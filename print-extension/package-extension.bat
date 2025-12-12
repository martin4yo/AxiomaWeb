@echo off
echo ==========================================
echo Empaquetar Extension para Chrome Web Store
echo ==========================================
echo.

REM Verificar que existe 7-Zip
where 7z >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: 7-Zip no esta instalado
    echo Descarga desde: https://www.7-zip.org/
    pause
    exit /b 1
)

REM Crear carpeta temporal
if exist temp-extension rmdir /s /q temp-extension
mkdir temp-extension

echo [1/3] Copiando archivos de la extension...

REM Copiar archivos necesarios
xcopy /s /y manifest.json temp-extension\
xcopy /s /y scripts temp-extension\scripts\
xcopy /s /y popup temp-extension\popup\

REM Copiar iconos si existen
if exist icons\*.png (
    mkdir temp-extension\icons
    xcopy /s /y icons\*.png temp-extension\icons\
)

echo [2/3] Creando archivo ZIP...
cd temp-extension
7z a -tzip ..\axioma-print-extension.zip * -mx9
cd ..

echo [3/3] Limpiando...
rmdir /s /q temp-extension

echo.
echo ==========================================
echo Extension empaquetada exitosamente!
echo Archivo: axioma-print-extension.zip
echo.
echo Subir a: https://chrome.google.com/webstore/devconsole
echo ==========================================
pause
