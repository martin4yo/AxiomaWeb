@echo off
echo ==========================================
echo Crear Paquete CRX para Distribucion
echo ==========================================
echo.

echo Este script creara un archivo .crx que puedes distribuir
echo a tus usuarios para instalacion sin Chrome Web Store.
echo.
echo IMPORTANTE: La primera vez se generara una clave privada.
echo Guardala en un lugar SEGURO para futuras actualizaciones.
echo.
pause

REM Crear carpeta de salida
if not exist "dist" mkdir dist

REM Verificar que Chrome este instalado
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist %CHROME_PATH% (
    echo ERROR: No se encontro Chrome instalado
    pause
    exit /b 1
)

echo [1/2] Verificando archivos necesarios...

REM Verificar que existan los archivos basicos
if not exist "manifest.json" (
    echo ERROR: No se encuentra manifest.json
    echo Ejecuta este script desde la carpeta print-extension
    pause
    exit /b 1
)

if not exist "scripts\background.js" (
    echo ERROR: Estructura de archivos incompleta
    pause
    exit /b 1
)

echo [2/2] Empaquetando extension...

REM Si existe clave privada previa, usarla
if exist "dist\axioma-print-manager.pem" (
    echo Usando clave privada existente...
    %CHROME_PATH% --pack-extension="%CD%" --pack-extension-key="%CD%\dist\axioma-print-manager.pem"
) else (
    echo Generando nueva clave privada...
    %CHROME_PATH% --pack-extension="%CD%"

    REM Mover la clave a la carpeta dist
    if exist "axioma-print-manager.pem" (
        move "axioma-print-manager.pem" "dist\axioma-print-manager.pem"
    )
)

REM Mover el .crx a dist
if exist "axioma-print-manager.crx" (
    move "axioma-print-manager.crx" "dist\axioma-print-manager.crx"
)

echo.
echo ==========================================
if exist "dist\axioma-print-manager.crx" (
    echo Exito! Paquete CRX creado
    echo.
    echo Archivos generados:
    echo   - dist\axioma-print-manager.crx  ^(extension para distribuir^)
    echo   - dist\axioma-print-manager.pem  ^(clave privada - GUARDAR SEGURO^)
    echo.
    echo IMPORTANTE: Guarda axioma-print-manager.pem en un lugar seguro.
    echo La necesitaras para futuras actualizaciones.
    echo.
    echo Para instalar:
    echo   1. Arrastra el archivo .crx a chrome://extensions/
    echo   2. Confirma la instalacion
) else (
    echo ERROR: Fallo la creacion del paquete
)
echo ==========================================
pause
