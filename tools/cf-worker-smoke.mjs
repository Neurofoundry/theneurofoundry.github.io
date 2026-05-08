const DEFAULT_WORKER_URL = process.env.CF_WORKER_URL || "http://127.0.0.1:8787";
const DEFAULT_MODEL = process.env.CF_BROWSER_USE_MODEL || "@cf/zai-org/glm-4.7-flash";

function parseArgs(argv) {
	const args = {};
	for (let index = 0; index < argv.length; index += 1) {
		const entry = argv[index];
		if (!entry.startsWith("--")) {
			continue;
		}
		const key = entry.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}
		args[key] = next;
		index += 1;
	}
	return args;
}

function buildHeaders(apiKey, mockAi) {
	const headers = {
		"content-type": "application/json",
	};
	if (apiKey) {
		headers.authorization = `Bearer ${apiKey}`;
	}
	if (mockAi) {
		headers["x-debug-mock-ai"] = "1";
	}
	return headers;
}

async function readJson(response) {
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new Error(`Expected JSON from ${response.url}, got: ${text}`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const workerUrl = (args.url || DEFAULT_WORKER_URL).replace(/\/$/, "");
	const model = args.model || DEFAULT_MODEL;
	const apiKey =
		args["api-key"] ||
		process.env.CF_WORKER_API_KEY ||
		process.env.CLOUDFLARE_WORKER_API_KEY ||
		process.env.CLOUDFLARE_API_TOKEN ||
		"";
	const mockAi = Boolean(args["mock-ai"]);
	const headers = buildHeaders(apiKey, mockAi);

	const health = await fetch(`${workerUrl}/health`, { headers });
	if (!health.ok) {
		throw new Error(`/health failed with ${health.status}`);
	}
	console.log("health:", await readJson(health));

	const models = await fetch(`${workerUrl}/v1/models`, { headers });
	if (!models.ok) {
		throw new Error(`/v1/models failed with ${models.status}`);
	}
	console.log("models:", await readJson(models));

	const structuredPayload = {
		model,
		messages: [
			{ role: "system", content: "Return strict JSON matching the schema." },
			{ role: "user", content: "Confirm the worker is ready." },
		],
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "worker_smoke",
				strict: true,
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						ok: { type: "boolean" },
						status: { type: "string" },
					},
					required: ["ok", "status"],
				},
			},
		},
		max_completion_tokens: 120,
		temperature: 0,
	};

	const completion = await fetch(`${workerUrl}/v1/chat/completions`, {
		method: "POST",
		headers,
		body: JSON.stringify(structuredPayload),
	});
	if (!completion.ok) {
		throw new Error(`/v1/chat/completions failed with ${completion.status}`);
	}
	console.log("structured completion:", await readJson(completion));

	const agentPayload = {
		model,
		input: "Fetch https://example.com and tell me the page title and current UTC time.",
		max_recursive_tool_runs: 2,
	};

	const agent = await fetch(`${workerUrl}/v1/agent/run`, {
		method: "POST",
		headers,
		body: JSON.stringify(agentPayload),
	});
	if (!agent.ok) {
		throw new Error(`/v1/agent/run failed with ${agent.status}`);
	}
	console.log("agent run:", await readJson(agent));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
