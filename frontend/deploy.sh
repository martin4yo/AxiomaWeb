#!/bin/bash

# Script de Deploy para AxiomaWeb Frontend
# Autor: Claude
# Fecha: 2025-12-12

set -e  # Salir si hay errores

echo "🚀 Iniciando deploy de AxiomaWeb Frontend a Producción"
echo "=================================================="

# Configuración
SERVIDOR="66.97.45.210"
USUARIO="${DEPLOY_USER:-root}"  # Por defecto root, puede cambiarse con variable de entorno
DIRECTORIO_REMOTO="${DEPLOY_DIR:-/var/www/axiomaweb}"  # Por defecto /var/www/axiomaweb
PUERTO_SSH="${DEPLOY_PORT:-22}"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Paso 1: Construyendo frontend...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: No se encontró la carpeta dist/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completado${NC}"
echo ""

echo -e "${YELLOW}📤 Paso 2: Verificando conexión SSH...${NC}"
if ! ssh -p $PUERTO_SSH -o ConnectTimeout=5 $USUARIO@$SERVIDOR "echo 'Conexión exitosa'" 2>/dev/null; then
    echo -e "${RED}❌ Error: No se pudo conectar al servidor $SERVIDOR${NC}"
    echo -e "${YELLOW}💡 Verifica:${NC}"
    echo "   - Usuario SSH: $USUARIO"
    echo "   - Servidor: $SERVIDOR"
    echo "   - Puerto: $PUERTO_SSH"
    echo ""
    echo -e "${YELLOW}Puedes configurar las variables de entorno:${NC}"
    echo "   export DEPLOY_USER=tu_usuario"
    echo "   export DEPLOY_DIR=/ruta/al/directorio"
    echo "   export DEPLOY_PORT=22"
    exit 1
fi

echo -e "${GREEN}✅ Conexión SSH exitosa${NC}"
echo ""

echo -e "${YELLOW}🗑️  Paso 3: Limpiando directorio remoto...${NC}"
ssh -p $PUERTO_SSH $USUARIO@$SERVIDOR "mkdir -p $DIRECTORIO_REMOTO && rm -rf $DIRECTORIO_REMOTO/*"
echo -e "${GREEN}✅ Directorio limpio${NC}"
echo ""

echo -e "${YELLOW}📤 Paso 4: Subiendo archivos al servidor...${NC}"
rsync -avz --progress -e "ssh -p $PUERTO_SSH" dist/ $USUARIO@$SERVIDOR:$DIRECTORIO_REMOTO/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos subidos correctamente${NC}"
else
    echo -e "${RED}❌ Error subiendo archivos${NC}"
    exit 1
fi

echo ""

echo -e "${YELLOW}🔧 Paso 5: Configurando permisos...${NC}"
ssh -p $PUERTO_SSH $USUARIO@$SERVIDOR "chown -R www-data:www-data $DIRECTORIO_REMOTO && chmod -R 755 $DIRECTORIO_REMOTO"
echo -e "${GREEN}✅ Permisos configurados${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Deploy completado exitosamente!${NC}"
echo ""
echo "=================================================="
echo -e "${GREEN}✅ Frontend desplegado en:${NC}"
echo "   📍 Servidor: $SERVIDOR"
echo "   📁 Directorio: $DIRECTORIO_REMOTO"
echo "   🌐 URL: https://axiomaweb.axiomacloud.com"
echo "=================================================="
echo ""
echo -e "${YELLOW}💡 Verifica en tu navegador:${NC}"
echo "   https://axiomaweb.axiomacloud.com"
