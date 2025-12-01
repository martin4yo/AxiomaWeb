# 🚀 Inicio Rápido - Próxima Sesión

## 📊 Estado Actual del Proyecto (01/12/2025)

### ✅ Módulos Completados y Operativos
1. **Ventas** - 100% ✅
2. **Compras** - 100% ✅
3. **Sistema de Caja** - 85% ✅
4. **Productos e Inventario** - 100% ✅
5. **Clientes y Proveedores** - 100% ✅

### 📝 Última Sesión (01/12/2025)

**Implementado:**
- ✅ Descripción personalizada en items de venta/compra
- ✅ Fecha de venta configurable
- ✅ Fecha de vencimiento en compras
- ✅ Filtro por cuenta en movimientos de caja
- ✅ Bug fix: actualización automática de movimientos

**Documentación:**
- ✅ `docs/SESION_2025-12-01.md` - Documentación detallada
- ✅ `ROADMAP.md` actualizado

---

## 🎯 Próximos Pasos Prioritarios

### Prioridad ALTA 🔴
1. **Dashboard con Métricas**
   - Total vendido hoy/semana/mes
   - Productos más vendidos
   - Movimientos de caja del día
   - Stock bajo mínimo
   - Productos próximos a vencer

2. **Módulo de Informes**
   - Ventas por producto
   - Cobranzas por forma de pago
   - Exportación a Excel

3. **Mejoras de UX**
   - Notificación de productos próximos a vencer
   - Alertas de stock bajo
   - Atajos de teclado en POS

### Prioridad MEDIA 🟡
1. **Integración AFIP**
   - Configuración de certificados
   - Facturación electrónica
   - Generación de PDFs

2. **Optimizaciones**
   - Índices en tablas principales
   - Paginación en endpoints
   - Cache de consultas frecuentes

### Prioridad BAJA 🟢
1. **Extras**
   - Sistema de impresión térmica (Electron app)
   - App móvil para ventas
   - Integración Mercado Pago

---

## 🛠️ Comandos Útiles

### Iniciar Desarrollo
```bash
# Terminal 1 - Backend
cd /home/martin/Desarrollos/AxiomaWeb/backend
npm run dev  # Puerto 3001

# Terminal 2 - Frontend
cd /home/martin/Desarrollos/AxiomaWeb/frontend
npm run dev  # Puerto 5173
```

### Base de Datos
```bash
# Conectar a PostgreSQL
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d axiomaweb_db

# Ver migraciones
cd /home/martin/Desarrollos/AxiomaWeb/backend
npx prisma migrate status

# Crear nueva migración
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/axiomaweb_db" npx prisma migrate dev --name nombre_de_migracion
```

### Datos de Prueba
- **Tenant:** Demo (slug: demo)
- **Usuario:** demo@axioma.com
- **Cuentas:** Caja Principal, Cuenta Bancaria, Mercado Pago
- **Formas de pago:** Efectivo, Crédito, Débito, MP

---

## 📁 Estructura de Archivos Clave

### Backend
```
backend/
├── src/
│   ├── routes/
│   │   ├── sales.ts          # API de ventas
│   │   ├── purchases.ts      # API de compras
│   │   ├── cash.ts           # API de movimientos de caja
│   │   └── ...
│   ├── services/
│   │   ├── salesService.ts   # Lógica de negocio ventas
│   │   ├── purchaseService.ts # Lógica de negocio compras
│   │   ├── cashMovementService.ts # Lógica movimientos
│   │   └── ...
│   └── middleware/
│       ├── tenantMiddleware.ts # Aislamiento multi-tenant
│       └── authMiddleware.ts   # Autenticación JWT
└── prisma/
    └── schema.prisma         # Modelos de datos
```

### Frontend
```
frontend/
├── src/
│   ├── pages/
│   │   ├── sales/
│   │   │   ├── NewSalePage.tsx      # POS
│   │   │   └── SalesPage.tsx        # Listado
│   │   ├── purchases/
│   │   │   ├── NewPurchasePage.tsx  # Formulario compra
│   │   │   └── PurchasesPage.tsx    # Listado
│   │   └── cash/
│   │       ├── CashMovementsPage.tsx # Movimientos
│   │       └── CashAccountsPage.tsx  # Cuentas
│   ├── services/
│   │   ├── api.ts            # Cliente Axios
│   │   └── ...
│   └── stores/
│       └── authStore.ts      # Zustand store auth
```

---

## 🐛 Issues Conocidos

### Pendientes
- [ ] Agregar índice en `purchase_items.expiration_date` para optimizar búsquedas
- [ ] Validar que fecha de venta no sea futura (opcional)
- [ ] Límite de caracteres en descripción personalizada (500 chars)

### En Desarrollo
- Ninguno actualmente

---

## 💡 Notas para Recordar

### Arquitectura Multi-Tenant
- Todos los modelos principales tienen `tenantId`
- El middleware `tenantMiddleware` filtra automáticamente por tenant
- Algunos modelos están en `skipModels` (ej: User, SaleItem, PurchaseItem)

### Cálculo de IVA
- Se calcula automáticamente según condición IVA del cliente
- Responsable Inscripto → IVA discriminado
- Consumidor Final → IVA incluido

### Movimientos de Caja
- Se crean automáticamente al guardar venta/compra
- Vinculados a la cuenta del método de pago
- Si método no tiene cuenta, usa cuenta por defecto

### React Query
- Invalidar cache al mutar: `queryClient.invalidateQueries({ queryKey: [...] })`
- Siempre incluir dependencias en `queryKey` para reactividad

---

## 📚 Documentación Disponible

- `README.md` - Información general del proyecto
- `ROADMAP.md` - Hoja de ruta y estado del proyecto
- `CONFIGURATION.md` - Configuración del sistema
- `DEPLOYMENT.md` - Guía de deployment
- `docs/AFIP_INTEGRACION.md` - Documentación AFIP
- `docs/SESION_2025-12-01.md` - Última sesión de desarrollo

---

## 🔗 Enlaces Útiles

- [Prisma Docs](https://www.prisma.io/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev/)

---

**Última actualización:** 01/12/2025
**Próxima revisión:** Al inicio de la próxima sesión

---

## ✨ Quick Start Checklist

Al iniciar la próxima sesión:
- [ ] Leer `docs/SESION_2025-12-01.md` para contexto
- [ ] Verificar que servicios estén corriendo (backend + frontend)
- [ ] Hacer pull de cambios si hay colaboradores
- [ ] Revisar issues en GitHub (si aplica)
- [ ] Confirmar estado de la base de datos
- [ ] Abrir esta documentación para referencia rápida
