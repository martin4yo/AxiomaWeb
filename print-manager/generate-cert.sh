#!/bin/bash
# Script para generar certificado SSL autofirmado para Print Manager (Linux/Mac)

echo ""
echo "================================================"
echo "  Generador de Certificado SSL para Print Manager"
echo "================================================"
echo ""

# Verificar si OpenSSL está disponible
if ! command -v openssl &> /dev/null; then
    echo "ERROR: OpenSSL no está instalado"
    echo ""
    echo "Instala OpenSSL:"
    echo "  Ubuntu/Debian: sudo apt-get install openssl"
    echo "  MacOS: brew install openssl"
    echo ""
    exit 1
fi

echo "Generando certificado autofirmado..."
echo ""

# Generar certificado autofirmado válido por 365 días
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=Axioma Web/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  Certificado generado exitosamente!"
    echo "================================================"
    echo ""
    echo "Archivos creados:"
    echo "  - localhost-cert.pem (certificado público)"
    echo "  - localhost-key.pem  (clave privada)"
    echo ""
    echo "IMPORTANTE:"
    echo "  La primera vez que uses el Print Manager, el navegador"
    echo "  mostrará una advertencia de seguridad. Esto es normal"
    echo "  para certificados autofirmados."
    echo ""
    echo "  Debes aceptar el certificado para poder imprimir."
    echo ""
else
    echo ""
    echo "ERROR: No se pudo generar el certificado"
    echo ""
fi
