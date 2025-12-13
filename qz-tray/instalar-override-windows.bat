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
(
echo -----BEGIN CERTIFICATE-----
echo MIIDlzCCAn8CFBhtuBBgopAogeDBUpGi7KbAEFPaMA0GCSqGSIb3DQEBCwUAMIGH
echo MQswCQYDVQQGEwJBUjEVMBMGA1UECAwMQnVlbm9zIEFpcmVzMRUwEwYDVQQHDAxC
echo dWVub3MgQWlyZXMxEjAQBgNVBAoMCUF4aW9tYVdlYjESMBAGA1UEAwwJbG9jYWxo
echo b3N0MSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3ZWIuY29tMB4XDTI1MTIx
echo MjE2MDIyOVoXDTI2MTIxMjE2MDIyOVowgYcxCzAJBgNVBAYTAkFSMRUwEwYDVQQI
echo DAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJ
echo QXhpb21hV2ViMRIwEAYDVQQDDAlsb2NhbGhvc3QxIjAgBgkqhkiG9w0BCQEWE2Fk
echo bWluQGF4aW9tYXdlYi5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
echo AQDHUdSdIxld95sdpYWDk4Owl7nRnUGcGG3LYjgjz+EXcBFkMnXSBH3i1sZ+cMnO
echo UTB9bHvNthtQ3I3VZglZn27VvAMvGPtOGVxW7tW2rWueWc9NQOvm3HJMW/c/6GeP
echo zojWGs59vowK3/TVlcIYdk6mPhJXBOgHg234oM8rjQsgdxBg7e6PzOafBMxCV0y4
echo 0APPiJaE78iOIthLXcZ94ppMz2FbZkUEHQCXjzDXAYf97kf4xyvx1EFSF/9RKbE7
echo CxxSSc7EfongQgN6qeLp4xjC68Jhrv/V2Sw+9uoptRRg9ubXoU33fqEHaxAhF8iw
echo w1NWphf6LlXVMkVp0HUnPlVvAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABT2opbU
echo AvPcSbs7MBipxwK3sh539A5yLBAmorcswLZfy9IF/7gz2YT5R1gx9laEcI1rTVey
echo 8yWeq/jsKQ7/vXZZDJ/kCQYE4gzmDHaJWuM7kO6N5ohOdhlFih+elZlIY3qu56Eh
echo o1RN/5IspgoxXrTaCb097r6fo4Zz1cFPLDdq4mJYv/bDzSw0hwaVQhbU90hpwJad
echo YNx2i3C7BqW/AttYiWjIfnuPNIgI/fxhoUOJIKVJXh31kJxLtrbaY6Wi3wbXWcqe
echo EueDS2POuRVtNcBlybJeMbycFOntNNVCeypRDyBfOdQtC1J17nbzNaWiz8ju6x7c
echo lyImJCbNWzCGP5c=
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
