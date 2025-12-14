# Script to create local PostgreSQL database for LMS project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  إنشاء قاعدة البيانات المحلية" -ForegroundColor Cyan
Write-Host "  Creating Local Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$dbName = "lms_db"
$dbUser = "postgres"
$dbPassword = ""
$dbHost = "localhost"
$dbPort = "5432"

# Step 1: Get PostgreSQL password
Write-Host "الخطوة 1: إدخال كلمة مرور PostgreSQL" -ForegroundColor Yellow
Write-Host "Step 1: Enter PostgreSQL password" -ForegroundColor Yellow
Write-Host "`nإذا لم تكن لديك كلمة مرور، اضغط Enter لاستخدام كلمة مرور فارغة" -ForegroundColor Gray
Write-Host "If you don't have a password, press Enter for empty password`n" -ForegroundColor Gray

$securePassword = Read-Host "أدخل كلمة مرور PostgreSQL (Enter PostgreSQL password)" -AsSecureString
$dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    Write-Host "`n⚠ سيتم استخدام كلمة مرور فارغة" -ForegroundColor Yellow
    Write-Host "⚠ Will use empty password" -ForegroundColor Yellow
    $dbPassword = ""
}

# Step 2: Test connection
Write-Host "`nالخطوة 2: التحقق من الاتصال..." -ForegroundColor Yellow
Write-Host "Step 2: Testing connection..." -ForegroundColor Yellow

$env:PGPASSWORD = $dbPassword
$testResult = psql -U $dbUser -h $dbHost -p $dbPort -c "SELECT version();" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ فشل الاتصال بـ PostgreSQL" -ForegroundColor Red
    Write-Host "✗ Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "`nيرجى التحقق من:" -ForegroundColor Yellow
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL يعمل (PostgreSQL is running)" -ForegroundColor White
    Write-Host "  2. كلمة المرور صحيحة (Password is correct)" -ForegroundColor White
    Write-Host "  3. المستخدم '$dbUser' موجود (User '$dbUser' exists)" -ForegroundColor White
    Write-Host "`nيمكنك التحقق من الخدمة:" -ForegroundColor Cyan
    Write-Host "You can check the service:" -ForegroundColor Cyan
    Write-Host "  Get-Service -Name '*postgresql*'" -ForegroundColor White
    exit 1
}

Write-Host "✓ الاتصال ناجح!" -ForegroundColor Green
Write-Host "✓ Connection successful!" -ForegroundColor Green

# Step 3: Check if database exists
Write-Host "`nالخطوة 3: التحقق من قاعدة البيانات..." -ForegroundColor Yellow
Write-Host "Step 3: Checking database..." -ForegroundColor Yellow

$dbExists = psql -U $dbUser -h $dbHost -p $dbPort -lqt | Select-String -Pattern "\b$dbName\b"

if ($dbExists) {
    Write-Host "⚠ قاعدة البيانات '$dbName' موجودة بالفعل" -ForegroundColor Yellow
    Write-Host "⚠ Database '$dbName' already exists" -ForegroundColor Yellow
    
    $drop = Read-Host "هل تريد حذفها وإنشاء جديدة؟ (y/n) (Delete and recreate? y/n)"
    if ($drop -eq "y" -or $drop -eq "Y") {
        Write-Host "جارٍ حذف قاعدة البيانات..." -ForegroundColor Cyan
        Write-Host "Dropping database..." -ForegroundColor Cyan
        psql -U $dbUser -h $dbHost -p $dbPort -c "DROP DATABASE $dbName;"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ تم حذف قاعدة البيانات" -ForegroundColor Green
            Write-Host "✓ Database dropped" -ForegroundColor Green
        } else {
            Write-Host "✗ فشل حذف قاعدة البيانات" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ سيتم استخدام قاعدة البيانات الموجودة" -ForegroundColor Green
        Write-Host "✓ Will use existing database" -ForegroundColor Green
    }
}

# Step 4: Create database
if (-not $dbExists -or ($drop -eq "y" -or $drop -eq "Y")) {
    Write-Host "`nالخطوة 4: إنشاء قاعدة البيانات..." -ForegroundColor Yellow
    Write-Host "Step 4: Creating database..." -ForegroundColor Yellow
    
    psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ تم إنشاء قاعدة البيانات '$dbName' بنجاح!" -ForegroundColor Green
        Write-Host "✓ Database '$dbName' created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ فشل إنشاء قاعدة البيانات" -ForegroundColor Red
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Update .env file
Write-Host "`nالخطوة 5: تحديث ملف .env..." -ForegroundColor Yellow
Write-Host "Step 5: Updating .env file..." -ForegroundColor Yellow

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "إنشاء ملف .env جديد..." -ForegroundColor Cyan
    Write-Host "Creating new .env file..." -ForegroundColor Cyan
}

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

$envContent | Set-Content $envFile -Encoding UTF8

Write-Host "✓ تم تحديث ملف .env" -ForegroundColor Green
Write-Host "✓ .env file updated" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  تم الإعداد بنجاح!" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "الآن يمكنك تشغيل:" -ForegroundColor Cyan
Write-Host "Now you can run:" -ForegroundColor Cyan
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python manage.py migrate_schemas" -ForegroundColor White
Write-Host "  python manage.py runserver" -ForegroundColor White
Write-Host ""










