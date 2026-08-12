@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   LunaGuard - Mission Intelligence Platform
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker CLI was not found. Install Docker Desktop first.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [INFO] Docker engine is not running. Trying to start Docker Desktop...
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else (
    echo [ERROR] Docker Desktop was not found in the standard location.
    echo Start Docker Desktop manually, wait for the engine, then run this file again.
    pause
    exit /b 1
  )

  echo [INFO] Waiting for Docker Desktop...
  for /l %%I in (1,1,18) do (
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if not errorlevel 1 goto docker_ready
  )

  echo [ERROR] Docker did not become ready in time.
  echo Open Docker Desktop, wait until it says the engine is running, then try again.
  pause
  exit /b 1
)

:docker_ready
echo [OK] Docker engine is ready.
echo [INFO] Building and starting LunaGuard...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERROR] LunaGuard failed to start. Review the Docker output above.
  pause
  exit /b 1
)

echo [INFO] Waiting for the backend health check...
for /l %%I in (1,1,15) do (
  timeout /t 2 /nobreak >nul
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:8000/health; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto app_ready
)

:app_ready
echo.
docker compose ps
echo.
echo [READY] LunaGuard Dashboard: http://localhost:3000
echo [API]   FastAPI docs: http://localhost:8000/docs
echo.
start "" http://localhost:3000
endlocal
