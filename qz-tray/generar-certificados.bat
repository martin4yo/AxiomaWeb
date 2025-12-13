@echo off
REM Script para generar certificados self-signed para QZ Tray (Windows)
REM Soporta múltiples dominios con SAN (Subject Alternative Names)
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

echo [1/5] Generando clave privada (2048 bits)...
openssl genrsa -out private-key.pem 2048
if %errorlevel% neq 0 (
    echo ERROR: Fallo generacion de clave privada
    pause
    exit /b 1
)

echo.
echo [2/5] Creando archivo de configuracion OpenSSL...
(
echo [req]
echo default_bits = 2048
echo prompt = no
echo default_md = sha256
echo distinguished_name = dn
echo req_extensions = v3_req
echo.
echo [dn]
echo C=AR
echo ST=Buenos Aires
echo L=Buenos Aires
echo O=AxiomaWeb
echo CN=axiomaweb.axiomacloud.com
echo emailAddress=admin@axiomaweb.com
echo.
echo [v3_req]
echo subjectAltName = @alt_names
echo.
echo [alt_names]
echo DNS.1 = axiomaweb.axiomacloud.com
echo DNS.2 = localhost
echo DNS.3 = 127.0.0.1
) > openssl.cnf

echo.
echo [3/5] Creando solicitud de certificado (CSR) con SAN...
openssl req -new -key private-key.pem -out certificate.csr -config openssl.cnf
if %errorlevel% neq 0 (
    echo ERROR: Fallo creacion de CSR
    pause
    exit /b 1
)

echo.
echo [4/5] Generando certificado auto-firmado (valido 365 dias)...
openssl x509 -req -days 365 -in certificate.csr -signkey private-key.pem -out digital-certificate.pem -extensions v3_req -extfile openssl.cnf
if %errorlevel% neq 0 (
    echo ERROR: Fallo generacion de certificado
    pause
    exit /b 1
)

echo.
echo [5/5] Limpiando archivos temporales...
del certificate.csr openssl.cnf

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
echo Dominios incluidos en el certificado (SAN):
echo   - axiomaweb.axiomacloud.com
echo   - localhost
echo   - 127.0.0.1
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
