# Script to run both Frontend and Backend locally
# LMS SaaS Project - Local Development Setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LMS SaaS - Local Development Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Python
Write-Host "Checking Python..." -ForegroundColor Cyan
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCheck) {
    Write-Host "✗ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}
$pythonVersion = python --version
Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green

# Check Node.js
Write-Host "`nChecking Node.js..." -ForegroundColor Cyan
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green

# Check package manager for frontend
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

# Setup Backend
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setting up Backend (Django)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
if (-not (Test-Path $backendPath)) {
    Write-Host "✗ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Check for virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Install/upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip --quiet

# Install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    $envContent = @"
SECRET_KEY=django-insecure-dev-key-change-in-production-$(Get-Random)
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✓ .env file created (using default values)" -ForegroundColor Green
    Write-Host "⚠ Please update .env file with your actual database credentials" -ForegroundColor Yellow
}

# Run migrations (if database is configured)
Write-Host "`nNote: Make sure PostgreSQL is running and database is configured" -ForegroundColor Yellow
Write-Host "You may need to run migrations manually: python manage.py migrate" -ForegroundColor Yellow

Set-Location ..

# Setup Frontend
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setting up Frontend (React)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$frontendPath = "lms-saas-react-dev\lms-saas-react-dev"
if (-not (Test-Path $frontendPath)) {
    Write-Host "✗ Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

# Install dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
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

Set-Location ..\..\..

# Start both servers
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting Servers" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Starting Backend (Django) on http://localhost:8000" -ForegroundColor Yellow
Write-Host "Starting Frontend (React) on https://localhost:5173" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C to stop both servers`n" -ForegroundColor Yellow

# Start backend in new window
$backendScript = @"
cd '$PWD\$backendPath'
.\venv\Scripts\Activate.ps1
python manage.py runserver
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start frontend
Set-Location $frontendPath
if ($usePnpm) {
    pnpm dev
} else {
    npm run dev
}


