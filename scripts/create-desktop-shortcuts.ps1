param(
    [switch]$NoWait
)

# ======================================================================
# SMART PLANT IoT - TAO SHORTCUT NGOAI MAN HINH DESKTOP
# ======================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
$desktopPath = [Environment]::GetFolderPath("Desktop")
if (-not $desktopPath -or -not (Test-Path $desktopPath)) {
    $desktopPath = Join-Path $env:USERPROFILE "Desktop"
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     TAO SHORTCUT SMART PLANT IoT TREN MAN HINH DESKTOP" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Desktop Path: $desktopPath" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $desktopPath)) {
    Write-Host "[LOI] Khong tim thay thu muc Desktop tai: $desktopPath" -ForegroundColor Red
    exit 1
}

$wshShell = New-Object -ComObject WScript.Shell

# 1. Shortcut: START SYSTEM
$startBat = Join-Path $WorkspaceRoot "start-smart-plant.bat"
$startLnk = Join-Path $desktopPath "SMART PLANT - START SYSTEM.lnk"

$scStart = $wshShell.CreateShortcut($startLnk)
$scStart.TargetPath = $startBat
$scStart.WorkingDirectory = $WorkspaceRoot
$scStart.Description = "Khoi dong toan bo he thong Smart Plant IoT (PostgreSQL, Backend, Frontend Dashboard)"
$scStart.IconLocation = "$env:SystemRoot\System32\shell32.dll,299"
$scStart.Save()

Write-Host "  [OK] Da tao shortcut khoi dong: $startLnk" -ForegroundColor Green

# 2. Shortcut: STOP SYSTEM
$stopBat = Join-Path $WorkspaceRoot "stop-smart-plant.bat"
$stopLnk = Join-Path $desktopPath "SMART PLANT - STOP SYSTEM.lnk"

$scStop = $wshShell.CreateShortcut($stopLnk)
$scStop.TargetPath = $stopBat
$scStop.WorkingDirectory = $WorkspaceRoot
$scStop.Description = "Dung an toan Backend va Frontend cua he thong Smart Plant IoT"
$scStop.IconLocation = "$env:SystemRoot\System32\shell32.dll,27"
$scStop.Save()

Write-Host "  [OK] Da tao shortcut tat he thong: $stopLnk" -ForegroundColor Green
Write-Host ""
Write-Host "Ban da co 2 bieu tuong khoi dong/tat nhanh ngay ngoai man hinh Desktop!" -ForegroundColor Cyan
if (-not $NoWait) {
    Write-Host "Nhan Enter de thoat..." -ForegroundColor Gray
    try { $null = Read-Host } catch {}
}
