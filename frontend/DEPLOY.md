# 🚀 Guía de Deploy - AxiomaWeb Frontend

Instrucciones para desplegar el frontend a producción.

---

## 📋 Pre-requisitos

### 1. Acceso SSH al Servidor

Necesitas tener configurado el acceso SSH al servidor de producción:

```bash
# Probar conexión SSH
ssh root@66.97.45.210

# O con usuario específico
ssh tu_usuario@66.97.45.210
```

**Si no tienes acceso SSH**, contacta al administrador del servidor.

### 2. Configurar Variables de Entorno (Opcional)

Si el servidor usa un usuario o directorio diferente:

```bash
# En tu terminal, antes de ejecutar deploy.sh:
export DEPLOY_USER=tu_usuario      # Default: root
export DEPLOY_DIR=/var/www/html    # Default: /var/www/axiomaweb
export DEPLOY_PORT=22               # Default: 22
```

---

## 🚀 Deploy Automático (Recomendado)

### Opción 1: Script de Deploy

```bash
cd /home/martin/Desarrollos/AxiomaWeb/frontend
./deploy.sh
```

El script automáticamente:
1. ✅ Construye el frontend (`npm run build`)
2. ✅ Verifica conexión SSH
3. ✅ Limpia el directorio remoto
4. ✅ Sube los archivos con rsync
5. ✅ Configura permisos

**Ejemplo de salida:**
```
🚀 Iniciando deploy de AxiomaWeb Frontend a Producción
==================================================
📦 Paso 1: Construyendo frontend...
✅ Build completado

📤 Paso 2: Verificando conexión SSH...
✅ Conexión SSH exitosa

🗑️  Paso 3: Limpiando directorio remoto...
✅ Directorio limpio

📤 Paso 4: Subiendo archivos al servidor...
✅ Archivos subidos correctamente

🔧 Paso 5: Configurando permisos...
✅ Permisos configurados

🎉 ¡Deploy completado exitosamente!
```

---

## 🔧 Deploy Manual

Si prefieres hacerlo paso a paso:

### 1. Construir el Frontend

```bash
cd /home/martin/Desarrollos/AxiomaWeb/frontend
npm run build
```

Esto genera la carpeta `dist/` con los archivos compilados.

### 2. Subir archivos al servidor

**Opción A: Con rsync (recomendado)**
```bash
rsync -avz --progress dist/ root@66.97.45.210:/var/www/axiomaweb/
```

**Opción B: Con scp**
```bash
scp -r dist/* root@66.97.45.210:/var/www/axiomaweb/
```

### 3. Configurar permisos en el servidor

```bash
ssh root@66.97.45.210 "chown -R www-data:www-data /var/www/axiomaweb && chmod -R 755 /var/www/axiomaweb"
```

### 4. Verificar

Abrir en el navegador: **https://axiomaweb.axiomacloud.com**

---

## 🐳 Deploy con Docker (Alternativa)

Si el servidor usa Docker:

### 1. Crear Dockerfile

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

### 2. Construir y subir imagen

```bash
# Construir imagen
docker build -t axiomaweb-frontend .

# Guardar imagen
docker save axiomaweb-frontend > axiomaweb-frontend.tar

# Subir al servidor
scp axiomaweb-frontend.tar root@66.97.45.210:/tmp/

# En el servidor, cargar e iniciar
ssh root@66.97.45.210
docker load < /tmp/axiomaweb-frontend.tar
docker stop axiomaweb-frontend || true
docker rm axiomaweb-frontend || true
docker run -d --name axiomaweb-frontend -p 80:80 axiomaweb-frontend
```

---

## 🔍 Verificación Post-Deploy

### 1. Verificar archivos en el servidor

```bash
ssh root@66.97.45.210 "ls -la /var/www/axiomaweb"
```

Deberías ver:
```
drwxr-xr-x www-data www-data 4096 dic 12 13:00 .
drwxr-xr-x root     root     4096 dic 12 13:00 ..
drwxr-xr-x www-data www-data 4096 dic 12 13:00 assets
-rw-r--r-- www-data www-data  279 dic 12 13:00 favicon.svg
-rw-r--r-- www-data www-data  717 dic 12 13:00 index.html
```

### 2. Verificar que el sitio carga

```bash
curl -I https://axiomaweb.axiomacloud.com
```

