# AutoCut AI - API Runner
# This script ensures the correct Virtual Environment (.venv) is used.

if (Test-Path ".\.venv\Scripts\python.exe") {
    Write-Host "🚀 Launching AutoCut AI API using virtual environment..." -ForegroundColor Cyan
    .\.venv\Scripts\python.exe start.py
} else {
    Write-Error "❌ Virtual environment (.venv) not found! Please ask Antigravity to rebuild it."
}
