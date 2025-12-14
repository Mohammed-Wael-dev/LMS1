# PowerShell script to reset student assessment
# Usage: .\reset-student-assessment.ps1 student@gmail.com

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "=== Reset Student Assessment ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to Django project directory
$djangoDir = "LMS-saas-django-main"
if (-not (Test-Path $djangoDir)) {
    Write-Host "Error: Django directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $djangoDir

# Activate virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "Error: Virtual environment not found!" -ForegroundColor Red
    exit 1
}

# Run the Python script
Write-Host "Resetting assessment for user: $Email" -ForegroundColor Yellow
Write-Host ""

python reset_student_assessment.py $Email

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
