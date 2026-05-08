var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var MODES = ["cdp", "acp", "sip"];
var DEFAULT_PROMPTS = {
  cdp: [
    "You are a strict visual analyst for character detail extraction.",
    "Return JSON only and only from visible evidence.",
    "Do not confirm user assumptions unless visibly supported.",
    "Focus on subject, pose, wardrobe, accessories, visible attributes."
  ].join(" "),
  acp: [
    "You are a strict visual analyst for atmosphere and context extraction.",
    "Return JSON only and only from visible evidence.",
    "Do not confirm user assumptions unless visibly supported.",
    "Focus on environment, lighting, weather, mood, spatial cues."
  ].join(" "),
  sip: [
    "You are a strict visual analyst for style and image properties.",
    "Return JSON only and only from visible evidence.",
    "Do not confirm user assumptions unless visibly supported.",
    "Focus on style, rendering cues, lens/framing hints, composition."
  ].join(" ")
};
function jsonResponse(status, payload, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");
function getAllowedOrigins(env) {
  const raw = (env.ALLOW_ORIGINS || "").trim();
  if (!raw) {
    return ["https://forge.theneurofoundry.com", "http://localhost:8000", "http://127.0.0.1:8000"];
  }
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}
__name(getAllowedOrigins, "getAllowedOrigins");
function getCorsHeaders(origin, env) {
  const allowed = getAllowedOrigins(env);
  const chosen = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "access-control-allow-origin": chosen,
    "access-control-allow-methods": "POST, OPTIONS, GET",
    "access-control-allow-headers": "content-type, x-auth-key",
    "vary": "Origin"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
function decodeBase64Image(imageData) {
  let raw = imageData;
  if (raw.startsWith("data:image")) {
    raw = raw.split(",", 2)[1] || "";
  }
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  return bytes;
}
__name(decodeBase64Image, "decodeBase64Image");
function extractText(result) {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const candidate = result;
  if (typeof candidate.response === "string") return candidate.response.trim();
  if (typeof candidate.generated_text === "string") return candidate.generated_text.trim();
  if (typeof candidate.output === "string") return candidate.output.trim();
  if (typeof candidate.caption === "string") return candidate.caption.trim();
  if (typeof candidate.description === "string") return candidate.description.trim();
  const nested = candidate.response;
  const output = nested?.output;
  const content = output?.[0]?.content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item.text === "string") return item.text;
      return "";
    }).filter(Boolean).join(" ").trim();
  }
  return "";
}
__name(extractText, "extractText");
function parseJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
__name(parseJsonObject, "parseJsonObject");
async function fetchPromptFromMedia(env, mode) {
  const base = (env.PROMPTS_MEDIA_BASE || "").trim();
  if (!base) return null;
  const template = (env.PROMPTS_MEDIA_PATH_TEMPLATE || "/prompts/{mode}").trim();
  const path = template.replace("{mode}", mode);
  const url = `${base.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 300 } });
    if (!res.ok) return null;
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (ctype.includes("application/json")) {
      const data = await res.json();
      const candidate = data.prompt ?? data.content ?? "";
      return typeof candidate === "string" ? candidate.trim() : null;
    }
    return (await res.text()).trim();
  } catch {
    return null;
  }
}
__name(fetchPromptFromMedia, "fetchPromptFromMedia");
function clampNumber(value, fallback, min = 0, max = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
__name(clampNumber, "clampNumber");
function normalizeStringArray(value, limit = 8, maxLen = 180) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean).slice(0, limit).map((v) => v.slice(0, maxLen));
}
__name(normalizeStringArray, "normalizeStringArray");
function sanitizeAnalysis(mode, raw, fallbackRawText) {
  const safeSummary = String(raw?.summary || fallbackRawText || "").trim().slice(0, 420);
  const observed = normalizeStringArray(raw?.observed_facts, 10);
  const uncertain = normalizeStringArray(raw?.uncertainty_flags, 10);
  const excluded = normalizeStringArray(raw?.excluded_assumptions, 10);
  const confidence = clampNumber(raw?.confidence, observed.length > 0 ? 0.65 : 0.4);
  const uncertaintyPenalty = Math.min(0.5, uncertain.length * 0.05);
  const sparsityPenalty = observed.length === 0 ? 0.35 : observed.length < 3 ? 0.15 : 0;
  const driftScore = clampNumber(1 - confidence + uncertaintyPenalty + sparsityPenalty, 0.5);
  return {
    mode,
    summary: safeSummary || "No grounded visual evidence extracted.",
    observed_facts: observed,
    uncertainty_flags: uncertain,
    excluded_assumptions: excluded,
    confidence,
    drift_score: driftScore
  };
}
__name(sanitizeAnalysis, "sanitizeAnalysis");
function buildContractPrompt(mode, instruction) {
  return [
    instruction,
    "",
    "Output contract (JSON only):",
    "{",
    '  "mode": "' + mode + '",',
    '  "summary": "2-4 concise sentences with only visible evidence",',
    '  "observed_facts": ["bullet facts grounded in image evidence"],',
    '  "uncertainty_flags": ["what cannot be verified from this image"],',
    '  "excluded_assumptions": ["user claims/hypotheses not visually proven"],',
    '  "confidence": 0.0',
    "}",
    "",
    "Rules:",
    "- Never confirm a hypothesis unless explicitly visible.",
    "- If evidence is weak, explicitly state uncertainty.",
    "- Avoid style inflation and unsupported adjectives.",
    "- Do not mention these rules in output."
  ].join("\n");
}
__name(buildContractPrompt, "buildContractPrompt");
async function runModelWithFallback(ai, models, payloadFactory) {
  let lastErr = null;
  for (const raw of models) {
    const model = raw.trim();
    if (!model) continue;
    try {
      const result = await ai.run(model, payloadFactory(model));
      return { model, result };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`All model attempts failed: ${String(lastErr)}`);
}
__name(runModelWithFallback, "runModelWithFallback");
function getVisionModelChain(env) {
  const primary = (env.VISION_MODEL_PRIMARY || "@cf/meta/llama-3.2-11b-vision-instruct").trim();
  const normalizedPrimary = primary === "cf/meta/llama-3.2-11b-vision-instru" ? "@cf/meta/llama-3.2-11b-vision-instruct" : primary;
  return [
    normalizedPrimary,
    env.VISION_MODEL_FALLBACK || "@cf/llava-hf/llava-1.5-7b-hf"
  ];
}
__name(getVisionModelChain, "getVisionModelChain");
function getTextModelChain(env) {
  const primary = (env.TEXT_MODEL_PRIMARY || "@cf/qwen/qwen3-30b-a3b-fp8").trim();
  const normalizedPrimary = primary === "qwen3-30b-a3b-fp8" ? "@cf/qwen/qwen3-30b-a3b-fp8" : primary;
  return [
    normalizedPrimary,
    env.TEXT_MODEL_FALLBACK || "@cf/mistral/mistral-7b-instruct-v0.2-lora"
  ];
}
__name(getTextModelChain, "getTextModelChain");
async function analyzeMode(env, mode, imageBase64) {
  const image = decodeBase64Image(imageBase64);
  const promptFromMedia = await fetchPromptFromMedia(env, mode);
  const instruction = promptFromMedia || DEFAULT_PROMPTS[mode];
  const contractPrompt = buildContractPrompt(mode, instruction);
  const { model, result } = await runModelWithFallback(env.AI, getVisionModelChain(env), () => ({
    image: [...image],
    prompt: contractPrompt,
    max_tokens: 900
  }));
  const rawText = extractText(result);
  const parsed = parseJsonObject(rawText);
  const analysis = sanitizeAnalysis(mode, parsed, rawText);
  return { model, analysis, raw_text: rawText };
}
__name(analyzeMode, "analyzeMode");
function buildSynthesisPrompt(cdp, acp, sip) {
  return [
    "You are a strict synthesis engine.",
    "Merge CDP, ACP, and SIP into one generation-ready prompt.",
    "Use only grounded facts from inputs. No embellishment beyond evidence.",
    "",
    "Return JSON only:",
    "{",
    '  "synth": "single concise generation-ready prompt",',
    '  "guardrails": ["short constraints to reduce model drift"],',
    '  "confidence": 0.0',
    "}",
    "",
    "CDP:",
    JSON.stringify(cdp),
    "",
    "ACP:",
    JSON.stringify(acp),
    "",
    "SIP:",
    JSON.stringify(sip),
    "",
    "Hard limits:",
    "- Max 140 words in synth.",
    "- No invented objects, brands, or identities.",
    "- If conflict exists, prefer higher-confidence shared facts."
  ].join("\n");
}
__name(buildSynthesisPrompt, "buildSynthesisPrompt");
function extractSynth(data, fallbackText) {
  if (!data) {
    return {
      synth: fallbackText.slice(0, 900),
      guardrails: ["Use grounded details only.", "Avoid adding unsupported scene elements."],
      confidence: 0.45
    };
  }
  return {
    synth: String(data.synth || fallbackText || "").trim().slice(0, 900),
    guardrails: normalizeStringArray(data.guardrails, 8, 120),
    confidence: clampNumber(data.confidence, 0.6)
  };
}
__name(extractSynth, "extractSynth");
function requireAuth(request, env) {
  const configured = (env.AUTH_KEY || "").trim();
  if (!configured) return true;
  const key = (request.headers.get("x-auth-key") || "").trim();
  return key === configured;
}
__name(requireAuth, "requireAuth");
function routeMode(pathname) {
  if (pathname.endsWith("/fusion/cdp") || pathname === "/cdp") return "cdp";
  if (pathname.endsWith("/fusion/acp") || pathname === "/acp") return "acp";
  if (pathname.endsWith("/fusion/sip") || pathname === "/sip") return "sip";
  return null;
}
__name(routeMode, "routeMode");
var src_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!requireAuth(request, env)) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" }, corsHeaders);
    }
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(200, {
        ok: true,
        service: "apprentice",
        endpoints: ["/fusion/cdp", "/fusion/acp", "/fusion/sip", "/fusion/synth", "/fusion", "/analyze"],
        modes: MODES
      }, corsHeaders);
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "Method Not Allowed" }, corsHeaders);
    }
    const body = await request.json().catch(() => ({}));
    const modeFromRoute = routeMode(url.pathname);
    const modeFromBody = String(body.mode || "").toLowerCase() || "";
    const mode = modeFromRoute || (MODES.includes(modeFromBody) ? modeFromBody : null);
    if (mode && (url.pathname.startsWith("/fusion/") || url.pathname === "/analyze" || url.pathname === "/cdp" || url.pathname === "/acp" || url.pathname === "/sip")) {
      const imageInput = String(body["image_base64"] || body["image"] || "");
      if (!imageInput) {
        return jsonResponse(400, { ok: false, error: "image_base64 (or image) is required" }, corsHeaders);
      }
      try {
        const out = await analyzeMode(env, mode, imageInput);
        return jsonResponse(200, {
          ok: true,
          mode,
          model_used: out.model,
          analysis: out.analysis,
          raw: out.raw_text
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, corsHeaders);
      }
    }
    if (url.pathname.endsWith("/fusion/synth") || url.pathname === "/synth") {
      const cdpIn = body["cdp"];
      const acpIn = body["acp"];
      const sipIn = body["sip"];
      if (!cdpIn || !acpIn || !sipIn) {
        return jsonResponse(400, { ok: false, error: "cdp, acp, and sip are required" }, corsHeaders);
      }
      const cdp = sanitizeAnalysis("cdp", typeof cdpIn === "object" ? cdpIn : null, String(cdpIn));
      const acp = sanitizeAnalysis("acp", typeof acpIn === "object" ? acpIn : null, String(acpIn));
      const sip = sanitizeAnalysis("sip", typeof sipIn === "object" ? sipIn : null, String(sipIn));
      try {
        const prompt = buildSynthesisPrompt(cdp, acp, sip);
        const { model, result } = await runModelWithFallback(env.AI, getTextModelChain(env), () => ({
          messages: [
            { role: "system", content: "Strict grounded synthesis only." },
            { role: "user", content: prompt }
          ],
          max_tokens: 500
        }));
        const rawText = extractText(result);
        const parsed = parseJsonObject(rawText);
        const synth = extractSynth(parsed, rawText);
        return jsonResponse(200, {
          ok: true,
          model_used: model,
          synth: synth.synth,
          guardrails: synth.guardrails,
          confidence: synth.confidence,
          drift_score: clampNumber(1 - synth.confidence, 0.4),
          raw: rawText
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, corsHeaders);
      }
    }
    if (url.pathname.endsWith("/fusion") || url.pathname === "/fusion") {
      const imageInput = String(body["image_base64"] || body["image"] || "");
      if (!imageInput) {
        return jsonResponse(400, { ok: false, error: "image_base64 (or image) is required" }, corsHeaders);
      }
      try {
        const [cdpOut, acpOut, sipOut] = await Promise.all([
          analyzeMode(env, "cdp", imageInput),
          analyzeMode(env, "acp", imageInput),
          analyzeMode(env, "sip", imageInput)
        ]);
        const synthPrompt = buildSynthesisPrompt(cdpOut.analysis, acpOut.analysis, sipOut.analysis);
        const { model: synthModel, result } = await runModelWithFallback(env.AI, getTextModelChain(env), () => ({
          messages: [
            { role: "system", content: "Strict grounded synthesis only." },
            { role: "user", content: synthPrompt }
          ],
          max_tokens: 500
        }));
        const synthRaw = extractText(result);
        const synth = extractSynth(parseJsonObject(synthRaw), synthRaw);
        return jsonResponse(200, {
          ok: true,
          cdp: cdpOut.analysis,
          acp: acpOut.analysis,
          sip: sipOut.analysis,
          synth: synth.synth,
          guardrails: synth.guardrails,
          models_used: {
            cdp: cdpOut.model,
            acp: acpOut.model,
            sip: sipOut.model,
            synth: synthModel
          }
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, corsHeaders);
      }
    }
    return jsonResponse(404, { ok: false, error: "Not Found" }, corsHeaders);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-GSvMuj/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-GSvMuj/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
