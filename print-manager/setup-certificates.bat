@echo off
REM Script para generar certificados SSL automáticamente
REM Este script se ejecuta durante la instalación

cd /d "%~dp0"

REM Crear directorio de certificados si no existe
if not exist "certs" mkdir certs

REM Generar certificados usando OpenSSL portable incluido
echo Generando certificados SSL...

tools\openssl\openssl.exe req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout certs\localhost-key.pem ^
  -out certs\localhost-cert.pem ^
  -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=Axioma Web/CN=localhost" ^
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo Certificados SSL generados exitosamente
    exit /b 0
) else (
    echo Error generando certificados SSL
    exit /b 1
)
