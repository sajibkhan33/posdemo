# Build optimized cpanel_deploy.zip for cPanel Phusion Passenger
$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$stagingDir = Join-Path $rootDir "cpanel-deploy-staging"
$zipPath = Join-Path $rootDir "cpanel_deploy.zip"

Write-Host "Creating clean cPanel deployment package..." -ForegroundColor Cyan

# 1. Clean previous staging and zip
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

# 2. Copy dist folder (excluding any .map files if any)
$distStaging = Join-Path $stagingDir "dist"
New-Item -ItemType Directory -Path $distStaging -Force | Out-Null
Copy-Item (Join-Path $rootDir "dist\*") $distStaging -Recurse -Force
Get-ChildItem -Path $distStaging -Recurse -Filter "*.map" | Remove-Item -Force

# 3. Copy public folder if exists
if (Test-Path (Join-Path $rootDir "public")) {
    $publicStaging = Join-Path $stagingDir "public"
    New-Item -ItemType Directory -Path $publicStaging -Force | Out-Null
    Copy-Item (Join-Path $rootDir "public\*") $publicStaging -Recurse -Force
}

# 4. Copy required server entry and configuration files
$filesToCopy = @(
    "app.js",
    "package.json",
    "package-lock.json",
    "print-agent.cjs",
    ".node-version",
    ".env.example",
    ".htaccess",
    "README.md"
)

foreach ($file in $filesToCopy) {
    $srcPath = Join-Path $rootDir $file
    if (Test-Path $srcPath) {
        Copy-Item $srcPath $stagingDir -Force
    }
}

# 5. Compress staging directory to cpanel_deploy.zip
Write-Host "Compressing files into $zipPath ..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingDir,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

# 6. Cleanup staging
Remove-Item $stagingDir -Recurse -Force

# 7. Report size
$zipItem = Get-Item $zipPath
$sizeMB = [math]::Round($zipItem.Length / 1MB, 2)
Write-Host "Successfully generated: $($zipItem.Name) - Size: $sizeMB MB" -ForegroundColor Green
