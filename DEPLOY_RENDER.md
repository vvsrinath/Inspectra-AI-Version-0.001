# Deploy backend on Render

Use your service: [Render Dashboard](https://dashboard.render.com/web/srv-d868gobbc2fs73ffkp5g)

## Manual settings (if not using Blueprint)

| Setting | Value |
|---------|--------|
| **Repository** | `vvsrinath/Inspectra-AI-Version-0.001` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/` |

## Environment variables

| Key | Value |
|-----|--------|
| `PYTHON_VERSION` | `3.11.9` |
| `ALLOWED_ORIGIN_REGEX` | `https://.*\.vercel\.app` |
| `ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` (optional, your exact Vercel URL) |

## After deploy

1. Copy the public URL, e.g. `https://inspectra-api.onrender.com`
2. Test: open `https://YOUR-SERVICE.onrender.com/` — should return `{"status":"ok",...}`
3. On **Vercel**, set `INSPECTRA_API_URL` to that URL (no trailing slash)
4. Redeploy Vercel frontend

## Free tier note

First request after idle may take 30–60 seconds (cold start). Retry if health check fails once.
