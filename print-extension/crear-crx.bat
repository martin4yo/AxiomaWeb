@echo off
echo ==========================================
echo Crear Paquete CRX para Distribucion
echo ==========================================
echo.

echo NOTA: Chrome removio el comando --pack-extension en versiones recientes.
echo Este script intentara empaquetar, pero probablemente falle.
echo.
echo Si falla, usa una de estas alternativas:
echo   1. crear-crx-auto.ps1  ^(PowerShell automatico^)
echo   2. CREAR-CRX-MANUAL.md ^(manual desde Chrome^)
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
    echo.
    echo Usar metodo manual: ver CREAR-CRX-MANUAL.md
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
    %CHROME_PATH% --pack-extension="%CD%" --pack-extension-key="%CD%\dist\axioma-print-manager.pem" 2>nul
) else (
    echo Generando nueva clave privada...
    %CHROME_PATH% --pack-extension="%CD%" 2>nul

    REM Mover la clave a la carpeta dist
    if exist "print-extension.pem" (
        move "print-extension.pem" "dist\axioma-print-manager.pem" >nul
    )
)

REM Mover el .crx a dist
if exist "print-extension.crx" (
    move "print-extension.crx" "dist\axioma-print-manager.crx" >nul
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
    echo.
    echo Chrome ya no soporta --pack-extension.
    echo.
    echo USA UNA DE ESTAS ALTERNATIVAS:
    echo.
    echo   1. METODO AUTOMATICO ^(recomendado^):
    echo      powershell -ExecutionPolicy Bypass -File crear-crx-auto.ps1
    echo.
    echo   2. METODO MANUAL ^(mas simple^):
    echo      Ver instrucciones en CREAR-CRX-MANUAL.md
    echo.
    echo   3. MODO DESARROLLADOR ^(para testing^):
    echo      - chrome://extensions/
    echo      - Activar "Modo de desarrollador"
    echo      - Cargar extension sin empaquetar
    echo.
)
echo ==========================================
pause
