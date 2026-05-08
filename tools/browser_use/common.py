from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from browser_use import Agent, Browser
from browser_use.llm.openai.chat import ChatOpenAI

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
TRANSCRIPT_DIR = WORKSPACE_ROOT / "tracing" / "browser-use"

DEFAULT_WORKER_URL = "https://zero.csirico9.workers.dev"
DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash"
DEFAULT_SMOKE_TASK = (
    "Go to https://news.ycombinator.com, read the title of the first story link on the page, "
    "and finish with only that title."
)


def parse_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def resolve_worker_url(explicit: str | None = None) -> str:
    candidate = explicit or os.getenv("CF_WORKER_URL") or DEFAULT_WORKER_URL
    return candidate.rstrip("/")


def resolve_model(explicit: str | None = None) -> str:
    candidate = explicit or os.getenv("CF_BROWSER_USE_MODEL") or DEFAULT_MODEL
    return candidate.strip()


def resolve_api_key(explicit: str | None = None) -> str:
    return (
        explicit
        or os.getenv("CF_WORKER_API_KEY")
        or os.getenv("CLOUDFLARE_WORKER_API_KEY")
        or os.getenv("CLOUDFLARE_API_TOKEN")
        or "local-dev-key"
    )


def resolve_vision_mode(explicit: str | None = None) -> bool | str:
    candidate = (explicit or os.getenv("BROWSER_USE_VISION") or "auto").strip().lower()
    if candidate in {"true", "1", "yes", "on"}:
        return True
    if candidate in {"false", "0", "no", "off"}:
        return False
    return "auto"


def make_transcript_path(prefix: str) -> Path:
    TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return TRANSCRIPT_DIR / f"{prefix}-{timestamp}.json"


def build_worker_headers(api_key: str, mock_ai: bool) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if mock_ai:
        headers["X-Debug-Mock-AI"] = "1"
    return headers


def build_session_headers(session_id: str | None, session_ttl_seconds: int | None) -> dict[str, str]:
    headers: dict[str, str] = {}
    if session_id:
        headers["X-Session-Id"] = session_id
    if session_ttl_seconds:
        headers["X-Session-TTL-Seconds"] = str(session_ttl_seconds)
    return headers


def build_llm(
    worker_url: str,
    model: str,
    api_key: str,
    mock_ai: bool,
    timeout_seconds: int,
    session_id: str | None = None,
    session_ttl_seconds: int | None = None,
) -> ChatOpenAI:
    default_headers = {}
    if mock_ai:
        default_headers["X-Debug-Mock-AI"] = "1"
    default_headers.update(build_session_headers(session_id, session_ttl_seconds))

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=f"{worker_url}/v1",
        temperature=0.0,
        max_retries=2,
        timeout=timeout_seconds,
        default_headers=default_headers or None,
    )


def build_browser(headless: bool) -> Browser:
    return Browser(
        headless=headless,
        wait_between_actions=1.0,
        minimum_wait_page_load_time=1.0,
        wait_for_network_idle_page_load_time=1.25,
    )


def extract_chat_message(payload: dict[str, Any]) -> tuple[Any, Any, Any]:
    choices = payload.get("choices", [])
    if not isinstance(choices, list) or not choices:
        return None, None, None

    choice = choices[0] if isinstance(choices[0], dict) else {}
    message = choice.get("message", {}) if isinstance(choice, dict) else {}
    if not isinstance(message, dict):
        return None, None, None

    content = message.get("content")
    reasoning = message.get("reasoning_content") or message.get("reasoning")
    tool_calls = message.get("tool_calls")
    return content, reasoning, tool_calls


