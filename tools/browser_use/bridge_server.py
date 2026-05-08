from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parents[1]
HOST = os.getenv("BROWSER_USE_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.getenv("BROWSER_USE_BRIDGE_PORT", "8788"))
DEFAULT_WORKER_URL = os.getenv("CF_WORKER_URL", "https://zero.csirico9.workers.dev")
DEFAULT_MODEL = os.getenv("CF_BROWSER_USE_MODEL", "@cf/zai-org/glm-4.7-flash")

SCRIPT_REGISTRY = {
    "browser_use_task": {
        "label": "Browser Use Task",
        "description": "Run an arbitrary Browser Use prompt against the Cloudflare worker.",
        "path": SCRIPT_DIR / "run_task.py",
        "default_prompt": "Open the current site, inspect the main UI, and summarize what action should happen next.",
    },
    "browser_use_smoke": {
        "label": "Browser Use Smoke",
        "description": "Run the smoke automation prompt or a custom override.",
        "path": SCRIPT_DIR / "smoke_task.py",
        "default_prompt": "Run the default Browser Use smoke task.",
    },
}

JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def set_job(job_id: str, updates: dict[str, Any]) -> None:
    with JOBS_LOCK:
        JOBS[job_id].update(updates)


def append_job_output(job_id: str, line: str) -> None:
    with JOBS_LOCK:
        output = JOBS[job_id].setdefault("output", [])
        output.append(line.rstrip())
        if len(output) > 250:
            del output[:-250]


def serialize_job(job_id: str) -> dict[str, Any]:
    with JOBS_LOCK:
        payload = dict(JOBS[job_id])
    payload["job_id"] = job_id
    return payload


def list_jobs() -> list[dict[str, Any]]:
    with JOBS_LOCK:
        items = [
            {"job_id": job_id, **job}
            for job_id, job in JOBS.items()
        ]
    return sorted(items, key=lambda item: item["started_at"], reverse=True)


def launch_job(payload: dict[str, Any]) -> dict[str, Any]:
    script_id = payload.get("script_id")
    if script_id not in SCRIPT_REGISTRY:
        raise ValueError(f"Unknown script_id '{script_id}'.")

    script_meta = SCRIPT_REGISTRY[script_id]
    prompt = str(payload.get("prompt") or "").strip()

    if script_id == "browser_use_task" and not prompt:
        raise ValueError("prompt is required for browser_use_task.")

    command = [sys.executable, "-u", str(script_meta["path"])]
    if prompt:
        command.extend(["--task", prompt])

    worker_url = str(payload.get("worker_url") or "").strip()
    model = str(payload.get("model") or "").strip()
    session_id = str(payload.get("session_id") or "").strip()
    session_ttl_seconds = payload.get("session_ttl_seconds")
    vision = str(payload.get("vision") or "").strip()
    max_steps = payload.get("max_steps")
    timeout = payload.get("timeout")

    if worker_url:
        command.extend(["--worker-url", worker_url])
    else:
        command.extend(["--worker-url", DEFAULT_WORKER_URL])
        worker_url = DEFAULT_WORKER_URL
    if model:
        command.extend(["--model", model])
    else:
        command.extend(["--model", DEFAULT_MODEL])
        model = DEFAULT_MODEL
    if vision:
        command.extend(["--vision", vision])
    if session_id:
        command.extend(["--session-id", session_id])
    if isinstance(session_ttl_seconds, int) and session_ttl_seconds > 0:
        command.extend(["--session-ttl-seconds", str(session_ttl_seconds)])
    if isinstance(max_steps, int) and max_steps > 0:
        command.extend(["--max-steps", str(max_steps)])
    if isinstance(timeout, int) and timeout > 0:
        command.extend(["--timeout", str(timeout)])
    if payload.get("headless") is True:
        command.append("--headless")
    if payload.get("mock_ai") is True:
        command.append("--mock-ai")

    env = os.environ.copy()
    api_key = str(payload.get("api_key") or "").strip()
    if api_key:
        env["CF_WORKER_API_KEY"] = api_key
    if worker_url:
        env["CF_WORKER_URL"] = worker_url
    if model:
        env["CF_BROWSER_USE_MODEL"] = model

    process = subprocess.Popen(
        command,
        cwd=str(WORKSPACE_ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    job_id = str(uuid.uuid4())
    with JOBS_LOCK:
        JOBS[job_id] = {
            "status": "running",
            "script_id": script_id,
            "prompt": prompt,
            "worker_url": worker_url,
            "model": model,
            "session_id": session_id or None,
            "session_ttl_seconds": session_ttl_seconds if isinstance(session_ttl_seconds, int) else None,
            "started_at": utc_now(),
            "finished_at": None,
            "exit_code": None,
            "output": [],
            "pid": process.pid,
            "final_result": None,
            "transcript_path": None,
        }

    thread = threading.Thread(
        target=monitor_process,
        args=(job_id, process),
        daemon=True,
    )
    thread.start()
    return serialize_job(job_id)


def monitor_process(job_id: str, process: subprocess.Popen[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        stripped = line.rstrip()
        if stripped.startswith("FINAL_RESULT:"):
            set_job(job_id, {"final_result": stripped.removeprefix("FINAL_RESULT:").strip()})
        elif stripped.startswith("TRANSCRIPT_PATH:"):
            set_job(job_id, {"transcript_path": stripped.removeprefix("TRANSCRIPT_PATH:").strip()})
        elif stripped.startswith("SESSION_ID:"):
            set_job(job_id, {"session_id": stripped.removeprefix("SESSION_ID:").strip()})
        append_job_output(job_id, line)

    exit_code = process.wait()
    set_job(
        job_id,
        {
            "status": "completed" if exit_code == 0 else "failed",
            "exit_code": exit_code,
            "finished_at": utc_now(),
        },
    )


class BridgeHandler(BaseHTTPRequestHandler):
    server_version = "NeurofoundryBrowserUseBridge/1.0"

    def do_OPTIONS(self) -> None:
        self.send_json(204, {})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "host": HOST,
                    "port": PORT,
                    "default_worker_url": DEFAULT_WORKER_URL,
                    "default_model": DEFAULT_MODEL,
                    "scripts": list(SCRIPT_REGISTRY.keys()),
                    "running_jobs": sum(1 for job in JOBS.values() if job["status"] == "running"),
                },
            )
            return

        if parsed.path == "/scripts":
            self.send_json(
                200,
                {
                    "data": [
                        {
                            "id": script_id,
                            "label": meta["label"],
                            "description": meta["description"],
                            "default_prompt": meta.get("default_prompt"),
                        }
                        for script_id, meta in SCRIPT_REGISTRY.items()
                    ]
                },
            )
            return

        if parsed.path == "/jobs":
            self.send_json(200, {"data": list_jobs()[:20]})
            return

        if parsed.path.startswith("/jobs/"):
            job_id = parsed.path.rsplit("/", 1)[-1]
            if job_id not in JOBS:
                self.send_json(404, {"error": f"Unknown job_id '{job_id}'."})
                return
            self.send_json(200, serialize_job(job_id))
            return

        self.send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path != "/run":
            self.send_json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length else b"{}"
            payload = json.loads(raw_body.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Request body must be a JSON object.")

            job = launch_job(payload)
            self.send_json(202, job)
        except Exception as error:
            self.send_json(400, {"error": str(error)})

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if status != 204:
            self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    print(f"Browser Use bridge listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
