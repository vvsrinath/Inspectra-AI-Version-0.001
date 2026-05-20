# Deploy backend on Render

Use your service: [Render Dashboard](https://dashboard.render.com/web/srv-d868gobbc2fs73ffkp5g)

## Manual settings (if not using Blueprint)

**If build fails with `No such file or directory: requirements.txt`**, Render is using the **repo root** — use these commands:

| Setting | Value |
|---------|--------|
| **Repository** | `vvsrinath/Inspectra-AI-Version-0.001` |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* or `backend` — see below |
| **Runtime** | Python 3 |
| **Build Command** (repo root) | `pip install --upgrade pip && pip install -r backend/requirements.txt` |
| **Start Command** (repo root) | `bash start.sh` |
| **Build Command** (if Root = `backend`) | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** (if Root = `backend`) | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/` |
| **PYTHON_VERSION** | `3.11.9` (do not use 3.14 — OpenCV may fail) |

Root `requirements.txt` and `runtime.txt` are included for repo-root deploys.

**After commit `8a30288`:** even the default build command `pip install -r requirements.txt` works (root file includes `-r backend/requirements.txt`).

### Wrong start command (`gunicorn: command not found`)

If deploy log shows:

```text
Running 'gunicorn Inspectra-AI-Version-0.001.wsgi'
gunicorn: command not found
```

Render auto-detected the wrong stack. **Fix:** Settings → **Start Command** → set exactly:

```bash
bash start.sh
```

Or: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

Do **not** use `gunicorn Inspectra-AI-Version-0.001.wsgi` (invalid for this FastAPI app).

**Automatic fix (commit after `ba3f665`):** `pip install -r requirements.txt` also installs `deploy/render-shim`, which registers a `gunicorn` command that starts **uvicorn**. If Render still runs the auto `gunicorn …wsgi` line, deploy should work **without** changing Start Command — check logs for `"message":"gunicorn_shim_start"`.

**Set `PYTHON_VERSION` = `3.11.9`** in Render → Environment. Without it, Render may use Python 3.14 and OpenCV can fail.

## Environment variables

| Key | Value |
|-----|--------|
| `PYTHON_VERSION` | `3.11.9` |
| `ALLOWED_ORIGIN_REGEX` | `https://.*\.vercel\.app` |
| `ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` (optional, your exact Vercel URL) |

## After deploy

1. Copy the public URL, e.g. `https://inspectra-ai-version-0-001-3.onrender.com`
2. Test: open `https://YOUR-SERVICE.onrender.com/` — should return `{"status":"ok",...}`
3. On **Vercel**, set `INSPECTRA_API_URL` to that URL (no trailing slash)
4. Redeploy Vercel frontend

## Service suspended or 503

If you see **"Service Suspended"** on Render:

1. Open the service in [Render Dashboard](https://dashboard.render.com/web/srv-d868gobbc2fs73ffkp5g).
2. Click **Resume** / **Restore** (or create a **New Web Service** from the same repo).
3. Redeploy latest `main` after setting `PYTHON_VERSION=3.11.9`.

## Docker deploy (if Native Python build still fails)

1. Render → your service → **Settings** → change runtime to **Docker** (or create new Docker web service).
2. **Root Directory:** repo root (empty).
3. **Dockerfile path:** `Dockerfile` (at repo root).
4. Deploy — includes OpenCV system libraries (`libgl1`).

## Free tier note

First request after idle may take 30–60 seconds (cold start). Retry if health check fails once.
