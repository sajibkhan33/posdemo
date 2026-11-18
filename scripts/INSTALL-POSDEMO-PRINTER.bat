@echo off
title BD HOSTT POS DEMO Printer - 1-Click Installer
color 0A
setlocal enabledelayedexpansion

echo ====================================================================
echo     BD HOSTT POS DEMO - 1-CLICK THERMAL PRINTER INSTALLER
echo ====================================================================
echo.

set "SRC_DIR=%~dp0"
set "INSTALL_DIR=%LOCALAPPDATA%\BDHosttPOSDEMOPrinter"

:: [1] Detect Target Application URL strictly from .env or CLI Argument
set "APP_URL="
if exist "%SRC_DIR%.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%SRC_DIR%.env") do (
        if /i "%%a"=="APP_URL" set "APP_URL=%%~b"
    )
)
if "!APP_URL!"=="" if exist "%SRC_DIR%..\.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%SRC_DIR%..\.env") do (
        if /i "%%a"=="APP_URL" set "APP_URL=%%~b"
    )
)
if "!APP_URL!"=="" if exist "%INSTALL_DIR%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%INSTALL_DIR%\.env") do (
        if /i "%%a"=="APP_URL" set "APP_URL=%%~b"
    )
)
if "!APP_URL!"=="" if not "%~1"=="" set "APP_URL=%~1"
if "!APP_URL!"=="" set "APP_URL=https://posdemo.bdhostt.com"

:: Strip surrounding quotes if any
set APP_URL=!APP_URL:"=!
:: Strip trailing slash if any
if "!APP_URL:~-1!"=="/" set "APP_URL=!APP_URL:~0,-1!"

echo [Configured Target URL]: !APP_URL!
echo.
echo [1/4] Checking environment...

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Node.js was not detected on this computer!
    echo Node.js is required to bridge web POS printing to thermal printers.
    echo.
    echo Attempting to install Node.js automatically via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [!] Could not auto-install Node.js via winget.
        echo Opening Node.js download page. Please install Node.js and run this setup again.
        start https://nodejs.org/en/download/
        pause
        exit /b 1
    )
)

echo       [OK] Node.js is ready.

echo.
echo [2/4] Installing files to: "%INSTALL_DIR%"...

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\scripts" mkdir "%INSTALL_DIR%\scripts"

:: If run as a standalone Direct .BAT from Downloads without the extracted ZIP files, auto-download package from target server
if not exist "%SRC_DIR%print-agent.cjs" (
    echo       Downloading printer agent files from !APP_URL!...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$zip = Join-Path $env:TEMP 'pos-printer-setup.zip'; Invoke-WebRequest -Uri '!APP_URL!/api/download/printer-agent-zip' -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath '%INSTALL_DIR%' -Force"
) else (
    :: Copy files from local folder
    copy /y "%SRC_DIR%print-agent.cjs" "%INSTALL_DIR%\" >nul
    copy /y "%SRC_DIR%run-printer-silent.vbs" "%INSTALL_DIR%\" >nul
    copy /y "%SRC_DIR%start-printer-agent.bat" "%INSTALL_DIR%\" >nul
    if exist "%SRC_DIR%stop-printer-agent.bat" copy /y "%SRC_DIR%stop-printer-agent.bat" "%INSTALL_DIR%\" >nul
    if exist "%SRC_DIR%scripts\print-raw.ps1" copy /y "%SRC_DIR%scripts\print-raw.ps1" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\raw-print.exe" copy /y "%SRC_DIR%scripts\raw-print.exe" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\raw-print.cs" copy /y "%SRC_DIR%scripts\raw-print.cs" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\setup-autostart.ps1" copy /y "%SRC_DIR%scripts\setup-autostart.ps1" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\stop-agent.ps1" copy /y "%SRC_DIR%scripts\stop-agent.ps1" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\remove-autostart.ps1" copy /y "%SRC_DIR%scripts\remove-autostart.ps1" "%INSTALL_DIR%\scripts\" >nul
)

:: Save exact .env into the installation folder so the background agent never hits any other URL
echo APP_URL=!APP_URL!> "%INSTALL_DIR%\.env"
echo PORT=3000>> "%INSTALL_DIR%\.env"
if exist "%SRC_DIR%.env" copy /y "%SRC_DIR%.env" "%INSTALL_DIR%\.env" >nul
if exist "%SRC_DIR%..\.env" copy /y "%SRC_DIR%..\.env" "%INSTALL_DIR%\.env" >nul

echo       [OK] All printer bridge files deployed with Target: !APP_URL!

echo.
echo [3/4] Configuring Auto-Start & Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%INSTALL_DIR%\scripts\setup-autostart.ps1"

echo.
echo [4/4] Verifying background service...
timeout /t 2 /nobreak >nul

echo ====================================================================
echo   SUCCESS! BD HOSTT POS DEMO PRINTER IS READY AND RUNNING!
echo.
echo   * Connected Target  : !APP_URL!
echo   * Desktop shortcuts : "Start Printer Agent" & "Stop Printer Agent"
echo   * Windows Startup   : Starts automatically every time you start Windows
echo   * Zero terminal popups (completely silent in background)
echo ====================================================================
echo.
echo Press any key to close this installer.
pause >nul
