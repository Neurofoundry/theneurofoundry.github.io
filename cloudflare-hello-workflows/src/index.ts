import { runWithTools, tool } from "@cloudflare/ai-utils";
import { DurableObject } from "cloudflare:workers";

type WorkerEnv = {
	AI: Ai;
	SESSION_STATE: DurableObjectNamespace;
	WORKER_API_KEY?: string;
	CF_CHAT_MODEL?: string;
	CF_RESPONSES_MODEL?: string;
	CF_AGENT_MODEL?: string;
	SESSION_TTL_SECONDS?: string;
	CORS_ORIGIN?: string;
	ALLOW_MOCK_AI?: string;
	ALLOWED_FETCH_HOSTS?: string;
};

type JsonRecord = Record<string, unknown>;

type ChatCompletionRequest = {
	model?: string;
	messages?: Array<Record<string, unknown>>;
	tools?: unknown[];
	functions?: unknown[];
	session_id?: string;
	session_ttl_seconds?: number;
	response_format?: Record<string, unknown>;
	max_tokens?: number;
	max_completion_tokens?: number;
	temperature?: number;
	top_p?: number;
	top_k?: number;
	seed?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stream?: boolean;
};

type ResponsesRequest = {
	model?: string;
	input?: unknown;
	instructions?: string;
	session_id?: string;
	session_ttl_seconds?: number;
	max_output_tokens?: number;
	parallel_tool_calls?: boolean;
	previous_response_id?: string;
	reasoning?: Record<string, unknown>;
	service_tier?: string;
	stream?: boolean;
	temperature?: number;
	text?: Record<string, unknown>;
	tool_choice?: unknown;
	tools?: unknown[];
	top_p?: number;
	truncation?: string;
};

type AgentRunRequest = {
	model?: string;
	input?: string;
	system?: string;
	session_id?: string;
	session_ttl_seconds?: number;
	messages?: Array<Record<string, unknown>>;
	max_recursive_tool_runs?: number;
};

type ToolTraceEntry = {
	name: string;
	args: unknown;
	status: "completed" | "error";
	result_preview?: string;
	error?: string;
};

type SessionEventPayload = {
	route: string;
	kind: string;
	request: unknown;
	response: unknown;
	usage?: unknown;
	ttl_seconds?: number;
};

const DEFAULT_CHAT_MODEL = "@cf/zai-org/glm-4.7-flash";
const DEFAULT_RESPONSES_MODEL = "@cf/openai/gpt-oss-120b";
const DEFAULT_AGENT_MODEL = "@cf/zai-org/glm-4.7-flash";
const DEFAULT_SESSION_TTL_SECONDS = 900;
const MAX_SESSION_EVENTS = 25;

const SUPPORTED_MODELS = [
	{
		id: "@cf/zai-org/glm-4.7-flash",
		object: "model",
		description: "Best default here for Browser Use and multi-turn function calling.",
	},
	{
		id: "@cf/openai/gpt-oss-120b",
		object: "model",
		description: "Higher-reasoning option for responses-style workloads.",
	},
	{
		id: "@cf/meta/llama-4-scout-17b-16e-instruct",
		object: "model",
		description: "Alternative long-context model with JSON/schema support.",
	},
];

const AGENT_SYSTEM_PROMPT = [
	"You are a Cloudflare Workers AI automation assistant.",
	"Use tools when they materially improve the answer.",
	"Do not invent tool results.",
	"Prefer concise, factual answers.",
].join(" ");

