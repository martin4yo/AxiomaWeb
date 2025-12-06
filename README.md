# AxiomaWeb ERP

Sistema ERP moderno y multi-tenant construido con Node.js, React y PostgreSQL, con integración completa a AFIP para facturación electrónica.

## 🚀 Características

### Core
- **Multi-tenant**: Un solo despliegue, múltiples clientes con aislamiento total de datos
- **Autenticación segura**: JWT con roles y permisos por tenant
- **UI moderna**: Interfaz responsive con Tailwind CSS y componentes reutilizables
- **API RESTful**: Backend escalable con Express.js y TypeScript
- **Base de datos optimizada**: PostgreSQL con Prisma ORM

### Módulos de Negocio
- **Productos**: Gestión completa con SKU, stock, categorías y marcas
- **Clientes**: Base de datos de entidades con condiciones fiscales
- **Ventas**: Punto de venta con productos de acceso rápido
- **Inventario**: Control de stock por almacén
- **Sucursales**: Multi-sucursal con configuración independiente

### Facturación Electrónica AFIP 🇦🇷
- **WSAA**: Autenticación con certificados digitales
- **WSFE v1**: Emisión de facturas A, B, C
- **Notas de Crédito/Débito**: Gestión completa
- **CAE**: Solicitud y validación automática
- **Puntos de Venta**: Configuración por sucursal
- **Sincronización**: Numeración automática con AFIP
- **Multi-ambiente**: Testing y Producción

### Impresión de Tickets y Facturas 🖨️
- **Templates Flexibles**: Sistema JSON para múltiples formatos
- **Impresión Automática**: Se imprime al completar venta
- **Impresoras Térmicas**: Soporte nativo para 58mm y 80mm
- **Códigos QR**: Generación automática para validación AFIP
- **Datos de CAE**: Integrado con facturación electrónica
- **Templates por Comprobante**: Formato diferente según tipo
- **Sin Dependencias**: Funciona con cualquier impresora del SO

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** 18+
- **Express.js** - Framework web
- **TypeScript** - Type safety
- **Prisma ORM** - Database ORM
- **PostgreSQL** 14+ - Base de datos
- **JWT** - Autenticación
- **Zod** - Validación de schemas
- **node-forge** - Firma digital para AFIP
- **soap** - Cliente SOAP para AFIP

### Frontend
- **React** 18
- **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **Zustand** - State management
- **TanStack Query** - Data fetching
- **React Hook Form** - Formularios
- **React Router** - Navegación
- **Axios** - HTTP client

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

### ✅ **IMPLEMENTADO Y OPERATIVO** (v1.0 - Diciembre 2024)

#### 🏢 Gestión Multi-Tenant
- [x] Tenants con aislamiento completo de datos
- [x] Usuarios, roles y permisos por tenant
- [x] Configuración fiscal por tenant

#### 📦 Productos e Inventario
- [x] Catálogo de productos con SKU, precios, stock
- [x] Categorías y marcas de productos
- [x] Almacenes/Depósitos múltiples
- [x] Stock por almacén con movimientos
- [x] **Alertas de stock** (mínimo, máximo, punto de pedido)
- [x] Ajustes de inventario
- [x] Control de stock negativo configurable
- [x] Dashboard de alertas en tiempo real

#### 💰 Ventas
- [x] Punto de venta (POS) completo
- [x] Múltiples formas de pago por venta
- [x] Descuentos por item y general
- [x] Cliente final o registrado
- [x] Estados de pago (pendiente/parcial/pagado)
- [x] Historial con filtros avanzados

#### 🛒 Compras
- [x] Registro de compras con items
- [x] Asignación a almacén
- [x] Pagos de compras
- [x] Estado de cuenta proveedores
- [x] Fechas de vencimiento

#### 🧾 Facturación Electrónica AFIP
- [x] Integración completa WSAA + WSFEv1
- [x] Certificados digitales (testing + producción)
- [x] Puntos de venta configurables
- [x] Facturas A, B, C
- [x] Solicitud automática de CAE
- [x] Reintento de CAE ante errores
- [x] Código QR de validación ARCA
- [x] Determinación automática de comprobante

