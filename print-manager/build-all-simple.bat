@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Axioma Print Manager - Build All
echo ========================================
echo.

cd /d "%~dp0"

REM Paso 1: Verificar Node.js
echo [1/8] Verificando Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    echo Descarga desde: https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo OK - Node.js encontrado
echo.

REM Paso 2: Verificar/Instalar pkg
echo [2/8] Verificando pkg...
where pkg >nul 2>nul
if errorlevel 1 (
    echo pkg no encontrado. Instalando...
    npm install -g pkg
    if errorlevel 1 (
        echo ERROR instalando pkg
        pause
        exit /b 1
    )
)
echo OK - pkg disponible
echo.

REM Paso 3: Instalar dependencias originales
echo [3/8] Instalando dependencias del proyecto...
if not exist "node_modules" (
    npm install
    if errorlevel 1 (
        echo ERROR instalando dependencias
        pause
        exit /b 1
    )
)
echo OK - Dependencias instaladas
echo.

REM Paso 4: Descargar herramientas
echo [4/8] Verificando herramientas (OpenSSL, NSSM)...
if not exist "tools\openssl\openssl.exe" (
    echo OpenSSL no encontrado, descargando...
    powershell -ExecutionPolicy Bypass -File "%~dp0download-tools.ps1"
) else (
    echo OK - OpenSSL encontrado
)

if not exist "tools\nssm\nssm.exe" (
    echo ERROR: NSSM no encontrado
    echo Ejecuta: download-tools.bat
    pause
    exit /b 1
)
echo OK - NSSM encontrado
echo.

REM Paso 5: Respaldar package.json
echo [5/8] Preparando package.json para build...
if exist "package.json.backup" del /f /q "package.json.backup"
if exist "package.json" ren "package.json" "package.json.backup"
copy /y "package-installer.json" "package.json" >nul
echo OK - package-installer.json copiado
echo.

REM Paso 6: Instalar dependencias para build
echo [6/8] Instalando dependencias para build...
npm install --production
if errorlevel 1 (
    echo ERROR instalando dependencias de build
    if exist "package.json" del /f /q "package.json"
    if exist "package.json.backup" ren "package.json.backup" "package.json"
    pause
    exit /b 1
)
echo OK - Dependencias de build instaladas
echo.

REM Paso 7: Construir ejecutable
echo [7/8] Construyendo ejecutable (puede tardar varios minutos)...
if exist "build\AxiomaPrintManager.exe" del /f /q "build\AxiomaPrintManager.exe"

pkg . --targets node18-win-x64 --output build/AxiomaPrintManager.exe
set PKG_EXIT=%ERRORLEVEL%

REM Restaurar package.json
if exist "package.json" del /f /q "package.json"
if exist "package.json.backup" ren "package.json.backup" "package.json"

if %PKG_EXIT% NEQ 0 (
    echo ERROR construyendo ejecutable
    pause
    exit /b 1
)

if not exist "build\AxiomaPrintManager.exe" (
    echo ERROR: Ejecutable no generado
    pause
    exit /b 1
)
echo OK - Ejecutable creado
echo.

REM Paso 8: Construir instalador
echo [8/8] Construyendo instalador...
set INNO_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe

if not exist "%INNO_PATH%" (
    echo Inno Setup no encontrado
    echo Instalador NO generado
    echo Ejecutable disponible en: build\AxiomaPrintManager.exe
    echo.
    pause
    exit /b 0
)

"%INNO_PATH%" "%~dp0installer.iss"
if errorlevel 1 (
    echo ERROR compilando instalador
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Completado
echo ========================================
echo.
echo Ejecutable: build\AxiomaPrintManager.exe
echo Instalador: installer-output\AxiomaPrintManager-Setup-1.0.0.exe
echo.
pause
