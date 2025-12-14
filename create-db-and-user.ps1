# Complete script to setup database and create admin user

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete Database & User Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"

# Step 1: Create .env file
Write-Host "Step 1: Creating .env file..." -ForegroundColor Yellow
Set-Location $backendPath

if (-not (Test-Path ".env")) {
    $dbPassword = Read-Host "Enter PostgreSQL password for user 'postgres'"
    
    $envContent = @"
SECRET_KEY=django-insecure-dev-key-$(Get-Random -Minimum 1000 -Maximum 9999)
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$dbPassword
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✓ .env file created" -ForegroundColor Green
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
    $dbPassword = (Get-Content ".env" | Select-String "POSTGRES_PASSWORD=").ToString().Split("=")[1]
}

# Step 2: Create database
Write-Host "`nStep 2: Creating database..." -ForegroundColor Yellow
Write-Host "Please enter PostgreSQL password when prompted..." -ForegroundColor Cyan

$env:PGPASSWORD = $dbPassword
$dbExists = psql -U postgres -h localhost -lqt 2>&1 | Select-String -Pattern "\blms_db\b"

if (-not $dbExists) {
    psql -U postgres -h localhost -c "CREATE DATABASE lms_db;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database. Please create it manually:" -ForegroundColor Red
        Write-Host "  psql -U postgres -c 'CREATE DATABASE lms_db;'" -ForegroundColor Yellow
        Set-Location ..
        exit 1
    }
} else {
    Write-Host "✓ Database already exists" -ForegroundColor Green
}

# Step 3: Activate venv and run migrations
Write-Host "`nStep 3: Running migrations..." -ForegroundColor Yellow

if (-not (Test-Path "venv")) {
    Write-Host "✗ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run .\run-backend.ps1 first" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

& ".\venv\Scripts\Activate.ps1"
.\venv\Scripts\python.exe manage.py migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Migrations failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✓ Migrations completed" -ForegroundColor Green

# Step 4: Create admin user
Write-Host "`nStep 4: Creating admin user..." -ForegroundColor Yellow
.\venv\Scripts\python.exe create_admin.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Setup Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Login credentials:" -ForegroundColor Yellow
    Write-Host "  Email: admin@gmail.com" -ForegroundColor White
    Write-Host "  Password: 123" -ForegroundColor White
    Write-Host "`nAdmin Panel: http://localhost:8000/admin/" -ForegroundColor Cyan
} else {
    Write-Host "✗ Failed to create user" -ForegroundColor Red
}

Set-Location ..

