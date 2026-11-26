# Build POSDEMO-Printer-Setup.exe (Standalone Windows 1-Click Installer)
$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$pkgDir = Join-Path $rootDir "pkg-installer-tmp"
$downloadsDir = Join-Path $rootDir "public\downloads"
$tempPayloadZip = Join-Path $rootDir "scripts\payload.zip"
$csSource = Join-Path $rootDir "scripts\PrinterInstaller.cs"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

Write-Host "Creating clean Printer Setup package payload..." -ForegroundColor Cyan

if (Test-Path $pkgDir) { Remove-Item $pkgDir -Recurse -Force }
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $pkgDir "scripts") -Force | Out-Null

Copy-Item (Join-Path $rootDir "print-agent.cjs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "run-printer-silent.vbs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "start-printer-agent.bat") $pkgDir -Force
Copy-Item (Join-Path $rootDir "stop-printer-agent.bat") $pkgDir -Force

if (Test-Path (Join-Path $rootDir ".env")) {
    Copy-Item (Join-Path $rootDir ".env") $pkgDir -Force
}

$installerBat = Join-Path $rootDir "scripts\INSTALL-POSDEMO-PRINTER.bat"
if (Test-Path $installerBat) {
    Copy-Item $installerBat (Join-Path $pkgDir "INSTALL-POSDEMO-PRINTER.bat") -Force
}
Copy-Item (Join-Path $rootDir "scripts\README-INSTRUCTIONS.txt") $pkgDir -Force

# Compile PrinterControl.exe
$ctrlCs = Join-Path $rootDir "scripts\PrinterControl.cs"
$ctrlExe = Join-Path $rootDir "scripts\PrinterControl.exe"
if (Test-Path $ctrlCs) {
    Write-Host "Compiling PrinterControl.exe..." -ForegroundColor Cyan
    & $csc /target:winexe /optimize+ /out:"$ctrlExe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "$ctrlCs"
    if (Test-Path $ctrlExe) {
        Copy-Item $ctrlExe $pkgDir -Force
    }
}

$printerScripts = @(
    "print-raw.ps1",
    "raw-print.exe",
    "raw-print.cs",
    "setup-autostart.ps1",
    "stop-agent.ps1",
    "remove-autostart.ps1",
    "PrinterControl.cs"
)

foreach ($sc in $printerScripts) {
    $srcPath = Join-Path $rootDir "scripts\$sc"
    if (Test-Path $srcPath) {
        Copy-Item $srcPath (Join-Path $pkgDir "scripts\$sc") -Force
    }
}

# Zip payload
if (Test-Path $tempPayloadZip) { Remove-Item $tempPayloadZip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($pkgDir, $tempPayloadZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Remove-Item $pkgDir -Recurse -Force

if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir -Force | Out-Null
}

$outExePath = Join-Path $downloadsDir "POSDEMO-Printer-Setup.exe"
if (Test-Path $outExePath) { Remove-Item $outExePath -Force }

Write-Host "Compiling standalone native Windows installer (.exe) with csc.exe..." -ForegroundColor Cyan

$cscArgs = @(
    "/target:winexe",
    "/optimize+",
    "/out:`"$outExePath`"",
    "/resource:`"$tempPayloadZip`",Payload.zip",
    "/reference:System.Windows.Forms.dll",
    "/reference:System.Drawing.dll",
    "`"$csSource`""
)

$proc = Start-Process -FilePath $csc -ArgumentList $cscArgs -NoNewWindow -Wait -PassThru

if (Test-Path $tempPayloadZip) { Remove-Item $tempPayloadZip -Force }

if ($proc.ExitCode -ne 0) {
    Write-Error "CSC compilation failed with exit code $($proc.ExitCode)"
    exit 1
}

# Also sync to dist/downloads if dist exists
$distDownloads = Join-Path $rootDir "dist\downloads"
if (Test-Path (Join-Path $rootDir "dist")) {
    if (-not (Test-Path $distDownloads)) {
        New-Item -ItemType Directory -Path $distDownloads -Force | Out-Null
    }
    Copy-Item $outExePath (Join-Path $distDownloads "POSDEMO-Printer-Setup.exe") -Force
}

Write-Host "Successfully generated standalone EXE installer: $outExePath" -ForegroundColor Green
Get-Item $outExePath | Select-Object Name, Length, LastWriteTime
