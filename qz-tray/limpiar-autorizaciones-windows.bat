@echo off
REM Script para limpiar todas las autorizaciones de QZ Tray y empezar de cero

echo ========================================
echo Limpiar Autorizaciones de QZ Tray
echo ========================================
echo.
echo Este script eliminara todas las autorizaciones guardadas
echo y permitira empezar de cero con la configuracion.
echo.
echo IMPORTANTE: Cierra QZ Tray antes de continuar
echo.
pause

REM Cerrar QZ Tray
echo Intentando cerrar QZ Tray...
taskkill /F /IM javaw.exe /FI "WINDOWTITLE eq QZ Tray*" 2>nul
timeout /t 2 >nul

REM Definir rutas
set USER_QZ=%USERPROFILE%\.qz
set ALLOWED_FILE=%USER_QZ%\allowed.dat
set BLOCKED_FILE=%USER_QZ%\blocked.dat
set SAVED_DIR=%USER_QZ%\saved

echo.
echo Limpiando archivos de autorizacion...

REM Eliminar allowed.dat
if exist "%ALLOWED_FILE%" (
    echo Eliminando: %ALLOWED_FILE%
    del "%ALLOWED_FILE%" 2>nul
    if %errorLevel% equ 0 (
        echo ✓ allowed.dat eliminado
    ) else (
        echo ✗ No se pudo eliminar allowed.dat
    )
) else (
    echo   allowed.dat no existe
)

REM Eliminar blocked.dat
if exist "%BLOCKED_FILE%" (
    echo Eliminando: %BLOCKED_FILE%
    del "%BLOCKED_FILE%" 2>nul
    if %errorLevel% equ 0 (
        echo ✓ blocked.dat eliminado
    ) else (
        echo ✗ No se pudo eliminar blocked.dat
    )
) else (
    echo   blocked.dat no existe
)

REM Eliminar carpeta saved
if exist "%SAVED_DIR%" (
    echo Eliminando: %SAVED_DIR%
    rd /S /Q "%SAVED_DIR%" 2>nul
    if %errorLevel% equ 0 (
        echo ✓ Carpeta saved/ eliminada
    ) else (
        echo ✗ No se pudo eliminar carpeta saved/
    )
) else (
    echo   Carpeta saved/ no existe
)

echo.
echo ========================================
echo ✅ LIMPIEZA COMPLETADA
echo ========================================
echo.
echo Todas las autorizaciones han sido eliminadas.
echo.
echo PROXIMOS PASOS:
echo.
echo 1. Abrir QZ Tray
echo.
echo 2. Abrir: qz-tray\verificar-certificado.html
echo.
echo 3. Click en "Test Conexion"
echo.
echo 4. CUANDO APAREZCA EL POPUP:
echo    - Verificar que el certificado muestre:
echo      Common Name: axiomaweb.axiomacloud.com
echo      Subject Alternative Names: localhost, 127.0.0.1
echo.
echo    - Click en "Allow"
echo    - Marcar "Remember this decision"
echo.
echo 5. Probar nuevamente
echo.
echo ========================================
pause
