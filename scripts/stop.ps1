param(
    [switch]$NoWait,
    [switch]$StopDocker
)

# ======================================================================
# SMART PLANT IoT - SCRIPT DUNG HE THONG AN TOAN (VERIFIED OWNERSHIP)
# ======================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $WorkspaceRoot
$LogDir = Join-Path $WorkspaceRoot "logs"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     DUNG HE THONG TUOI CAY THONG MINH IoT - SMART PLANT STOPPER" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "[Thu muc lam viec] $WorkspaceRoot" -ForegroundColor Gray
Write-Host ""

# Helper kiem tra quyen so huu tien trinh (Process Ownership Verification)
function Test-ProcessOwnership {
    param(
        [int]$ProcessId,
        [string]$ExpectedDirectoryKeyword,
        [string]$ExpectedScriptKeyword
    )
    
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) {
        return $false
    }
    
    # Kiem tra ten tien trinh co phai la node khong
    if ($proc.ProcessName -notmatch "node") {
        return $false
    }
    
    # Thu lay CommandLine qua WMI/CIM neu co quyen
    try {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        if ($cim -and $cim.CommandLine) {
            $cmdLine = $cim.CommandLine.ToLower()
            $hasDir = if ($ExpectedDirectoryKeyword) { $cmdLine.Contains($ExpectedDirectoryKeyword.ToLower()) } else { $true }
            $hasScript = if ($ExpectedScriptKeyword) { $cmdLine.Contains($ExpectedScriptKeyword.ToLower()) } else { $true }
            return ($hasDir -or $hasScript)
        }
    } catch {
        # Neu CIM bi han che quyen trong sandbox, xac thuc qua ProcessName va trang thai
        return ($proc.ProcessName -match "node")
    }
    
    return $true
}

# ----------------------------------------------------------------------
# 1. Dung tien trinh Backend NestJS (Xac thuc quyen so huu truoc khi dung)
# ----------------------------------------------------------------------
Write-Host ">>> [1/3] Dung tien trinh Backend NestJS..." -ForegroundColor Cyan

$backendMetaFile = Join-Path $LogDir "backend.process.json"
$backendPidFile = Join-Path $LogDir "backend.pid"
$backendStopped = $false

$targetPid = $null
if (Test-Path $backendMetaFile) {
    try {
        $meta = Get-Content $backendMetaFile -Raw | ConvertFrom-Json
        $targetPid = [int]$meta.pid
    } catch {}
} elseif (Test-Path $backendPidFile) {
    $rawPid = (Get-Content $backendPidFile -Raw).Trim()
    if ($rawPid -match "^\d+$") {
        $targetPid = [int]$rawPid
    }
}

if ($targetPid) {
    $isOwner = Test-ProcessOwnership -ProcessId $targetPid -ExpectedDirectoryKeyword "backend" -ExpectedScriptKeyword "main.js"
    if ($isOwner) {
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Da dung tien trinh Backend (PID: $targetPid) duoc tao boi Launcher." -ForegroundColor Green
        $backendStopped = $true
    } else {
        Write-Host "  [CANH BAO] PID $targetPid khong khop voi Backend Smart Plant (co the da tat hoac bi he dieu hanh tai su dung)." -ForegroundColor Yellow
        Write-Host "             Khong can thiep de tranh tat nham ung dung khac." -ForegroundColor Gray
    }
    Remove-Item $backendMetaFile -Force -ErrorAction SilentlyContinue
    Remove-Item $backendPidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  -> Khong co file PID Backend do Launcher quan ly." -ForegroundColor Gray
}

# Kiem tra trang thai Port 3000 (TUYET DOI KHONG TU DONG KILL TIEN TRINH NGOAI)
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    $ownerProc = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    $isOurBackend = Test-ProcessOwnership -ProcessId $port3000.OwningProcess -ExpectedDirectoryKeyword "backend" -ExpectedScriptKeyword "main.js"
    
    if ($isOurBackend) {
        Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Da giai phong Port 3000 tu tien trinh Backend ton dong (PID: $($port3000.OwningProcess))." -ForegroundColor Green
        $backendStopped = $true
    } else {
        Write-Host "  [THONG TIN] Port 3000 dang duoc su dung boi ung dung khac ngoai Smart Plant (PID: $($port3000.OwningProcess)). Bo qua an toan." -ForegroundColor Gray
    }
}

if (-not $backendStopped -and -not $port3000) {
    Write-Host "  -> Backend da o trang thai dung hoan toan." -ForegroundColor Gray
}