export class SessionStateDurableObject extends DurableObject<WorkerEnv> {
	constructor(ctx: DurableObjectState, env: WorkerEnv) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			this.ctx.storage.sql.exec(
				`CREATE TABLE IF NOT EXISTS events (
					id TEXT PRIMARY KEY,
					created_at INTEGER NOT NULL,
					expires_at INTEGER NOT NULL,
					route TEXT NOT NULL,
					kind TEXT NOT NULL,
					request_json TEXT NOT NULL,
					response_json TEXT NOT NULL,
					usage_json TEXT
				)`,
			);
			this.ctx.storage.sql.exec(
				"CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events (expires_at)",
			);
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST" && url.pathname === "/events") {
			const body = await request.json<SessionEventPayload>();
			await this.persistEvent(body);
			return Response.json({ ok: true });
		}

		if (request.method === "GET" && url.pathname === "/session") {
			const limit = clampNumber(url.searchParams.get("limit"), MAX_SESSION_EVENTS, 1, 100);
			return Response.json(await this.readSession(limit));
		}

		if (request.method === "DELETE" && url.pathname === "/session") {
			await this.clearSession();
			return Response.json({ ok: true });
		}

		return Response.json({ error: "Not found" }, { status: 404 });
	}

	async alarm(): Promise<void> {
		await this.pruneExpired();
	}

	private async persistEvent(payload: SessionEventPayload): Promise<void> {
		const now = Date.now();
		const ttlSeconds = clampNumber(
			payload.ttl_seconds,
			resolveSessionTtlSeconds(this.env),
			60,
			86400,
		);
		const expiresAt = now + ttlSeconds * 1000;

		this.ctx.storage.sql.exec(
			`INSERT INTO events (id, created_at, expires_at, route, kind, request_json, response_json, usage_json)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			crypto.randomUUID(),
			now,
			expiresAt,
			payload.route,
			payload.kind,
			truncateString(safeJsonStringify(payload.request), 16000),
			truncateString(safeJsonStringify(payload.response), 16000),
			payload.usage ? truncateString(safeJsonStringify(payload.usage), 4000) : null,
		);

		await this.pruneExpired();
		await this.scheduleNextAlarm();
	}

	private async readSession(limit: number): Promise<JsonRecord> {
		await this.pruneExpired();

		const rows = this.ctx.storage.sql
			.exec<{
				id: string;
				created_at: number;
				expires_at: number;
				route: string;
				kind: string;
				request_json: string;
				response_json: string;
				usage_json: string | null;
			}>(
				`SELECT id, created_at, expires_at, route, kind, request_json, response_json, usage_json
				 FROM events
				 ORDER BY created_at DESC
				 LIMIT ?`,
				limit,
			)
			.toArray()
			.reverse();

		const nextExpiryRows = this.ctx.storage.sql
			.exec<{ next_expires_at: number | null }>(
				"SELECT MIN(expires_at) AS next_expires_at FROM events",
			)
			.toArray();
		const nextExpiry = nextExpiryRows[0]?.next_expires_at ?? null;

		return {
			ok: true,
			events: rows.map((row) => ({
				id: row.id,
				created_at: row.created_at,
				expires_at: row.expires_at,
				route: row.route,
				kind: row.kind,
				request: safeJsonParse(row.request_json),
				response: safeJsonParse(row.response_json),
				usage: row.usage_json ? safeJsonParse(row.usage_json) : null,
			})),
			next_expires_at: nextExpiry,
			database_size_bytes: this.ctx.storage.sql.databaseSize,
		};
	}

	private async clearSession(): Promise<void> {
		this.ctx.storage.sql.exec("DELETE FROM events");
		await this.ctx.storage.deleteAlarm();
	}

	private async pruneExpired(): Promise<void> {
		this.ctx.storage.sql.exec("DELETE FROM events WHERE expires_at <= ?", Date.now());
	}

	private async scheduleNextAlarm(): Promise<void> {
		const rows = this.ctx.storage.sql
			.exec<{ next_expires_at: number | null }>(
				"SELECT MIN(expires_at) AS next_expires_at FROM events",
			)
			.toArray();

		const nextExpiry = rows[0]?.next_expires_at ?? null;
		if (nextExpiry) {
			await this.ctx.storage.setAlarm(nextExpiry);
			return;
		}

		await this.ctx.storage.deleteAlarm();
	}
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders(env) });
		}

		if (url.pathname.startsWith("/favicon")) {
			return jsonResponse(env, { ok: false, error: "Not found" }, 404);
		}

		try {
			if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/v1")) {
				return jsonResponse(env, {
					ok: true,
					name: "zero",
					openai_compatible: true,
					default_chat_model: env.CF_CHAT_MODEL || DEFAULT_CHAT_MODEL,
					default_responses_model: env.CF_RESPONSES_MODEL || DEFAULT_RESPONSES_MODEL,
					default_agent_model: env.CF_AGENT_MODEL || DEFAULT_AGENT_MODEL,
					default_session_ttl_seconds: resolveSessionTtlSeconds(env),
					endpoints: [
						"/health",
						"/v1/models",
						"/v1/tools",
						"/v1/chat/completions",
						"/v1/responses",
						"/v1/agent/run",
						"/v1/sessions/:sessionId",
					],
				});
			}

			if (request.method === "GET" && url.pathname === "/health") {
				return jsonResponse(env, {
					ok: true,
					ai_binding: typeof env.AI !== "undefined",
					session_state_binding: typeof env.SESSION_STATE !== "undefined",
					mock_enabled: env.ALLOW_MOCK_AI === "true",
				});
			}

			if (request.method === "GET" && url.pathname === "/v1/models") {
				return jsonResponse(env, {
					object: "list",
					data: SUPPORTED_MODELS,
				});
			}

			if (request.method === "GET" && url.pathname === "/v1/tools") {
				return jsonResponse(env, {
					object: "list",
					data: builtInToolCatalog(),
				});
			}

			const sessionId = getSessionIdFromPath(url.pathname);
			if (sessionId) {
				if (!authorized(request, env)) {
					return openaiError(env, 401, "Invalid API key", "authentication_error");
				}
				if (request.method === "GET") {
					return handleGetSession(sessionId, request, env);
				}
				if (request.method === "DELETE") {
					return handleDeleteSession(sessionId, env);
				}
				return openaiError(env, 405, "Method not allowed", "invalid_request_error");
			}

			if (url.pathname === "/v1/chat/completions") {
				if (request.method !== "POST") {
					return openaiError(env, 405, "Method not allowed", "invalid_request_error");
				}
				if (!authorized(request, env)) {
					return openaiError(env, 401, "Invalid API key", "authentication_error");
				}
				return handleChatCompletions(request, env);
			}

			if (url.pathname === "/v1/responses") {
				if (request.method !== "POST") {
					return openaiError(env, 405, "Method not allowed", "invalid_request_error");
				}
				if (!authorized(request, env)) {
					return openaiError(env, 401, "Invalid API key", "authentication_error");
				}
				return handleResponses(request, env);
			}

			if (url.pathname === "/v1/agent/run") {
				if (request.method !== "POST") {
					return openaiError(env, 405, "Method not allowed", "invalid_request_error");
				}
				if (!authorized(request, env)) {
					return openaiError(env, 401, "Invalid API key", "authentication_error");
				}
				return handleAgentRun(request, env);
			}

			return openaiError(env, 404, "Not Found", "invalid_request_error");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return openaiError(env, 500, message, "server_error");
		}
	},
};

async function handleChatCompletions(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await safeJson<ChatCompletionRequest>(request);
	const sessionId = resolveRequestSessionId(request, body.session_id);
	const sessionTtlSeconds = resolveRequestSessionTtlSeconds(request, body.session_ttl_seconds);

	if (body.stream) {
		return openaiError(env, 400, "stream=true is not supported yet", "invalid_request_error");
	}

	const messages = Array.isArray(body.messages) ? body.messages : [];
	if (!messages.length) {
		return openaiError(env, 400, "messages must be a non-empty array", "invalid_request_error");
	}

	const model = pickModel(body.model, env.CF_CHAT_MODEL, DEFAULT_CHAT_MODEL);
	if (isMockMode(request, env)) {
		return jsonResponse(env, buildMockChatCompletion(model, body.response_format));
	}

	assertAiBinding(env);

	const ai = env.AI as any;
	let aiResponse: JsonRecord;
	try {
		aiResponse = await ai.run(model, {
			messages: messages as never,
			tools: Array.isArray(body.tools) ? (body.tools as never) : undefined,
			functions: Array.isArray(body.functions) ? (body.functions as never) : undefined,
			response_format: body.response_format as never,
			max_tokens: coerceNumber(body.max_completion_tokens ?? body.max_tokens, 1024),
			temperature: coerceOptionalNumber(body.temperature),
			top_p: coerceOptionalNumber(body.top_p),
			top_k: coerceOptionalNumber(body.top_k),
			seed: coerceOptionalNumber(body.seed),
			frequency_penalty: coerceOptionalNumber(body.frequency_penalty),
			presence_penalty: coerceOptionalNumber(body.presence_penalty),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return openaiError(env, 500, `AI run failed: ${message}`, "server_error");
	}

	const responsePayload = toOpenAIChatCompletion(model, aiResponse);
	await maybePersistSessionEvent(env, sessionId, {
		route: "/v1/chat/completions",
		kind: "chat_completion",
		request: {
			model,
			messages,
			response_format: body.response_format || null,
		},
		response: responsePayload,
		usage: (responsePayload as JsonRecord).usage || null,
		ttl_seconds: sessionTtlSeconds,
	});

	return jsonResponse(env, responsePayload);
}

async function handleResponses(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await safeJson<ResponsesRequest>(request);
	const sessionId = resolveRequestSessionId(request, body.session_id);
	const sessionTtlSeconds = resolveRequestSessionTtlSeconds(request, body.session_ttl_seconds);

	if (body.stream) {
		return openaiError(env, 400, "stream=true is not supported yet", "invalid_request_error");
	}

	const model = pickModel(body.model, env.CF_RESPONSES_MODEL, DEFAULT_RESPONSES_MODEL);
	if (isMockMode(request, env)) {
		return jsonResponse(env, {
			id: `resp_${crypto.randomUUID()}`,
			object: "response",
			status: "completed",
			output_text: JSON.stringify(buildMockSchemaObject(null)),
			model,
		});
	}

	assertAiBinding(env);

	const ai = env.AI as any;
	let aiResponse: JsonRecord;
	try {
		aiResponse = await ai.run(model, {
			input: body.input as never,
			instructions: body.instructions,
			max_output_tokens: coerceNumber(body.max_output_tokens, 1024),
			parallel_tool_calls: body.parallel_tool_calls,
			previous_response_id: body.previous_response_id,
			reasoning: body.reasoning as never,
			service_tier: body.service_tier as never,
			temperature: coerceOptionalNumber(body.temperature),
			text: body.text as never,
			tool_choice: body.tool_choice as never,
			tools: Array.isArray(body.tools) ? (body.tools as never) : undefined,
			top_p: coerceOptionalNumber(body.top_p),
			truncation: body.truncation as never,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return openaiError(env, 500, `Responses run failed: ${message}`, "server_error");
	}

	const responsePayload = {
		object: "response",
		model,
		...((aiResponse as JsonRecord) || {}),
	};
	await maybePersistSessionEvent(env, sessionId, {
		route: "/v1/responses",
		kind: "responses",
		request: {
			model,
			input: body.input,
			instructions: body.instructions,
		},
		response: responsePayload,
		usage: (responsePayload as JsonRecord).usage || null,
		ttl_seconds: sessionTtlSeconds,
	});

	return jsonResponse(env, responsePayload);
}

async function handleAgentRun(request: Request, env: WorkerEnv): Promise<Response> {
	const body = await safeJson<AgentRunRequest>(request);
	const sessionId = resolveRequestSessionId(request, body.session_id);
	const sessionTtlSeconds = resolveRequestSessionTtlSeconds(request, body.session_ttl_seconds);
	const model = pickModel(body.model, env.CF_AGENT_MODEL, DEFAULT_AGENT_MODEL);
	const trace: ToolTraceEntry[] = [];

	const messages = Array.isArray(body.messages) ? [...body.messages] : [];
	if (body.input) {
		messages.push({ role: "user", content: body.input });
	}
	if (!messages.length) {
		return openaiError(env, 400, "input or messages is required", "invalid_request_error");
	}

	if (isMockMode(request, env)) {
		return jsonResponse(env, {
			ok: true,
			model,
			output_text: "Mock agent response. Built-in tools are wired correctly.",
			tool_trace: trace,
		});
	}

	assertAiBinding(env);

	const tools = buildEmbeddedTools(env, trace);
	let result: JsonRecord;
	try {
		result = await runWithTools(
			env.AI,
			model as never,
			{
				messages: [
					{ role: "system", content: body.system || AGENT_SYSTEM_PROMPT },
					...(messages as never),
				],
				tools,
			},
			{
				strictValidation: true,
				maxRecursiveToolRuns: coerceNumber(body.max_recursive_tool_runs, 2),
			},
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return openaiError(env, 500, `Agent run failed: ${message}`, "server_error");
	}

	const responsePayload = {
		ok: true,
		model,
		output_text: extractText(result),
		usage: (result as JsonRecord).usage || null,
		tool_trace: trace,
	};
	await maybePersistSessionEvent(env, sessionId, {
		route: "/v1/agent/run",
		kind: "agent_run",
		request: {
			model,
			input: body.input || null,
			message_count: messages.length,
		},
		response: responsePayload,
		usage: responsePayload.usage,
		ttl_seconds: sessionTtlSeconds,
	});

	return jsonResponse(env, responsePayload);
}

async function handleGetSession(
	sessionId: string,
	request: Request,
	env: WorkerEnv,
): Promise<Response> {
	const url = new URL(request.url);
	const limit = clampNumber(url.searchParams.get("limit"), MAX_SESSION_EVENTS, 1, 100);
	const stub = getSessionStateStub(env, sessionId);
	const response = await stub.fetch(`https://session/session?limit=${limit}`);
	const payload = await response.json<JsonRecord>();
	return jsonResponse(env, {
		session_id: sessionId,
		...payload,
	});
}

async function handleDeleteSession(sessionId: string, env: WorkerEnv): Promise<Response> {
	const stub = getSessionStateStub(env, sessionId);
	await stub.fetch("https://session/session", { method: "DELETE" });
	return jsonResponse(env, {
		ok: true,
		session_id: sessionId,
		cleared: true,
	});
}

async function maybePersistSessionEvent(
	env: WorkerEnv,
	sessionId: string | undefined,
	payload: SessionEventPayload,
): Promise<void> {
	if (!sessionId) {
		return;
	}

	const stub = getSessionStateStub(env, sessionId);
	await stub.fetch("https://session/events", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
}

function getSessionStateStub(env: WorkerEnv, rawSessionId: string) {
	if (typeof env.SESSION_STATE === "undefined") {
		throw new Error("Durable Object binding 'SESSION_STATE' is not configured.");
	}

	const sessionId = normalizeSessionId(rawSessionId);
	const durableObjectId = env.SESSION_STATE.idFromName(sessionId);
	return env.SESSION_STATE.get(durableObjectId);
}

function buildEmbeddedTools(env: WorkerEnv, trace: ToolTraceEntry[]) {
	return [
		tool({
			name: "get_current_time",
			description: "Return the current UTC time in ISO-8601 format.",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
			function: async () =>
				tracedToolCall(trace, "get_current_time", {}, async () =>
					JSON.stringify({
						iso_utc: new Date().toISOString(),
					}),
				),
		}),
		tool({
			name: "fetch_url",
			description: "Fetch a public web page or JSON endpoint and return a compact summary.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "A public http or https URL to fetch.",
					},
					max_chars: {
						type: "integer",
						description: "Maximum number of characters to return.",
					},
				},
				required: ["url"],
			},
			function: async ({ url, max_chars }) =>
				tracedToolCall(trace, "fetch_url", { url, max_chars }, async () => {
					const targetUrl = assertPublicHttpUrl(String(url || ""), env);
					const response = await fetch(targetUrl, {
						headers: {
							"User-Agent": "NeurofoundryCloudflareAIWorker/1.0",
						},
					});
					const contentType = response.headers.get("content-type") || "";
					const rawText = await response.text();
					const limit = clampNumber(max_chars, 5000, 250, 20000);
					const text =
						contentType.includes("html") || looksLikeHtml(rawText)
							? htmlToText(rawText).slice(0, limit)
							: rawText.slice(0, limit);

					return JSON.stringify({
						url: targetUrl.toString(),
						status: response.status,
						content_type: contentType,
						title: extractTitle(rawText),
						text,
					});
				}),
		}),
		tool({
			name: "extract_links",
			description: "Extract visible anchor text and absolute URLs from a public web page.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "A public http or https URL to inspect.",
					},
					max_links: {
						type: "integer",
						description: "Maximum number of links to return.",
					},
				},
				required: ["url"],
			},
			function: async ({ url, max_links }) =>
				tracedToolCall(trace, "extract_links", { url, max_links }, async () => {
					const targetUrl = assertPublicHttpUrl(String(url || ""), env);
					const response = await fetch(targetUrl, {
						headers: {
							"User-Agent": "NeurofoundryCloudflareAIWorker/1.0",
						},
					});
					const html = await response.text();
					const links = extractLinks(html, targetUrl, clampNumber(max_links, 8, 1, 25));
					return JSON.stringify({
						url: targetUrl.toString(),
						status: response.status,
						links,
					});
				}),
		}),
	];
}

