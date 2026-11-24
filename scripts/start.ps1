param(
    [string]$Esp32Ip,
    [switch]$NoWait
)

# ======================================================================
# SMART PLANT IoT - SCRIPT KHOI DONG TOAN BO HE THONG (ONE-CLICK)
# ======================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $WorkspaceRoot

$LogDir = Join-Path $WorkspaceRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     HE THONG TUOI CAY THONG MINH IoT - SMART PLANT LAUNCHER" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "[Thu muc lam viec] $WorkspaceRoot" -ForegroundColor Gray
Write-Host ""

# Helper doc file .env
function Get-EnvConfig {
    param([string]$FilePath)
    $config = @{}
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line.Split("=", 2)
                $config[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
    return $config
}

$envConfig = Get-EnvConfig -FilePath (Join-Path $WorkspaceRoot ".env")
$dbUser = if ($envConfig["DB_USER"]) { $envConfig["DB_USER"] } else { "smartplant_user" }
$dbName = if ($envConfig["DB_NAME"]) { $envConfig["DB_NAME"] } else { "smart_plant" }
$dbPort = if ($envConfig["DB_PORT"]) { $envConfig["DB_PORT"] } else { "5434" }

# ----------------------------------------------------------------------
# 1. Kiem tra cong cu tien quyet (Node.js, Docker Desktop)
# ----------------------------------------------------------------------
Write-Host ">>> [1/6] Kiem tra moi truong he thong & Docker..." -ForegroundColor Cyan

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[LOI] Khong tim thay Node.js tren may tinh!" -ForegroundColor Red
    Write-Host "Vui long cai dat Node.js tai https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node -v
Write-Host "  -> Node.js: $nodeVersion" -ForegroundColor Green

# Kiem tra trang thai Docker Engine
$dockerRunning = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "  -> Docker Engine chua san sang. Dang thu tu dong bat Docker Desktop..." -ForegroundColor Yellow
    $dockerExePath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    
    if (Test-Path $dockerExePath) {
        Start-Process $dockerExePath
        Write-Host -NoNewline "  -> Dang cho Docker Desktop khoi dong Engine..." -ForegroundColor Gray
        
        $waitDocker = 0
        $maxWaitDocker = 45
        while (-not $dockerRunning -and $waitDocker -lt $maxWaitDocker) {
            Start-Sleep -Seconds 3
            $waitDocker += 3
            Write-Host -NoNewline "." -ForegroundColor Gray
            try {
                $null = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerRunning = $true
                }
            } catch {}
        }
        Write-Host ""
    }
}

if (-not $dockerRunning) {
    Write-Host "[LOI] Khong the ket noi toi Docker Engine!" -ForegroundColor Red
    Write-Host "  Nguyen nhan: Docker Desktop chua duoc bat hoac mat nhieu thoi gian de khoi dong Engine." -ForegroundColor Yellow
    Write-Host "  Cach xu ly: Vui long mo Docker Desktop thu cong tu Start Menu va cho den khi bieu tuong hien thi 'Running'." -ForegroundColor Yellow
    Write-Host ""
    if (-not $NoWait) {
        Write-Host "Nhan phim bat ky de thoat..." -ForegroundColor Gray
        try { $null = Read-Host } catch {}
    }
    exit 1
}
Write-Host "  -> Docker Engine: San sang hoat dong" -ForegroundColor Green

# ----------------------------------------------------------------------
# 2. Khoi dong va kiem tra PostgreSQL Database bang truy van SELECT 1
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [2/6] Kiem tra va khoi dong PostgreSQL Database..." -ForegroundColor Cyan

$composeFile = Join-Path $WorkspaceRoot "docker-compose.yml"
$null = docker compose -f $composeFile up -d smart-plant-postgres 2>&1

$dbReady = $false
$retryCount = 0
$maxRetries = 20
Write-Host -NoNewline "  -> Kiem tra ket noi va thuc thi truy van SQL tren container smart-plant-postgres..." -ForegroundColor Gray

