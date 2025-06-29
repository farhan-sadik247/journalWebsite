@echo off
REM Simple Ngrok Setup - No PATH required
REM Place ngrok.exe in the same folder as this script

echo ==========================================
echo    Simple Ngrok Setup Helper
echo ==========================================
echo.

REM Check if ngrok.exe exists in current directory
if not exist "ngrok.exe" (
    echo ❌ ngrok.exe not found in current directory
    echo.
    echo Please download ngrok:
    echo 1. Go to: https://ngrok.com/download
    echo 2. Download Windows ZIP file
    echo 3. Extract ngrok.exe to this project folder
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ Found ngrok.exe in current directory

REM Check if Next.js is running
echo.
echo Checking if Next.js development server is running...
powershell -Command "& {try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5 -ErrorAction Stop; Write-Host '✅ Next.js server is running' } catch { Write-Host '❌ Next.js server is not running. Please start it with: npm run dev' }}"

echo.
echo Starting ngrok tunnel to localhost:3000...
echo.
echo ⚠️  IMPORTANT INSTRUCTIONS:
echo 1. Keep this window open during development
echo 2. Copy the HTTPS URL that appears below
echo 3. Use it in Stripe Dashboard webhook configuration:
echo    https://your-ngrok-url/api/payments/webhook
echo 4. Copy the webhook secret to .env.local
echo.
echo Press Ctrl+C to stop the tunnel
echo.

REM Start ngrok from current directory
ngrok.exe http 3000
