@echo off
echo ==========================================
echo Axioma Print Manager - Build Native Host
echo ==========================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    pause
    exit /b 1
)

echo [1/3] Instalando dependencias...
call npm install --production
if %errorlevel% neq 0 (
    echo ERROR: Fallo npm install
    pause
    exit /b 1
)

echo.
echo [2/3] Instalando pkg...
call npm install -g pkg
if %errorlevel% neq 0 (
    echo ERROR: Fallo instalacion de pkg
    pause
    exit /b 1
)

echo.
echo [3/3] Compilando ejecutable...
call pkg . --targets node18-win-x64 --output axioma-print-host.exe
if %errorlevel% neq 0 (
    echo ERROR: Fallo compilacion
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Build completado exitosamente!
echo Ejecutable: axioma-print-host.exe
echo ==========================================
pause