while (-not $dbReady -and $retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 1
    $retryCount++
    Write-Host -NoNewline "." -ForegroundColor Gray
    
    try {
        # Kiem tra ket noi truc tiep vao database va chay SELECT 1
        $queryResult = docker exec smart-plant-postgres psql -U $dbUser -d $dbName -t -A -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0 -and $queryResult.Trim() -eq "1") {
            $dbReady = $true
        }
    } catch {}
}
Write-Host ""

if ($dbReady) {
    Write-Host "  [OK] PostgreSQL Database (Port $dbPort) san sang va truy van 'SELECT 1' thanh cong!" -ForegroundColor Green
} else {
    Write-Host "  [CANH BAO] Chua thuc hien duoc truy van SQL toi PostgreSQL sau $maxRetries giay." -ForegroundColor Red
    Write-Host "  Vui long kiem tra logs container: docker logs smart-plant-postgres" -ForegroundColor Yellow
}

# ----------------------------------------------------------------------
# 3. Kiem tra va khoi dong Backend NestJS (Kiem tra Health & Database)
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [3/6] Kiem tra va khoi dong Backend NestJS..." -ForegroundColor Cyan

$backendUrl = "http://localhost:3000/api/v1/health"
$backendAlreadyHealthy = $false

try {
    $health = Invoke-RestMethod -Uri $backendUrl -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($health.status -eq "healthy" -and $health.database.status -eq "connected") {
        $backendAlreadyHealthy = $true
    }
} catch {
    $backendAlreadyHealthy = $false
}

$backendMetaFile = Join-Path $LogDir "backend.process.json"
$backendPidFile = Join-Path $LogDir "backend.pid"

