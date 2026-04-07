# Clicky for Windows - Setup Script
# Run this in PowerShell as Administrator

Write-Host "=== Clicky for Windows Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Node.js not found. Please install from https://nodejs.org (v18+)" -ForegroundColor Red
    exit 1
} else {
    $nodeVersion = node --version
    Write-Host "  Node.js found: $nodeVersion" -ForegroundColor Green
}

# 2. Check/Install Ollama
Write-Host "[2/4] Checking Ollama..." -ForegroundColor Yellow
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "  Ollama not found. Downloading installer..." -ForegroundColor Yellow
    $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $ollamaInstaller
    Write-Host "  Installing Ollama..." -ForegroundColor Yellow
    Start-Process -FilePath $ollamaInstaller -Wait
    Write-Host "  Ollama installed!" -ForegroundColor Green
} else {
    Write-Host "  Ollama found!" -ForegroundColor Green
}

# 3. Pull Gemma 4 model
Write-Host "[3/4] Pulling Gemma 3 4B vision model (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "  This is a ~3GB download." -ForegroundColor Gray

# Start Ollama serve in background if not running
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if (!$ollamaProcess) {
    Write-Host "  Starting Ollama server..." -ForegroundColor Yellow
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

ollama pull gemma3:4b
Write-Host "  Model ready!" -ForegroundColor Green

# 4. Install Node dependencies
Write-Host "[4/4] Installing app dependencies..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install
Write-Host "  Dependencies installed!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start Clicky:" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  Hold Ctrl+Shift+Space  →  speak your question" -ForegroundColor Gray
Write-Host "  Release                →  Clicky looks at your screen + guides you" -ForegroundColor Gray
Write-Host "  Esc                    →  dismiss" -ForegroundColor Gray
Write-Host ""
