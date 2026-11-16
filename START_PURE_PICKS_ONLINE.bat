@echo off
title Pure Picks - Live Online Server (PC ^& Mobile)
cd /d "%~dp0"
color 0B

echo =================================================================
echo           PURE PICKS - ONLINE LAUNCHER (PC ^& MOBILE)
echo       Pure Milk - Healthy Life - Bengaluru Fulfillment Hub
echo =================================================================
echo.

echo [1/3] Cleaning up old port 3000 / tunnel sessions...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1
if exist tunnel.log del /f /q tunnel.log >nul 2>&1
if exist ONLINE_LINK.txt del /f /q ONLINE_LINK.txt >nul 2>&1

echo [2/3] Generating Live Online HTTPS Link...
if exist "%~dp0cloudflared.exe" (
    start "" /b "%~dp0cloudflared.exe" tunnel --url http://localhost:3000 2>tunnel.log
) else if exist "%~dp0..\cloudflared.exe" (
    start "" /b "%~dp0..\cloudflared.exe" tunnel --url http://localhost:3000 2>tunnel.log
) else (
    echo [ERROR] cloudflared.exe not found! Starting local mode only.
    goto start_local
)

powershell -NoProfile -Command "$u=''; for($i=0; $i -lt 20; $i++){ Start-Sleep -Milliseconds 700; if(Test-Path 'tunnel.log'){ $c=Get-Content 'tunnel.log' -Raw -ErrorAction SilentlyContinue; if($c -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com'){ $u=$matches[0]; break } } }; if($u){ Set-Content -Path 'ONLINE_LINK.txt' -Value $u }"

:start_local
set LIVE_URL=
if exist ONLINE_LINK.txt set /p LIVE_URL=<ONLINE_LINK.txt

cls
echo =================================================================
echo               PURE PICKS IS NOW LIVE ONLINE!
echo =================================================================
echo.
if defined LIVE_URL (
    echo   LIVE ONLINE LINK ^(Works on PC, Laptop ^& Mobile^):
    echo     Storefront:  %LIVE_URL%
    echo     Admin Hub:   %LIVE_URL%/admin/login
    echo     ^(Saved to ONLINE_LINK.txt^)
    echo.
    start "" /b cmd /c "timeout /t 3 >nul & start "" "%LIVE_URL%""
) else (
    echo   [!] Generating online link in background... check tunnel.log
    start "" /b cmd /c "timeout /t 3 >nul & start "" "http://localhost:3000""
)
echo   LOCAL PC LINK:
echo     Storefront:  http://localhost:3000
echo     Admin Hub:   http://localhost:3000/admin/login
echo.
echo   -------------------------------------------------------------
echo   LOGIN CREDENTIALS:
echo   - Admin Portal:     admin@purepicks.com  ^|  Password: PurePicks@AdminSecure2026!
echo   - Customer Login:   customer@gmail.com   ^|  Password: customer123
echo   -------------------------------------------------------------
echo.
echo   [i] KEEP THIS WINDOW OPEN to stay online on PC and Mobile.
echo       Close this window or press Ctrl+C to shut down.
echo =================================================================
echo.

npm start
