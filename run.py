"""Start the ResearchPilot API and web frontend with a single command."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "src"
WEB_DIR = ROOT / "web"
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = int(os.environ.get("API_PORT", "8000"))
FRONTEND_PORT = int(os.environ.get("WEB_PORT", "3000"))


def _backend_env() -> dict[str, str]:
    env = os.environ.copy()
    pythonpath = env.get("PYTHONPATH")
    env["PYTHONPATH"] = str(SRC_DIR) + (os.pathsep + pythonpath if pythonpath else "")
    return env


def _frontend_env() -> dict[str, str]:
    env = os.environ.copy()
    if BACKEND_PORT != 8000 and "NEXT_PUBLIC_API_URL" not in env:
        env["NEXT_PUBLIC_API_URL"] = f"http://localhost:{BACKEND_PORT}"
    return env


def _npm() -> str:
    npm = shutil.which("npm")
    if npm:
        return npm
    return "npm.cmd" if os.name == "nt" else "npm"


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


def start_frontend() -> subprocess.Popen[bytes]:
    if not (WEB_DIR / "node_modules").exists():
        print("Installing web dependencies (npm install)...")
        subprocess.run([_npm(), "install"], cwd=WEB_DIR, check=True)
    return subprocess.Popen(
        [_npm(), "run", "dev", "--", "-p", str(FRONTEND_PORT)],
        cwd=WEB_DIR,
        env=_frontend_env(),
    )


def run_backend(reload: bool, frontend: subprocess.Popen[bytes] | None) -> None:
    os.environ.update(_backend_env())
    try:
        import uvicorn
    except ImportError:
        sys.exit("uvicorn is not installed. Run `uv sync` and then `uv run run.py`.")

    config = uvicorn.Config(
        "researchpilot.api.app:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=reload,
        reload_dirs=[str(SRC_DIR)] if reload else None,
        log_level="info",
    )
    server = uvicorn.Server(config)

    if frontend is not None:
        def watch() -> None:
            frontend.wait()
            server.should_exit = True

        threading.Thread(target=watch, daemon=True).start()

    server.run()


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

    frontend: subprocess.Popen[bytes] | None = None
    try:
        if not args.backend_only:
            frontend = start_frontend()

        if args.frontend_only:
            assert frontend is not None
            return_code = frontend.wait()
            sys.exit(return_code)

        run_backend(reload=not args.no_reload, frontend=frontend)
    except KeyboardInterrupt:
        pass
    finally:
        if frontend is not None:
            _stop(frontend)


if __name__ == "__main__":
    main()
