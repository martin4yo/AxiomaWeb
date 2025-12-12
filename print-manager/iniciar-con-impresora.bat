@echo off
REM Script para iniciar el Print Manager con el nombre de impresora correcto

echo.
echo ========================================
echo   Axioma Print Manager
echo ========================================
echo.

REM ⚙️ CONFIGURA AQUI EL NOMBRE DE TU IMPRESORA
REM Ejecuta list-printers.bat para ver el nombre exacto
set PRINTER_NAME=POS-80

echo Impresora configurada: %PRINTER_NAME%
echo.
echo Iniciando servidor...
echo.

REM Iniciar el Print Manager
cd /d "%~dp0build"
AxiomaPrintManager.exe

pause
