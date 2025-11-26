# Guía de Deployment - AxiomaWeb ERP

## Índice
1. [Requisitos](#requisitos)
2. [Configuración del Servidor](#configuración-del-servidor)
3. [Base de Datos](#base-de-datos)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Variables de Entorno](#variables-de-entorno)
7. [Proceso de Deploy](#proceso-de-deploy)
8. [Troubleshooting](#troubleshooting)

---

## Requisitos

### Software Requerido

- **Node.js**: v18.x o superior
- **PostgreSQL**: v14 o superior
- **npm**: v9.x o superior
- **Git**: Para clonar el repositorio

### Servidor

- **RAM**: Mínimo 2GB, recomendado 4GB
- **CPU**: 2 cores recomendado
- **Disco**: 20GB mínimo
- **Sistema Operativo**: Linux (Ubuntu 20.04+, CentOS 8+, etc.)

---

## Configuración del Servidor

### 1. Actualizar Sistema

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Instalar Node.js

```bash
# Usando nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# O usando repositorio oficial
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib -y

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
```

### 4. Configurar PostgreSQL

```bash
# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear usuario y base de datos
sudo -u postgres psql

postgres=# CREATE DATABASE axiomaweb_db;
postgres=# CREATE USER axioma_user WITH PASSWORD 'tu_password_seguro';
postgres=# GRANT ALL PRIVILEGES ON DATABASE axiomaweb_db TO axioma_user;
postgres=# \q
```

### 5. Configurar Firewall

```bash
# Abrir puerto 80 (HTTP)
sudo ufw allow 80/tcp

# Abrir puerto 443 (HTTPS)
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable
```

---

## Base de Datos

### Opción 1: Base de Datos Existente (Baseline)

Si la base de datos ya tiene un esquema existente:

```bash
cd /var/www/AxiomaWeb/backend

# Marcar la migración inicial como aplicada
npx prisma migrate resolve --applied "20251124160445_init"

# Aplicar migraciones restantes
npx prisma migrate deploy
```

### Opción 2: Base de Datos Nueva

Si la base de datos está vacía:

```bash
cd /var/www/AxiomaWeb/backend

# Aplicar todas las migraciones
npx prisma migrate deploy

# Opcional: Ejecutar seed de datos iniciales
npx tsx src/seed.ts
```

### Opción 3: Sincronización Directa (No Recomendado para Producción)

Solo usar en ambientes de desarrollo/testing:

```bash
npx prisma db push --accept-data-loss
```

### Verificar Migraciones

```bash
# Ver estado de migraciones
npx prisma migrate status

# Ver esquema actual
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
```

---

## Backend

### 1. Clonar Repositorio

```bash
cd /var/www
git clone https://github.com/martin4yo/AxiomaWeb.git
cd AxiomaWeb/backend
```

### 2. Instalar Dependencias

```bash
npm install --production
```

### 3. Configurar Variables de Entorno

```bash
# Crear archivo .env
nano .env
```

Contenido del `.env`:

```env
# Base de datos
DATABASE_URL="postgresql://axioma_user:tu_password@localhost:5432/axiomaweb_db"

# Servidor
PORT=3150
NODE_ENV=production

# JWT
JWT_SECRET="tu_secret_jwt_super_seguro_cambiar_en_produccion"

# CORS (dominio del frontend)
CORS_ORIGIN="https://tudominio.com"
```

### 4. Generar Cliente Prisma

```bash
npx prisma generate
```

### 5. Aplicar Migraciones

```bash
npx prisma migrate deploy
```

### 6. Compilar TypeScript

```bash
npm run build
```

### 7. Crear Servicio Systemd

```bash
sudo nano /etc/systemd/system/axioma-backend.service
```

Contenido:

```ini
[Unit]
Description=AxiomaWeb Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/AxiomaWeb/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10

# Logging
StandardOutput=append:/var/log/axioma-backend.log
StandardError=append:/var/log/axioma-backend-error.log

[Install]
WantedBy=multi-user.target
```

### 8. Iniciar Servicio

```bash
# Recargar systemd
sudo systemctl daemon-reload

# Habilitar servicio
sudo systemctl enable axioma-backend

# Iniciar servicio
sudo systemctl start axioma-backend

# Verificar estado
sudo systemctl status axioma-backend

# Ver logs
sudo journalctl -u axioma-backend -f
```

---

## Frontend

### 1. Ir a Directorio Frontend

```bash
cd /var/www/AxiomaWeb/frontend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
nano .env.production
```

Contenido:

```env
VITE_API_URL=https://api.tudominio.com
```

### 4. Build de Producción

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos.

### 5. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/axiomaweb
```

Contenido:

```nginx
# Frontend
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    root /var/www/AxiomaWeb/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://localhost:3150;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 6. Habilitar Sitio y Reiniciar Nginx

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/axiomaweb /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar nginx
sudo systemctl restart nginx
```

### 7. Configurar SSL con Let's Encrypt (Opcional pero Recomendado)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificados
sudo certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com

# Auto-renovación
sudo certbot renew --dry-run
```

---

## Variables de Entorno

### Backend (.env)

```env
# === BASE DE DATOS ===
DATABASE_URL="postgresql://usuario:password@host:puerto/database"

# === SERVIDOR ===
PORT=3150
NODE_ENV=production

# === SEGURIDAD ===
JWT_SECRET="cambiar_por_secret_aleatorio_largo_y_seguro"
JWT_EXPIRES_IN="24h"

# === CORS ===
CORS_ORIGIN="https://tudominio.com"

# === AFIP (Opcional - se usan valores por defecto) ===
# AFIP_WSAA_URL_TESTING="https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL"
# AFIP_WSAA_URL_PRODUCTION="https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL"
# AFIP_WSFE_URL_TESTING="https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
# AFIP_WSFE_URL_PRODUCTION="https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"
```

### Frontend (.env.production)

```env
VITE_API_URL=https://api.tudominio.com
```

---

## Proceso de Deploy

### Deploy Completo (Primera Vez)

```bash
#!/bin/bash
# deploy-full.sh

set -e

echo "🚀 Iniciando deploy completo..."

# 1. Backend
cd /var/www/AxiomaWeb/backend
git pull origin master
npm install --production
npx prisma generate
npx prisma migrate deploy
npm run build
sudo systemctl restart axioma-backend

# 2. Frontend
cd /var/www/AxiomaWeb/frontend
npm install
npm run build
sudo systemctl reload nginx

echo "✅ Deploy completo exitoso!"
```

### Deploy de Actualización

```bash
#!/bin/bash
# deploy-update.sh

set -e

echo "🔄 Actualizando aplicación..."

# Backup de base de datos
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -U axioma_user axiomaweb_db > /var/backups/db_backup_$timestamp.sql

# Backend
cd /var/www/AxiomaWeb/backend
git pull origin master
npm install --production

# Verificar si hay nuevas migraciones
if npx prisma migrate status | grep -q "pending"; then
    echo "⚠️  Aplicando migraciones pendientes..."
    npx prisma migrate deploy
fi

npx prisma generate
npm run build
sudo systemctl restart axioma-backend

# Frontend
cd /var/www/AxiomaWeb/frontend
git pull origin master
npm install
npm run build
sudo systemctl reload nginx

echo "✅ Actualización completada!"
```

### Rollback

```bash
#!/bin/bash
# rollback.sh

set -e

echo "⏪ Ejecutando rollback..."

# Restaurar base de datos
read -p "Ingrese archivo de backup (ej: db_backup_20251125_120000.sql): " backup_file
psql -U axioma_user axiomaweb_db < /var/backups/$backup_file

# Volver al commit anterior
cd /var/www/AxiomaWeb
git reset --hard HEAD~1

# Rebuild
cd backend
npm install --production
npx prisma generate
npm run build
sudo systemctl restart axioma-backend

cd ../frontend
npm install
npm run build
sudo systemctl reload nginx

echo "✅ Rollback completado!"
```

---

## Troubleshooting

### Backend No Inicia

**Verificar logs**:
```bash
sudo journalctl -u axioma-backend -n 50
tail -f /var/log/axioma-backend-error.log
```

**Verificar puerto**:
```bash
sudo lsof -i :3150
```

**Verificar conexión a base de datos**:
```bash
cd /var/www/AxiomaWeb/backend
npx prisma db pull
```

### Error de Migraciones

**Ver estado**:
```bash
npx prisma migrate status
```

**Baseline de base de datos existente**:
```bash
# Marcar migración como aplicada
npx prisma migrate resolve --applied "nombre_de_migracion"

# Aplicar pendientes
npx prisma migrate deploy
```

**Reset completo (⚠️ BORRA DATOS)**:
```bash
npx prisma migrate reset --force
```

### Error: prisma.modelName is not defined

**Causa**: Cliente Prisma no regenerado después de cambios en schema

**Solución**:
```bash
cd /var/www/AxiomaWeb/backend
npx prisma generate
npm run build
sudo systemctl restart axioma-backend
```

### Frontend Muestra Errores

**Verificar variables de entorno**:
```bash
cat /var/www/AxiomaWeb/frontend/.env.production
```

**Rebuild**:
```bash
cd /var/www/AxiomaWeb/frontend
rm -rf dist/
npm run build
```

**Verificar nginx**:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Problemas de CORS

**Backend**:
```typescript
// Verificar CORS_ORIGIN en .env
CORS_ORIGIN="https://tudominio.com"
```

**Nginx**:
```nginx
# Agregar headers CORS si es necesario
add_header 'Access-Control-Allow-Origin' 'https://tudominio.com';
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
```

### Base de Datos Lenta

**Ver conexiones activas**:
```sql
SELECT * FROM pg_stat_activity;
```

**Optimizar índices**:
```sql
-- Ver índices faltantes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Analizar performance
EXPLAIN ANALYZE SELECT ...
```

**Aumentar cache**:
```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Ajustar valores según RAM disponible
shared_buffers = 256MB
effective_cache_size = 1GB
```

---

## Monitoreo

### Logs

```bash
# Backend
tail -f /var/log/axioma-backend.log
tail -f /var/log/axioma-backend-error.log

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Métricas del Sistema

```bash
# CPU y RAM
htop

# Espacio en disco
df -h

# Procesos
ps aux | grep node

# Red
netstat -tulpn | grep LISTEN
```

### Health Check

```bash
# Backend
curl http://localhost:3150/health

# Frontend
curl http://localhost/

# Base de datos
psql -U axioma_user -d axiomaweb_db -c "SELECT 1;"
```

---

## Backup y Restore

### Backup Automático

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-axioma.sh
```

Contenido:
```bash
#!/bin/bash

timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="/var/backups/axioma"
mkdir -p $backup_dir

# Backup base de datos
pg_dump -U axioma_user axiomaweb_db | gzip > $backup_dir/db_$timestamp.sql.gz

# Backup archivos subidos
tar -czf $backup_dir/uploads_$timestamp.tar.gz /var/www/AxiomaWeb/backend/uploads

# Eliminar backups antiguos (más de 30 días)
find $backup_dir -name "*.gz" -mtime +30 -delete

echo "Backup completado: $timestamp"
```

```bash
# Dar permisos
sudo chmod +x /usr/local/bin/backup-axioma.sh

# Configurar cron (diario a las 2 AM)
sudo crontab -e
```

Agregar:
```cron
0 2 * * * /usr/local/bin/backup-axioma.sh >> /var/log/axioma-backup.log 2>&1
```

### Restore desde Backup

```bash
# Restaurar base de datos
gunzip < /var/backups/axioma/db_20251125_020000.sql.gz | psql -U axioma_user axiomaweb_db

# Restaurar archivos
tar -xzf /var/backups/axioma/uploads_20251125_020000.tar.gz -C /
```

---

## Seguridad

### 1. Firewall

```bash
# Solo permitir SSH, HTTP, HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban

```bash
# Instalar
sudo apt install fail2ban -y

# Configurar
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
```

### 3. Actualizar Regularmente

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Actualizar dependencias npm
cd /var/www/AxiomaWeb/backend
npm audit fix

cd /var/www/AxiomaWeb/frontend
npm audit fix
```

---

## Checklist de Deploy

- [ ] Servidor configurado y actualizado
- [ ] PostgreSQL instalado y configurado
- [ ] Node.js instalado (v18+)
- [ ] Repositorio clonado
- [ ] Variables de entorno configuradas
- [ ] Base de datos creada
- [ ] Migraciones aplicadas
- [ ] Backend compilado
- [ ] Frontend compilado
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Servicio systemd creado
- [ ] Backups configurados
- [ ] Logs verificados
- [ ] Health checks funcionando
- [ ] DNS apuntando al servidor
- [ ] Firewall configurado
