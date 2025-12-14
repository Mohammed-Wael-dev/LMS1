# Script to setup local PostgreSQL database for LMS SaaS project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setting up Local Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
Set-Location $backendPath

# Database configuration
$dbName = "lms_db"
$dbUser = "postgres"
$dbPassword = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Database Name: $dbName" -ForegroundColor White
Write-Host "  User: $dbUser" -ForegroundColor White
Write-Host "  Host: $dbHost" -ForegroundColor White
Write-Host "  Port: $dbPort" -ForegroundColor White
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    $envContent = @"
SECRET_KEY=django-insecure-dev-key-change-in-production-$(Get-Random -Minimum 1000 -Maximum 9999)
DEBUG=True
POSTGRES_DB=$dbName
POSTGRES_USER=$dbUser
POSTGRES_PASSWORD=$dbPassword
POSTGRES_HOST=$dbHost
POSTGRES_PORT=$dbPort
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✓ .env file created" -ForegroundColor Green
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

# Create database using psql
Write-Host "`nCreating PostgreSQL database..." -ForegroundColor Cyan

# Set PGPASSWORD environment variable for non-interactive password
$env:PGPASSWORD = $dbPassword

# Check if database exists
$dbExists = psql -U $dbUser -h $dbHost -p $dbPort -lqt | Select-String -Pattern "\b$dbName\b"

if ($dbExists) {
    Write-Host "Database '$dbName' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to drop and recreate it? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Dropping existing database..." -ForegroundColor Yellow
        psql -U $dbUser -h $dbHost -p $dbPort -c "DROP DATABASE IF EXISTS $dbName;" 2>&1 | Out-Null
        Write-Host "Creating new database..." -ForegroundColor Cyan
        psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database created successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to create database" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Using existing database" -ForegroundColor Green
    }
} else {
    Write-Host "Creating database '$dbName'..." -ForegroundColor Cyan
    psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database. Make sure PostgreSQL is running." -ForegroundColor Red
        Write-Host "You may need to enter the PostgreSQL password manually." -ForegroundColor Yellow
        exit 1
    }
}

# Activate virtual environment
if (Test-Path "venv") {
    Write-Host "`nActivating virtual environment..." -ForegroundColor Cyan
    & ".\venv\Scripts\Activate.ps1"
} else {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run .\run-backend.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Run migrations
Write-Host "`nRunning migrations..." -ForegroundColor Cyan
.\venv\Scripts\python.exe manage.py migrate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Migrations failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Database Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create admin user: .\create-admin-user.ps1" -ForegroundColor White
Write-Host "2. Start the server: .\run-backend.ps1" -ForegroundColor White

Set-Location ..

