# Keep-alive cron (free tier sleep)

Hosts like **Render**, **Zeabur**, and similar **free** plans **sleep** after ~15 minutes with no traffic. A **cron job** that hits your URLs every few minutes can keep them warm (for demos and light use).

This repo includes a **GitHub Actions** workflow: [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml).

## Setup (GitHub Actions — recommended)

1. Deploy your app (Vercel, Render, Zeabur, etc.).
2. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**
3. Add one or both:

| Secret | Example |
|--------|---------|
| `KEEP_ALIVE_FRONTEND_URL` | `https://your-app.vercel.app` |
| `KEEP_ALIVE_API_URL` | `https://your-api.onrender.com/` or `https://your-app.vercel.app/api` |

4. The workflow runs **every 14 minutes** and sends a `GET` request.
5. Run manually anytime: **Actions → Keep alive → Run workflow**.

### URL examples

| Deploy style | `KEEP_ALIVE_FRONTEND_URL` | `KEEP_ALIVE_API_URL` |
|--------------|---------------------------|----------------------|
| Vercel (all-in-one) | `https://your-app.vercel.app` | `https://your-app.vercel.app/api` |
| Vercel + Render | `https://your-app.vercel.app` | `https://inspectra-ai-version-0-001-3.onrender.com/` |
| Zeabur (2 services) | `https://frontend-xxx.zeabur.app` | `https://backend-xxx.zeabur.app/` |

## Other free cron services

- [cron-job.org](https://cron-job.org) — free HTTP job every 5+ minutes  
- [UptimeRobot](https://uptimerobot.com) — free monitor every 5 minutes  

## Limits

- Not a guarantee of 24/7; hosts may still sleep.
- For **true 24/7 free**, use **Oracle Always Free VPS**.
- Use for personal/MVP demos; respect host terms of service.
