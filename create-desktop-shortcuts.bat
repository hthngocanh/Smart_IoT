@echo off
chcp 65001 >nul
title [SMART PLANT] TAO SHORTCUT DESKTOP
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcuts.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Co loi xay ra khi tao shortcut. Nhan phim bat ky de thoat...
    pause >nul
)
