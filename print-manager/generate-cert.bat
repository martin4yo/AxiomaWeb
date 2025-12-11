@echo off
REM Script para generar certificado SSL autofirmado para Print Manager

echo.
echo ================================================
echo   Generador de Certificado SSL para Print Manager
echo ================================================
echo.

REM Verificar si OpenSSL está disponible
where openssl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: OpenSSL no esta instalado
    echo.
    echo Opciones para instalar OpenSSL:
    echo 1. Instalar Git for Windows (incluye OpenSSL): https://git-scm.com/
    echo 2. Agregar Git\usr\bin al PATH: C:\Program Files\Git\usr\bin
    echo.
    pause
    exit /b 1
)

echo Generando certificado autofirmado...
echo.

REM Generar certificado autofirmado válido por 365 días
openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout localhost-key.pem ^
  -out localhost-cert.pem ^
  -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=Axioma Web/CN=localhost" ^
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo   Certificado generado exitosamente!
    echo ================================================
    echo.
    echo Archivos creados:
    echo   - localhost-cert.pem (certificado publico)
    echo   - localhost-key.pem  (clave privada)
    echo.
    echo IMPORTANTE:
    echo   La primera vez que uses el Print Manager, el navegador
    echo   mostrara una advertencia de seguridad. Esto es normal
    echo   para certificados autofirmados.
    echo.
    echo   Debes aceptar el certificado para poder imprimir.
    echo.
) else (
    echo.
    echo ERROR: No se pudo generar el certificado
    echo.
)

pause
