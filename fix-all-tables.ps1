# Complete fix for missing tables
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing All Missing Tables" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
Set-Location $backendPath

# Read .env
$envContent = Get-Content ".env" -Raw
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

$env:PGPASSWORD = $dbPassword

Write-Host "Step 1: Deleting fake migration records..." -ForegroundColor Yellow
$deleteQuery = "SET search_path TO public; DELETE FROM django_migrations WHERE app IN ('course', 'enrollment', 'exam', 'cart', 'core', 'iraq_form');"
psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c $deleteQuery | Out-Null
Write-Host "OK: Deleted fake records" -ForegroundColor Green

Write-Host "`nStep 2: Running migrations with syncdb..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1
python create_tables_manually.py

Write-Host "`nStep 3: Verifying tables..." -ForegroundColor Yellow
$checkQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'course%' ORDER BY tablename;"
$tables = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c $checkQuery

if ($tables -match "course_course") {
    Write-Host "OK: course_course table exists!" -ForegroundColor Green
} else {
    Write-Host "ERROR: course_course table still missing!" -ForegroundColor Red
    Write-Host "Tables found:" -ForegroundColor Yellow
    Write-Host $tables
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