#### 🖨️ Impresión
- [x] **Térmica 80mm** con comandos ESC/POS
- [x] **PDF A4** formato legal
- [x] Templates: Legal (con QR/CAE) y Simple
- [x] **Print Manager para Windows** (versión simplificada)
- [x] Configuración por cliente y comprobante
- [x] Reimpresión de comprobantes

#### 💵 Caja y Bancos
- [x] Cuentas de caja/banco múltiples
- [x] Movimientos automáticos desde ventas/compras
- [x] Vinculación formas de pago → cuentas

#### 🏢 Otros Módulos
- [x] Sucursales con configuración AFIP
- [x] Entidades unificadas (clientes/proveedores)
- [x] Tipos de documento personalizables
- [x] Dashboard con métricas básicas

---

### 🚧 **EN DESARROLLO** - Q1 2025 (Enero-Marzo)

- [ ] **Cuenta Corriente de Clientes** (3-4 días)
- [ ] **Notas de Crédito/Débito AFIP** (4-5 días) - CRÍTICO
- [ ] **Presupuestos y Cotizaciones** (3 días)

---

### 📋 **ROADMAP COMPLETO** - 2025

Ver **[ROADMAP.md](./ROADMAP.md)** para plan detallado

#### Q2 2025 (Abril-Junio)
- [ ] Listas de Precios Múltiples
- [ ] Remitos y Guías de Entrega
- [ ] Gestión de Cheques
- [ ] Lotes y Trazabilidad (FIFO)

#### Q3 2025 (Julio-Septiembre)
- [ ] Producción Básica (BOM)
- [ ] CRM Básico
- [ ] Integraciones E-commerce

#### Q4 2025 (Octubre-Diciembre)
- [ ] Contabilidad
- [ ] Reportes Avanzados
- [ ] WhatsApp Business API
- [ ] Auditoría y Seguridad 2FA

## 🤝 Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🚀 Deployment a Producción

**IMPORTANTE**: Si ves el error `ERR_BLOCKED_BY_CLIENT` o referencias a `localhost` en producción, necesitas configurar correctamente las variables de entorno.

Ver la guía completa de deployment en [`DEPLOYMENT.md`](./DEPLOYMENT.md)

### Quick Start para Deploy:

1. **Configurar URL de producción**:
   ```bash
   # En tu plataforma de deployment (Vercel, Netlify, etc.)
   VITE_API_URL=https://api.tudominio.com/api
   ```

2. **O crear .env.production.local**:
   ```bash
   cd frontend
   cp .env.production .env.production.local
   # Editar y actualizar VITE_API_URL con tu URL real
   ```

3. **Build con las variables correctas**:
   ```bash
   npm run build
   ```

**Nota**: Vite embebe las variables de entorno en tiempo de build, no de ejecución.

## 📚 Documentación

### 📋 Documentos del Proyecto

- **[SESION_2024-12-06.md](./SESION_2024-12-06.md)** - Resumen de implementaciones recientes
  - Sistema de alertas de stock
  - Print Manager simplificado para Windows
  - Análisis de módulos implementados vs faltantes

- **[ROADMAP.md](./ROADMAP.md)** - Plan de desarrollo completo 2025
  - Prioridades por trimestre
  - Estimaciones de tiempo
  - Tareas específicas por módulo
  - Calendario de entregas

### Guías Completas

- **[Integración AFIP](./docs/AFIP_INTEGRACION.md)** - Configuración completa de facturación electrónica
  - URLs de homologación y producción
  - Certificados digitales
  - Flujo de autenticación WSAA
  - Solicitud de CAE con WSFE
  - Troubleshooting completo

- **[Sistema de Impresión](./docs/SISTEMA_IMPRESION.md)** - Sistema completo de tickets y facturas
  - Configuración de impresoras térmicas
  - Templates disponibles
  - Personalización de formatos
  - Códigos QR y datos AFIP
  - Solución de problemas

- **[Print Manager Windows](./print-manager/INSTALACION_WINDOWS.md)** - Instalación paso a paso para Windows
  - Guía completa desde cero (20-30 minutos)
  - Instalación de Node.js
  - Configuración de impresoras
  - Scripts de prueba
  - Troubleshooting común

