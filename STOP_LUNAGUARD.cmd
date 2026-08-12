@echo off
setlocal
cd /d "%~dp0"
echo Stopping LunaGuard...
docker compose down
echo LunaGuard stopped.
pause
endlocal
