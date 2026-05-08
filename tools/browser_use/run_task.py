from __future__ import annotations

import argparse
import asyncio
import sys

from common import (
    parse_bool,
    preflight_worker,
    resolve_api_key,
    resolve_model,
    resolve_vision_mode,
    resolve_worker_url,
    run_browser_task,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run a Browser Use task against the Cloudflare worker.")
    parser.add_argument("--task", required=True, help="Natural-language browser task to run.")
    parser.add_argument("--worker-url", help="Cloudflare worker base URL.")
    parser.add_argument("--model", help="Workers AI model id to request through the worker.")
    parser.add_argument("--api-key", help="Worker API key. Falls back to env vars.")
    parser.add_argument("--headless", action="store_true", help="Run Chromium headless.")
    parser.add_argument("--vision", help="Vision mode: auto, true, or false.")
    parser.add_argument("--mock-ai", action="store_true", help="Send the worker mock-ai header.")
    parser.add_argument("--session-id", help="Optional session id persisted by zero.")
    parser.add_argument(
        "--session-ttl-seconds",
        type=int,
        help="Optional session retention window for zero.",
    )
    parser.add_argument("--max-steps", type=int, default=12, help="Maximum Browser Use steps.")
    parser.add_argument("--timeout", type=int, default=120, help="LLM timeout in seconds.")
    return parser


async def main_async() -> int:
    args = build_parser().parse_args()
    worker_url = resolve_worker_url(args.worker_url)
    model = resolve_model(args.model)
    api_key = resolve_api_key(args.api_key)
    mock_ai = parse_bool(args.mock_ai, False)
    vision_mode = resolve_vision_mode(args.vision)

    print(f"[preflight] worker={worker_url} model={model} mock_ai={mock_ai}")
    preflight_worker(
        worker_url=worker_url,
        model=model,
        api_key=api_key,
        mock_ai=mock_ai,
        timeout_seconds=args.timeout,
    )

    result = await run_browser_task(
        task=args.task,
        worker_url=worker_url,
        model=model,
        api_key=api_key,
        headless=args.headless,
        vision_mode=vision_mode,
        mock_ai=mock_ai,
        max_steps=args.max_steps,
        timeout_seconds=args.timeout,
        transcript_prefix="browser-use-task",
        session_id=args.session_id,
        session_ttl_seconds=args.session_ttl_seconds,
    )

    print("FINAL_RESULT:", result["final_result"])
    print("TRANSCRIPT_PATH:", result["transcript_path"])
    if result.get("session_id"):
        print("SESSION_ID:", result["session_id"])
    return 0


def main() -> None:
    try:
        raise SystemExit(asyncio.run(main_async()))
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
