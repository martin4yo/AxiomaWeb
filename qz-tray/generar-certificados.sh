#!/bin/bash
##
# Script para generar certificados self-signed para QZ Tray
# Soporta múltiples dominios con SAN (Subject Alternative Names)
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

echo "[1/5] Generando clave privada (2048 bits)..."
openssl genrsa -out private-key.pem 2048

echo ""
echo "[2/5] Creando archivo de configuración OpenSSL..."
cat > openssl.cnf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=AR
ST=Buenos Aires
L=Buenos Aires
O=AxiomaWeb
CN=axiomaweb.axiomacloud.com
emailAddress=admin@axiomaweb.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = axiomaweb.axiomacloud.com
DNS.2 = localhost
DNS.3 = 127.0.0.1
EOF

echo ""
echo "[3/5] Creando solicitud de certificado (CSR) con SAN..."
openssl req -new -key private-key.pem -out certificate.csr -config openssl.cnf

echo ""
echo "[4/5] Generando certificado auto-firmado (válido 365 días)..."
openssl x509 -req -days 365 -in certificate.csr \
  -signkey private-key.pem \
  -out digital-certificate.pem \
  -extensions v3_req \
  -extfile openssl.cnf

echo ""
echo "[5/5] Limpiando archivos temporales..."
rm certificate.csr openssl.cnf

echo ""
echo "============================================"
echo "✅ Certificados generados exitosamente!"
echo "============================================"
echo ""
echo "Archivos creados en qz-tray/certs/:"
echo "  - private-key.pem        (CLAVE PRIVADA - GUARDAR SEGURO)"
echo "  - digital-certificate.pem (CERTIFICADO PÚBLICO)"
echo ""
echo "Dominios incluidos en el certificado (SAN):"
echo "  ✓ axiomaweb.axiomacloud.com"
echo "  ✓ localhost"
echo "  ✓ 127.0.0.1"
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
