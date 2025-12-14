# LMS SaaS React Development Server Setup Script
# Make sure Node.js is installed before running this script

Write-Host "Checking for Node.js..." -ForegroundColor Cyan

# Check if Node.js is installed
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green

# Check if pnpm is available, otherwise use npm
Write-Host "`nChecking package manager..." -ForegroundColor Cyan
$pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCheck) {
    $pnpmVersion = pnpm --version
    Write-Host "✓ pnpm found: $pnpmVersion" -ForegroundColor Green
    $usePnpm = $true
} else {
    Write-Host "ℹ pnpm not found, using npm instead" -ForegroundColor Yellow
    $usePnpm = $false
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
if ($usePnpm) {
    pnpm install
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green

# Start development server
Write-Host "`nStarting development server..." -ForegroundColor Cyan
Write-Host "The app will be available at: https://localhost:5173" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

if ($usePnpm) {
    pnpm dev
} else {
    npm run dev
}
