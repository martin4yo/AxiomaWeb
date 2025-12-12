@echo off
REM Instalar como servicio de Windows usando NSSM

cd /d "%~dp0"

REM Verificar si ya está instalado
sc query AxiomaWebPrintManager >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo El servicio ya esta instalado.
    echo Reinstalando...
    call uninstall-service.bat
)

REM Leer configuración
set PRINTER_NAME=POS-80
if exist config.txt (
    for /f "tokens=2 delims==" %%a in ('findstr "PRINTER_NAME" config.txt') do set PRINTER_NAME=%%a
)

echo Instalando servicio de Windows...

REM Instalar servicio usando NSSM (Non-Sucking Service Manager)
tools\nssm\nssm.exe install AxiomaWebPrintManager "%~dp0AxiomaPrintManager.exe"

REM Configurar servicio
tools\nssm\nssm.exe set AxiomaWebPrintManager AppDirectory "%~dp0"
tools\nssm\nssm.exe set AxiomaWebPrintManager DisplayName "Axioma Print Manager"
tools\nssm\nssm.exe set AxiomaWebPrintManager Description "Print Manager para impresion termica automatica - Axioma Web"
tools\nssm\nssm.exe set AxiomaWebPrintManager Start SERVICE_AUTO_START
tools\nssm\nssm.exe set AxiomaWebPrintManager AppEnvironmentExtra PRINTER_NAME=%PRINTER_NAME%
tools\nssm\nssm.exe set AxiomaWebPrintManager AppStdout "%~dp0logs\service-output.log"
tools\nssm\nssm.exe set AxiomaWebPrintManager AppStderr "%~dp0logs\service-error.log"
tools\nssm\nssm.exe set AxiomaWebPrintManager AppRotateFiles 1
tools\nssm\nssm.exe set AxiomaWebPrintManager AppRotateBytes 1048576

echo Servicio instalado exitosamente
echo.
echo El servicio se iniciara automaticamente al arrancar Windows.
echo.
