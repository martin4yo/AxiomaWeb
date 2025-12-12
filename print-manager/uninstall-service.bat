@echo off
REM Desinstalar servicio de Windows

cd /d "%~dp0"

echo Deteniendo servicio...
sc stop AxiomaWebPrintManager >nul 2>&1

timeout /t 2 /nobreak >nul

echo Desinstalando servicio...
tools\nssm\nssm.exe remove AxiomaWebPrintManager confirm

echo Servicio desinstalado
