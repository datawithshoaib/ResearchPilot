# ResearchPilot

> Ask anything, get a cited research brief. ResearchPilot recruits a panel of AI analyst personas, has each one interview a web-grounded expert in parallel, and synthesizes the findings into a sourced Markdown report.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-1C3C3C)](https://www.langchain.com/langgraph)
[![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

---

## How it works

1. **Recruit a panel.** An LLM reads the topic and proposes distinct expert personas.
2. **Human checkpoint.** The graph pauses (`interrupt()`) so you can approve the panel or ask for changes.
3. **Parallel interviews.** One interview subgraph per analyst asks questions, searches the web with Tavily, and answers from the retrieved context.
4. **Synthesis.** The sections are merged into an introduction, insights, a conclusion, and a deduplicated source list.

While the interviews run, graph nodes emit progress events that the API streams to the browser over **Server-Sent Events**. The UI shows them on a live "research map" and in an activity feed.

## Repository layout

```text
ResearchPilot/
├── backend/                     FastAPI + LangGraph service  → deployed to Render
│   ├── app/
│   │   ├── main.py              FastAPI app factory (`app.main:app`)
│   │   ├── api/                 router, dependencies, routes (health, research)
│   │   ├── schemas/             HTTP request/response models
│   │   ├── services/            ResearchService (jobs, streaming, cancel, TTL), report store
│   │   ├── graph/               LangGraph: models, state, prompts, nodes, edges, tools, events
│   │   │   └── workflows/       compiled graphs: analysts, interview, research
│   │   └── core/                settings, Supabase token verification, LLM factory, logging
│   ├── tests/                   API tests against the real graph with a fake LLM
│   ├── Dockerfile               production image (uv, non-root, single worker)
│   ├── langgraph.json           LangGraph Studio registration
│   └── pyproject.toml / uv.lock
├── frontend/                    Next.js 16 App Router UI     → deployed to Vercel
│   ├── app/                     layout, page, /login, /auth/callback, global styles, icon
│   ├── proxy.ts                 refreshes the Supabase session, redirects signed-out visitors
│   ├── components/
│   │   ├── auth/                auth provider, login form (email + Google), user menu
│   │   ├── layout/              header, background, theme, providers
│   │   ├── landing/             hero, composer, how-it-works
│   │   ├── research/            review, mission control, constellation, report, history
│   │   └── ui/                  primitives (button, segmented, spotlight card…)
│   ├── hooks/                   useResearchJob (SSE + polling), useBackendHealth, …
│   └── lib/                     typed API client, Supabase clients, history, utils
├── supabase/migrations/         `reports` table + row level security
├── render.yaml                  Render Blueprint for the backend
├── run.py                       local helper: start backend + frontend together
└── .github/workflows/ci.yml     lint, type-check, test, build
```

## UI highlights

- An aurora background with a cursor spotlight, glass surfaces, and dark and light themes.
- A composer with a spinning glow border, a typewriter placeholder, sliding segmented controls, and a live cost estimate.
- Analyst cards that tilt in 3D, with gradient avatars that keep the same color everywhere a persona appears.
- **Mission control**: a live SVG constellation in which data packets fly to the core on every event, sources orbit each analyst as satellites, and progress rings fill up. It sits alongside a streaming activity feed with favicons and animated counters.
- A report view with a reading-progress bar, a scroll-spy table of contents, a confetti finish, a sources gallery, and copy, `.md` download, and print-to-PDF actions.
- Sign-in with email/password or Google (Supabase Auth), and a per-account report history that follows you across devices.
- Graceful handling of Render cold starts: a "waking server" state with automatic retries.
- Honors `prefers-reduced-motion`.

---

## Local development

**Prerequisites:** Python 3.12+, [uv](https://docs.astral.sh/uv/), Node.js 20.9+, a [Groq](https://console.groq.com/) API key, a [Tavily](https://tavily.com/) API key, and a [Supabase](https://supabase.com/) project (see [Authentication and history](#authentication-and-history)).

```bash
# 1. Backend
cd backend
cp .env.example .env          # add GROQ_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
uv sync
uv run uvicorn app.main:app --reload --port 8000   # or: uv run python -m app

# 2. Frontend (second terminal)
cd frontend
cp .env.local.example .env.local   # add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                   # http://localhost:3000
```

To start both at once from the repo root, run `python run.py` (add `--backend-only` or `--frontend-only` to start one). It only needs `uv` and `npm` on your PATH.

| Task | Command |
|---|---|
| Backend tests | `cd backend && uv run pytest` |
| Backend lint / format | `uv run ruff check . && uv run ruff format .` |
| Frontend lint / types / build | `cd frontend && npm run lint && npm run typecheck && npm run build` |
| LangGraph Studio | `cd backend && uv run langgraph dev` |
| API docs (dev only) | <http://localhost:8000/docs> |

---

## Authentication and history

Users sign in with **Supabase Auth**, using email and password or **Google**. Every research run belongs to the account that started it, and each finished report is saved to that user's history.

```text
browser ──(Supabase session)──▶ Supabase Auth
   │  Authorization: Bearer <access token>
   ▼
FastAPI ── verifies the JWT (JWKS, or HS256 secret on legacy projects)
   │       scopes every job to the token's user id
   └── on completion: inserts into public.reports (service-role key)

browser ──(anon key + session)──▶ public.reports   # RLS: read/delete own rows only
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com/).
2. **Create the table.** In the SQL editor, run [`supabase/migrations/20261108000000_create_reports.sql`](supabase/migrations/20261108000000_create_reports.sql), or run `supabase db push` if you use the Supabase CLI.
3. **Keys** (Project Settings → API):
   - Frontend: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon or publishable key).
   - Backend: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. This key is secret and must never reach the browser. If your project still signs tokens with the legacy JWT secret, also set `SUPABASE_JWT_SECRET`.
4. **URL configuration** (Authentication → URL Configuration): set **Site URL** to your app's URL and add `http://localhost:3000/auth/callback` and `https://<your-app>.vercel.app/auth/callback` to **Redirect URLs**.
5. **Google sign-in:**
   - In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** of type *Web application*.
   - Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
   - In Supabase → Authentication → Sign In / Providers → **Google**, enable the provider and paste the client ID and secret.
6. **Email sign-up** works out of the box. With "Confirm email" enabled (the default), new users must click the emailed link, which lands on `/auth/callback`.

---

## Deployment

Deploy the **backend first**, because the frontend needs its URL.

### Backend on Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. Render reads [`render.yaml`](render.yaml), which builds `backend/Dockerfile` and health-checks `/api/health`.
3. When prompted, set the secrets:
   - `GROQ_API_KEY`, `TAVILY_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and `SUPABASE_JWT_SECRET` only on legacy-secret projects)
   - `CORS_ORIGINS`: your Vercel URL, e.g. `https://researchpilot.vercel.app` (comma-separated for several; no trailing slash)
   - `CORS_ORIGIN_REGEX` (optional): to allow preview deploys, e.g. `https://researchpilot-[a-z0-9-]+\.vercel\.app`. Leave it empty otherwise.
4. Once the service is live, check `https://<your-service>.onrender.com/api/health`.

To set up the service by hand instead: create a Web Service, set the root directory to `backend`, the runtime to Docker, and the health check path to `/api/health`, then add the same environment variables.

> **Run exactly one instance and one worker.** Jobs and graph checkpoints live in process memory. On the free plan the service sleeps when idle; the UI shows "Waking server" and retries until it answers (about a minute).

### Frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the repo.
2. Set the **Root Directory** to `frontend`. The framework (Next.js) is detected automatically.
3. Add environment variables: `NEXT_PUBLIC_API_URL=https://<your-service>.onrender.com` (no trailing slash), `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. If your final Vercel domain differs from what you put in `CORS_ORIGINS`, update it on Render.

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy the frontend after changing them.

---

## API

Every `/api/research` endpoint requires `Authorization: Bearer <Supabase access token>`. The stream endpoint also accepts `?access_token=`, because `EventSource` cannot send headers. A job owned by another user returns `404`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Status, missing keys, model, active jobs |
| `POST` | `/api/research` | Start a job `{topic, max_analysts 1–6, max_num_turns 1–4}` |
| `GET` | `/api/research/{id}` | Full job snapshot (analysts, progress, activity, sources, report) |
| `GET` | `/api/research/{id}/stream` | SSE: a `job` event per change (activity is incremental), plus `end` |
| `POST` | `/api/research/{id}/resume` | `{feedback: null}` approves the panel; text regenerates it |
| `POST` | `/api/research/{id}/cancel` | Stop a run |

Statuses: `queued → generating_analysts → awaiting_feedback → researching → writing_report → completed`, or `failed` / `cancelled`.

## Configuration (backend)

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY`, `TAVILY_API_KEY` | none (required) | Provider credentials |
| `SUPABASE_URL` | none (required) | Project URL; the JWT issuer and JWKS are derived from it |
| `SUPABASE_SERVICE_ROLE_KEY` | none (required) | Writes finished reports to `public.reports` |
| `SUPABASE_JWT_SECRET` | unset | Only for projects on the legacy HS256 secret |
| `SUPABASE_REPORTS_TABLE` | `reports` | History table name |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Chat model |
| `GROQ_TEMPERATURE` | `0` | Sampling temperature |
| `GROQ_MAX_RETRIES` | `6` | Retries with `retry-after` back-off (helps with tokens-per-minute limits) |
| `TAVILY_MAX_RESULTS` | `3` | Results per search |
| `GRAPH_MAX_CONCURRENCY` | `3` | Max graph tasks in flight per job |
| `ENVIRONMENT` | `development` | `production` hides `/docs` and `/openapi.json` |
| `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` | localhost:3000 | Allowed browser origins |
| `MAX_ACTIVE_JOBS` | `4` | Concurrent running jobs before `429` |
| `JOB_TTL_MINUTES` | `180` | How long idle jobs are kept in memory |
| `LANGSMITH_*` | unset | Optional tracing |

## Limitations

- In-flight job state is in memory, so a restart or redeploy drops running jobs. Finished reports are safe in each user's Supabase history. For durability of running jobs, swap `InMemorySaver` for a Postgres checkpointer.
- Sign-in is required, but any account can still spend your Groq and Tavily credits; `MAX_ACTIVE_JOBS` caps concurrent runs, not per-user usage. Add per-user rate limits (or restrict sign-ups in Supabase) before sharing widely.
- On Groq's free tier, large panels at high depth can still hit tokens-per-minute limits. The API retries with back-off and reports a clear error if it still fails.
- Output is AI-generated. Verify sources before relying on it.
