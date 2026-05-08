# Apprentice Worker

Unified analysis worker that preserves endpoint separation:

- `POST /fusion/cdp` (or `/cdp`)
- `POST /fusion/acp` (or `/acp`)
- `POST /fusion/sip` (or `/sip`)
- `POST /fusion/synth` (or `/synth`)
- `POST /fusion`
- `POST /analyze` with `{ mode: "cdp" | "acp" | "sip" }`
- `POST /generate` (origin-based image generation)
- `POST /origin/generate` (alias)
- `POST /fractal` (alternating img2img chain)
- `GET /schema/generate` (full parameter schema)
- `GET /diag/models`
- `GET /health`

## Design Goals

- Keep your multi-step generative process intact.
- Enforce anti-confirmation-bias output contract.
- Add hard drift limits via JSON schema and sanitization.
- Support prompt ingestion from prompts-media worker.
- Keep model choices configurable by env vars.

## Request Payloads

Analysis endpoints:

```json
{
  "image_base64": "data:image/png;base64,..."
}
```

Synthesis endpoint:

```json
{
  "cdp": { "summary": "...", "observed_facts": ["..."] },
  "acp": { "summary": "...", "observed_facts": ["..."] },
  "sip": { "summary": "...", "observed_facts": ["..."] }
}
```

Generation endpoint (`/generate`) accepts:

```json
{
  "origin": "sdxl",
  "prompt": "required",
  "negative_prompt": "optional",
  "height": 1024,
  "width": 1024,
  "image": [0, 255],
  "image_b64": "base64-encoded-image",
  "mask": [0, 255],
  "num_steps": 20,
  "strength": 1,
  "guidance": 7.5,
  "seed": 12345
}
```

Fractal endpoint (`/fractal`) accepts all generation fields plus:

```json
{
  "iterations": 2
}
```

Notes:
- `prompt` is required (min 1 char).
- `width`/`height` are clamped to `256..2048`.
- `num_steps` is clamped to `1..20`.
- `strength` is clamped to `0..1`.
- `image` and `mask` must be integer arrays with values `0..255`.
- Fractal is img2img-only (`image` or `image_b64` required).

## Environment

- `AUTH_KEY` (secret recommended)
- `PROMPTS_MEDIA_BASE` (ex: `https://prompts-media.<subdomain>.workers.dev`)
- `PROMPTS_MEDIA_PATH_TEMPLATE` (default: `/prompts/{mode}`)
- `VISION_MODEL_PRIMARY` (default: `@cf/meta/llama-3.2-11b-vision-instruct`)
- `VISION_MODEL_FALLBACK` (default: `@cf/llava-hf/llava-1.5-7b-hf`)
- `TEXT_MODEL_PRIMARY` (default: `@cf/qwen/qwen3-30b-a3b-fp8`)
- `TEXT_MODEL_FALLBACK` (default: `@cf/mistral/mistral-7b-instruct-v0.2-lora`)
- `ALLOW_ORIGINS` comma-separated
- `ORIGIN_MODEL_SDXL`
- `ORIGIN_MODEL_PHOENIX`
- `ORIGIN_MODEL_FLUX`
- `ORIGIN_MODEL_DREAMSHAPER`
- `FRACTAL_MODEL_A`
- `FRACTAL_MODEL_B`

## Local Dev

```bash
npm install
npm run dev
```

## Deploy

```bash
wrangler secret put AUTH_KEY
npm run deploy
```