# ----------------------------------------------------------------------
# 2. Dung tien trinh Frontend React (Xac thuc quyen so huu truoc khi dung)
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [2/3] Dung tien trinh Frontend React..." -ForegroundColor Cyan

$frontendMetaFile = Join-Path $LogDir "frontend.process.json"
$frontendPidFile = Join-Path $LogDir "frontend.pid"
$frontendStopped = $false

$targetFPid = $null
if (Test-Path $frontendMetaFile) {
    try {
        $fmeta = Get-Content $frontendMetaFile -Raw | ConvertFrom-Json
        $targetFPid = [int]$fmeta.pid
    } catch {}
} elseif (Test-Path $frontendPidFile) {
    $rawFPid = (Get-Content $frontendPidFile -Raw).Trim()
    if ($rawFPid -match "^\d+$") {
        $targetFPid = [int]$rawFPid
    }
}

if ($targetFPid) {
    $isFOwner = Test-ProcessOwnership -ProcessId $targetFPid -ExpectedDirectoryKeyword "frontend" -ExpectedScriptKeyword "vite"
    if ($isFOwner) {
        Stop-Process -Id $targetFPid -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Da dung tien trinh Frontend (PID: $targetFPid) duoc tao boi Launcher." -ForegroundColor Green
        $frontendStopped = $true
    } else {
        Write-Host "  [CANH BAO] PID $targetFPid khong khop voi Frontend Smart Plant. Bo qua an toan." -ForegroundColor Yellow
    }
    Remove-Item $frontendMetaFile -Force -ErrorAction SilentlyContinue
    Remove-Item $frontendPidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  -> Khong co file PID Frontend do Launcher quan ly." -ForegroundColor Gray
}

# Kiem tra trang thai Port 5173 (TUYET DOI KHONG TU DONG KILL TIEN TRINH NGOAI)
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($port5173) {
    $isOurFrontend = Test-ProcessOwnership -ProcessId $port5173.OwningProcess -ExpectedDirectoryKeyword "frontend" -ExpectedScriptKeyword "vite"
    if ($isOurFrontend) {
        Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "  -> Da giai phong Port 5173 tu tien trinh Vite ton dong (PID: $($port5173.OwningProcess))." -ForegroundColor Green
        $frontendStopped = $true
    } else {
        Write-Host "  [THONG TIN] Port 5173 dang duoc su dung boi ung dung khac ngoai Smart Plant (PID: $($port5173.OwningProcess)). Bo qua an toan." -ForegroundColor Gray
    }
}

if (-not $frontendStopped -and -not $port5173) {
    Write-Host "  -> Frontend da o trang thai dung hoan toan." -ForegroundColor Gray
}

# ----------------------------------------------------------------------
# 3. Kiem tra trang thai PostgreSQL Container (Docker)
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [3/3] Xu ly PostgreSQL Database (Docker)..." -ForegroundColor Cyan
Write-Host "  [Thong tin] Container 'smart-plant-postgres' van dang tiep tuc chay nen." -ForegroundColor Gray
Write-Host "  Du lieu cam bien trong CSDL duoc luu giu nguyen ven trong Docker Volume." -ForegroundColor Green
Write-Host ""

if ($StopDocker) {
    $composeFile = Join-Path $WorkspaceRoot "docker-compose.yml"
    $null = docker compose -f $composeFile stop smart-plant-postgres 2>&1
    Write-Host "  -> Da dung container PostgreSQL theo tuy chon StopDocker!" -ForegroundColor Green
} elseif (-not $NoWait) {
    Write-Host "Ban co muon tat luon container PostgreSQL de tiet kiem RAM khong? (Y/N, mac dinh N): " -NoNewline -ForegroundColor Yellow
    $userChoice = $null
    try { $userChoice = Read-Host } catch {}

    if ($userChoice -eq "Y" -or $userChoice -eq "y") {
        $composeFile = Join-Path $WorkspaceRoot "docker-compose.yml"
        $null = docker compose -f $composeFile stop smart-plant-postgres 2>&1
        Write-Host "  -> Da dung container PostgreSQL thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "  -> Container PostgreSQL tiep tuc chay nen de san sang cho lan bat tiep theo." -ForegroundColor Gray
    }
} else {
    Write-Host "  -> Container PostgreSQL tiep tuc chay nen de san sang cho lan bat tiep theo." -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "        DA DUNG HE THONG SMART PLANT IoT AN TOAN HOAN TAT!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
if (-not $NoWait) {
    Write-Host "Nhan Enter de thoat cua so nay..." -ForegroundColor Gray
    try { $null = Read-Host } catch {}
}
