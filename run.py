"""Start the ResearchPilot API and web frontend with a single command (local development).

    python run.py                  # both
    python run.py --backend-only
    python run.py --frontend-only

Only the standard library is used here. The API runs as a subprocess inside
`backend/` through `uv run`, so it always uses the backend's virtualenv and
`app` is importable without any PYTHONPATH tweaks.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
WEB_DIR = ROOT / "frontend"
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = int(os.environ.get("API_PORT", "8000"))
FRONTEND_PORT = int(os.environ.get("WEB_PORT", "3000"))


def _require(tool: str, hint: str) -> str:
    path = shutil.which(tool)
    if not path:
        sys.exit(f"`{tool}` was not found on PATH. {hint}")
    return path


def _stop(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def start_backend(reload: bool) -> subprocess.Popen[bytes]:
    uv = _require("uv", "Install it from https://docs.astral.sh/uv/.")
    command = [
        uv, "run", "uvicorn", "app.main:app",
        "--host", BACKEND_HOST,
        "--port", str(BACKEND_PORT),
    ]  # fmt: skip
    if reload:
        command += ["--reload", "--reload-dir", "app"]
    return subprocess.Popen(command, cwd=BACKEND_DIR)


def start_frontend() -> subprocess.Popen[bytes]:
    npm = _require("npm", "Install Node.js 20.9+ from https://nodejs.org/.")
    if not (WEB_DIR / "node_modules").exists():
        print("Installing web dependencies (npm install)...")
        subprocess.run([npm, "install"], cwd=WEB_DIR, check=True)
    env = os.environ.copy()
    env.setdefault("NEXT_PUBLIC_API_URL", f"http://localhost:{BACKEND_PORT}")
    return subprocess.Popen([npm, "run", "dev", "--", "-p", str(FRONTEND_PORT)], cwd=WEB_DIR, env=env)


def main() -> None:
    parser = argparse.ArgumentParser(description="Start the ResearchPilot app.")
    parser.add_argument("--backend-only", action="store_true", help="Only start the API.")
    parser.add_argument("--frontend-only", action="store_true", help="Only start the web UI.")
    parser.add_argument("--no-reload", action="store_true", help="Disable backend auto-reload.")
    args = parser.parse_args()

    if args.backend_only and args.frontend_only:
        parser.error("--backend-only and --frontend-only cannot be combined")

    print("ResearchPilot")
    if not args.frontend_only:
        print(f"  API:      http://localhost:{BACKEND_PORT}")
        print(f"  Docs:     http://localhost:{BACKEND_PORT}/docs")
    if not args.backend_only:
        print(f"  Web UI:   http://localhost:{FRONTEND_PORT}")
    print("Press Ctrl+C to stop.\n")

    processes: list[subprocess.Popen[bytes]] = []
    exit_code = 0
    try:
        if not args.frontend_only:
            processes.append(start_backend(reload=not args.no_reload))
        if not args.backend_only:
            processes.append(start_frontend())

        # Stop everything as soon as either process exits.
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        exit_code = next((p.returncode for p in processes if p.returncode), 0)
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes:
            _stop(process)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
