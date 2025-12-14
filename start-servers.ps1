# Start Backend and Frontend Servers
Write-Host "=== Starting Servers ===" -ForegroundColor Cyan

# Stop any existing processes
Write-Host "`nStopping existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or ($_.ProcessName -like "*python*" -and $_.MainWindowTitle -like "*runserver*")} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Backend
Write-Host "`n=== Starting Backend (Django) ===" -ForegroundColor Green
$backendPath = "LMS-saas-django-main"
if (Test-Path $backendPath) {
    cd $backendPath
    if (Test-Path "venv\Scripts\Activate.ps1") {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; python manage.py runserver; Read-Host 'Press Enter to close'"
        Write-Host "Backend starting in new window..." -ForegroundColor Green
    } else {
        Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Backend directory not found!" -ForegroundColor Red
}

# Start Frontend
Write-Host "`n=== Starting Frontend (React) ===" -ForegroundColor Green
cd ..
$frontendPath = "lms-saas-react-dev"
if (Test-Path $frontendPath) {
    cd $frontendPath
    if (Test-Path "node_modules") {
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev; Read-Host 'Press Enter to close'"
        } else {
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev; Read-Host 'Press Enter to close'"
        }
        Write-Host "Frontend starting in new window..." -ForegroundColor Green
    } else {
        Write-Host "Installing dependencies first..." -ForegroundColor Yellow
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev; Read-Host 'Press Enter to close'"
        } else {
            npm install
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev; Read-Host 'Press Enter to close'"
        }
    }
} else {
    Write-Host "ERROR: Frontend directory not found!" -ForegroundColor Red
}

Write-Host "`n=== Servers Starting ===" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "`nWaiting 15 seconds for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check status
Write-Host "`n=== Checking Server Status ===" -ForegroundColor Cyan
try {
    $backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction Stop
    Write-Host "✓ Backend is running on port 8000" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is NOT running on port 8000" -ForegroundColor Red
}

try {
    $frontend = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction Stop
    Write-Host "✓ Frontend is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is NOT running on port 5173" -ForegroundColor Red
}
