@echo off
REM Script para configurar el nombre de la impresora

cd /d "%~dp0"

echo.
echo ========================================
echo   Configurar Impresora Termica
echo ========================================
echo.

REM Mostrar impresoras instaladas
echo Impresoras disponibles:
echo.
powershell -Command "Get-Printer | Select-Object Name | Format-Table -HideTableHeaders"
echo.

REM Leer configuración actual si existe
set DEFAULT_PRINTER=POS-80
if exist config.txt (
    for /f "tokens=2 delims==" %%a in ('findstr "PRINTER_NAME" config.txt') do set DEFAULT_PRINTER=%%a
)

echo Configuracion actual: %DEFAULT_PRINTER%
echo.

REM Pedir nuevo nombre de impresora
set /p PRINTER_NAME="Ingrese el nombre de su impresora termica [%DEFAULT_PRINTER%]: "

REM Si no ingresa nada, usar el default
if "%PRINTER_NAME%"=="" set PRINTER_NAME=%DEFAULT_PRINTER%

REM Guardar configuración
echo PRINTER_NAME=%PRINTER_NAME% > config.txt
echo PORT=9100 >> config.txt

echo.
echo Configuracion guardada:
echo   Impresora: %PRINTER_NAME%
echo   Puerto: 9100
echo.

pause
