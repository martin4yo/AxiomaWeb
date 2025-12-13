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
echo "Certificado con SAN para múltiples dominios:"
echo "  - axiomaweb.axiomacloud.com"
echo "  - localhost"
echo "  - 127.0.0.1"
echo ""
cat > "$CERT_FILE" << 'EOF'
-----BEGIN CERTIFICATE-----
MIIEGzCCAwOgAwIBAgIUZwr8GY39yP7jUDm2SbH0v1sUTdUwDQYJKoZIhvcNAQEL
BQAwgZcxCzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNV
BAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlh
eGlvbWF3ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBh
eGlvbWF3ZWIuY29tMB4XDTI1MTIxMzEyNTkwOFoXDTI2MTIxMzEyNTkwOFowgZcx
CzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1
ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlheGlvbWF3
ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3
ZWIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoMYYJ31BHwyp
3+djbC+1/3NkpJFurUwo8mme13vrMhbxKWmcbPcU9FPVWVMtqnJuQjie/ytri5ZV
HiV6h10kWA73EtzRUSgZSNoCUBwQlM2az+6s9/CY7ZG5LvKM+n0TkoQS6t8iiG4p
K31W2/i9NWf1McVQ9LE5ntx0WJlHA8dVRkejZaXDNcQOpb5flrW+8LN2WLQXrKev
BwX48nJaxJ8XNsymczVR5hcJ7WcNyunk3/gzOvzTEwEFGxNEmwsi6xfkmAxsTf7A
0R0OL3Pb/Rr7OoWfCwfcz1kwXCdML+M4DnU/JJaoitXbfGL0lIFjacZC+vxCAO0F
2/nFvCHKzQIDAQABo10wWzA6BgNVHREEMzAxghlheGlvbWF3ZWIuYXhpb21hY2xv
dWQuY29tgglsb2NhbGhvc3SCCTEyNy4wLjAuMTAdBgNVHQ4EFgQUPUqpS0kRV/gB
g2F9iOEDeqD+ttgwDQYJKoZIhvcNAQELBQADggEBAJ4sPwTIyNZJzgUq5zfbafca
qi95ikjGJO8W+H1D66LnAFhzBynrl+MTH9u7pBfYXzcttdfy3vYFOCu0g+PwcGFf
DV9xPE1VkSo5in5DIfu7+/OPQk9uywOKglGORNBcm3tmjLsy0IeSWd+JA3vTYQ3Y
unGisCiWLEBfrDuG+5e92vfgq96NYbSdnAScekVffwROa6Fd24V23YG2J5uNp/Rf
rIoaH/FnMlFGVveCD2gblEUfqXgl/TCxBxXHNt3biNJIiD+m9TMH0JUuR0cioLyz
880/n9i13ehxWsOcL+tR32kdGmgiQxOSgojqZAv4yk1xlK3h3W7CdkTyw6scYzI=
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
