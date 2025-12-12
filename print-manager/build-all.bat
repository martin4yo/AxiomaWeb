@echo off
REM Script todo-en-uno para construir el instalador
REM Ejecuta todos los pasos necesarios automáticamente

echo.
echo ========================================
echo   Axioma Print Manager - Build All
echo ========================================
echo.

cd /d "%~dp0"

REM Paso 1: Verificar Node.js
echo [1/6] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Node.js no esta instalado
    echo.
    echo Descarga e instala Node.js desde: https://nodejs.org/
    echo Luego ejecuta este script de nuevo.
    echo.
    pause
    exit /b 1
)

node --version
npm --version
echo ✅ Node.js encontrado
echo.

REM Paso 2: Verificar/Instalar pkg
echo [2/6] Verificando pkg...
where pkg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  pkg no encontrado. Instalando globalmente...
    call npm install -g pkg
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Error instalando pkg
        echo.
        pause
        exit /b 1
    )
)
echo ✅ pkg disponible
echo.

REM Paso 3: Instalar dependencias del proyecto
echo [3/6] Instalando dependencias del proyecto...
if not exist "node_modules" (
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
    echo ✅ Dependencias instaladas
) else (
    echo ✅ Dependencias ya instaladas
)
echo.

REM Paso 4: Descargar herramientas
echo [4/6] Descargando herramientas (OpenSSL, NSSM)...

set TOOLS_NEEDED=0
if not exist "tools\openssl\openssl.exe" (
    echo    ⚠️  OpenSSL no encontrado
    set TOOLS_NEEDED=1
)
if not exist "tools\nssm\nssm.exe" (
    echo    ⚠️  NSSM no encontrado
    set TOOLS_NEEDED=1
)

if %TOOLS_NEEDED%==1 (
    echo.
    echo    Descargando herramientas automáticamente...
    powershell -ExecutionPolicy Bypass -File "%~dp0download-tools.ps1"
    echo.

    REM Verificar descarga exitosa
    if not exist "tools\openssl\openssl.exe" (
        echo    ❌ OpenSSL no se descargó correctamente
        echo.
        echo    Descarga manual:
        echo    https://slproweb.com/products/Win32OpenSSL.html
        echo    Copiar openssl.exe a: tools\openssl\
        echo.
        pause
        exit /b 1
    )

    if not exist "tools\nssm\nssm.exe" (
        echo    ❌ NSSM no se descargó correctamente
        echo.
        echo    Descarga manual:
        echo    https://nssm.cc/download
        echo    Copiar nssm.exe (win64) a: tools\nssm\
        echo.
        pause
        exit /b 1
    )

    echo ✅ Herramientas descargadas
) else (
    echo ✅ Herramientas ya descargadas
)
echo.

REM Paso 5: Construir ejecutable con pkg
echo [5/6] Construyendo ejecutable (esto puede tardar varios minutos)...
if exist "build\AxiomaPrintManager.exe" (
    echo    ⚠️  Ejecutable ya existe, eliminando versión anterior...
    del /f /q "build\AxiomaPrintManager.exe"
)

call pkg . --targets node18-win-x64 --output build/AxiomaPrintManager.exe
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error construyendo ejecutable
    echo.
    pause
    exit /b 1
)

if not exist "build\AxiomaPrintManager.exe" (
    echo ❌ Ejecutable no generado
    pause
    exit /b 1
)

echo ✅ Ejecutable creado: build\AxiomaPrintManager.exe
echo.

REM Paso 6: Construir instalador con Inno Setup
echo [6/6] Construyendo instalador con Inno Setup...

set INNO_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe

if not exist "%INNO_PATH%" (
    echo ⚠️  Inno Setup no encontrado en: %INNO_PATH%
    echo.
    echo Para generar el instalador .exe, necesitas instalar Inno Setup:
    echo https://jrsoftware.org/isdl.php
    echo.
    echo El ejecutable está listo en: build\AxiomaPrintManager.exe
    echo Puedes compilar el instalador manualmente después.
    echo.
    pause
    exit /b 0
)

"%INNO_PATH%" "%~dp0installer.iss"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error compilando instalador
    echo.
    pause
    exit /b 1
)

echo ✅ Instalador creado
echo.

REM Resumen final
echo.
echo ========================================
echo   ✅ Build Completado Exitosamente
echo ========================================
echo.

if exist "build\AxiomaPrintManager.exe" (
    for %%A in ("build\AxiomaPrintManager.exe") do set size=%%~zA
    set /a sizeMB=!size! / 1048576
    echo 📦 Ejecutable: build\AxiomaPrintManager.exe
    echo    Tamaño: !sizeMB! MB
    echo.
)

if exist "installer-output\AxiomaPrintManager-Setup-1.0.0.exe" (
    for %%A in ("installer-output\AxiomaPrintManager-Setup-1.0.0.exe") do set size=%%~zA
    set /a sizeMB=!size! / 1048576
    echo 🎉 INSTALADOR LISTO: installer-output\AxiomaPrintManager-Setup-1.0.0.exe
    echo    Tamaño: !sizeMB! MB
    echo.
    echo Este archivo es el que debes distribuir a tus clientes.
    echo Los usuarios solo necesitan ejecutarlo y seguir el asistente.
    echo.
) else (
    echo ℹ️  El ejecutable está listo, pero no se generó el instalador.
    echo    Instala Inno Setup y vuelve a ejecutar este script.
    echo.
)

echo Presiona cualquier tecla para salir...
pause >nul