function builtInToolCatalog() {
	return [
		{
			name: "get_current_time",
			description: "Return the current UTC time in ISO-8601 format.",
		},
		{
			name: "fetch_url",
			description: "Fetch a public web page or JSON endpoint and return a compact summary.",
		},
		{
			name: "extract_links",
			description: "Extract visible anchor text and absolute URLs from a public web page.",
		},
	];
}

async function tracedToolCall(
	trace: ToolTraceEntry[],
	name: string,
	args: unknown,
	fn: () => Promise<string>,
): Promise<string> {
	try {
		const result = await fn();
		trace.push({
			name,
			args,
			status: "completed",
			result_preview: result.slice(0, 240),
		});
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		trace.push({
			name,
			args,
			status: "error",
			error: message,
		});
		throw error;
	}
}

function toOpenAIChatCompletion(model: string, aiResponse: JsonRecord): JsonRecord {
	if (Array.isArray(aiResponse.choices)) {
		return {
			...aiResponse,
			id:
				typeof aiResponse.id === "string" && aiResponse.id
					? aiResponse.id
					: `chatcmpl_${crypto.randomUUID()}`,
			object:
				typeof aiResponse.object === "string" && aiResponse.object
					? aiResponse.object
					: "chat.completion",
			created:
				typeof aiResponse.created === "number"
					? aiResponse.created
					: Math.floor(Date.now() / 1000),
			model:
				typeof aiResponse.model === "string" && aiResponse.model
					? aiResponse.model
					: model,
		};
	}

	const toolCalls = normalizeToolCalls(aiResponse.tool_calls);
	const content = toolCalls.length ? null : extractText(aiResponse);

	return {
		id: `chatcmpl_${crypto.randomUUID()}`,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content,
					...(toolCalls.length ? { tool_calls: toolCalls } : {}),
				},
				finish_reason: toolCalls.length ? "tool_calls" : "stop",
			},
		],
		usage: aiResponse.usage || {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0,
		},
	};
}

