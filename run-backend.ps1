# Script to run Backend (Django) only

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Backend (Django)" -ForegroundColor Cyan
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

# Install dependencies if needed
if (-not (Test-Path "venv\Lib\site-packages\django")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    pip install -r requirements.txt --quiet
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file with default values..." -ForegroundColor Cyan
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
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host "⚠ Please update .env with your database credentials" -ForegroundColor Yellow
}

Write-Host "`nStarting Django development server..." -ForegroundColor Cyan
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

python manage.py runserver


