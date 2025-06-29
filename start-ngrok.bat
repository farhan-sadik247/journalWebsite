@echo off
REM Ngrok Webhook Setup Helper Script
REM This script helps you set up ngrok for Stripe webhook testing

echo ==========================================
echo    Ngrok Webhook Setup Helper
echo ==========================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ngrok is not installed or not in PATH
    echo.
    echo Please install ngrok:
    echo 1. Download from: https://ngrok.com/download
    echo 2. Extract to a folder in your PATH
    echo 3. Or install via chocolatey: choco install ngrok
    echo.
    pause
    exit /b 1
)

echo ✅ ngrok is installed

REM Check if Next.js is running
echo.
echo Checking if Next.js development server is running...
powershell -Command "& {try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5 -ErrorAction Stop; Write-Host '✅ Next.js server is running' } catch { Write-Host '❌ Next.js server is not running. Please start it with: npm run dev' }}"

echo.
echo Starting ngrok tunnel to localhost:3000...
echo.
echo ⚠️  IMPORTANT: Keep this window open during development
echo ⚠️  Copy the https URL that appears below
echo ⚠️  Use it in Stripe Dashboard webhook configuration
echo.
echo Press Ctrl+C to stop the tunnel
echo.

REM Start ngrok
ngrok http 3000