function buildMockChatCompletion(model: string, responseFormat?: Record<string, unknown>): JsonRecord {
	const mockObject = buildMockSchemaObject(responseFormat?.json_schema);
	const content =
		responseFormat?.type === "json_schema" || responseFormat?.type === "json_object"
			? JSON.stringify(mockObject)
			: "Mock chat completion from the Cloudflare worker.";

	return {
		id: `chatcmpl_${crypto.randomUUID()}`,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content,
				},
				finish_reason: "stop",
			},
		],
		usage: {
			prompt_tokens: 1,
			completion_tokens: 1,
			total_tokens: 2,
		},
	};
}

function buildMockSchemaObject(schemaValue: unknown): unknown {
	const schema =
		schemaValue && typeof schemaValue === "object" && "schema" in (schemaValue as JsonRecord)
			? (schemaValue as JsonRecord).schema
			: schemaValue;

	if (!schema || typeof schema !== "object") {
		return { ok: true, worker: "mock" };
	}

	const node = schema as JsonRecord;
	const type = typeof node.type === "string" ? node.type : "object";

	if (type === "string") {
		return "mock";
	}
	if (type === "boolean") {
		return true;
	}
	if (type === "integer" || type === "number") {
		return 1;
	}
	if (type === "array") {
		return [];
	}

	const properties = (node.properties as JsonRecord) || {};
	const result: JsonRecord = {};
	for (const [key, value] of Object.entries(properties)) {
		result[key] = buildMockSchemaObject(value);
	}
	if (!Object.keys(result).length) {
		result.ok = true;
	}
	return result;
}

