# Simple Ngrok Setup Script
# Run this after downloading ngrok.exe

param(
    [string]$NgrokPath = ".\ngrok.exe"
)

# Set error handling
$ErrorActionPreference = "Continue"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    Manual Ngrok Setup Helper" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok exists at specified path
if (-not (Test-Path $NgrokPath)) {
    Write-Host "❌ ngrok.exe not found at: $NgrokPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download ngrok:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "2. Download Windows ZIP file" -ForegroundColor Yellow
    Write-Host "3. Extract ngrok.exe to this folder" -ForegroundColor Yellow
    Write-Host "4. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use the simple batch file 'setup-ngrok-simple.bat'" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found ngrok.exe at: $NgrokPath" -ForegroundColor Green

# Check if Next.js is running
Write-Host ""
Write-Host "Checking if Next.js development server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Next.js server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Next.js server is not running" -ForegroundColor Red
    Write-Host "Please start it with: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "Starting ngrok tunnel to localhost:3000..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Keep this window open during development" -ForegroundColor White
Write-Host "2. Copy the HTTPS URL that appears below" -ForegroundColor White
Write-Host "3. Use it in Stripe Dashboard webhook configuration:" -ForegroundColor White
Write-Host "   https://your-ngrok-url/api/payments/webhook" -ForegroundColor Gray
Write-Host "4. Don't forget to copy the webhook secret to .env.local" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Red
Write-Host ""

# Start ngrok
& $NgrokPath http 3000
