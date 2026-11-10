@echo off
title Pure Picks - Port 3000
cd /d "%~dp0"

:: Free port 3000 if already running
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1

echo ========================================================
echo                PURE PICKS LOCAL SERVER
echo ========================================================
echo.
echo Running at: http://localhost:3000
echo.
echo Opening browser...
start http://localhost:3000

npm start