- **[Decisiones de Arquitectura](./docs/DECISIONES_ARQUITECTURA.md)** - Diseño del sistema de impresión
  - Decisiones técnicas y trade-offs
  - Patrones de diseño utilizados
  - Performance y seguridad
  - Lecciones aprendidas

- **[Deployment](./docs/DEPLOYMENT.md)** - Guía de deploy en producción
  - Configuración del servidor
  - Base de datos y migraciones
  - Variables de entorno
  - Nginx y SSL
  - Backups y monitoreo
  - Scripts de deploy

### Guías Rápidas

#### Configurar Impresión (5 minutos)

Ver **[Quick Start Impresión](./docs/QUICK_START_IMPRESION.md)** para inicio rápido

1. **Configurar Datos del Negocio**
   ```
   Configuración → Tenants → Editar → Datos del Negocio
   - Nombre del Negocio
   - CUIT
   - Dirección
   - Teléfono
   ```

2. **Asignar Template**
   ```
   Configuración → Configuración de Comprobantes → Editar
   - Formato de Impresión: Seleccionar template
   ```

3. **Configurar Impresora**
   - Establecer impresora térmica como predeterminada en el SO

4. **¡Listo!**
   - Al crear venta se imprime automáticamente
   - Botón de reimpresión en listado de ventas

Ver ejemplos de código en **[Ejemplos de Código](./docs/EJEMPLOS_CODIGO.md)**

### Guías Rápidas

#### Configurar AFIP (Facturación Electrónica)

1. **Obtener Certificado Digital**
   - Ingresar a AFIP con CUIT y Clave Fiscal
   - Ir a Sistema → Certificados Digitales
   - Generar CSR para Web Services
   - Descargar certificado (.crt) y convertir a PEM

2. **Crear Conexión AFIP**
   ```
   Settings → Conexiones AFIP → Nueva Conexión
   - Nombre: "AFIP Homologación"
   - CUIT: Tu CUIT
   - Ambiente: Testing
   - Certificado: Pegar contenido PEM
   - Clave Privada: Pegar contenido PEM
   - Timeout: 30000 (opcional)
   ```

3. **Crear Punto de Venta**
   ```
   Settings → Puntos de Venta → Nuevo
   - Número: 1
   - Nombre: "PV Principal"
   - Conexión AFIP: Seleccionar la creada
   ```

4. **Configurar Comprobantes**
   ```
   Settings → Configuración de Comprobantes → Nueva
   - Tipo: Factura B
   - Sucursal: Casa Central
   - Conexión AFIP: Seleccionar
   - Punto de Venta: PV Principal
   - Próximo Número: 1
   ```

5. **Probar Integración**
   - Ir a Conexiones AFIP
   - Click en "Probar Conexión"
   - Verificar los 3 pasos estén en verde

Ver documentación completa en [`docs/AFIP_INTEGRACION.md`](./docs/AFIP_INTEGRACION.md)

#### Deploy en Producción

```bash
# En el servidor
cd /var/www/AxiomaWeb/backend

# Aplicar migraciones
npx prisma migrate deploy

# Regenerar cliente Prisma
npx prisma generate

# Compilar TypeScript
npm run build

# Reiniciar servicio
sudo systemctl restart axioma-backend
```

Ver guía completa en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

## 🆘 Soporte

Si tienes problemas o preguntas:

1. **Documentación**: Revisa las guías en [`docs/`](./docs/)
2. **Issues**: Busca en los issues existentes
3. **Nuevo Issue**: Crea un issue con detalles del problema
4. **Logs**: Incluye logs relevantes del error

### Problemas Comunes

**Error de compilación TypeScript en producción**
```bash
cd /var/www/AxiomaWeb/backend
npx prisma generate
npm run build
```

**Dashboard sin datos**
- Verificar que uses `currentTenant` en las queries
- URLs deben incluir `/${tenantSlug}/`

**AFIP timeout**
- Aumentar timeout en conexión AFIP (Settings)
- Verificar firewall permite conexiones a afip.gov.ar

## 🙏 Agradecimientos

- Inspirado en sistemas ERP modernos
- Construido con las mejores prácticas de desarrollo
- Diseñado para escalabilidad y mantenibilidad
- Integración AFIP siguiendo normativa argentina

## 📄 Licencia

Copyright © 2025 AxiomaWeb