function normalizeToolCalls(value: unknown): unknown[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => {
			if (!entry || typeof entry !== "object") {
				return null;
			}

			const record = entry as JsonRecord;
			const fn = (record.function || record) as JsonRecord;
			const name = typeof fn.name === "string" ? fn.name : null;
			if (!name) {
				return null;
			}

			let args = fn.arguments;
			if (args && typeof args === "object") {
				args = JSON.stringify(args);
			}

			return {
				id:
					typeof record.id === "string" && record.id
						? record.id
						: `call_${crypto.randomUUID()}`,
				type: "function",
				function: {
					name,
					arguments: typeof args === "string" ? args : "{}",
				},
			};
		})
		.filter(Boolean);
}

function extractText(value: unknown): string {
	if (!value) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => extractText(item)).filter(Boolean).join("\n");
	}

	if (typeof value === "object") {
		const record = value as JsonRecord;
		for (const key of ["response", "output_text", "content", "text", "message"]) {
			if (!(key in record)) {
				continue;
			}
			const extracted = extractText(record[key]);
			if (extracted && extracted !== "[object Object]") {
				return extracted;
			}
		}
		for (const nested of Object.values(record)) {
			if (typeof nested === "string" && nested.trim()) {
				return nested;
			}
			if (nested && typeof nested === "object") {
				const extracted = extractText(nested);
				if (extracted && extracted !== "[object Object]") {
					return extracted;
				}
			}
		}
	}

	return String(value);
}

