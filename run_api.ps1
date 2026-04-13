# AutoCut AI - Root Shortcut Runner
# Launches the API from the root directory.

$scriptPath = "apps/api/run_api.ps1"

if (Test-Path $scriptPath) {
    Set-Location "apps/api"
    ./run_api.ps1
    Set-Location "../../" # Return back to root on exit
} else {
    Write-Error "❌ API script not found at $scriptPath"
}
