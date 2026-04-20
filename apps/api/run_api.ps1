# AutoCut AI - API Runner
# This script ensures the correct Virtual Environment (.venv) is used.

$VENV_PATH = "$PSScriptRoot\.venv"

if (Test-Path "$VENV_PATH\Scripts\python.exe") {
    Write-Host "🚀 Launching AutoCut AI API using virtual environment..." -ForegroundColor Cyan
    Set-Location $PSScriptRoot
    & "$VENV_PATH\Scripts\python.exe" start.py
} else {
    Write-Error "❌ Virtual environment (.venv) not found at $VENV_PATH!"
}
