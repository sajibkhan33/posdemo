@echo off
title BD HOSTT POS - Stop Printer Agent
color 0C
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-agent.ps1"
echo.
echo Closing in 2 seconds...
timeout /t 2 /nobreak >nul
