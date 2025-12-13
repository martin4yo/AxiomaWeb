@echo off
REM Script para configurar allowed-domains.txt en QZ Tray 2.2+
REM Este es el metodo NUEVO que reemplaza a override.crt

echo ========================================
echo Configurar Allowed Domains (QZ Tray 2.2+)
echo para AxiomaWeb
echo ========================================
echo.

REM Verificar permisos de administrador
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador
    echo.
    echo Click derecho en el archivo -^> "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

REM Definir rutas
set QZ_DIR=C:\Program Files\QZ Tray
set ALLOWED_FILE=%QZ_DIR%\allowed-domains.txt
set OVERRIDE_FILE=%QZ_DIR%\override.crt

echo Verificando directorio de QZ Tray...
if not exist "%QZ_DIR%" (
    echo ERROR: No se encuentra QZ Tray en %QZ_DIR%
    echo.
    pause
    exit /b 1
)
echo ✓ QZ Tray encontrado
echo.

echo Creando allowed-domains.txt...
echo.
echo Este archivo le dice a QZ Tray que confie en:
echo   - axiomaweb.axiomacloud.com
echo   - localhost
echo.

(
echo # Allowed domains for AxiomaWeb
echo # QZ Tray 2.2+ usa este archivo en lugar de override.crt
echo axiomaweb.axiomacloud.com
echo localhost
echo 127.0.0.1
) > "%ALLOWED_FILE%"

if %errorLevel% neq 0 (
    echo ERROR: No se pudo crear allowed-domains.txt
    pause
    exit /b 1
)

echo ✓ allowed-domains.txt creado en: %ALLOWED_FILE%
echo.

REM Tambien crear override.crt por compatibilidad
echo Creando override.crt (para compatibilidad con versiones antiguas)...
(
echo -----BEGIN CERTIFICATE-----
echo MIIEGzCCAwOgAwIBAgIUZwr8GY39yP7jUDm2SbH0v1sUTdUwDQYJKoZIhvcNAQEL
echo BQawgZcxCzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNV
echo BAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlh
echo eGlvbWF3ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBh
echo eGlvbWF3ZWIuY29tMB4XDTI1MTIxMzEyNTkwOFoXDTI2MTIxMzEyNTkwOFowgZcx
echo CzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1
echo ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlheGlvbWF3
echo ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3
echo ZWIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoMYYJ31BHwyp
echo 3+djbC+1/3NkpJFurUwo8mme13vrMhbxKWmcbPcU9FPVWVMtqnJuQjie/ytri5ZV
echo HiV6h10kWA73EtzRUSgZSNoCUBwQlM2az+6s9/CY7ZG5LvKM+n0TkoQS6t8iiG4p
echo K31W2/i9NWf1McVQ9LE5ntx0WJlHA8dVRkejZaXDNcQOpb5flrW+8LN2WLQXrKev
echo BwX48nJaxJ8XNsymczVR5hcJ7WcNyunk3/gzOvzTEwEFGxNEmwsi6xfkmAxsTf7A
echo 0R0OL3Pb/Rr7OoWfCwfcz1kwXCdML+M4DnU/JJaoitXbfGL0lIFjacZC+vxCAO0F
echo 2/nFvCHKzQIDAQABo10wWzA6BgNVHREEMzAxghlheGlvbWF3ZWIuYXhpb21hY2xv
echo dWQuY29tgglsb2NhbGhvc3SCCTEyNy4wLjAuMTAdBgNVHQ4EFgQUPUqpS0kRV/gB
echo g2F9iOEDeqD+ttgwDQYJKoZIhvcNAQELBQADggEBAJ4sPwTIyNZJzgUq5zfbafca
echo qi95ikjGJO8W+H1D66LnAFhzBynrl+MTH9u7pBfYXzcttdfy3vYFOCu0g+PwcGFf
echo DV9xPE1VkSo5in5DIfu7+/OPQk9uywOKglGORNBcm3tmjLsy0IeSWd+JA3vTYQ3Y
echo unGisCiWLEBfrDuG+5e92vfgq96NYbSdnAScekVffwROa6Fd24V23YG2J5uNp/Rf
echo rIoaH/FnMlFGVveCD2gblEUfqXgl/TCxBxXHNt3biNJIiD+m9TMH0JUuR0cioLyz
echo 880/n9i13ehxWsOcL+tR32kdGmgiQxOSgojqZAv4yk1xlK3h3W7CdkTyw6scYzI=
echo -----END CERTIFICATE-----
) > "%OVERRIDE_FILE%"

echo ✓ override.crt creado
echo.

echo ========================================
echo ✅ CONFIGURACION COMPLETADA
echo ========================================
echo.
echo Archivos creados:
echo   - %ALLOWED_FILE%
echo   - %OVERRIDE_FILE%
echo.
echo ========================================
echo IMPORTANTE - PROXIMOS PASOS:
echo ========================================
echo.
echo 1. REINICIAR QZ Tray:
echo    - Click derecho en el icono de QZ Tray
echo    - Seleccionar "Exit"
echo    - Volver a abrir QZ Tray desde el menu Inicio
echo.
echo 2. PROBAR LA CONEXION:
echo    - Abrir: qz-tray\verificar-certificado.html
echo    - Click en "Test Conexion"
echo.
echo 3. SI EL POPUP SIGUE APARECIENDO:
echo    - Ejecutar: diagnostico-completo.bat
echo    - Verificar la version de QZ Tray
echo    - Si es 2.2+, el allowed-domains.txt deberia funcionar
echo.
echo ========================================
pause
