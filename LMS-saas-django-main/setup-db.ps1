# Create local PostgreSQL database for LMS

$dbName = "lms_db"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating Local Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Enter PostgreSQL password" -ForegroundColor Yellow
Write-Host "(Press Enter if no password)" -ForegroundColor Gray
Write-Host ""

$securePassword = Read-Host "PostgreSQL password" -AsSecureString
$dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    $dbPassword = ""
    Write-Host "Using empty password" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Testing connection..." -ForegroundColor Yellow

$env:PGPASSWORD = $dbPassword
$testResult = psql -U $dbUser -h $dbHost -p $dbPort -c "SELECT version();" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running" -ForegroundColor White
    Write-Host "  2. Password is correct" -ForegroundColor White
    Write-Host "  3. User 'postgres' exists" -ForegroundColor White
    exit 1
}

Write-Host "Connection successful!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Checking database..." -ForegroundColor Yellow

$dbExists = psql -U $dbUser -h $dbHost -p $dbPort -lqt | Select-String -Pattern "\b$dbName\b"

if ($dbExists) {
    Write-Host "Database '$dbName' already exists" -ForegroundColor Yellow
    $drop = Read-Host "Delete and recreate? (y/n)"
    if ($drop -eq "y" -or $drop -eq "Y") {
        Write-Host "Dropping database..." -ForegroundColor Cyan
        psql -U $dbUser -h $dbHost -p $dbPort -c "DROP DATABASE $dbName;"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to drop database" -ForegroundColor Red
            exit 1
        }
        Write-Host "Database dropped" -ForegroundColor Green
    } else {
        Write-Host "Using existing database" -ForegroundColor Green
    }
}

if (-not $dbExists -or ($drop -eq "y" -or $drop -eq "Y")) {
    Write-Host ""
    Write-Host "Step 4: Creating database..." -ForegroundColor Yellow
    
    psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database '$dbName' created successfully!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create database" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 5: Updating .env file..." -ForegroundColor Yellow

$envContent = @"
SECRET_KEY=django-insecure-dev-key-change-this-in-production-12345
DEBUG=True
POSTGRES_DB=$dbName
POSTGRES_USER=$dbUser
POSTGRES_PASSWORD=$dbPassword
POSTGRES_HOST=$dbHost
POSTGRES_PORT=$dbPort
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"@

$envContent | Set-Content ".env" -Encoding UTF8

Write-Host ".env file updated" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python manage.py migrate_schemas" -ForegroundColor White
Write-Host "  python manage.py runserver" -ForegroundColor White
Write-Host ""










