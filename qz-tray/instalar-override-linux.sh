#!/bin/bash

# Script para instalar certificado override.crt en QZ Tray (Linux)

echo "========================================"
echo "Instalador de Certificado Override"
echo "para QZ Tray - AxiomaWeb"
echo "========================================"
echo ""

# Definir directorio
QZ_DIR="$HOME/.qz"
CERT_FILE="$QZ_DIR/override.crt"

# Crear directorio si no existe
echo "Verificando directorio de QZ Tray..."
if [ ! -d "$QZ_DIR" ]; then
    echo "Creando directorio $QZ_DIR..."
    mkdir -p "$QZ_DIR"
fi
echo "✓ Directorio listo: $QZ_DIR"
echo ""

# Crear certificado
echo "Creando certificado override.crt..."
cat > "$CERT_FILE" << 'EOF'
-----BEGIN CERTIFICATE-----
MIIDlzCCAn8CFBhtuBBgopAogeDBUpGi7KbAEFPaMA0GCSqGSIb3DQEBCwUAMIGH
MQswCQYDVQQGEwJBUjEVMBMGA1UECAwMQnVlbm9zIEFpcmVzMRUwEwYDVQQHDAxC
dWVub3MgQWlyZXMxEjAQBgNVBAoMCUF4aW9tYVdlYjESMBAGA1UEAwwJbG9jYWxo
b3N0MSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3ZWIuY29tMB4XDTI1MTIx
MjE2MDIyOVoXDTI2MTIxMjE2MDIyOVowgYcxCzAJBgNVBAYTAkFSMRUwEwYDVQQI
DAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJ
QXhpb21hV2ViMRIwEAYDVQQDDAlsb2NhbGhvc3QxIjAgBgkqhkiG9w0BCQEWE2Fk
bWluQGF4aW9tYXdlYi5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
AQDHUdSdIxld95sdpYWDk4Owl7nRnUGcGG3LYjgjz+EXcBFkMnXSBH3i1sZ+cMnO
UTB9bHvNthtQ3I3VZglZn27VvAMvGPtOGVxW7tW2rWueWc9NQOvm3HJMW/c/6GeP
zojWGs59vowK3/TVlcIYdk6mPhJXBOgHg234oM8rjQsgdxBg7e6PzOafBMxCV0y4
0APPiJaE78iOIthLXcZ94ppMz2FbZkUEHQCXjzDXAYf97kf4xyvx1EFSF/9RKbE7
CxxSSc7EfongQgN6qeLp4xjC68Jhrv/V2Sw+9uoptRRg9ubXoU33fqEHaxAhF8iw
w1NWphf6LlXVMkVp0HUnPlVvAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABT2opbU
AvPcSbs7MBipxwK3sh539A5yLBAmorcswLZfy9IF/7gz2YT5R1gx9laEcI1rTVey
8yWeq/jsKQ7/vXZZDJ/kCQYE4gzmDHaJWuM7kO6N5ohOdhlFih+elZlIY3qu56Eh
o1RN/5IspgoxXrTaCb097r6fo4Zz1cFPLDdq4mJYv/bDzSw0hwaVQhbU90hpwJad
YNx2i3C7BqW/AttYiWjIfnuPNIgI/fxhoUOJIKVJXh31kJxLtrbaY6Wi3wbXWcqe
EueDS2POuRVtNcBlybJeMbycFOntNNVCeypRDyBfOdQtC1J17nbzNaWiz8ju6x7c
lyImJCbNWzCGP5c=
-----END CERTIFICATE-----
EOF

if [ $? -eq 0 ]; then
    echo "✓ Certificado instalado en $CERT_FILE"
else
    echo "✗ ERROR: No se pudo crear el certificado"
    exit 1
fi
echo ""

# Verificar instalación
echo "Verificando instalación..."
if [ -f "$CERT_FILE" ]; then
    echo "✓ Archivo creado correctamente"
    echo "  Ubicación: $CERT_FILE"
    echo "  Tamaño: $(wc -c < "$CERT_FILE") bytes"
else
    echo "✗ ERROR: El archivo no existe"
    exit 1
fi
echo ""

echo "========================================"
echo "✅ INSTALACIÓN COMPLETADA EXITOSAMENTE"
echo "========================================"
echo ""
echo "Próximos pasos:"
echo "1. Reiniciar QZ Tray:"
echo "   pkill -f qz-tray"
echo "   qz-tray &"
echo ""
echo "2. Probar la conexión:"
echo "   - Abrir AxiomaWeb"
echo "   - Ir a Configuración -> General -> Impresión Térmica"
echo "   - Click en 'Conectar'"
echo "   - El popup NO debería aparecer"
echo ""