function assertAiBinding(env: WorkerEnv): void {
	if (typeof env.AI === "undefined") {
		throw new Error("Workers AI binding 'AI' is not configured.");
	}
}

function pickModel(requested: string | undefined, configured: string | undefined, fallback: string): string {
	if (typeof requested === "string" && requested.trim()) {
		return requested.trim();
	}
	if (typeof configured === "string" && configured.trim()) {
		return configured.trim();
	}
	return fallback;
}

function resolveSessionTtlSeconds(env: WorkerEnv): number {
	return clampNumber(env.SESSION_TTL_SECONDS, DEFAULT_SESSION_TTL_SECONDS, 60, 86400);
}

function resolveRequestSessionId(request: Request, bodySessionId?: string): string | undefined {
	const headerSessionId = request.headers.get("X-Session-Id") || undefined;
	const candidate = bodySessionId || headerSessionId;
	return candidate ? normalizeSessionId(candidate) : undefined;
}

function resolveRequestSessionTtlSeconds(
	request: Request,
	bodySessionTtlSeconds?: number,
): number | undefined {
	if (typeof bodySessionTtlSeconds === "number" && Number.isFinite(bodySessionTtlSeconds)) {
		return clampNumber(bodySessionTtlSeconds, DEFAULT_SESSION_TTL_SECONDS, 60, 86400);
	}

	const headerValue = request.headers.get("X-Session-TTL-Seconds");
	if (!headerValue) {
		return undefined;
	}

	return clampNumber(headerValue, DEFAULT_SESSION_TTL_SECONDS, 60, 86400);
}

