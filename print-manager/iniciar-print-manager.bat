@echo off
REM ========================================
REM  Print Manager - Axioma Web
REM  Script de inicio automático
REM ========================================

REM Configurar nombre de impresora térmica
REM Modifica esto con el nombre exacto de tu impresora
set PRINTER_NAME=POS-80

REM Cambiar al directorio del Print Manager
cd /d "%~dp0"

REM Mostrar información
echo.
echo ========================================
echo   Print Manager - Axioma Web
echo ========================================
echo.
echo Impresora configurada: %PRINTER_NAME%
echo.
echo Iniciando servidor...
echo.

REM Iniciar el servidor
node server-thermal-windows.js

REM Si el servidor se cierra, pausar para ver errores
pause
