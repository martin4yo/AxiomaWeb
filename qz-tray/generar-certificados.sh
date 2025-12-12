#!/bin/bash
##
# Script para generar certificados self-signed para QZ Tray
# Uso: ./generar-certificados.sh
##

set -e

echo "============================================"
echo "Generador de Certificados para QZ Tray"
echo "============================================"
echo ""

# Crear carpeta de certificados
mkdir -p certs
cd certs

echo "[1/4] Generando clave privada (2048 bits)..."
openssl genrsa -out private-key.pem 2048

echo ""
echo "[2/4] Creando solicitud de certificado (CSR)..."
echo "Se te pedirán algunos datos. Puedes dejar en blanco los opcionales."
echo ""

# Generar CSR interactivamente
openssl req -new -key private-key.pem -out certificate.csr \
  -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=AxiomaWeb/CN=localhost/emailAddress=admin@axiomaweb.com"

echo ""
echo "[3/4] Generando certificado auto-firmado (válido 365 días)..."
openssl x509 -req -days 365 -in certificate.csr \
  -signkey private-key.pem \
  -out digital-certificate.pem

echo ""
echo "[4/4] Limpiando archivos temporales..."
rm certificate.csr

echo ""
echo "============================================"
echo "✅ Certificados generados exitosamente!"
echo "============================================"
echo ""
echo "Archivos creados en qz-tray/certs/:"
echo "  - private-key.pem        (CLAVE PRIVADA - GUARDAR SEGURO)"
echo "  - digital-certificate.pem (CERTIFICADO PÚBLICO)"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. COPIAR contenido de los archivos a frontend/src/services/qz-tray.ts"
echo ""
echo "   const CERTIFICATE = \`$(cat digital-certificate.pem)\`;"
echo ""
echo "   const PRIVATE_KEY = \`$(cat private-key.pem)\`;"
echo ""
echo "2. GUARDAR copia de private-key.pem en lugar seguro (no commitear a Git)"
echo ""
echo "3. Agregar a .gitignore:"
echo "   echo 'qz-tray/certs/*.pem' >> .gitignore"
echo ""
echo "============================================"