function getSessionIdFromPath(pathname: string): string | null {
	const match = pathname.match(/^\/v1\/sessions\/([^/]+)$/);
	if (!match) {
		return null;
	}
	return normalizeSessionId(decodeURIComponent(match[1]));
}

function normalizeSessionId(sessionId: string): string {
	const trimmed = sessionId.trim();
	if (!trimmed || trimmed.length > 128 || !/^[A-Za-z0-9:_-]+$/.test(trimmed)) {
		throw new Error("session_id must match /^[A-Za-z0-9:_-]+$/ and be 1-128 chars.");
	}
	return trimmed;
}

function coerceNumber(value: unknown, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceOptionalNumber(value: unknown): number | undefined {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function clampNumber(
	value: unknown,
	fallback: number,
	minimum: number = 0,
	maximum: number = Number.MAX_SAFE_INTEGER,
): number {
	const parsed = coerceNumber(value, fallback);
	return Math.max(minimum, Math.min(maximum, parsed));
}

async function safeJson<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		return {} as T;
	}
}

function authorized(request: Request, env: WorkerEnv): boolean {
	const expected = env.WORKER_API_KEY || "";
	if (!expected) {
		return true;
	}

	const authorization = request.headers.get("Authorization") || "";
	if (!authorization.startsWith("Bearer ")) {
		return false;
	}

	return authorization.slice(7) === expected;
}

