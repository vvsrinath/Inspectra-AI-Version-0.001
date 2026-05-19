# Deploy frontend on Vercel (Render backend)

Use this when your **FastAPI backend is on Render** (recommended — OpenCV works reliably).

## 1. Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import [Inspectra-AI-Version-0.001](https://github.com/vvsrinath/Inspectra-AI-Version-0.001)
3. **Root Directory:** `frontend`
4. Framework: **Next.js** (auto-detected)

## 2. Environment variable (required)

| Name | Value | Example |
|------|--------|---------|
| `INSPECTRA_API_URL` | Your **Render** API URL, no trailing slash | `https://inspectra-api.onrender.com` |

Apply to **Production**, **Preview**, and **Development**.

**Do not** set `NEXT_PUBLIC_VERCEL_API=1` for this setup.

## 3. Deploy

Click **Deploy**. Build should complete in ~2–3 minutes (no Python/OpenCV on Vercel).

## 4. Verify

1. Open `https://YOUR-APP.vercel.app`
2. Sidebar shows **API online** (green)
3. **Analyze** — upload one image → results load
4. **Compare** — upload 2+ images → table appears

If API is offline:

- Confirm Render URL works: `https://YOUR-SERVICE.onrender.com/` → `{"status":"ok",...}`
- Confirm `INSPECTRA_API_URL` matches exactly (https, no trailing `/`)
- **Redeploy** Vercel after changing env vars

## How it works

```
Browser → your-app.vercel.app/api/proxy/*
       → Next.js rewrite (INSPECTRA_API_URL)
       → Render FastAPI
```

## Render CORS

Backend allows `https://*.vercel.app` by default. For a custom domain, add on Render:

| Key | Value |
|-----|--------|
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

---

## Optional: all-in-one on Vercel (UI + Python API)

Heavier build; may fail on free tier. Set `NEXT_PUBLIC_VERCEL_API=1` and see git history for `vercel.json` Python function config.

For most users: **Vercel frontend + Render backend** (this guide).
