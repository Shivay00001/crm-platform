# CRM Platform Backend Deployment Script
param(
    [switch]$Dev = $false,
    [switch]$Prod = $false,
    [switch]$Install = $false
)

$ErrorActionPreference = "Continue"
$BackendDir = $PSScriptRoot

# Color functions
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error-Custom { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Cyan }

Write-Info "CRM Platform Backend Deployment"
Write-Host "================================"
Write-Host ""

# Check Node.js
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "npm not found. Install Node.js from https://nodejs.org/"
    exit 1
}

$nodeVersion = node --version
Write-Success "Node.js: $nodeVersion"

# Install dependencies
if ($Install -or -not (Test-Path "$BackendDir\node_modules")) {
    Write-Info "Installing dependencies..."
    cd $BackendDir
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    }
    else {
        Write-Error-Custom "Failed to install dependencies"
        exit 1
    }
}

# Create necessary directories
$dirs = @("logs", "uploads", "temp")
foreach ($dir in $dirs) {
    $path = Join-Path $BackendDir $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Success "Created directory: $dir"
    }
}

# Create .env if needed
if (-not (Test-Path "$BackendDir\.env")) {
    if (Test-Path "$BackendDir\.env.example") {
        Copy-Item "$BackendDir\.env.example" "$BackendDir\.env"
        Write-Success "Created .env file (please configure)"
    }
}

# Build TypeScript
Write-Info "Building TypeScript..."
cd $BackendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Build failed"
    exit 1
}
Write-Success "Build complete"

# Run backend
Write-Host ""
Write-Info "Starting CRM Backend on port 8003..."
Write-Host ""

if ($Prod) {
    # Production mode
    Write-Info "Running in PRODUCTION mode"
    npm run start:prod
}
else {
    # Development mode (default)
    Write-Info "Running in DEVELOPMENT mode"
    npm run dev
}
