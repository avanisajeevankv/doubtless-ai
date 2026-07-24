@echo off
setlocal enabledelayedexpansion
title Doubtless AI Launcher
color 0E

echo.
echo  ===================================================
echo   DOUBTLESS AI - Centered Multilingual Doubt Solver
echo  ===================================================
echo.

:: ── 1. Check Node.js ──────────────────────────────────
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is NOT installed.
    echo.
    echo  Please install Node.js from https://nodejs.org
    echo  Download the "LTS" version, install it, then
    echo  close and re-open this file.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js found: %NODE_VER%

:: ── 2. Check npm ──────────────────────────────────────
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm not found. Reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] npm found.

:: ── 3. Install dependencies if needed ─────────────────
if not exist "node_modules\" (
    echo.
    echo  [INFO] Installing dependencies (first time only)...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        color 0C
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
) else (
    echo  [OK] node_modules found. Skipping install.
)

:: ── 4. Create .env from example if missing ────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [INFO] Created .env from .env.example
        echo  [WARN] Add your GEMINI_API_KEY to .env for live AI mode.
        echo         (App will run in DEMO mode otherwise)
    )
)

:: ── 5. Launch server ──────────────────────────────────
echo.
echo  ===================================================
echo   Starting server on http://localhost:3000 ...
echo   Press Ctrl+C to stop the server.
echo  ===================================================
echo.

:: Open browser after 2 seconds
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start the server
node server.js

echo.
echo  Server stopped.
pause
