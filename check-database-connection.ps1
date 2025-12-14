# Script to verify database connection and settings
# Database Connection Check Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Connection Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "LMS-saas-django-main"
$envFile = Join-Path $backendPath ".env"

# Check if .env file exists
Write-Host "Step 1: Checking .env file..." -ForegroundColor Yellow

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file at: $envFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: .env file exists" -ForegroundColor Green

# Read .env file
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

# Check required variables
Write-Host "`nStep 2: Checking required variables..." -ForegroundColor Yellow

$requiredVars = @("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_PORT")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        $missingVars += $var
        Write-Host "ERROR: $var is missing or empty" -ForegroundColor Red
    } else {
        $displayValue = if ($var -eq "POSTGRES_PASSWORD") { "***" } else { $envVars[$var] }
        Write-Host "OK: $var = $displayValue" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`nERROR: Some required variables are missing!" -ForegroundColor Red
    exit 1
}

# Test PostgreSQL connection
Write-Host "`nStep 3: Testing PostgreSQL connection..." -ForegroundColor Yellow

$dbName = $envVars["POSTGRES_DB"]
$dbUser = $envVars["POSTGRES_USER"]
$dbPassword = $envVars["POSTGRES_PASSWORD"]
$dbHost = $envVars["POSTGRES_HOST"]
$dbPort = $envVars["POSTGRES_PORT"]

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "WARNING: psql not found in PATH" -ForegroundColor Yellow
    Write-Host "Skipping direct connection test" -ForegroundColor Gray
} else {
    $env:PGPASSWORD = $dbPassword
    $testResult = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Database connection successful!" -ForegroundColor Green
        
        # Check if database has tables
        $tableCheck = psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t 2>&1
        if ($LASTEXITCODE -eq 0) {
            $tableCount = ($tableCheck -replace '\s', '').Trim()
            Write-Host "OK: Number of tables in database: $tableCount" -ForegroundColor Green
        }
    } else {
        Write-Host "ERROR: Database connection failed" -ForegroundColor Red
        Write-Host "Error details:" -ForegroundColor Yellow
        Write-Host $testResult -ForegroundColor Red
        Write-Host "`nPlease check:" -ForegroundColor Yellow
        Write-Host "  1. PostgreSQL is running" -ForegroundColor White
        Write-Host "  2. Connection credentials are correct" -ForegroundColor White
        Write-Host "  3. Database exists" -ForegroundColor White
        exit 1
    }
}

# Check Django settings
Write-Host "`nStep 4: Checking Django settings..." -ForegroundColor Yellow

$settingsFile = Join-Path $backendPath "project\settings.py"
if (Test-Path $settingsFile) {
    $settingsContent = Get-Content $settingsFile -Raw
    
    # Check for tenant settings
    if ($settingsContent -match "django_tenants") {
        Write-Host "INFO: Project uses django-tenants" -ForegroundColor Yellow
    }
    
    # Check database engine
    if ($settingsContent -match "django_tenants\.postgresql_backend") {
        Write-Host "OK: Database engine: django_tenants.postgresql_backend" -ForegroundColor Green
    } elseif ($settingsContent -match "django\.db\.backends\.postgresql") {
        Write-Host "OK: Database engine: django.db.backends.postgresql" -ForegroundColor Green
    }
    
    # Check SHOW_PUBLIC_IF_NO_TENANT_FOUND
    if ($settingsContent -match "SHOW_PUBLIC_IF_NO_TENANT_FOUND\s*=\s*True") {
        Write-Host "OK: SHOW_PUBLIC_IF_NO_TENANT_FOUND = True" -ForegroundColor Green
        Write-Host "INFO: Will show public schema if no tenant found" -ForegroundColor Gray
    }
} else {
    Write-Host "WARNING: settings.py file not found" -ForegroundColor Yellow
}

# Check React API configuration
Write-Host "`nStep 5: Checking React API settings..." -ForegroundColor Yellow

$reactPath = "lms-saas-react-dev"
$constantsFile = Join-Path $reactPath "src\utils\constants.ts"

if (Test-Path $constantsFile) {
    $constantsContent = Get-Content $constantsFile -Raw
    
    if ($constantsContent -match "localhost:8000") {
        Write-Host "OK: React API configured for localhost:8000" -ForegroundColor Green
    } else {
        Write-Host "WARNING: React API may not be configured for localhost:8000" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: constants.ts file not found" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nDatabase Settings:" -ForegroundColor White
Write-Host "  Database: $dbName" -ForegroundColor Gray
Write-Host "  User: $dbUser" -ForegroundColor Gray
Write-Host "  Host: $dbHost" -ForegroundColor Gray
Write-Host "  Port: $dbPort" -ForegroundColor Gray

Write-Host "`nTo run the project:" -ForegroundColor White
Write-Host "  1. Backend: cd $backendPath && python manage.py runserver" -ForegroundColor Gray
Write-Host "  2. Frontend: cd $reactPath && npm run dev" -ForegroundColor Gray

Write-Host "`nOK: Verification completed successfully!" -ForegroundColor Green
