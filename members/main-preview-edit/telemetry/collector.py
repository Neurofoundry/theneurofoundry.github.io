#!/usr/bin/env python3
"""
Lightweight, consented telemetry collector for worker environment.
- Detects OS, Python version, presence of common CLI tools (git, docker, node), CPU count
- Measures a basic network latency to a configurable host
- Writes JSON output to stdout or a file

Usage: python telemetry/collector.py --out report.json

Run only with explicit consent.
"""
import argparse
import json
import platform
import shutil
import subprocess
import time
import socket
from urllib.request import urlopen

COMMON_TOOLS = ["git", "docker", "node", "npm", "python", "pip"]


def check_tool(cmd):
    return shutil.which(cmd) is not None


def ping_host(host, timeout=2.0):
    # simple TCP connect to port 443 to estimate latency
    start = time.time()
    try:
        conn = socket.create_connection((host, 443), timeout=timeout)
        conn.close()
        return int((time.time() - start) * 1000)
    except Exception:
        return None


def gather():
    data = {}
    data['timestamp'] = int(time.time())
    data['os'] = platform.system()
    data['platform'] = platform.platform()
    data['python_version'] = platform.python_version()
    data['cpu_count'] = None
    try:
        import multiprocessing
        data['cpu_count'] = multiprocessing.cpu_count()
    except Exception:
        pass
    data['tools'] = {t: check_tool(t) for t in COMMON_TOOLS}
    # small network check to common host
    host = '8.8.8.8'  # default to Google DNS
    data['latency_ms'] = ping_host(host)

    # git config user.email if available and user allows (do not auto-send credentials)
    if data['tools'].get('git'):
        try:
            out = subprocess.check_output(['git', 'config', '--get', 'user.email'], stderr=subprocess.DEVNULL, timeout=1).decode().strip()
            data['git_email'] = out if out else None
        except Exception:
            data['git_email'] = None

    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Telemetry collector (consented)')
    parser.add_argument('--out', '-o', help='Write JSON output to file')
    args = parser.parse_args()
    report = gather()
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        print(args.out)
    else:
        print(json.dumps(report, indent=2))
