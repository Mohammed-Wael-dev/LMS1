# Script to create Django superuser
# This script helps create a superuser for the LMS SaaS project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Create Django Superuser" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
if (-not (Test-Path $backendPath)) {
    Write-Host "✗ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Check for virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run .\run-backend.ps1 first to set up the environment" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

Write-Host "`nThis will create a superuser for the Django admin panel." -ForegroundColor Yellow
Write-Host "You will be prompted to enter:" -ForegroundColor Yellow
Write-Host "  - Email (required)" -ForegroundColor White
Write-Host "  - First Name (optional)" -ForegroundColor White
Write-Host "  - Last Name (optional)" -ForegroundColor White
Write-Host "  - Password (required)" -ForegroundColor White
Write-Host ""

# Use Django's built-in createsuperuser command
# This works with custom user models
python manage.py createsuperuser

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Superuser created successfully!" -ForegroundColor Green
    Write-Host "`nYou can now login to the admin panel at:" -ForegroundColor Yellow
    Write-Host "  http://localhost:8000/admin/" -ForegroundColor Cyan
    Write-Host "`nOr use the API endpoints for authentication." -ForegroundColor Yellow
} else {
    Write-Host "`n✗ Failed to create superuser" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Database is set up and migrations are run" -ForegroundColor White
    Write-Host "  2. PostgreSQL is running" -ForegroundColor White
    Write-Host "  3. .env file has correct database credentials" -ForegroundColor White
}

Set-Location ..

