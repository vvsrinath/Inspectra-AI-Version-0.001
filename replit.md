# Inspectra AI

Analyzes textile and cotton fabric images using classical computer vision (no AI/ML models). Produces lab-style metric reports, multi-sample batch comparison, and downloadable PDF/CSV exports. Each user gets a private browser workspace so reports are not mixed between visitors.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `VITE_API_URL` — Override for the FastAPI backend URL (defaults to `window.location.origin + /api`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + wouter routing
- API: Express 5 (scaffold only — main backend is a separate FastAPI Python service)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/inspectra/` — React + Vite frontend (preview at `/`)
- `artifacts/api-server/` — Express API scaffold
- `artifacts/inspectra/src/pages/` — Route pages (Home, Analyze, Compare, Dashboard, Result, Login)
- `artifacts/inspectra/src/components/` — AppShell, ProductChrome, LabReportTable, theme-provider
- `artifacts/inspectra/src/lib/` — api.ts (API calls), api-base.ts, workspace.ts, report-store.ts (IndexedDB)

## Architecture decisions

- Reports are stored in **IndexedDB on the user's device**, not a server database. Each user has a random workspace ID in a cookie.
- The frontend calls a **FastAPI Python backend** for analysis (set `VITE_API_URL`). The Express api-server is scaffold-only.
- **No AI/ML models used** — classical OpenCV + scikit-image pipelines only.
- `next/image` → `<img>`, `next/link` → wouter `<Link>`, `useRouter` → `useLocation`/`useParams`, `useParams` → wouter `useParams`.

## Product

- **Home** — Choose single-sample Analyze or multi-sample Compare.
- **Analyze** — Upload a fabric image → sends to FastAPI `/analyze-material` → redirects to Results.
- **Compare** — Upload 2–10 images → sends to FastAPI `/compare-batch` → shows comparison table + download buttons.
- **Dashboard** — Lists all reports saved in IndexedDB for this workspace.
- **Results** — Shows lab report with metrics table, findings, download PDF/CSV buttons.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- API calls go to `VITE_API_URL` (env var). Without it, the app shows "API offline" in the sidebar — this is expected in dev until a backend URL is configured.
- The `next-themes` package is used for dark/light mode (same as original).
- Report data uses `sessionStorage` for the just-analyzed result and IndexedDB for persisted history.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
