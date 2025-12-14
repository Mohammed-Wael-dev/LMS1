# Script to run Frontend (React) only

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Frontend (React)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$frontendPath = "lms-saas-react-dev\lms-saas-react-dev"
if (-not (Test-Path $frontendPath)) {
    Write-Host "✗ Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

# Check for Node.js
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check package manager
$pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCheck) {
    $usePnpm = $true
    Write-Host "Using pnpm..." -ForegroundColor Green
} else {
    $usePnpm = $false
    Write-Host "Using npm..." -ForegroundColor Yellow
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    if ($usePnpm) {
        pnpm install
    } else {
        npm install
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

Write-Host "`nStarting React development server..." -ForegroundColor Cyan
Write-Host "Frontend will be available at: https://localhost:5173" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

if ($usePnpm) {
    pnpm dev
} else {
    npm run dev
}