if ($backendAlreadyHealthy) {
    Write-Host "  [OK] Backend NestJS da dang chay va ket noi CSDL on dinh. Su dung lai tien trinh hien tai." -ForegroundColor Green
    Write-Host "       Trang thai API: $($health.status) | Database: $($health.database.status) (Do tre: $($health.database.latencyMs)ms)" -ForegroundColor Gray
} else {
    $backendDir = Join-Path $WorkspaceRoot "backend"
    $distMain = Join-Path $backendDir "dist\main.js"
    
    if (-not (Test-Path $distMain)) {
        Write-Host "  -> Dang bien dich ma nguon TypeScript Backend (npm run build)..." -ForegroundColor Yellow
        Push-Location $backendDir
        $null = npm run build
        Pop-Location
    }
    
    $backendLog = Join-Path $LogDir "backend.log"
    $backendErr = Join-Path $LogDir "backend-error.log"
    
    $backendProc = Start-Process -FilePath "node" `
        -ArgumentList "dist/main.js" `
        -WorkingDirectory $backendDir `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErr `
        -WindowStyle Hidden `
        -PassThru

    # Ghi thong tin tien trinh de xac thuc quyen so huu khi dung
    $procInfo = @{
        pid = $backendProc.Id
        name = "node"
        cwd = $backendDir
        script = "dist/main.js"
        startTime = (Get-Date).ToString("o")
    }
    $procInfo | ConvertTo-Json | Out-File -FilePath $backendMetaFile -Encoding utf8
    $backendProc.Id | Out-File -FilePath $backendPidFile -Encoding ascii
    Write-Host "  -> Tien trinh Backend khoi tao voi PID: $($backendProc.Id)" -ForegroundColor Gray
    
    # Cho Backend phan hoi API health voi ket noi Database connected
    $backendReady = $false
    $retry = 0
    $maxRetry = 25
    Write-Host -NoNewline "  -> Dang cho Backend khoi dong va kiem tra API health..." -ForegroundColor Gray
    
    $healthInfo = $null
    while (-not $backendReady -and $retry -lt $maxRetry) {
        Start-Sleep -Seconds 1
        $retry++
        Write-Host -NoNewline "." -ForegroundColor Gray
        try {
            $h = Invoke-RestMethod -Uri $backendUrl -Method Get -TimeoutSec 1 -ErrorAction Stop
            if ($h.status -eq "healthy" -and $h.database.status -eq "connected") {
                $backendReady = $true
                $healthInfo = $h
            }
        } catch {}
    }
    Write-Host ""
    
    if ($backendReady) {
        Write-Host "  [OK] Backend NestJS khoi dong thanh cong tai: http://localhost:3000" -ForegroundColor Green
        Write-Host "       API Health: $($healthInfo.status) | Database: $($healthInfo.database.status) ($($healthInfo.database.latencyMs)ms)" -ForegroundColor Gray
    } else {
        Write-Host "  [CANH BAO] Backend chua san sang hoac chua ket noi CSDL sau $maxRetry giay." -ForegroundColor Yellow
        Write-Host "  Kiem tra nhat ky loi tai: $backendErr" -ForegroundColor Yellow
    }
}

# ----------------------------------------------------------------------
# 4. Kiem tra va khoi dong Frontend React (Kiem tra bang HTTP GET)
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [4/6] Kiem tra va khoi dong Frontend React..." -ForegroundColor Cyan

$frontendUrl = "http://127.0.0.1:5173"
$frontendAlreadyRunning = $false

try {
    $fRes = Invoke-WebRequest -Uri $frontendUrl -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($fRes.StatusCode -eq 200) {
        $frontendAlreadyRunning = $true
    }
} catch {
    $frontendAlreadyRunning = $false
}

$frontendMetaFile = Join-Path $LogDir "frontend.process.json"
$frontendPidFile = Join-Path $LogDir "frontend.pid"

if ($frontendAlreadyRunning) {
    Write-Host "  [OK] Frontend React da dang chay tai: http://localhost:5173 (HTTP 200). Su dung lai tien trinh hien tai." -ForegroundColor Green
} else {
    $frontendDir = Join-Path $WorkspaceRoot "frontend"
    $frontendLog = Join-Path $LogDir "frontend.log"
    $frontendErr = Join-Path $LogDir "frontend-error.log"
    $viteBin = Join-Path $frontendDir "node_modules\vite\bin\vite.js"
    
    if (Test-Path $viteBin) {
        $frontendProc = Start-Process -FilePath "node" `
            -ArgumentList "`"$viteBin`" --host 0.0.0.0 --port 5173" `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput $frontendLog `
            -RedirectStandardError $frontendErr `
            -WindowStyle Hidden `
            -PassThru
    } else {
        $frontendProc = Start-Process -FilePath "npx" `
            -ArgumentList "vite --host 0.0.0.0 --port 5173" `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput $frontendLog `
            -RedirectStandardError $frontendErr `
            -WindowStyle Hidden `
            -PassThru
    }

    $fProcInfo = @{
        pid = $frontendProc.Id
        name = "node"
        cwd = $frontendDir
        script = "vite"
        startTime = (Get-Date).ToString("o")
    }
    $fProcInfo | ConvertTo-Json | Out-File -FilePath $frontendMetaFile -Encoding utf8
    $frontendProc.Id | Out-File -FilePath $frontendPidFile -Encoding ascii
    Write-Host "  -> Tien trinh Frontend khoi tao voi PID: $($frontendProc.Id)" -ForegroundColor Gray
    
    # Cho Frontend phan hoi bang HTTP GET 200 (kiem tra qua 127.0.0.1 tranh loi phan giai IPv6)
    $frontendReady = $false
    $fRetry = 0
    Write-Host -NoNewline "  -> Dang cho Frontend san sang phuc vu Web..." -ForegroundColor Gray
    while (-not $frontendReady -and $fRetry -lt 20) {
        Start-Sleep -Seconds 1
        $fRetry++
        Write-Host -NoNewline "." -ForegroundColor Gray
        try {
            $webCheck = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -Method Get -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            if ($webCheck.StatusCode -eq 200) {
                $frontendReady = $true
            }
        } catch {}
    }
    Write-Host ""
    
    if ($frontendReady) {
        Write-Host "  [OK] Frontend React khoi dong thanh cong tai: http://localhost:5173 (HTTP 200 OK)" -ForegroundColor Green
    } else {
        Write-Host "  [CANH BAO] Frontend chua phan hoi HTTP 200 sau 20 giay." -ForegroundColor Yellow
        Write-Host "  Kiem tra nhat ky loi tai: $frontendErr" -ForegroundColor Yellow
    }
}

