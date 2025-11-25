# Guía de Despliegue - Axioma ERP

## Problema Común: Error ERR_BLOCKED_BY_CLIENT en Producción

Si ves este error en producción:
```
POST http://localhost:3150/api/auth/login net::ERR_BLOCKED_BY_CLIENT
```

Significa que el frontend fue construido con la URL de desarrollo (`localhost`) en lugar de la URL de producción.

## Solución

### 1. Configurar Variables de Entorno para Producción

Vite embebe las variables de entorno en tiempo de **build**, no de ejecución. Por lo tanto, debes configurar la URL correcta **antes** de hacer el build.

#### Opción A: Usar archivo .env.production

Edita el archivo `frontend/.env.production`:

```bash
# Para API en dominio diferente
VITE_API_URL=https://api.tudominio.com/api

# O si frontend y backend están en el mismo dominio
VITE_API_URL=/api
```

Luego ejecuta el build:
```bash
cd frontend
npm run build
```

#### Opción B: Variable de entorno en el comando de build

```bash
cd frontend
VITE_API_URL=https://api.tudominio.com/api npm run build
```

#### Opción C: En plataformas de deployment (Vercel, Netlify, etc.)

Configura la variable de entorno en el panel de control de tu plataforma:

**Vercel:**
1. Ve a Project Settings → Environment Variables
2. Agrega: `VITE_API_URL` con el valor `https://api.tudominio.com/api`
3. Redeploy el proyecto

**Netlify:**
1. Ve a Site Settings → Build & Deploy → Environment Variables
2. Agrega: `VITE_API_URL` con el valor `https://api.tudominio.com/api`
3. Trigger a new deploy

**Railway/Render/etc:**
Similar - busca la sección de Environment Variables y agrega `VITE_API_URL`

### 2. Verificar la Configuración

Después del build, verifica que la variable fue embebida correctamente:

```bash
# Busca en los archivos generados
cd frontend/dist/assets
grep -r "localhost:3150" .
```

Si encuentras `localhost:3150`, significa que el build no usó la variable de entorno correcta.

### 3. Arquitecturas Comunes

#### A. Frontend y Backend en el mismo dominio (con proxy reverso)

```
https://tudominio.com/         → Frontend (React)
https://tudominio.com/api/     → Backend (Express)
```

Configuración:
```bash
VITE_API_URL=/api
```

Nginx config ejemplo:
```nginx
location / {
    root /var/www/frontend;
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://localhost:3150/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

#### B. Frontend y Backend en dominios diferentes

```
https://app.tudominio.com/     → Frontend
https://api.tudominio.com/     → Backend
```

Configuración:
```bash
VITE_API_URL=https://api.tudominio.com/api
```

**Importante:** Configura CORS en el backend para permitir requests desde el dominio del frontend.

Backend (`backend/src/server.ts`):
```typescript
app.use(cors({
  origin: ['https://app.tudominio.com'],
  credentials: true
}))
```

### 4. Checklist de Deployment

- [ ] Variables de entorno configuradas en la plataforma
- [ ] Build ejecutado con las variables correctas
- [ ] No hay referencias a `localhost` en el código del frontend
- [ ] CORS configurado correctamente en el backend
- [ ] Backend accesible desde la URL configurada
- [ ] Base de datos configurada y migraciones ejecutadas
- [ ] Credenciales de base de datos en variables de entorno del backend

### 5. Debugging

Si sigues teniendo problemas, verifica:

1. **Inspeccionar Network en DevTools:**
   - Abre DevTools → Network
   - Intenta hacer login
   - Ve a qué URL está intentando hacer el request
   - Si sigue siendo `localhost`, el build no tiene las variables correctas

2. **Revisar console.log en api.ts:**
   - Los interceptores de axios logean la URL completa
   - Revisa qué baseURL está usando

3. **Verificar build:**
   ```bash
   cd frontend/dist/assets
   grep -r "API_URL" *.js
   ```

## Contacto

Para más información sobre el deployment, consulta:
- [Vite: Env Variables and Modes](https://vitejs.dev/guide/env-and-mode.html)
- [Vite: Building for Production](https://vitejs.dev/guide/build.html)