Debería responder:
```
HTTP/2 200
content-type: text/html
...
```

### 3. Verificar en navegador

Abrir: **https://axiomaweb.axiomacloud.com**

- ✅ El sitio carga correctamente
- ✅ No hay errores en consola (F12 → Console)
- ✅ Los certificados de QZ Tray están incluidos

### 4. Verificar versión desplegada

En el navegador, abrir **DevTools (F12) → Console** y ejecutar:

```javascript
// Ver build date de los assets
console.log(document.querySelector('script[src*="index"]').src)
```

Debería mostrar un hash nuevo (diferente al anterior).

---

## 🔥 Rollback (Volver a Versión Anterior)

Si algo sale mal:

### 1. En el servidor, crear backups antes de deploy

```bash
# Antes de hacer deploy, hacer backup
ssh root@66.97.45.210 "cp -r /var/www/axiomaweb /var/www/axiomaweb.backup.$(date +%Y%m%d-%H%M%S)"
```

### 2. Restaurar backup si es necesario

```bash
# Listar backups disponibles
ssh root@66.97.45.210 "ls -la /var/www/ | grep backup"

# Restaurar backup específico
ssh root@66.97.45.210 "rm -rf /var/www/axiomaweb && cp -r /var/www/axiomaweb.backup.20251212-130000 /var/www/axiomaweb"
```

---

## 📊 CI/CD Automático (Futuro)

Para automatizar deploys en el futuro, considerar:

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2.1.5
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: 66.97.45.210
          REMOTE_USER: root
          TARGET: /var/www/axiomaweb
          SOURCE: dist/
```

---

## 🛠️ Troubleshooting

### ❌ "Permission denied (publickey)"

**Problema:** No tienes acceso SSH.

**Solución:**
```bash
# Generar clave SSH si no tienes
ssh-keygen -t rsa -b 4096

# Copiar clave al servidor
ssh-copy-id root@66.97.45.210

# O agregar manualmente
cat ~/.ssh/id_rsa.pub  # Copiar contenido
ssh root@66.97.45.210 "echo 'CONTENIDO_CLAVE' >> ~/.ssh/authorized_keys"
```

### ❌ "Connection refused"

**Problema:** El servidor no está accesible.

**Solución:**
```bash
# Verificar que el servidor está arriba
ping 66.97.45.210

# Verificar puerto SSH
nmap -p 22 66.97.45.210

# Probar otro puerto si usa uno diferente
ssh -p 2222 root@66.97.45.210
```

### ❌ "No such file or directory: /var/www/axiomaweb"

**Problema:** El directorio no existe en el servidor.

**Solución:**
```bash
# Crear directorio en el servidor
ssh root@66.97.45.210 "mkdir -p /var/www/axiomaweb && chown www-data:www-data /var/www/axiomaweb"
```

### ❌ "Site shows old version after deploy"

**Problema:** El navegador cachea la versión anterior.

**Solución:**
1. **Ctrl + Shift + R** (hard refresh)
2. Limpiar caché del navegador
3. Verificar que los archivos en el servidor están actualizados:
   ```bash
   ssh root@66.97.45.210 "ls -la /var/www/axiomaweb/assets/"
   ```

---

## 📝 Checklist Pre-Deploy

Antes de cada deploy, verificar:

- [ ] El código compila sin errores (`npm run build`)
- [ ] Los tests pasan (si hay)
- [ ] Los cambios están commiteados en Git
- [ ] Tienes acceso SSH al servidor
- [ ] Hay un backup de la versión actual (por si acaso)
- [ ] Notificaste al equipo del deploy (si aplica)

## 📝 Checklist Post-Deploy

Después de cada deploy:

- [ ] El sitio carga correctamente
- [ ] No hay errores en consola del navegador
- [ ] QZ Tray conecta correctamente
- [ ] La impresión funciona
- [ ] Todas las funcionalidades principales funcionan
- [ ] Se creó un tag en Git con la versión desplegada

---

## 📞 Soporte

Si tienes problemas con el deploy:

1. Verificar logs del servidor web (nginx/apache)
2. Verificar permisos de archivos
3. Verificar configuración de firewall
4. Contactar al administrador del servidor

---

**Fecha:** 2025-12-12
**Autor:** Claude
**Versión:** 1.0
