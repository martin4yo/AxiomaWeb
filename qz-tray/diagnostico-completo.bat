@echo off
REM Diagnóstico completo de QZ Tray

echo ========================================
echo DIAGNOSTICO COMPLETO - QZ TRAY
echo ========================================
echo.

REM 1. Verificar instalación
echo [1/6] Verificando instalacion de QZ Tray...
set QZ_DIR=C:\Program Files\QZ Tray
if exist "%QZ_DIR%\qz-tray.jar" (
    echo ✓ QZ Tray instalado en: %QZ_DIR%
) else (
    echo ✗ QZ Tray NO encontrado
    goto :END
)

REM 2. Verificar versión
echo.
echo [2/6] Verificando version...
for /f "tokens=*" %%i in ('java -jar "%QZ_DIR%\qz-tray.jar" --version 2^>^&1') do (
    echo   Version: %%i
)

REM 3. Verificar override.crt
echo.
echo [3/6] Verificando override.crt...
if exist "%QZ_DIR%\override.crt" (
    echo ✓ override.crt existe
    for %%A in ("%QZ_DIR%\override.crt") do echo   Tamaño: %%~zA bytes
) else (
    echo ✗ override.crt NO existe
)

REM 4. Verificar carpeta de usuario
echo.
echo [4/6] Verificando carpeta de configuracion...
set USER_QZ=%USERPROFILE%\.qz
if exist "%USER_QZ%" (
    echo ✓ Carpeta .qz existe: %USER_QZ%
    if exist "%USER_QZ%\qz-tray.properties" (
        echo ✓ qz-tray.properties existe
        echo   Contenido:
        type "%USER_QZ%\qz-tray.properties"
    ) else (
        echo   (qz-tray.properties no existe - esto es normal)
    )
) else (
    echo   Carpeta .qz no existe (se creara al ejecutar QZ Tray)
)

REM 5. Verificar certificados guardados
echo.
echo [5/6] Verificando certificados guardados...
if exist "%USER_QZ%\saved" (
    dir /B "%USER_QZ%\saved" 2>nul
    if %errorLevel% equ 0 (
        echo   Certificados encontrados en saved/
    )
) else (
    echo   (No hay certificados guardados - esto es normal si no has autorizado sitios)
)

REM 6. Verificar si QZ Tray está corriendo
echo.
echo [6/6] Verificando si QZ Tray esta ejecutandose...
tasklist /FI "IMAGENAME eq javaw.exe" 2>nul | find /I "javaw.exe" >nul
if %errorLevel% equ 0 (
    echo ✓ Java esta corriendo (probablemente QZ Tray)
) else (
    echo ✗ QZ Tray no parece estar ejecutandose
)

echo.
echo ========================================
echo RECOMENDACIONES
echo ========================================
echo.

REM Determinar problema y sugerir solución
if not exist "%QZ_DIR%\override.crt" (
    echo 1. INSTALAR override.crt:
    echo    Ejecuta: instalar-override-windows.bat
    echo.
)

echo 2. SI override.crt NO FUNCIONA (QZ Tray 2.2+):
echo.
echo    QZ Tray 2.2+ cambio el metodo de confianza.
echo    Ahora usa "allowed-domains.txt" en lugar de "override.crt"
echo.
echo    Solucion alternativa:
echo.
echo    a) Crear archivo: C:\Program Files\QZ Tray\allowed-domains.txt
echo    b) Agregar esta linea:
echo       axiomaweb.axiomacloud.com
echo    c) Reiniciar QZ Tray
echo.

echo 3. O AUTORIZAR MANUALMENTE (mas confiable):
echo.
echo    a) Abrir QZ Tray
echo    b) Advanced -^> Site Manager
echo    c) Add -^> From origin: https://axiomaweb.axiomacloud.com
echo    d) Allow
echo.

echo 4. VERIFICAR VERSION:
echo.
echo    Si tu version es 2.2+, override.crt puede no funcionar.
echo    Usa los metodos 2 o 3 de arriba.
echo.

:END
echo.
echo ========================================
pause
