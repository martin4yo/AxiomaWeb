# Inicio Rápido - Próxima Sesión

## Estado Actual del Proyecto (13/12/2025)

### Módulos Completados y Operativos
1. **Ventas** - 100%
2. **Compras** - 100%
3. **Sistema de Caja** - 100%
4. **Productos e Inventario** - 100%
5. **Clientes y Proveedores** - 100%
6. **Facturación Electrónica AFIP** - 100%
7. **Impresión** - 100% (Térmica 80mm, PDF A4, Print Manager Windows)

---

## Última Sesión (13/12/2025)

### Implementado

#### 1. Ticket Térmico - Corrección de Datos
**Problema:** Los precios, totales y formas de pago aparecían en 0 o "Sin Especificar"

**Causa:** Desajuste de nombres de campos entre backend y frontend:
- Backend enviaba `unitPrice` → Frontend esperaba `price`
- Backend enviaba `totalAmount` → Frontend esperaba `total`
- Backend enviaba `name` en payments → Frontend esperaba `method`

**Solución:** Actualizado `backend/src/routes/sales.ts` (endpoints `thermal-data` y `thermal`) para enviar ambos nombres de campos:
```javascript
items: {
  description, name,           // Ambos para compatibilidad
  price, unitPrice,            // Ambos para compatibilidad
  total, ...
}
payments: {
  method, name,                // Ambos para compatibilidad
  amount, ...
}
sale: {
  total, totalAmount,          // Ambos para compatibilidad
  ...
}
```

#### 2. Selector de Impresora Térmica - Fix de Selección
**Problema:** La impresora guardada no aparecía seleccionada al editar voucher

**Causa:** El `useEffect` que populaba el formulario no tenía `printers` como dependencia, entonces se ejecutaba antes de que la lista de impresoras estuviera cargada.

**Solución:** Agregado `printers` como dependencia en `EditVoucherConfigurationPage.tsx`:
```javascript
// Antes
}, [configuration, salesPoints, reset])

// Después
}, [configuration, salesPoints, reset, printers])
```

#### 3. Productos - Campos Opcionales de Stock y Peso
**Problema:** Los campos de stock y peso eran requeridos aunque `trackStock` estuviera desactivado

**Solución:**
- **Frontend:** Actualizado schema Zod en `ProductModal.tsx` con `preprocess` para permitir valores vacíos/null
- **Backend:** Actualizado schema en `products.ts` para hacer campos opcionales y nullable:
  - `currentStock`, `minStock`, `maxStock`, `reorderPoint` → opcionales
  - `weight` → opcional

#### 4. Sidebar - Menú de Cajas
**Problema:** Usuario no encontraba el CRUD de cajas

**Solución:** Renombrado "Balance" a "Cajas" y reordenado en el menú "Fondos":
- Antes: Movimientos, Balance
- Ahora: **Cajas**, Movimientos

#### 5. Seed KeySoft
Ejecutado seed para crear tenant KeySoft con todos los datos base:
- Tenant, Usuario Admin, Condiciones IVA, Tipos de Comprobante
- Sucursal, Conexión AFIP, Punto de Venta
- Configuraciones de Comprobantes, Almacén, Caja, Formas de Pago

**Credenciales:**
```
Email: admin@keysoft.com
Password: KeySoft2024!
Tenant: keysoft
```

---

## Base de Datos Actual

```
Host: 66.97.45.210
Puerto: 5432
Usuario: postgres
Password: Q27G4B98
Base de datos: axiomaweb_db
```

---

## Archivos Modificados Esta Sesión

### Backend
- `backend/src/routes/sales.ts` - Corregido mapeo de campos para thermal-data
- `backend/src/routes/products.ts` - Campos de stock opcionales
- `backend/.env` - Configuración de BD remota

### Frontend
- `frontend/src/pages/settings/EditVoucherConfigurationPage.tsx` - Fix selector impresora + logs debug
- `frontend/src/components/products/ProductModal.tsx` - Campos stock/peso opcionales
- `frontend/src/components/layout/Sidebar.tsx` - Renombrado "Balance" a "Cajas"

---

## Logs de Debug Activos

### Frontend (Consola del navegador)
En `EditVoucherConfigurationPage.tsx`:
- `[EditVoucherConfig] Servicio de impresión disponible: true/false`
- `[EditVoucherConfig] Lista de impresoras recuperadas: [...]`
- `[EditVoucherConfig] Configuración recibida del backend: {...}`

### Backend (Consola del servidor)
En endpoint `thermal-data`:
- `[ThermalData] Sale ID: ...`
- `[ThermalData] Items crudos: [...]`
- `[ThermalData] Totales crudos: {...}`
- `[ThermalData] Payments crudos: [...]`
- `[ThermalData] printData.sale preparado: {...}`

**Nota:** Estos logs pueden eliminarse una vez confirmado que todo funciona.

---

## Próximos Pasos Sugeridos

### Prioridad ALTA
1. **Quitar logs de debug** - Una vez confirmado que impresión funciona
2. **Dashboard con Métricas** - Total vendido, productos más vendidos, stock bajo
3. **Módulo de Informes** - Ventas por producto, exportación Excel

### Prioridad MEDIA
1. **Cuenta Corriente de Clientes**
2. **Notas de Crédito/Débito AFIP**
3. **Optimizaciones de rendimiento**

---

## Comandos Útiles

### Iniciar Desarrollo
```bash
# Backend (Puerto 3150)
cd backend && npm run dev

# Frontend (Puerto 8088)
cd frontend && npm run dev

# Print Manager (Puerto 5555)
cd print-manager && node server-windows.js
```

### Seed KeySoft
```bash
cd backend
export DATABASE_URL="postgresql://postgres:Q27G4B98@66.97.45.210:5432/axiomaweb_db?schema=public"
npx tsx src/seed-keysoft.ts
```

---

## Tenants Disponibles

| Tenant | Email | Password |
|--------|-------|----------|
| demo | demo@axioma.com | (verificar) |
| keysoft | admin@keysoft.com | KeySoft2024! |

---

**Última actualización:** 13/12/2025
