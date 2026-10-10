# FinLedger-AI — Local PostgreSQL Setup & Migration Automation Script (Windows)
# Run from repository root: .\scripts\setup_postgres_local.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " FinLedger-AI Local Database Setup & Migration Script " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if .env exists, if not copy from .env.example
if (-not (Test-Path ".env")) {
    Write-Host "[1/5] Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "  -> Created .env. IMPORTANT: Open .env and set your actual DB_PASSWORD and SECRET_KEY." -ForegroundColor Yellow
} else {
    Write-Host "[1/5] Found existing .env file." -ForegroundColor Green
}

# 2. Check Python virtual environment
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[2/5] Creating Python virtual environment in .venv..." -ForegroundColor Yellow
    python -m venv .venv
}
Write-Host "[2/5] Virtual environment ready." -ForegroundColor Green

# 3. Install/upgrade backend requirements
Write-Host "[3/5] Installing backend dependencies..." -ForegroundColor Yellow
.\.venv\Scripts\pip.exe install -r backend\requirements.txt --quiet
Write-Host "  -> Dependencies installed." -ForegroundColor Green

# 4. Provision databases (finledger and finledger_test)
Write-Host "[4/5] Provisioning PostgreSQL databases and system clearing account..." -ForegroundColor Yellow
.\.venv\Scripts\python.exe backend\scripts\init_db.py

# 5. Run Alembic migrations on both databases
Write-Host "[5/5] Executing Alembic migrations on development and test databases..." -ForegroundColor Yellow
.\.venv\Scripts\alembic.exe -c backend\alembic.ini upgrade head
.\.venv\Scripts\alembic.exe -c backend\alembic.ini -x db=test upgrade head

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " FinLedger-AI Database Foundation Successfully Ready!   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
