@echo off
REM Script para descargar herramientas automáticamente

echo.
echo ========================================
echo   Descargando Herramientas
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0download-tools.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Descarga completada
) else (
    echo.
    echo ❌ Hubo errores durante la descarga
)

pause
