# AGENTS.md

## Cursor Cloud specific instructions

### Repository overview

APP FIFER is a monorepo (npm workspaces) for an AI-powered affiliate marketing content engine. Written primarily in Spanish. The four workspaces are:

| Workspace | Path | Tech | Purpose |
|---|---|---|---|
| fifer-landing | `/fifer-landing` | Next.js 14, Tailwind, TypeScript | Marketing landing page with TikTok OAuth |
| saas-fifer | `/saas-fifer` | Node.js + Python (FastAPI ecosystem) | Backend: affiliate APIs, AI service, scraping |
| fifer-ingestor | `/fifer-ingestor` | Node.js (Puppeteer, CSV) | ETL pipeline for affiliate product feeds |
| fifer-content | `/fifer-content` | Node.js (Gemini AI, ElevenLabs, FFmpeg) | AI content production: scripts, TTS, video |

Shared code lives in `/shared/` (JS Supabase client) and `/shared-libs/python/` (SQLAlchemy models/config).

### Running services

- **fifer-landing** (the only service with a UI): `npm run dev` from `/fifer-landing` — runs on port 3000. This is the primary service to verify the dev environment works.
- **saas-fifer ecosystem (Python)**: The FastAPI core-service at `/saas-fifer/ecosystem/core-service` requires PostgreSQL. Start Postgres via `docker compose -f saas-fifer/ecosystem/infra/docker-compose.yml up -d` first. Then run the core-service with `uvicorn app.main:app --reload` from the core-service directory.
- **fifer-content / fifer-ingestor**: These are script-based workspaces (no persistent server). They require external API keys (Supabase, Gemini, ElevenLabs, affiliate networks) to function.

### Lint / Build / Test

- **Lint**: `npx next lint` in `fifer-landing/`. No other workspaces have linting configured.
- **Build**: `npx next build` in `fifer-landing/`.
- **Tests**: No automated test suites exist. Root and workspace `package.json` test scripts are stubs (`echo "Error: no test specified"`).

### Key caveats

- No `.env` or `.env.example` files are committed. The required env vars are documented in `/saas-fifer/config/index.js`. The shared Supabase client at `/shared/supabase.js` will throw on import if `SUPABASE_URL` and a Supabase key are missing.
- The root `package.json` uses npm workspaces. Always run `npm install` from the repo root.
- `saas-fifer/package.json` and `fifer-ingestor/package.json` have no `name` field — they reference the same dependencies but are linked via workspaces.
- Python dependencies span three `requirements.txt` files: `saas-fifer/ecosystem/core-service/requirements.txt`, `saas-fifer/ecosystem/gateway/requirements.txt`, and `saas-fifer/gateway/requirements.txt`.
- FFmpeg is provided via the `ffmpeg-static` npm package (no system install needed).
