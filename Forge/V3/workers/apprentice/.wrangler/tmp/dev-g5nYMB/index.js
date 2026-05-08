var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var MODES = ["cdp", "acp", "sip"];
var ORIGINS = ["sdxl", "phoenix", "flux", "dreamshaper"];
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
var TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7n2z8AAAAASUVORK5CYII=";
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
function toPositiveInt(value, fallback, min = 1, max = 5e3) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  const intVal = Math.floor(n);
  return Math.max(min, Math.min(max, intVal));
}
__name(toPositiveInt, "toPositiveInt");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
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
async function runModelWithFallback(ai, models, payloadFactory, options) {
  let lastErr = null;
  const attemptsPerModel = toPositiveInt(options?.per_model_attempts, 2, 1, 5);
  const backoffMs = toPositiveInt(options?.backoff_ms, 450, 50, 3e3);
  let attempts = 0;
  for (const raw of models) {
    const model = raw.trim();
    if (!model) continue;
    for (let i = 0; i < attemptsPerModel; i++) {
      attempts += 1;
      const started = Date.now();
      try {
        const result = await ai.run(model, payloadFactory(model));
        return { model, result, latency_ms: Date.now() - started, attempts };
      } catch (err) {
        lastErr = err;
        const isLastAttempt = i === attemptsPerModel - 1;
        if (!isLastAttempt) {
          await sleep(backoffMs * (i + 1));
        }
      }
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
function getOriginModel(env, origin) {
  if (origin === "sdxl") return (env.ORIGIN_MODEL_SDXL || "@cf/stabilityai/stable-diffusion-xl-base-1.0").trim();
  if (origin === "phoenix") return (env.ORIGIN_MODEL_PHOENIX || "@cf/leonardo/phoenix-1.0").trim();
  if (origin === "flux") return (env.ORIGIN_MODEL_FLUX || "@cf/black-forest-labs/flux-1-schnell").trim();
  return (env.ORIGIN_MODEL_DREAMSHAPER || "@cf/lykon/dreamshaper-8-lcm").trim();
}
__name(getOriginModel, "getOriginModel");
function parseOrigin(value) {
  const v = String(value || "").trim().toLowerCase();
  if (ORIGINS.includes(v)) return v;
  return null;
}
__name(parseOrigin, "parseOrigin");
function parseIntArray(value) {
  if (!Array.isArray(value)) return null;
  const arr = [];
  for (const item of value) {
    const n = Number(item);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    arr.push(n);
  }
  return arr;
}
__name(parseIntArray, "parseIntArray");
function parseGenerateRequest(body) {
  const origin = parseOrigin(body.origin || "sdxl");
  if (!origin) {
    return { ok: false, error: "origin must be one of: sdxl, phoenix, flux, dreamshaper" };
  }
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return { ok: false, error: "prompt is required and must contain at least 1 character" };
  }
  const width = toPositiveInt(body.width, 1024, 256, 2048);
  const height = toPositiveInt(body.height, 1024, 256, 2048);
  const numSteps = toPositiveInt(body.num_steps, 20, 1, 20);
  const strength = clampNumber(body.strength, 1, 0, 1);
  const guidance = clampNumber(body.guidance, 7.5, 0, 30);
  const image = parseIntArray(body.image);
  if (body.image !== void 0 && image === null) {
    return { ok: false, error: "image must be an integer array with values between 0 and 255" };
  }
  const mask = parseIntArray(body.mask);
  if (body.mask !== void 0 && mask === null) {
    return { ok: false, error: "mask must be an integer array with values between 0 and 255" };
  }
  const imageB64 = body.image_b64 !== void 0 ? String(body.image_b64 || "").trim() : "";
  if (body.image_b64 !== void 0 && !imageB64) {
    return { ok: false, error: "image_b64 was provided but empty" };
  }
  let seed;
  if (body.seed !== void 0 && body.seed !== null && String(body.seed).trim() !== "") {
    const parsedSeed = Number(body.seed);
    if (!Number.isInteger(parsedSeed)) {
      return { ok: false, error: "seed must be an integer" };
    }
    seed = parsedSeed;
  }
  const request = {
    origin,
    prompt,
    negative_prompt: body.negative_prompt !== void 0 ? String(body.negative_prompt || "") : void 0,
    width,
    height,
    num_steps: numSteps,
    strength,
    guidance,
    seed
  };
  if (image) request.image = image;
  if (imageB64) request.image_b64 = imageB64;
  if (mask) request.mask = mask;
  return { ok: true, value: request };
}
__name(parseGenerateRequest, "parseGenerateRequest");
function buildGeneratePayload(req) {
  const payload = {
    prompt: req.prompt,
    width: req.width,
    height: req.height,
    num_steps: req.num_steps,
    strength: req.strength,
    guidance: req.guidance
  };
  if (req.negative_prompt !== void 0) payload.negative_prompt = req.negative_prompt;
  if (req.seed !== void 0) payload.seed = req.seed;
  if (req.image) payload.image = req.image;
  if (req.image_b64) payload.image_b64 = req.image_b64;
  if (req.mask) payload.mask = req.mask;
  return payload;
}
__name(buildGeneratePayload, "buildGeneratePayload");
function uint8ArrayToPlainArray(bytes) {
  return Array.from(bytes);
}
__name(uint8ArrayToPlainArray, "uint8ArrayToPlainArray");
async function runOriginGenerate(env, req) {
  const model = getOriginModel(env, req.origin);
  const payload = buildGeneratePayload(req);
  const out = await runModelWithFallback(env.AI, [model], () => payload, {
    per_model_attempts: toPositiveInt(env.MODEL_RETRY_ATTEMPTS, 2, 1, 5),
    backoff_ms: toPositiveInt(env.MODEL_RETRY_BACKOFF_MS, 450, 50, 3e3)
  });
  if (out.result instanceof Uint8Array) {
    return { model: out.model, attempts: out.attempts, latency_ms: out.latency_ms, image_png_bytes: out.result };
  }
  if (out.result instanceof ArrayBuffer) {
    return { model: out.model, attempts: out.attempts, latency_ms: out.latency_ms, image_png_bytes: new Uint8Array(out.result) };
  }
  if (Array.isArray(out.result)) {
    const arr = parseIntArray(out.result) || [];
    return { model: out.model, attempts: out.attempts, latency_ms: out.latency_ms, image_png_bytes: Uint8Array.from(arr) };
  }
  throw new Error(`Image generation response was not binary for model ${out.model}`);
}
__name(runOriginGenerate, "runOriginGenerate");
async function analyzeMode(env, mode, imageBase64) {
  const image = decodeBase64Image(imageBase64);
  const promptFromMedia = await fetchPromptFromMedia(env, mode);
  const instruction = promptFromMedia || DEFAULT_PROMPTS[mode];
  const contractPrompt = buildContractPrompt(mode, instruction);
  const { model, result, latency_ms, attempts } = await runModelWithFallback(env.AI, getVisionModelChain(env), () => ({
    image: [...image],
    prompt: contractPrompt,
    max_tokens: toPositiveInt(env.VISION_MAX_TOKENS, 420, 64, 900)
  }), {
    per_model_attempts: toPositiveInt(env.MODEL_RETRY_ATTEMPTS, 2, 1, 5),
    backoff_ms: toPositiveInt(env.MODEL_RETRY_BACKOFF_MS, 450, 50, 3e3)
  });
  const rawText = extractText(result);
  const parsed = parseJsonObject(rawText);
  const analysis = sanitizeAnalysis(mode, parsed, rawText);
  return { model, latency_ms, attempts, analysis, raw_text: rawText };
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
function buildDeterministicSynth(cdp, acp, sip) {
  const parts = [];
  if (cdp.summary) parts.push(cdp.summary);
  if (acp.summary) parts.push(acp.summary);
  if (sip.summary) parts.push(sip.summary);
  const details = [
    ...cdp.observed_facts.slice(0, 3),
    ...acp.observed_facts.slice(0, 3),
    ...sip.observed_facts.slice(0, 3)
  ];
  if (details.length) {
    parts.push(`Key visible details: ${details.join(", ")}.`);
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined || "Grounded visual prompt: preserve only clearly observed subject, atmosphere, and style details.";
}
__name(buildDeterministicSynth, "buildDeterministicSynth");
async function probeModel(env, model, kind) {
  const started = Date.now();
  try {
    let result;
    if (kind === "vision") {
      const tiny = decodeBase64Image(TINY_PNG_BASE64);
      result = await env.AI.run(model, {
        image: [...tiny],
        prompt: "Return the word 'ok'.",
        max_tokens: 32
      });
    } else {
      result = await env.AI.run(model, {
        messages: [
          { role: "system", content: "Reply with one word: ok" },
          { role: "user", content: "ok?" }
        ],
        max_tokens: 16
      });
    }
    const text = extractText(result);
    return {
      model,
      kind,
      ok: true,
      latency_ms: Date.now() - started,
      details: text.slice(0, 120) || "no text extracted"
    };
  } catch (err) {
    return {
      model,
      kind,
      ok: false,
      latency_ms: Date.now() - started,
      details: String(err).slice(0, 260)
    };
  }
}
__name(probeModel, "probeModel");
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
        endpoints: [
          "/fusion/cdp",
          "/fusion/acp",
          "/fusion/sip",
          "/fusion/synth",
          "/fusion",
          "/analyze",
          "/diag/models",
          "/schema/generate",
          "/generate",
          "/fractal"
        ],
        modes: MODES
      }, corsHeaders);
    }
    if (request.method === "GET" && url.pathname === "/diag/models") {
      const visionModels = Array.from(new Set(getVisionModelChain(env)));
      const textModels = Array.from(new Set(getTextModelChain(env)));
      const started = Date.now();
      const probes = await Promise.all([
        ...visionModels.map((m) => probeModel(env, m, "vision")),
        ...textModels.map((m) => probeModel(env, m, "text"))
      ]);
      const summary = {
        ok: probes.every((p) => p.ok),
        total: probes.length,
        passed: probes.filter((p) => p.ok).length,
        failed: probes.filter((p) => !p.ok).length,
        elapsed_ms: Date.now() - started
      };
      return jsonResponse(200, { ok: summary.ok, summary, probes }, corsHeaders);
    }
    if (request.method === "GET" && url.pathname === "/schema/generate") {
      return jsonResponse(200, {
        ok: true,
        schema: {
          required: ["prompt"],
          fields: {
            origin: { type: "string", allowed: ORIGINS, default: "sdxl" },
            prompt: { type: "string", min_length: 1, description: "A text description of the image you want to generate" },
            negative_prompt: { type: "string", description: "Text describing elements to avoid in the generated image" },
            height: { type: "integer", min: 256, max: 2048, default: 1024 },
            width: { type: "integer", min: 256, max: 2048, default: 1024 },
            image: { type: "int_array", items: "0-255", description: "img2img input bytes array" },
            image_b64: { type: "string", description: "base64 encoded input image for img2img" },
            mask: { type: "int_array", items: "0-255", description: "mask bytes for inpainting" },
            num_steps: { type: "integer", default: 20, min: 1, max: 20 },
            strength: { type: "number", min: 0, max: 1, default: 1 },
            guidance: { type: "number", min: 0, max: 30, default: 7.5 },
            seed: { type: "integer", description: "Random seed for reproducibility" }
          }
        },
        notes: [
          "If image/image_b64 are omitted the request is treated as text-to-image.",
          "If image/image_b64 are present the request is treated as img2img by supported models.",
          "For fractal endpoint, image or image_b64 is required."
        ]
      }, corsHeaders);
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "Method Not Allowed" }, corsHeaders);
    }
    const body = await request.json().catch(() => ({}));
    const modeFromRoute = routeMode(url.pathname);
    const modeFromBody = String(body.mode || "").toLowerCase() || "";
    const mode = modeFromRoute || (MODES.includes(modeFromBody) ? modeFromBody : null);
    if (url.pathname === "/generate" || url.pathname === "/origin/generate") {
      const parsed = parseGenerateRequest(body);
      if (!parsed.ok) {
        return jsonResponse(400, { ok: false, error: parsed.error }, corsHeaders);
      }
      try {
        const out = await runOriginGenerate(env, parsed.value);
        return jsonResponse(200, {
          ok: true,
          origin: parsed.value.origin,
          model_used: out.model,
          attempts: out.attempts,
          latency_ms: out.latency_ms,
          width: parsed.value.width,
          height: parsed.value.height,
          image: uint8ArrayToPlainArray(out.image_png_bytes)
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, corsHeaders);
      }
    }
    if (url.pathname === "/fractal" || url.pathname === "/fractal/generate") {
      const parsed = parseGenerateRequest(body);
      if (!parsed.ok) {
        return jsonResponse(400, { ok: false, error: parsed.error }, corsHeaders);
      }
      const baseReq = parsed.value;
      if (!baseReq.image && !baseReq.image_b64) {
        return jsonResponse(400, { ok: false, error: "fractal requires image or image_b64 (img2img only)" }, corsHeaders);
      }
      const iterations = toPositiveInt(body.iterations, 2, 1, 8);
      const modelA = (env.FRACTAL_MODEL_A || "@cf/lykon/dreamshaper-8-lcm").trim();
      const modelB = (env.FRACTAL_MODEL_B || "@cf/stabilityai/stable-diffusion-xl-base-1.0").trim();
      const alternator = [modelA, modelB];
      try {
        const trace = [];
        let workingReq = { ...baseReq };
        let finalImage = new Uint8Array();
        for (let i = 0; i < iterations; i++) {
          const model = alternator[i % alternator.length];
          const payload = buildGeneratePayload(workingReq);
          const out = await runModelWithFallback(env.AI, [model], () => payload, {
            per_model_attempts: toPositiveInt(env.MODEL_RETRY_ATTEMPTS, 2, 1, 5),
            backoff_ms: toPositiveInt(env.MODEL_RETRY_BACKOFF_MS, 450, 50, 3e3)
          });
          let imageBytes;
          if (out.result instanceof Uint8Array) {
            imageBytes = out.result;
          } else if (out.result instanceof ArrayBuffer) {
            imageBytes = new Uint8Array(out.result);
          } else if (Array.isArray(out.result)) {
            imageBytes = Uint8Array.from(parseIntArray(out.result) || []);
          } else {
            throw new Error(`Fractal iteration ${i + 1} returned non-binary output`);
          }
          finalImage = imageBytes;
          trace.push({
            iteration: i + 1,
            model_used: out.model,
            attempts: out.attempts,
            latency_ms: out.latency_ms,
            output_bytes: imageBytes.length
          });
          workingReq = {
            ...workingReq,
            image: uint8ArrayToPlainArray(imageBytes),
            image_b64: void 0
          };
        }
        return jsonResponse(200, {
          ok: true,
          mode: "fractal",
          iterations,
          models: { a: modelA, b: modelB },
          trace,
          image: uint8ArrayToPlainArray(finalImage)
        }, corsHeaders);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, corsHeaders);
      }
    }
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
          latency_ms: out.latency_ms,
          attempts: out.attempts,
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
        const { model, result, latency_ms, attempts } = await runModelWithFallback(env.AI, getTextModelChain(env), () => ({
          messages: [
            { role: "system", content: "Strict grounded synthesis only." },
            { role: "user", content: prompt }
          ],
          max_tokens: toPositiveInt(env.TEXT_MAX_TOKENS, 280, 64, 700)
        }), {
          per_model_attempts: toPositiveInt(env.MODEL_RETRY_ATTEMPTS, 2, 1, 5),
          backoff_ms: toPositiveInt(env.MODEL_RETRY_BACKOFF_MS, 450, 50, 3e3)
        });
        const rawText = extractText(result);
        const parsed = parseJsonObject(rawText);
        const synth = extractSynth(parsed, rawText);
        const synthText = synth.synth.trim() ? synth.synth : buildDeterministicSynth(cdp, acp, sip);
        return jsonResponse(200, {
          ok: true,
          model_used: model,
          latency_ms,
          attempts,
          synth: synthText,
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
        const { model: synthModel, result, latency_ms: synthLatencyMs, attempts: synthAttempts } = await runModelWithFallback(env.AI, getTextModelChain(env), () => ({
          messages: [
            { role: "system", content: "Strict grounded synthesis only." },
            { role: "user", content: synthPrompt }
          ],
          max_tokens: toPositiveInt(env.TEXT_MAX_TOKENS, 280, 64, 700)
        }), {
          per_model_attempts: toPositiveInt(env.MODEL_RETRY_ATTEMPTS, 2, 1, 5),
          backoff_ms: toPositiveInt(env.MODEL_RETRY_BACKOFF_MS, 450, 50, 3e3)
        });
        const synthRaw = extractText(result);
        const synth = extractSynth(parseJsonObject(synthRaw), synthRaw);
        const synthText = synth.synth.trim() ? synth.synth : buildDeterministicSynth(cdpOut.analysis, acpOut.analysis, sipOut.analysis);
        return jsonResponse(200, {
          ok: true,
          cdp: cdpOut.analysis,
          acp: acpOut.analysis,
          sip: sipOut.analysis,
          synth: synthText,
          guardrails: synth.guardrails,
          synth_metrics: {
            latency_ms: synthLatencyMs,
            attempts: synthAttempts
          },
          analysis_metrics: {
            cdp: { latency_ms: cdpOut.latency_ms, attempts: cdpOut.attempts },
            acp: { latency_ms: acpOut.latency_ms, attempts: acpOut.attempts },
            sip: { latency_ms: sipOut.latency_ms, attempts: sipOut.attempts }
          },
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

// .wrangler/tmp/bundle-GEZ4dC/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-GEZ4dC/middleware-loader.entry.ts
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
