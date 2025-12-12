@echo off
REM Script para generar certificados self-signed para QZ Tray (Windows)
REM Requiere OpenSSL instalado

echo ============================================
echo Generador de Certificados para QZ Tray
echo ============================================
echo.

REM Verificar OpenSSL
where openssl >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: OpenSSL no esta instalado
    echo.
    echo Descargar desde: https://slproweb.com/products/Win32OpenSSL.html
    echo Instalar "Win64 OpenSSL v3.x.x Light"
    echo.
    pause
    exit /b 1
)

REM Crear carpeta
if not exist "certs" mkdir certs
cd certs

echo [1/4] Generando clave privada (2048 bits)...
openssl genrsa -out private-key.pem 2048
if %errorlevel% neq 0 (
    echo ERROR: Fallo generacion de clave privada
    pause
    exit /b 1
)

echo.
echo [2/4] Creando solicitud de certificado (CSR)...
openssl req -new -key private-key.pem -out certificate.csr -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=AxiomaWeb/CN=localhost/emailAddress=admin@axiomaweb.com"
if %errorlevel% neq 0 (
    echo ERROR: Fallo creacion de CSR
    pause
    exit /b 1
)

echo.
echo [3/4] Generando certificado auto-firmado (valido 365 dias)...
openssl x509 -req -days 365 -in certificate.csr -signkey private-key.pem -out digital-certificate.pem
if %errorlevel% neq 0 (
    echo ERROR: Fallo generacion de certificado
    pause
    exit /b 1
)

echo.
echo [4/4] Limpiando archivos temporales...
del certificate.csr

cd ..

echo.
echo ============================================
echo Certificados generados exitosamente!
echo ============================================
echo.
echo Archivos creados en qz-tray\certs\:
echo   - private-key.pem        ^(CLAVE PRIVADA - GUARDAR SEGURO^)
echo   - digital-certificate.pem ^(CERTIFICADO PUBLICO^)
echo.
echo Proximos pasos:
echo.
echo 1. COPIAR contenido de los archivos a:
echo    frontend\src\services\qz-tray.ts
echo.
echo 2. GUARDAR copia de private-key.pem en lugar seguro
echo    ^(NO commitear a Git^)
echo.
echo 3. Agregar a .gitignore:
echo    qz-tray/certs/*.pem
echo.
echo ============================================
pause