def preflight_worker(
    worker_url: str,
    model: str,
    api_key: str,
    mock_ai: bool,
    timeout_seconds: int = 30,
    session_id: str | None = None,
    session_ttl_seconds: int | None = None,
) -> None:
    headers = build_worker_headers(api_key, mock_ai)
    headers.update(build_session_headers(session_id, session_ttl_seconds))

    with httpx.Client(timeout=timeout_seconds, headers=headers) as client:
        health_response = client.get(f"{worker_url}/health")
        health_response.raise_for_status()
        health_payload = health_response.json()
        if not health_payload.get("ok"):
            raise RuntimeError(f"Worker health check failed: {health_payload}")

        models_response = client.get(f"{worker_url}/v1/models")
        models_response.raise_for_status()
        models_payload = models_response.json()
        available_models = {
            item.get("id")
            for item in models_payload.get("data", [])
            if isinstance(item, dict) and item.get("id")
        }
        if available_models and model not in available_models:
            print(
                f"[preflight] warning: requested model '{model}' is not listed by /v1/models. "
                "Continuing anyway."
            )

        structured_body = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Return strict JSON matching the provided schema."},
                {"role": "user", "content": "Confirm that the worker is ready."},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "worker_preflight",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "ok": {"type": "boolean"},
                            "status": {"type": "string"},
                        },
                        "required": ["ok", "status"],
                    },
                },
            },
            "max_completion_tokens": 120,
            "temperature": 0,
        }

        structured_response = client.post(
            f"{worker_url}/v1/chat/completions",
            content=json.dumps(structured_body),
        )
        structured_response.raise_for_status()
        completion_payload = structured_response.json()

        content, reasoning, tool_calls = extract_chat_message(completion_payload)
        if isinstance(content, str):
            parsed = json.loads(content)
            if "ok" in parsed and "status" in parsed:
                return

            raise RuntimeError(
                f"Structured output preflight returned unexpected JSON: {parsed!r}"
            )

        plain_probe_body = {
            "model": model,
            "messages": [
                {"role": "system", "content": "Reply with a short readiness confirmation."},
                {"role": "user", "content": "Are you ready?"},
            ],
            "max_completion_tokens": 64,
            "temperature": 0,
        }
        plain_probe_response = client.post(
            f"{worker_url}/v1/chat/completions",
            content=json.dumps(plain_probe_body),
        )
        plain_probe_response.raise_for_status()
        plain_probe_payload = plain_probe_response.json()
        plain_content, plain_reasoning, plain_tool_calls = extract_chat_message(plain_probe_payload)

        if isinstance(plain_content, str) and plain_content.strip():
            print("[preflight] warning: structured probe failed; continuing after plain chat probe succeeded.")
            return

        if plain_reasoning or plain_tool_calls or reasoning or tool_calls:
            print(
                "[preflight] warning: structured probe returned no assistant content; "
                "continuing because the worker responded to chat completions."
            )
            return

        raise RuntimeError(
            "Worker chat preflight failed: chat completions returned no assistant content. "
            f"Structured payload: {completion_payload!r} Plain payload: {plain_probe_payload!r}"
        )


async def run_browser_task(
    task: str,
    worker_url: str,
    model: str,
    api_key: str,
    headless: bool,
    vision_mode: bool | str,
    mock_ai: bool,
    max_steps: int,
    timeout_seconds: int,
    transcript_prefix: str,
    session_id: str | None = None,
    session_ttl_seconds: int | None = None,
) -> dict[str, Any]:
    transcript_path = make_transcript_path(transcript_prefix)
    llm = build_llm(
        worker_url,
        model,
        api_key,
        mock_ai,
        timeout_seconds,
        session_id=session_id,
        session_ttl_seconds=session_ttl_seconds,
    )
    browser = build_browser(headless=headless)
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        use_vision=vision_mode,
        max_failures=3,
        max_actions_per_step=4,
        save_conversation_path=str(transcript_path),
        extend_system_message=(
            "You are running browser automation. "
            "Only describe what you directly observed in the current browser state. "
            "If you type into a field that should submit, press Enter or click the submit control. "
            "Do not repeat the same failed action twice. "
            "If the page state does not change, choose a different action."
        ),
        planning_replan_on_stall=2,
        loop_detection_enabled=True,
        final_response_after_failure=True,
        llm_timeout=timeout_seconds,
    )

    try:
        history = await agent.run(max_steps=max_steps)
        try:
            final_result = history.final_result()
        except Exception:
            final_result = None

        if not final_result:
            final_result = str(history[-1]) if history else ""

        return {
            "final_result": final_result,
            "transcript_path": str(transcript_path),
            "session_id": session_id,
        }
    finally:
        await agent.close()
