# Script to create admin user automatically
# Email: admin@gmail.com
# Password: 123

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating Admin User" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
if (-not (Test-Path $backendPath)) {
    Write-Host "Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Check for virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run .\run-backend.ps1 first to set up the environment" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# User details
$email = "admin@gmail.com"
$password = "123"
$firstName = "Admin"
$lastName = "User"

Write-Host "Creating user with:" -ForegroundColor Yellow
Write-Host "  Email: $email" -ForegroundColor White
Write-Host "  Password: $password" -ForegroundColor White
Write-Host "  Name: $firstName $lastName" -ForegroundColor White
Write-Host ""

# Run the Python script
Write-Host "Running Django command..." -ForegroundColor Cyan
python create_admin.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nUser created/updated successfully!" -ForegroundColor Green
    Write-Host "`nYou can now login with:" -ForegroundColor Yellow
    Write-Host "  Email: $email" -ForegroundColor White
    Write-Host "  Password: $password" -ForegroundColor White
    Write-Host "`nAdmin panel: http://localhost:8000/admin/" -ForegroundColor Cyan
    Write-Host "API endpoints: http://localhost:8000/api/" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to create user" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Database is set up and migrations are run" -ForegroundColor White
    Write-Host "  2. PostgreSQL is running" -ForegroundColor White
    Write-Host "  3. .env file has correct database credentials" -ForegroundColor White
}

Set-Location ..
