# Simple script to setup database

cd "LMS-saas-django-main"

# Create .env if not exists
if (-not (Test-Path ".env")) {
    $envContent = @"
SECRET_KEY=django-insecure-dev-key-12345
DEBUG=True
POSTGRES_DB=lms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GOOGLE_RECAPTCHA_SECRET_KEY=6LfBL9QrAAAAADgxfHXejdcTYuf-RVT8b_8aj-8r
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host ".env file created"
}

Write-Host "`nPlease run these commands manually:" -ForegroundColor Yellow
Write-Host "1. Create database: psql -U postgres -c 'CREATE DATABASE lms_db;'" -ForegroundColor White
Write-Host "2. Run migrations: .\venv\Scripts\python.exe manage.py migrate" -ForegroundColor White
Write-Host "3. Create admin user: .\venv\Scripts\python.exe create_admin.py" -ForegroundColor White

cd ..

