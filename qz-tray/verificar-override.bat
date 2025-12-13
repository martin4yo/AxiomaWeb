@echo off
REM Script para verificar instalación de override.crt

echo ========================================
echo Verificador de override.crt
echo ========================================
echo.

set QZ_DIR=C:\Program Files\QZ Tray
set OVERRIDE_FILE=%QZ_DIR%\override.crt
set EXPECTED_SIZE=1300

echo [1] Verificando directorio de QZ Tray...
if not exist "%QZ_DIR%" (
    echo ✗ QZ Tray NO encontrado en %QZ_DIR%
    echo.
    pause
    exit /b 1
)
echo ✓ QZ Tray encontrado

echo.
echo [2] Verificando archivo override.crt...
if not exist "%OVERRIDE_FILE%" (
    echo ✗ override.crt NO existe
    echo   Ubicacion esperada: %OVERRIDE_FILE%
    echo.
    echo   Ejecuta: instalar-override-windows.bat
    echo.
    pause
    exit /b 1
)
echo ✓ override.crt existe

echo.
echo [3] Verificando tamaño del archivo...
for %%A in ("%OVERRIDE_FILE%") do set ACTUAL_SIZE=%%~zA
echo   Tamaño actual: %ACTUAL_SIZE% bytes
if %ACTUAL_SIZE% LSS 1000 (
    echo ✗ Archivo muy pequeño, posiblemente incorrecto
    pause
    exit /b 1
)
if %ACTUAL_SIZE% GTR 2000 (
    echo ✗ Archivo muy grande, posiblemente incorrecto
    pause
    exit /b 1
)
echo ✓ Tamaño correcto

echo.
echo [4] Verificando contenido...
findstr /C:"BEGIN CERTIFICATE" "%OVERRIDE_FILE%" >nul
if %errorLevel% neq 0 (
    echo ✗ No contiene certificado valido
    pause
    exit /b 1
)
echo ✓ Contiene certificado

echo.
echo [5] Verificando hash MD5...
certutil -hashfile "%OVERRIDE_FILE%" MD5 | find "9c d1 9a 2b 54 3f d8 46 66 3f f9 3b 12 f1 b8 61" >nul
if %errorLevel% neq 0 (
    echo ⚠ Hash no coincide (puede ser normal si regeneraste el certificado)
) else (
    echo ✓ Hash correcto
)

echo.
echo ========================================
echo Detalles del archivo:
echo ========================================
echo Ubicacion: %OVERRIDE_FILE%
echo Tamaño: %ACTUAL_SIZE% bytes
echo.

echo Primeras lineas:
type "%OVERRIDE_FILE%" | more | findstr /N "^" | findstr "1: 2: 3:"

echo.
echo ========================================
echo ✅ Verificacion completada
echo ========================================
echo.
echo Proximos pasos:
echo 1. Reiniciar QZ Tray (Exit y volver a abrir)
echo 2. Abrir: qz-tray/verificar-certificado.html
echo 3. Click en "Test Conexion"
echo 4. Si sigue apareciendo popup, lee: DIAGNOSTICO-OVERRIDE.md
echo.
pause
