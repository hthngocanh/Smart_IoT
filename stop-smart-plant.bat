@echo off
chcp 65001 >nul
title [SMART PLANT] DUNG HE THONG TUOI THONG MINH IoT
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Co loi xay ra khi dung he thong. Nhan phim bat ky de thoat...
    pause >nul
)
