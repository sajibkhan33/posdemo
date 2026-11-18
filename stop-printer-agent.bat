@echo off
title BD HOSTT POS - Stop Printer Agent
color 0C
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-agent.ps1"
echo.
echo Closing in 2 seconds...
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
