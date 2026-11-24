@echo off
chcp 65001 >nul
title [SMART PLANT] KHOI DONG HE THONG TUOI THONG MINH IoT
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Co loi xay ra trong qua trinh khoi dong. Nhan phim bat ky de thoat...
    pause >nul
)
