# Reset Database Script - Remove Tenant System
# This script will drop and recreate the database

$env:PGPASSWORD = "rami12345"
$dbName = "lms_db"
$dbUser = "postgres"
$dbHost = "localhost"

Write-Host "[INFO] Dropping database $dbName..." -ForegroundColor Yellow
psql -U $dbUser -h $dbHost -c "DROP DATABASE IF EXISTS $dbName;" postgres

Write-Host "[INFO] Creating database $dbName..." -ForegroundColor Yellow
psql -U $dbUser -h $dbHost -c "CREATE DATABASE $dbName;" postgres

Write-Host "[INFO] Database reset complete!" -ForegroundColor Green
Write-Host "[INFO] Now run: python manage.py migrate" -ForegroundColor Cyan
