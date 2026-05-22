@echo off
title MP Election 2023 Dashboard Server
echo ========================================================
echo   Starting MP Election 2023 Local Development Server
echo   Operating on http://localhost:8000
echo ========================================================
echo.
echo Launching default web browser...
start http://localhost:8000
echo.
echo Server log outputs:
python -m http.server 8000
pause
