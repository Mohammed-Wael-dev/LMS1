# Script to update .env file for local database

Write-Host "Updating .env file for local database..." -ForegroundColor Cyan

$envPath = "LMS-saas-django-main\.env"

if (-not (Test-Path $envPath)) {
    Write-Host ".env file not found!" -ForegroundColor Red
    exit 1
}

# Backup original
Copy-Item $envPath "$envPath.backup" -Force
Write-Host "Backup created: $envPath.backup" -ForegroundColor Green

# Ask for PostgreSQL password
$dbPassword = Read-Host "Enter PostgreSQL password for user 'postgres'"

# Read current .env
$content = Get-Content $envPath

# Update database settings
$newContent = @()
foreach ($line in $content) {
    if ($line -match "^POSTGRES_DB=") {
        $newContent += "POSTGRES_DB=lms_db"
    }
    elseif ($line -match "^POSTGRES_USER=") {
        $newContent += "POSTGRES_USER=postgres"
    }
    elseif ($line -match "^POSTGRES_PASSWORD=") {
        $newContent += "POSTGRES_PASSWORD=$dbPassword"
    }
    elseif ($line -match "^POSTGRES_HOST=") {
        $newContent += "POSTGRES_HOST=localhost"
    }
    elseif ($line -match "^POSTGRES_PORT=") {
        $newContent += "POSTGRES_PORT=5432"
    }
    else {
        $newContent += $line
    }
}

# Write updated content
$newContent | Set-Content $envPath -Encoding utf8

Write-Host "`n.env file updated successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Create database: psql -U postgres -c 'CREATE DATABASE lms_db;'" -ForegroundColor White
Write-Host "2. Run migrations: cd LMS-saas-django-main; .\venv\Scripts\python.exe manage.py migrate" -ForegroundColor White
Write-Host "3. Create user: .\venv\Scripts\python.exe create_admin.py" -ForegroundColor White


