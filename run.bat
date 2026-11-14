@echo off
title AI Battery Health Monitor - Server
echo ========================================================
echo   Starting AI Battery Health & Thermal Safety Monitor
echo ========================================================
echo.
echo 1. Checking dependencies...
python -m pip install -r requirements.txt --quiet
echo.
echo 2. Launching Web Dashboard in browser...
start http://127.0.0.1:5000
echo.
echo 3. Starting Flask API Server...
echo Server will run on: http://127.0.0.1:5000
echo Press Ctrl+C in this terminal to stop the server.
echo ========================================================
python api/app.py
pause
