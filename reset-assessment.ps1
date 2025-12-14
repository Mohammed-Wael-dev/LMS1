# PowerShell script to reset user assessment
# Usage: .\reset-assessment.ps1 student@gmail.com

param(
    [Parameter(Mandatory=$false)]
    [string]$Email = "student@gmail.com"
)

Write-Host "=== Reset User Assessment ===" -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor Yellow
Write-Host ""

# Navigate to Django project
$djangoPath = "LMS-saas-django-main"
if (-not (Test-Path $djangoPath)) {
    Write-Host "❌ Django project not found!" -ForegroundColor Red
    exit 1
}

Set-Location $djangoPath

# Activate virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    exit 1
}

# Run Django shell command
Write-Host "Resetting assessment for $Email..." -ForegroundColor Yellow
Write-Host ""

python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from account.models import User, UserAssessment

try:
    user = User.objects.get(email='$Email')
    
    # Delete all user assessments
    deleted_count = UserAssessment.objects.filter(user=user).delete()[0]
    
    # Reset user assessment fields
    user.has_completed_assessment = False
    user.assessment_level = None
    user.save()
    
    print(f'✅ تم حذف {deleted_count} إجابة للاختبار')
    print(f'✅ تم إعادة تعيين حالة الاختبار')
    print(f'   - has_completed_assessment: {user.has_completed_assessment}')
    print(f'   - assessment_level: {user.assessment_level}')
except User.DoesNotExist:
    print(f'❌ المستخدم غير موجود: $Email')
except Exception as e:
    print(f'❌ خطأ: {str(e)}')
"

Write-Host ""
Write-Host "✅ تم الانتهاء!" -ForegroundColor Green
Set-Location ..

