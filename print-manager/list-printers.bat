@echo off
echo.
echo ========================================
echo   Impresoras Instaladas en Windows
echo ========================================
echo.

powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName | Format-Table -AutoSize"

echo.
echo Copia el nombre EXACTO de tu impresora termica
echo (sensible a mayusculas y espacios)
echo.
pause
