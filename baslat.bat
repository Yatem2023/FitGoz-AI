@echo off
chcp 65001 > nul
title Akilli Beden ve Kiyafet Asistani - Baslatici
echo ========================================================
echo   AKILLI BEDEN VE KIYAFET ASISTANI (TUBITAK 2204-B)
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [BILGI] Python algilandi. Yerel web sunucusu baslatiliyor...
    start "" http://localhost:8000
    echo [BILGI] Tarayici acildi. Kapatmak icin bu pencereyi kapatabilirsiniz.
    python -m http.server 8000
) else (
    echo [BILGI] Python bulunamadi, dogrudan tarayici uzerinde aciliyor...
    start "" "%~dp0index.html"
)
pause
