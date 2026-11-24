@echo off
chcp 65001 >nul
title [SMART PLANT] THEO DOI NHAT KY BACKEND (LIVE LOGS)
cd /d "%~dp0"

echo ======================================================================
echo       THEO DOI TRUC TIEP NHAT KY BACKEND NESTJS (LIVE LOGS)
echo ======================================================================
echo  File nguon : logs\backend.log
echo  Noi dung   : 
echo   - Tien trinh khoi dong & dang ky Routes cua NestJS
echo   - Ket noi CSDL & truy van TypeORM
echo   - Nhat ky luu du lieu do am dat tu TelemetryService
echo     (Dang: [TelemetryService] Saved telemetry from ... raw=... at ...)
echo  --------------------------------------------------------------------
echo  Luu y: Nhan Ctrl + C de thoat che do theo doi bat ky luc nao.
echo ======================================================================
echo.

if not exist "%~dp0logs\backend.log" (
    echo [THONG BAO] File logs\backend.log chua ton tai. Vui long khoi dong he thong truoc!
    echo.
    pause
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0logs\backend.log' -Wait -Tail 40"