function isMockMode(request: Request, env: WorkerEnv): boolean {
	return env.ALLOW_MOCK_AI === "true" && request.headers.get("X-Debug-Mock-AI") === "1";
}

function jsonResponse(env: WorkerEnv, body: unknown, status: number = 200): Response {
	return new Response(JSON.stringify(body, null, 2), {
		status,
		headers: corsHeaders(env),
	});
}

function openaiError(env: WorkerEnv, status: number, message: string, type: string): Response {
	return jsonResponse(
		env,
		{
			error: {
				message,
				type,
			},
		},
		status,
	);
}

function corsHeaders(env: WorkerEnv): Headers {
	const headers = new Headers();
	headers.set("Access-Control-Allow-Origin", env.CORS_ORIGIN || "*");
	headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, X-Debug-Mock-AI, X-Session-Id, X-Session-TTL-Seconds",
	);
	headers.set("Content-Type", "application/json; charset=utf-8");
	return headers;
}

function assertPublicHttpUrl(rawUrl: string, env: WorkerEnv): URL {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw new Error(`Invalid URL: ${rawUrl}`);
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new Error("Only http and https URLs are allowed.");
	}

	const hostname = parsed.hostname.toLowerCase();
	if (
		hostname === "localhost" ||
		hostname === "::1" ||
		hostname.startsWith("127.") ||
		hostname.startsWith("10.") ||
		hostname.startsWith("192.168.") ||
		hostname.startsWith("169.254.") ||
		hostname.endsWith(".internal")
	) {
		throw new Error("Private or localhost targets are not allowed.");
	}

	const private172Match = hostname.match(/^172\.(\d+)\./);
	if (private172Match) {
		const secondOctet = Number(private172Match[1]);
		if (secondOctet >= 16 && secondOctet <= 31) {
			throw new Error("Private network targets are not allowed.");
		}
	}

	const whitelist = (env.ALLOWED_FETCH_HOSTS || "")
		.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	if (whitelist.length && !whitelist.includes(hostname)) {
		throw new Error(`Host '${hostname}' is not in ALLOWED_FETCH_HOSTS.`);
	}

	return parsed;
}

function looksLikeHtml(text: string): boolean {
	return /<html[\s>]|<body[\s>]|<title[\s>]/i.test(text);
}

function extractTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function htmlToText(html: string): string {
	return decodeHtmlEntities(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim(),
	);
}

function extractLinks(html: string, baseUrl: URL, maxLinks: number) {
	const links: Array<{ text: string; url: string }> = [];
	const seen = new Set<string>();
	const pattern = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(html)) && links.length < maxLinks) {
		const href = match[1]?.trim();
		if (!href) {
			continue;
		}

		let absoluteUrl: URL;
		try {
			absoluteUrl = new URL(href, baseUrl);
		} catch {
			continue;
		}

		const normalizedUrl = absoluteUrl.toString();
		if (seen.has(normalizedUrl)) {
			continue;
		}

		const text = htmlToText(match[2] || "").slice(0, 140);
		seen.add(normalizedUrl);
		links.push({
			text: text || normalizedUrl,
			url: normalizedUrl,
		});
	}

	return links;
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">");
}

function safeJsonStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return JSON.stringify({ error: "serialization_failed" });
	}
}

function safeJsonParse(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function truncateString(value: string, maximumLength: number): string {
	return value.length > maximumLength ? `${value.slice(0, maximumLength)}...` : value;
}
