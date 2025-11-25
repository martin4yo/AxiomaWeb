# Axioma ERP

Sistema ERP moderno y multi-tenant construido con Node.js, React y PostgreSQL.

## 🚀 Características

- **Multi-tenant**: Un solo despliegue, múltiples clientes
- **Autenticación segura**: JWT con roles y permisos
- **Gestión de documentos**: Sistema flexible de documentos comerciales
- **UI moderna**: Interfaz responsive con Tailwind CSS
- **API RESTful**: Backend escalable con Express.js
- **Base de datos optimizada**: PostgreSQL con Prisma ORM

## 🛠️ Stack Tecnológico

### Backend
- Node.js 20+
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Zod Validation

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (Estado)
- React Query (Fetching)
- React Hook Form

## 🏃‍♂️ Inicio Rápido

### Prerrequisitos

- Node.js 20+
- npm o yarn
- Docker y Docker Compose (opcional)

### Opción 1: Con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <repository-url>
cd axioma-erp

# Levantar servicios con Docker
docker-compose up -d

# Ejecutar migraciones y seed
npm run db:migrate
npm run db:seed

# La aplicación estará disponible en:
# Frontend: http://localhost:8088 (configurable en frontend/.env - VITE_PORT)
# Backend: http://localhost:3150 (configurable en backend/.env - PORT)
# Base de datos: localhost:5432
```

### Opción 2: Desarrollo Local

```bash
# Clonar el repositorio
git clone <repository-url>
cd axioma-erp

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install

# Volver al directorio raíz
cd ..

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones

# Ejecutar migraciones y seed
npm run db:migrate
npm run db:seed

# Ejecutar en modo desarrollo
npm run dev
```

## 📊 Datos de Prueba

Después de ejecutar el seed, puedes acceder con:

- **Email**: demo@axioma.com
- **Contraseña**: demo123
- **Tenant**: demo

## 📁 Estructura del Proyecto

```
axioma-erp/
├── backend/                 # API Backend
│   ├── src/
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── middleware/      # Middlewares personalizados
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── utils/           # Utilidades
│   │   └── server.ts        # Punto de entrada
│   ├── prisma/              # Schema y migraciones
│   └── package.json
├── frontend/                # Frontend React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas de la aplicación
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Estado global (Zustand)
│   │   ├── services/        # Servicios API
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml       # Configuración Docker
└── README.md
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev                  # Ejecutar frontend y backend
npm run dev:backend         # Solo backend
npm run dev:frontend        # Solo frontend

# Base de datos
npm run db:migrate          # Ejecutar migraciones
npm run db:generate         # Generar cliente Prisma
npm run db:seed             # Cargar datos de prueba
npm run db:studio           # Abrir Prisma Studio

# Construcción
npm run build               # Construir para producción
npm run build:backend       # Solo backend
npm run build:frontend      # Solo frontend
```

## 🏗️ Arquitectura

### Multi-tenancy
El sistema implementa multi-tenancy a nivel de fila usando `tenant_id` en todas las tablas principales. Cada consulta se filtra automáticamente por el tenant del usuario autenticado.

### Autenticación
- JWT tokens para autenticación
- Middleware de autorización por tenant
- Roles y permisos configurables por tenant

### Base de Datos
- PostgreSQL con Prisma ORM
- Migraciones versionadas
- Índices optimizados para queries multi-tenant
- Soft deletes para auditoría

## 🌟 Funcionalidades Principales

### ✅ Implementado (MVP)
- [ ] Sistema de autenticación multi-tenant
- [ ] Dashboard con métricas básicas
- [ ] Gestión de clientes y proveedores
- [ ] Catálogo de productos
- [ ] Documentos básicos (facturas, presupuestos)
- [ ] UI responsive moderna

### 🚧 En Desarrollo
- [ ] Sistema de workflows configurables
- [ ] Aplicación de documentos
- [ ] Control de stock con lotes
- [ ] Reportes dinámicos
- [ ] Integración AFIP (Argentina)

### 📋 Roadmap
- [ ] Módulo de compras avanzado
- [ ] Sistema de tesorería
- [ ] Control de acceso granular
- [ ] API webhooks
- [ ] Mobile app (React Native)

## 🤝 Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🙏 Agradecimientos

- Inspirado en sistemas ERP modernos
- Construido con las mejores prácticas de desarrollo
- Diseñado para escalabilidad y mantenibilidad