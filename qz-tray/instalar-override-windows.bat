@echo off
REM Script para instalar certificado override.crt en QZ Tray (Windows)
REM Ejecutar como Administrador

echo ========================================
echo Instalador de Certificado Override
echo para QZ Tray - AxiomaWeb
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
set CERT_FILE=%QZ_DIR%\override.crt
set TEMP_CERT=%TEMP%\axioma-override.crt

echo Verificando directorio de QZ Tray...
if not exist "%QZ_DIR%" (
    echo ERROR: No se encuentra QZ Tray en %QZ_DIR%
    echo.
    echo Por favor verifica que QZ Tray este instalado.
    echo.
    pause
    exit /b 1
)
echo ✓ QZ Tray encontrado en %QZ_DIR%
echo.

echo Creando certificado temporal...
echo Certificado con SAN para multiples dominios:
echo   - axiomaweb.axiomacloud.com
echo   - localhost
echo   - 127.0.0.1
echo.
(
echo -----BEGIN CERTIFICATE-----
echo MIIEGzCCAwOgAwIBAgIUZwr8GY39yP7jUDm2SbH0v1sUTdUwDQYJKoZIhvcNAQEL
echo BQAwgZcxCzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNV
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
) > "%TEMP_CERT%"
echo ✓ Certificado creado en %TEMP_CERT%
echo.

echo Copiando certificado a QZ Tray...
copy /Y "%TEMP_CERT%" "%CERT_FILE%" >nul
if %errorLevel% neq 0 (
    echo ERROR: No se pudo copiar el certificado
    echo.
    pause
    exit /b 1
)
echo ✓ Certificado instalado en %CERT_FILE%
echo.

echo Limpiando archivos temporales...
del "%TEMP_CERT%" >nul 2>&1
echo.

echo ========================================
echo ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE
echo ========================================
echo.
echo Próximos pasos:
echo 1. Reiniciar QZ Tray:
echo    - Click derecho en el icono de QZ Tray
echo    - Seleccionar "Exit"
echo    - Volver a abrir QZ Tray
echo.
echo 2. Probar la conexión:
echo    - Abrir AxiomaWeb
echo    - Ir a Configuracion -^> General -^> Impresion Termica
echo    - Click en "Conectar"
echo    - El popup NO deberia aparecer
echo.
echo Presiona cualquier tecla para salir...
pause >nul
