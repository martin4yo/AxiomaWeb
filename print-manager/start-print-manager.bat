@echo off
REM Iniciar Print Manager manualmente

cd /d "%~dp0"

REM Leer configuración
set PRINTER_NAME=POS-80
if exist config.txt (
    for /f "tokens=2 delims==" %%a in ('findstr "PRINTER_NAME" config.txt') do set PRINTER_NAME=%%a
)

echo.
echo ========================================
echo   Axioma Print Manager
echo ========================================
echo.
echo Impresora: %PRINTER_NAME%
echo.
echo Iniciando servidor...
echo.

REM Verificar si hay certificados
if not exist "certs\localhost-cert.pem" (
    echo Generando certificados SSL...
    call setup-certificates.bat
)

REM Iniciar el ejecutable
set PRINTER_NAME=%PRINTER_NAME%
AxiomaPrintManager.exe

pause
