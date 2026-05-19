# Deploy frontend + backend on Vercel (single project)

Both the **Next.js UI** and **FastAPI/Python API** deploy together from the `frontend/` folder.

## How it works

```
Browser → your-app.vercel.app
            ├── /              → Next.js pages
            └── /api/*         → Python serverless (FastAPI + OpenCV via Mangum)
```

At build time, `npm run prebuild` copies `backend/` into `frontend/api/_backend`.  
Vercel runs `api/index.py` as a serverless function (60s max, 3GB RAM).

## Vercel setup

1. Import [GitHub repo](https://github.com/vvsrinath/Inspectra-AI-Version-0.001)
2. **Root Directory:** `frontend`
3. Framework: **Next.js** (auto)
4. Environment variables (optional):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_VERCEL_API` | `1` (already in `vercel.json`) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

5. Deploy

## Verify

- Open `https://YOUR-APP.vercel.app` → sidebar **API online** (green)
- `https://YOUR-APP.vercel.app/api` → `{"status":"ok",...}`
- Run **Analyze** with one image

## Limits (important)

| Limit | Free / Hobby |
|-------|----------------|
| Function timeout | 60s max (set in `vercel.json`) |
| Bundle size | OpenCV is large — build may take several minutes |
| Cold start | First request after idle can be slow |

If the **build fails** (package too large), use **split deploy**: frontend on Vercel + backend on [Render](./DEPLOY_RENDER.md) with `INSPECTRA_API_URL`.

## Local development

Still use **`start.bat`** (separate backend on :8000).  
The UI uses `/api/proxy` locally, not Vercel `/api`.
