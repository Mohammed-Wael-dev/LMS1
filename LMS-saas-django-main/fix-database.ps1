# Script to help fix PostgreSQL database connection

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  إصلاح اتصال قاعدة البيانات" -ForegroundColor Cyan
Write-Host "  Fix Database Connection" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$envFile = ".env"

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "✗ ملف .env غير موجود!" -ForegroundColor Red
    exit 1
}

Write-Host "الخطوة 1: التحقق من PostgreSQL..." -ForegroundColor Yellow
Write-Host "Step 1: Checking PostgreSQL..." -ForegroundColor Yellow

# Check if PostgreSQL is installed
$pgPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pgPath) {
    Write-Host "`n✗ PostgreSQL غير مثبت أو غير موجود في PATH" -ForegroundColor Red
    Write-Host "✗ PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "`nيرجى تثبيت PostgreSQL من: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ PostgreSQL موجود" -ForegroundColor Green
Write-Host "✓ PostgreSQL found" -ForegroundColor Green

Write-Host "`nالخطوة 2: إدخال بيانات PostgreSQL..." -ForegroundColor Yellow
Write-Host "Step 2: Enter PostgreSQL credentials..." -ForegroundColor Yellow

# Get PostgreSQL password
$currentPassword = Read-Host "أدخل كلمة مرور PostgreSQL (Enter PostgreSQL password)"
if ([string]::IsNullOrWhiteSpace($currentPassword)) {
    Write-Host "✗ كلمة المرور مطلوبة!" -ForegroundColor Red
    exit 1
}

# Try to connect to PostgreSQL
Write-Host "`nجارٍ التحقق من الاتصال..." -ForegroundColor Cyan
Write-Host "Testing connection..." -ForegroundColor Cyan

$env:PGPASSWORD = $currentPassword
$testConnection = psql -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ الاتصال ناجح!" -ForegroundColor Green
    Write-Host "✓ Connection successful!" -ForegroundColor Green
    
    # Update .env file
    Write-Host "`nالخطوة 3: تحديث ملف .env..." -ForegroundColor Yellow
    Write-Host "Step 3: Updating .env file..." -ForegroundColor Yellow
    
    $envContent = Get-Content $envFile -Raw
    $envContent = $envContent -replace "POSTGRES_PASSWORD=.*", "POSTGRES_PASSWORD=$currentPassword"
    $envContent | Set-Content $envFile -Encoding UTF8
    
    Write-Host "✓ تم تحديث ملف .env" -ForegroundColor Green
    Write-Host "✓ .env file updated" -ForegroundColor Green
    
    # Create database if it doesn't exist
    Write-Host "`nالخطوة 4: التحقق من قاعدة البيانات..." -ForegroundColor Yellow
    Write-Host "Step 4: Checking database..." -ForegroundColor Yellow
    
    $dbExists = psql -U postgres -h localhost -lqt | Select-String -Pattern "\blms_db\b"
    
    if (-not $dbExists) {
        Write-Host "إنشاء قاعدة البيانات lms_db..." -ForegroundColor Cyan
        Write-Host "Creating database lms_db..." -ForegroundColor Cyan
        psql -U postgres -h localhost -c "CREATE DATABASE lms_db;"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ تم إنشاء قاعدة البيانات" -ForegroundColor Green
            Write-Host "✓ Database created" -ForegroundColor Green
        }
    } else {
        Write-Host "✓ قاعدة البيانات موجودة" -ForegroundColor Green
        Write-Host "✓ Database exists" -ForegroundColor Green
    }
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  تم الإصلاح بنجاح!" -ForegroundColor Green
    Write-Host "  Fixed Successfully!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "الآن يمكنك تشغيل:" -ForegroundColor Cyan
    Write-Host "Now you can run:" -ForegroundColor Cyan
    Write-Host "  python manage.py migrate_schemas" -ForegroundColor White
    Write-Host "  python manage.py runserver" -ForegroundColor White
    
} else {
    Write-Host "`n✗ فشل الاتصال بقاعدة البيانات" -ForegroundColor Red
    Write-Host "✗ Failed to connect to database" -ForegroundColor Red
    Write-Host "`nيرجى التحقق من:" -ForegroundColor Yellow
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL يعمل (PostgreSQL is running)" -ForegroundColor White
    Write-Host "  2. كلمة المرور صحيحة (Password is correct)" -ForegroundColor White
    Write-Host "  3. المستخدم 'postgres' موجود (User 'postgres' exists)" -ForegroundColor White
}