# ----------------------------------------------------------------------
# 5. Kiem tra mang Wi-Fi va Cau hinh Ping ESP32
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [5/6] Kiem tra dia chi IP va ket noi toi ESP32..." -ForegroundColor Cyan

# Lay dia chi IP mang hien tai cua Laptop
$laptopIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | `
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | `
    Select-Object -ExpandProperty IPAddress

$hotspotIp = $laptopIps | Where-Object { $_ -like "172.20.10.*" } | Select-Object -First 1
if (-not $hotspotIp) {
    $hotspotIp = $laptopIps | Select-Object -First 1
}

$displayIp = if ($hotspotIp) { $hotspotIp } else { "Khong tim thay IP" }
Write-Host "  -> IP hien tai cua Laptop: " -NoNewline
Write-Host $displayIp -ForegroundColor Green

# Xac dinh dia chi IP cua ESP32:
# Uu tien 1: Tham so -Esp32Ip truyen truc tiep
# Uu tien 2: Bien ESP32_IP trong file .env
# Uu tien 3: Neu dang o mang 172.20.10.x thi uoc luong 172.20.10.3 (kem thong bao ro rang)
$targetEsp32Ip = $null
if ($Esp32Ip) {
    $targetEsp32Ip = $Esp32Ip
} elseif ($envConfig["ESP32_IP"]) {
    $targetEsp32Ip = $envConfig["ESP32_IP"]
} elseif ($hotspotIp -and $hotspotIp.StartsWith("172.20.10.")) {
    $targetEsp32Ip = "172.20.10.3"
    Write-Host "  [i] Chua cau hinh ESP32_IP trong .env. Kiem tra dia chi mac dinh: $targetEsp32Ip" -ForegroundColor Gray
}

if ($targetEsp32Ip) {
    $esp32Ping = Test-Connection -ComputerName $targetEsp32Ip -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($esp32Ping) {
        Write-Host "  [OK] ESP32 ($targetEsp32Ip) - Da ket noi vao mang Wi-Fi va phan hoi tot!" -ForegroundColor Green
    } else {
        Write-Host "  [!] ESP32 ($targetEsp32Ip) - Chua phan hoi tin hieu ping." -ForegroundColor Yellow
        Write-Host "      Luu y: Vui long bat Hotspot tren dien thoai va cam nguon ESP32." -ForegroundColor Gray
        Write-Host "      (Dashboard van hoat dong binh thuong de xem du lieu lich su)." -ForegroundColor Gray
    }
} else {
    Write-Host "  [i] Chua xac dinh duoc dia chi IP cua ESP32 trong mang hien tai." -ForegroundColor Yellow
    Write-Host "      (Meo: Ban co the them dong ESP32_IP=<dia-chi-ip> vao file .env de he thong tu dong kiem tra)." -ForegroundColor Gray
}

# ----------------------------------------------------------------------
# 6. Mo Dashboard tren trinh duyet web & Tong ket
# ----------------------------------------------------------------------
Write-Host ""
Write-Host ">>> [6/6] Mo Dashboard tren trinh duyet web..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "           KHOI DONG HE THONG SMART PLANT IoT THANH CONG!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  1. PostgreSQL DB:     127.0.0.1:$dbPort (Container: smart-plant-postgres)" -ForegroundColor White
Write-Host "  2. Backend NestJS:    http://localhost:3000 (API Health: /api/v1/health)" -ForegroundColor White
Write-Host "  3. Frontend React:    http://localhost:5173" -ForegroundColor White
Write-Host "  4. Nhat ky tien trinh: Thu muc logs/ (backend.log, frontend.log)" -ForegroundColor White
Write-Host "  5. Khi can tat:       Chay file stop-smart-plant.bat" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "He thong dang chay an duoi nen. Ban co the dong cua so nay." -ForegroundColor Yellow
if (-not $NoWait) {
    Write-Host "Nhan Enter de thoat cua so dieu khien..." -ForegroundColor Gray
    try { $null = Read-Host } catch {}
}
