# ResearchPilot

> A multi-agent research workflow that creates analyst personas, runs parallel web-grounded interviews, and synthesizes the results into a cited report.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-000000)](https://ui.shadcn.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-1C3C3C)](https://www.langchain.com/langgraph)
[![Groq](https://img.shields.io/badge/Groq-gpt--oss--120b-F55036)](https://groq.com/)
[![Tavily](https://img.shields.io/badge/Tavily-Web%20Search-0EA5E9)](https://www.tavily.com/)
[![uv](https://img.shields.io/badge/uv-Package%20Manager-DE5FE9)](https://docs.astral.sh/uv/)

---

## Overview

ResearchPilot turns a research question into a cited Markdown report:

1. **Generate analysts** — an LLM proposes a panel of expert personas for the topic.
2. **Human review** — the graph pauses so you can approve the panel or ask for changes.
3. **Run interviews** — one interview subgraph runs per analyst in parallel. Each one asks questions, searches the web with Tavily, and answers from retrieved context.
4. **Write sections** — every interview becomes a short report section with sources.
5. **Synthesize** — the sections are combined into an introduction, body, conclusion, and consolidated source list.

The repository now ships a complete application:

- **Backend** — FastAPI service that starts, pauses, resumes, and polls LangGraph jobs.
- **Frontend** — Next.js App Router UI with Tailwind CSS and shadcn/ui.
- **Graphs** — the original LangGraph workflows, reorganized and still usable in LangGraph Studio.

| Layer | Location | Responsibility |
|---|---|---|
| Web UI | `web/` | Topic form, analyst review, live progress, report rendering |
| HTTP API | `src/researchpilot/api/` | Job lifecycle, background execution, polling |
| Graphs | `src/researchpilot/graph/` | Analyst, interview, and end-to-end research workflows |
| Domain | `src/researchpilot/models.py`, `state.py` | Pydantic models and typed graph state |
| Prompts / LLM | `src/researchpilot/prompts.py`, `llm.py` | Prompt templates and lazily constructed chat model |

---

## Screenshot

### Full research graph

![LangGraph research workflow](<screenshots/Screenshot 2026-09-08 101749.png>)

The graph creates analyst personas, pauses for human feedback, fans out interview subgraphs, writes report sections, and assembles the final report.

---

## Architecture

```text
Next.js UI (web/)
    |
    |  HTTP / JSON
    v
FastAPI (src/researchpilot/api/)
    |
    v
ResearchService  ── background asyncio tasks + in-memory checkpointer
    |
    v
LangGraph research graph (src/researchpilot/graph/research.py)
    |
    +-- create_analysts
    +-- human_feedback          <- interrupt() pauses the graph
    +-- conduct_interview       <- Send() fan-out, one per analyst
    |     +-- ask_question
    |     +-- search_web        <- Tavily
    |     +-- answer_question
    |     +-- save_interview
    |     +-- write_section
    +-- write_report
    +-- write_introduction
    +-- write_conclusion
    +-- finalize_report
```

The API keeps the paused graph state in a LangGraph checkpointer keyed by `thread_id`. Starting research returns immediately; the frontend polls the job until it is awaiting feedback, running, completed, or failed.

### Registered LangGraph graphs

| Graph | Entry point | Purpose |
|---|---|---|
| `create_analysts` | `src/researchpilot/graph/analysts.py:graph` | Generate and review analyst personas |
| `answer_question` | `src/researchpilot/graph/interview.py:question_answer_graph` | Run a single interview |
| `deep_agent` | `src/researchpilot/graph/research.py:graph` | Run the full research and reporting workflow |

---

## Project Structure

```text
ResearchPilot/
├── main.py                       # Minimal launcher
├── langgraph.json                # LangGraph Studio graph registration
├── pyproject.toml
├── .env.example
├── src/
│   ├── researchpilot/
│   │   ├── __init__.py
│   │   ├── config.py             # Environment-driven settings
│   │   ├── llm.py                # Lazy ChatGroq factory
│   │   ├── models.py             # Analyst / Perspectives / SearchQuery
│   │   ├── prompts.py
│   │   ├── state.py              # TypedDict graph state
│   │   ├── graph/
│   │   │   ├── analysts.py       # Analyst-only graph
│   │   │   ├── interview.py      # Interview subgraph
│   │   │   ├── research.py       # Full research graph
│   │   │   ├── nodes.py
│   │   │   ├── edges.py
│   │   │   └── tools.py          # Tavily search node
│   │   └── api/
│   │       ├── app.py            # FastAPI app
│   │       ├── service.py        # Job service and checkpoint handling
│   │       └── schemas.py        # Request/response models
│   └── __init__.py
└── web/
    ├── app/                      # Next.js App Router
    ├── components/               # App components + shadcn/ui primitives
    ├── lib/                      # API client and utilities
    ├── components.json           # shadcn configuration
    └── package.json
```

---

## Getting Started

### Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.12+ | Required by `pyproject.toml` |
| `uv` | Python dependency and command runner |
| Node.js 20.9+ | Required by Next.js 16 |
| Groq API key | Chat model (`GROQ_API_KEY`) |
| Tavily API key | Web search (`TAVILY_API_KEY`) |

### 1. Configure environment variables

```bash
cp .env.example .env
```

Set at least:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. Run the backend

```bash
uv sync
uv run uvicorn researchpilot.api.app:app --reload --port 8000
```

- API: <http://localhost:8000>
- Interactive docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/health>

Alternatively, `uv run researchpilot-api` starts the same app with reload enabled.

### 3. Run the frontend

In a second terminal:

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>.

The frontend reads the backend URL from `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`). The backend allows `http://localhost:3000` and `http://127.0.0.1:3000` via CORS; override with `CORS_ORIGINS`.

### 4. (Optional) Inspect graphs in LangGraph Studio

```bash
uv run langgraph dev
```

The graph paths in `langgraph.json` point at the reorganized package modules.

---

## Using the App

1. Enter a research topic and choose the analyst count and interview depth.
2. Review the generated analyst panel. Add feedback to regenerate it, or approve it.
3. Watch interview sections complete in parallel.
4. Read, copy, or download the final Markdown report.

The active `thread_id` is stored in `localStorage`, so refreshing the page restores the current run while the backend process is alive.

---

## API Reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | API status and required-key check |
| `POST` | `/api/research` | Start a research job |
| `GET` | `/api/research/{thread_id}` | Poll job status, progress, and report |
| `POST` | `/api/research/{thread_id}/resume` | Approve or regenerate analysts |

Start a job:

```bash
curl -X POST http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "How autonomous AI agents are changing software engineering teams", "max_analysts": 3, "max_num_turns": 2}'
```

Approve the analyst panel:

```bash
curl -X POST http://localhost:8000/api/research/<thread_id>/resume \
  -H "Content-Type: application/json" \
  -d '{"feedback": null}'
```

Request a new panel:

```bash
curl -X POST http://localhost:8000/api/research/<thread_id>/resume \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Add a security researcher and focus more on regulation."}'
```

Job statuses: `queued`, `generating_analysts`, `awaiting_feedback`, `researching`, `completed`, `failed`.

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---:|---|
| `GROQ_API_KEY` | Yes | — | Authenticates the ChatGroq model |
| `TAVILY_API_KEY` | Yes | — | Authenticates Tavily web search |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Model id passed to ChatGroq |
| `GROQ_TEMPERATURE` | No | `0` | Sampling temperature |
| `TAVILY_MAX_RESULTS` | No | `3` | Results per web search |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://127.0.0.1:3000` | Allowed browser origins |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend URL used by the web app |

---

## Design Decisions

| Choice | Reason |
|---|---|
| Package layout under `src/researchpilot` | Imports work from any directory and match standard Python packaging |
| Lazy LLM and search construction | The app and graphs can be imported without API keys |
| `interrupt()` inside `human_feedback` | One pause mechanism works in Studio and through the API |
| Background jobs + polling | Long research runs do not hold HTTP requests open |
| Single `search_web` node | Removes the duplicate search nodes while keeping grounded answers |
| Checkpoint serializer allow-list | Pydantic analyst models round-trip explicitly instead of relying on implicit deserialization |
| shadcn/ui primitives in-repo | UI is editable and has no external component runtime |

---

## Limitations

- Jobs and checkpoints are stored in memory. Restarting the backend clears active research and the frontend will report the job as unavailable.
- The API is single-process and has no authentication. Do not expose it publicly without adding auth and a persistent checkpointer.
- Report quality depends on the topic and the quality of Tavily results. Verify sources before using output for business, academic, legal, medical, or financial decisions.

## Future Improvements

- Swap `InMemorySaver` for a SQLite or Postgres checkpointer to survive restarts.
- Stream graph events to the UI with Server-Sent Events instead of polling.
- Add automated tests for routing, the job state machine, and API contracts.
- Add per-job cancellation and usage/cost reporting.
- Add report history and export to PDF/DOCX.
