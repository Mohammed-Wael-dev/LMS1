# Script to fix migrations for all tenant apps
# This script removes fake migration records and re-runs migrations

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Database Migrations" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
$envFile = Join-Path $backendPath ".env"

# Read .env to get database credentials
$envContent = Get-Content $envFile -Raw
$envVars = @{}

foreach ($line in ($envContent -split "`n")) {
    $line = $line.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
        }
    }
}

$dbName = $envVars["POSTGRES_DB"]
$dbUser = $envVars["POSTGRES_USER"]
$dbPassword = $envVars["POSTGRES_PASSWORD"]
$dbHost = $envVars["POSTGRES_HOST"]
$dbPort = $envVars["POSTGRES_PORT"]

Write-Host "Step 1: Removing fake migration records..." -ForegroundColor Yellow
$env:PGPASSWORD = $dbPassword

$tenantApps = @('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form')
$deleteQuery = "SET search_path TO public; DELETE FROM django_migrations WHERE app IN ('" + ($tenantApps -join "', '") + "');"

$result = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c $deleteQuery 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Removed fake migration records" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to remove migration records" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Running migrations..." -ForegroundColor Yellow

Set-Location $backendPath
.\venv\Scripts\Activate.ps1

$migrateResult = python manage.py migrate_schemas --schema public 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOK: Migrations completed successfully!" -ForegroundColor Green
    Write-Host $migrateResult -ForegroundColor Gray
} else {
    Write-Host "`nERROR: Migrations failed" -ForegroundColor Red
    Write-Host $migrateResult -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Verifying tables..." -ForegroundColor Yellow

$checkQuery = "SET search_path TO public; SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"
$tableCount = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c $checkQuery -t 2>&1 | Select-String -Pattern '\d+' | ForEach-Object { $_.Matches[0].Value }

Write-Host "Total tables in public schema: $tableCount" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Migration Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
