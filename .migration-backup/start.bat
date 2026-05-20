@echo off
echo Starting Inspectra AI MVP Services...

echo Starting FastAPI Backend...
start cmd /k "cd backend && .venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Next.js Frontend...
start cmd /k "cd frontend && npm run dev"

echo.
echo ==============================================
echo Inspectra AI MVP is starting!
echo.
echo Frontend: http://localhost:3000  (also http://YOUR-LAN-IP:3000 on phone)
echo Backend:  http://localhost:8000  (proxied via frontend /api/proxy)
echo.
echo Production: cd frontend ^&^& npm run build ^&^& npm run start
echo ==============================================
echo.
