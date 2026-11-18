# BD HOSTT POS - Stop Printer Agent
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "               STOPPING BD HOSTT POS PRINTER AGENT" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$stoppedCount = 0

# 1. Stop wscript/cscript supervisor running run-printer-silent.vbs first so it cannot auto-restart
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -match '^(wscript|cscript)\.exe$') -and ($_.CommandLine -match 'run-printer-silent\.vbs')
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Supervisor Watchdog (PID: $($_.ProcessId))" -ForegroundColor Green
    $stoppedCount++
}

# 2. Stop node.exe running print-agent.cjs
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -eq 'node.exe') -and ($_.CommandLine -match 'print-agent\.cjs')
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Node.js Print Agent (PID: $($_.ProcessId))" -ForegroundColor Green
    $stoppedCount++
}

# 3. Free port 9123 if still held by any rogue process
$portProcs = Get-NetTCPConnection -LocalPort 9123 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pidToKill in $portProcs) {
    if ($pidToKill -and $pidToKill -gt 4) {
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        Write-Host "Released Port 9123 (PID: $pidToKill)" -ForegroundColor Green
        $stoppedCount++
    }
}

if ($stoppedCount -eq 0) {
    Write-Host "No active Printer Agent process was found." -ForegroundColor Yellow
} else {
    Write-Host "`nPrinter Agent successfully and completely stopped." -ForegroundColor Green
}
Write-Host ""
