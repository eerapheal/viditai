# AutoCut AI - Master Backend Runner
# Launches the unified API + AI Engine from the root directory.

$API_DIR = "$PSScriptRoot\apps\api"
$SCRIPT = "$API_DIR\run_api.ps1"

if (Test-Path $SCRIPT) {
    Write-Host "🚀 Launching Unified AutoCut AI Backend..." -ForegroundColor Cyan
    & $SCRIPT
} else {
    Write-Error "❌ Master script not found at $SCRIPT"
}
