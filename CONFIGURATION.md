# ⚙️ Configuración del Proyecto

## 📋 Variables de Entorno

### Backend (`backend/.env`)

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/axiomaweb_db"

# JWT
JWT_SECRET="axioma_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3150                              # Puerto del backend
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:8088"   # URL del frontend para CORS
```

### Frontend (`frontend/.env`)

```bash
# Frontend Configuration
VITE_APP_NAME="Axioma ERP"
VITE_API_URL="http://localhost:3150"  # URL del backend para proxy
VITE_PORT=8088                         # Puerto del frontend
```

---

## 🔧 Configuración de Puertos

| Servicio       | Puerto | Variable de Entorno | Configurable en      |
|----------------|--------|---------------------|----------------------|
| Frontend       | 8088   | `VITE_PORT`         | `frontend/.env`      |
| Backend        | 3150   | `PORT`              | `backend/.env`       |
| PostgreSQL     | 5433   | `DATABASE_URL`      | `backend/.env`       |

---

## 🔄 Flujo de Comunicación

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador                                                  │
│  http://localhost:8088                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Solicitud a /api/*
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Vite Dev Server (Frontend)                                 │
│  Puerto: 8088 (VITE_PORT)                                   │
│                                                              │
│  Proxy configurado en vite.config.ts:                       │
│  • Intercepta todas las peticiones a /api/*                 │
│  • Agrega header Authorization                              │
│  • Reenvía a backend (VITE_API_URL)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Proxy: /api/* → http://localhost:3150/api/*
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Express Backend                                             │
│  Puerto: 3150 (PORT)                                         │
│                                                              │
│  • Valida JWT token                                          │
│  • Extrae tenantSlug de la URL                               │
│  • Filtra datos por tenantId                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Consultas SQL
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                  │
│  Puerto: 5433 (DATABASE_URL)                                │
│  Database: axiomaweb_db                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 Problemas Comunes

### 1. Error 401 Unauthorized

**Causa**: El header `Authorization` no llega al backend.

**Solución**:
- Verificar que `vite.config.ts` tenga `changeOrigin: false`
- Verificar que el proxy esté configurado para reenviar el header Authorization
- Reiniciar el servidor de Vite después de cambios en la configuración

### 2. Error 404 en rutas

**Causa**: Falta el `tenantSlug` en la URL o el proxy no está funcionando.

**Solución**:
- Verificar que el interceptor de axios agregue el `tenantSlug`: `/api/{tenantSlug}/endpoint`
- Verificar que `VITE_API_URL` esté configurado correctamente
- Verificar que el proxy en `vite.config.ts` esté apuntando al puerto correcto

### 3. CORS Error

**Causa**: La URL del frontend no está permitida en el backend.

**Solución**:
- Verificar que `FRONTEND_URL` en `backend/.env` coincida con la URL del frontend
- Formato correcto: `http://localhost:8088` (sin trailing slash)

### 4. Cannot connect to database

**Causa**: PostgreSQL no está corriendo o los datos de conexión son incorrectos.

**Solución**:
- Verificar que PostgreSQL esté corriendo: `lsof -i :5433`
- Verificar `DATABASE_URL` en `backend/.env`
- Formato: `postgresql://user:password@host:port/database`

---

## 🔐 Seguridad en Producción

### Variables que DEBES cambiar en producción:

1. **JWT_SECRET**: Generar una clave aleatoria segura
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **DATABASE_URL**: Usar credenciales seguras y conexión SSL
   ```
   postgresql://user:secure_password@host:port/db?sslmode=require
   ```

3. **FRONTEND_URL**: Cambiar a tu dominio de producción
   ```
   https://app.tudominio.com
   ```

4. **NODE_ENV**: Cambiar a "production"

---

## 📝 Checklist de Configuración Inicial

- [ ] Copiar `backend/.env.example` a `backend/.env`
- [ ] Copiar `frontend/.env.example` a `frontend/.env`
- [ ] Configurar credenciales de PostgreSQL en `backend/.env`
- [ ] Verificar que los puertos no estén en uso
- [ ] Ejecutar `npm install` en backend y frontend
- [ ] Ejecutar migraciones: `cd backend && npx prisma migrate dev`
- [ ] Cargar datos de prueba: `cd backend && npx tsx src/seed.ts`
- [ ] Iniciar backend: `cd backend && npm run dev`
- [ ] Iniciar frontend: `cd frontend && npm run dev`
- [ ] Acceder a http://localhost:8088
- [ ] Login con `demo@axioma.com` / `demo123`

---

## 🔄 Actualización de Configuración

Si cambias alguna variable de entorno:

1. **Backend**: Reiniciar el servidor (tsx watch lo hace automáticamente)
2. **Frontend con cambios en `.env`**: Reiniciar Vite (Ctrl+C y `npm run dev`)
3. **Frontend con cambios en `vite.config.ts`**: SIEMPRE reiniciar Vite

---

## 📦 Configuración para Docker (Futuro)

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - PORT=3150
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/axiomaweb
      - FRONTEND_URL=http://localhost:8088
      - JWT_SECRET=${JWT_SECRET}

  frontend:
    environment:
      - VITE_API_URL=http://backend:3150
      - VITE_PORT=8088

  db:
    image: postgres:15
    ports:
      - "5433:5432"
```

---

**Última actualización:** 2025-11-24
