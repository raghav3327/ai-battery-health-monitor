@echo off
title AI Battery Health Monitor - IoT Sensor Simulator
echo ========================================================
echo   Starting IoT EV Battery Telemetry Simulator
echo ========================================================
echo.
echo Make sure the server (run.bat) is running first!
echo.
python simulator/sensor_simulator.py
pause
