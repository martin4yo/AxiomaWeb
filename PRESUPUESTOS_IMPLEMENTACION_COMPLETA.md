# Presupuestos - Implementación Completa ✅

**Fecha:** 18 de Diciembre de 2024
**Estado:** ✅ COMPLETADO Y FUNCIONAL

---

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente el **Módulo de Presupuestos (Quotes)** completo en AxiomaWeb ERP, incluyendo:

- ✅ Modelos de base de datos (Prisma)
- ✅ Backend API completo
- ✅ Frontend con UI/UX completa
- ✅ Integración con módulo de Ventas
- ✅ Conversión de Presupuesto → Venta (parcial y total)
- ✅ Gestión de estados del presupuesto
- ✅ Migraciones aplicadas

---

## 🗂️ Arquitectura Implementada

### Base de Datos

#### Modelo `Quote` (Presupuesto)
```prisma
model Quote {
  id                String      @id @default(cuid())
  tenantId          String
  quoteNumber       String      // PRE-00000001
  quoteDate         DateTime
  validUntil        DateTime?

  customerId        String?
  customerName      String

  subtotal          Decimal
  discountAmount    Decimal
  discountPercent   Decimal
  taxAmount         Decimal
  totalAmount       Decimal

  notes             String?
  termsAndConditions String?
  internalNotes     String?

  status            QuoteStatus

  // Relaciones
  items             QuoteItem[]
  convertedToSales  Sale[]      // Puede generar múltiples ventas (conversión parcial)

  createdBy         String
  createdAt         DateTime
  updatedAt         DateTime
}
```

#### Modelo `QuoteItem` (Ítems del Presupuesto)
```prisma
model QuoteItem {
  id                String   @id
  quoteId           String
  lineNumber        Int

  productId         String?
  productSku        String?
  productName       String
  description       String?

  quantity          Decimal
  unitPrice         Decimal

  // Control de conversión parcial
  quantityConverted Decimal  // Cantidad ya convertida a ventas
  quantityPending   Decimal  // quantity - quantityConverted

  discountPercent   Decimal
  discountAmount    Decimal
  taxRate           Decimal
  taxAmount         Decimal

  subtotal          Decimal
  lineTotal         Decimal
}
```

#### Estados del Presupuesto (`QuoteStatus`)
```typescript
enum QuoteStatus {
  PENDING               // Pendiente de respuesta del cliente
  APPROVED              // Cliente aprobó
  REJECTED              // Cliente rechazó
  EXPIRED               // Venció la validez
  PARTIALLY_CONVERTED   // Conversión parcial en progreso
  FULLY_CONVERTED       // Totalmente convertido
  CANCELLED             // Cancelado por el negocio
}
```

---

## 🔧 Backend Implementado

### Servicio: `QuoteService`
**Ubicación:** `backend/src/services/quoteService.ts`

#### Métodos Principales:

1. **`createQuote(data)`** - Crear nuevo presupuesto
   - Valida cliente (si existe)
   - Calcula precios, descuentos e impuestos
   - Genera número secuencial (PRE-00000001, PRE-00000002, etc.)
   - **NO afecta stock** (diferencia clave con ventas)

2. **`listQuotes(filters)`** - Listar presupuestos con filtros
   - Paginación
   - Filtros: fecha, cliente, estado, búsqueda
   - Ordenamiento configurable

3. **`getQuoteById(id)`** - Obtener detalle completo

4. **`getDataForSaleConversion(quoteId)`** - Preparar datos para conversión
   - Retorna solo items con `quantityPending > 0`
   - Calcula cantidades disponibles para convertir

5. **`recordSaleConversion(quoteId, itemsConverted)`** - Registrar conversión
   - Actualiza `quantityConverted` y `quantityPending`
   - Cambia estado a `PARTIALLY_CONVERTED` o `FULLY_CONVERTED`

6. **`updateQuoteStatus(id, status)`** - Cambiar estado
   - Validaciones de transiciones permitidas

7. **`cancelQuote(id)`** - Cancelar presupuesto
   - Solo si no tiene conversiones

---

### Rutas API: `backend/src/routes/quotes.ts`

```typescript
POST   /api/:tenantSlug/quotes                    // Crear presupuesto
GET    /api/:tenantSlug/quotes                    // Listar presupuestos
GET    /api/:tenantSlug/quotes/:id                // Obtener detalle
GET    /api/:tenantSlug/quotes/:id/conversion-data // Datos para conversión
PATCH  /api/:tenantSlug/quotes/:id/status         // Actualizar estado
POST   /api/:tenantSlug/quotes/:id/cancel         // Cancelar
POST   /api/:tenantSlug/quotes/:id/record-conversion // Registrar conversión
```

**Autenticación:** Todas las rutas requieren `authMiddleware` ✅

---

## 🎨 Frontend Implementado

### API Client: `frontend/src/api/quotes.ts`

```typescript
export const quotesApi = {
  createQuote(data)
  getQuotes(filters)
  getQuoteById(id)
  getConversionData(id)
  updateQuoteStatus(id, status)
  cancelQuote(id)
  recordSaleConversion(quoteId, itemsConverted)
}
```

---

### Páginas Implementadas

#### 1. **Lista de Presupuestos** - `QuotesPage.tsx`
**Ruta:** `/quotes`

**Funcionalidades:**
- ✅ Tabla con todos los presupuestos
- ✅ Filtros: fecha, cliente, estado, búsqueda
- ✅ Paginación
- ✅ Indicadores visuales de estado con colores
- ✅ Badges para estados (Pendiente, Aprobado, Convertido, etc.)
- ✅ Acciones por fila:
  - **Ver** - Ver detalle
  - **Convertir a Venta** - Botón que redirige a `/sales/new?fromQuote=XXX`
  - **Cancelar** - Solo si está en estado válido
- ✅ Botón "Nuevo Presupuesto"

**Estados visuales:**
```tsx
PENDING            → Gris   (Clock icon)
APPROVED           → Verde  (CheckCircle icon)
REJECTED           → Rojo   (XCircle icon)
EXPIRED            → Amarillo (AlertCircle icon)
PARTIALLY_CONVERTED → Azul   (FileText icon)
FULLY_CONVERTED    → Púrpura (CheckCircle icon)
CANCELLED          → Gris oscuro (Ban icon)
```

---

#### 2. **Nuevo Presupuesto** - `NewQuotePage.tsx`
**Ruta:** `/quotes/new`

**Funcionalidades:**
- ✅ Formulario completo con:
  - Selección de cliente (opcional)
  - Fecha del presupuesto
  - Fecha de vencimiento (validUntil)
  - Buscador de productos
  - Carrito de productos con:
    - Cantidad editable
    - Precio unitario editable
    - Descuento por línea
    - Cálculo automático de totales
  - Notas del presupuesto
  - Términos y condiciones
  - Notas internas (no visibles al cliente)

- ✅ Cálculos automáticos:
  - Subtotales por línea
  - Descuentos
  - Impuestos (IVA)
  - Total general

- ✅ Validaciones:
  - Mínimo 1 producto
  - Cantidades positivas

- ✅ Al guardar: Redirige a lista de presupuestos

---

#### 3. **Integración con Ventas** - `NewSalePage.tsx`

**Flujo de Conversión:**

1. Usuario hace clic en **"Convertir"** en `QuotesPage`
2. Redirige a `/sales/new?fromQuote=XXX`
3. `NewSalePage` detecta el parámetro `fromQuote`:
   ```typescript
   const fromQuoteId = searchParams.get('fromQuote')
   ```

4. **Carga automática de datos:**
   ```typescript
   useEffect(() => {
     const conversionData = await quotesApi.getConversionData(fromQuoteId)

     // Pre-carga:
     - Cliente del presupuesto
     - Items con cantidades pendientes
     - Precios y descuentos originales
     - Notas del presupuesto
   }, [fromQuoteId])
   ```

5. Usuario puede:
   - Modificar cantidades (respetando máximo = quantityPending)
   - Agregar/quitar productos
   - Modificar precios
   - Proceder con la venta normal

6. **Al completar la venta:**
   ```typescript
   // Después de crear la venta exitosamente
   if (originQuoteId) {
     const itemsConverted = cart.map(item => ({
       quoteItemId: item.lineId,
       quantityConverted: item.quantity
     }))

     await quotesApi.recordSaleConversion(originQuoteId, itemsConverted)
   }
   ```

7. **Resultado:**
   - Venta creada ✅
   - Stock descontado ✅
   - Factura generada (si corresponde) ✅
   - Presupuesto actualizado:
     - `quantityConverted` incrementado
     - `quantityPending` decrementado
     - Estado → `PARTIALLY_CONVERTED` o `FULLY_CONVERTED`

---

## 🔄 Flujos de Trabajo Soportados

### Flujo 1: Presupuesto → Venta Directa (Total)
```
1. Crear presupuesto (5 productos)
2. Cliente acepta TODO
3. Convertir a venta (todos los productos)
4. Estado: FULLY_CONVERTED ✅
```

### Flujo 2: Presupuesto → Venta Parcial → Venta Parcial
```
1. Crear presupuesto (10 unidades producto A)
2. Cliente compra 3 unidades
3. Convertir a venta (3 unidades)
   - quantityConverted: 3
   - quantityPending: 7
   - Estado: PARTIALLY_CONVERTED
4. Cliente compra 5 unidades más
5. Convertir a venta (5 unidades)
   - quantityConverted: 8
   - quantityPending: 2
   - Estado: PARTIALLY_CONVERTED
6. Cliente compra las 2 restantes
7. Convertir a venta (2 unidades)
   - quantityConverted: 10
   - quantityPending: 0
   - Estado: FULLY_CONVERTED ✅
```

### Flujo 3: Presupuesto Rechazado
```
1. Crear presupuesto
2. Cliente rechaza
3. Cambiar estado a REJECTED
4. No se puede convertir ✅
```

### Flujo 4: Presupuesto Expirado
```
1. Crear presupuesto con validUntil = hoy + 7 días
2. Pasan 7 días sin respuesta
3. Cambiar estado a EXPIRED (manual o automático)
4. No se puede convertir ✅
```

---

## 🧪 Validaciones Implementadas

### Backend
- ✅ Cliente debe existir y estar activo (si se especifica)
- ✅ Productos deben existir y estar activos
- ✅ Cantidades deben ser positivas
- ✅ No se puede convertir presupuesto CANCELLED
- ✅ No se puede convertir presupuesto FULLY_CONVERTED
- ✅ Cantidad convertida no puede exceder cantidad pendiente
- ✅ No se puede cambiar estado de presupuesto totalmente convertido

### Frontend
- ✅ Mínimo 1 producto en el presupuesto
- ✅ Cantidades positivas
- ✅ Validación de cantidad máxima en conversión (≤ quantityPending)
- ✅ Confirmación antes de cancelar

---

## 📊 Base de Datos - Migración Aplicada

**Migración:** `20251217135008_add_quotes_and_quote_items`

**Cambios aplicados:**
- ✅ Tabla `quotes` creada
- ✅ Tabla `quote_items` creada
- ✅ Enum `QuoteStatus` creado
- ✅ Relación `Sale.quoteId` agregada (para trazar origen)
- ✅ Índices creados para optimización:
  - `quotes.tenantId`
  - `quotes.customerId`
  - `quotes.status`
  - `quotes.quoteDate`
  - `quote_items.quoteId`

**Estado:** ✅ APLICADA EN PRODUCCIÓN

---

## 🎯 Funcionalidades NO Incluidas (Fase 2)

Las siguientes funcionalidades están planificadas pero NO implementadas:

- ❌ Generación de PDF de presupuesto
- ❌ Envío de presupuesto por email
- ❌ Versionado de presupuestos
- ❌ Conversión a Pedido (CustomerOrder)
- ❌ Aprobación multinivel
- ❌ Notificaciones automáticas de expiración
- ❌ Dashboard de presupuestos (métricas)
- ❌ Plantillas de presupuesto

---

## 🚀 Cómo Usar

### 1. Crear un Presupuesto

```typescript
// Navegación: http://localhost:8088/quotes/new

1. Seleccionar cliente (opcional)
2. Agregar productos al carrito
3. Ajustar cantidades/precios/descuentos
4. Agregar notas y términos
5. Click "Guardar Presupuesto"
6. ✅ Presupuesto creado con número PRE-00000XXX
```

### 2. Ver Lista de Presupuestos

```typescript
// Navegación: http://localhost:8088/quotes

- Ver todos los presupuestos
- Filtrar por cliente, estado, fecha
- Buscar por número o nombre de cliente
- Ver estados con colores
```

### 3. Convertir Presupuesto a Venta

```typescript
// Desde QuotesPage:

1. Hacer clic en "Convertir" en el presupuesto deseado
2. Se abre NewSalePage con datos pre-cargados
3. Verificar/ajustar productos y cantidades
4. Seleccionar almacén
5. Seleccionar forma de pago
6. Completar venta
7. ✅ Venta creada + Stock actualizado + Presupuesto marcado como convertido
```

### 4. Cancelar Presupuesto

```typescript
// Desde QuotesPage:

1. Hacer clic en "Cancelar"
2. Confirmar acción
3. ✅ Estado cambia a CANCELLED
4. Ya no se puede convertir a venta
```

---

## 🐛 Testing Realizado

### ✅ Tests Manuales Completados

1. **Crear presupuesto básico**
   - Con cliente
   - Sin cliente (Consumidor Final)
   - Con múltiples productos
   - Con descuentos

2. **Listar presupuestos**
   - Paginación funcional
   - Filtros funcionan correctamente
   - Búsqueda funciona

3. **Conversión total**
   - Presupuesto → Venta (100%)
   - Estado cambia a FULLY_CONVERTED ✅

4. **Conversión parcial**
   - Presupuesto → Venta (50%)
   - quantityPending actualizado ✅
   - Segunda conversión del resto ✅

5. **Validaciones**
   - No se puede convertir presupuesto cancelado ✅
   - No se puede convertir presupuesto totalmente convertido ✅
   - Cantidad máxima respetada en conversión ✅

---

## 📁 Archivos Modificados/Creados

### Backend
```
backend/prisma/schema.prisma              [MODIFICADO] - Modelos Quote y QuoteItem
backend/src/services/quoteService.ts      [CREADO]     - Lógica de negocio
backend/src/routes/quotes.ts              [CREADO]     - API REST
backend/src/server.ts                     [MODIFICADO] - Registro de rutas
```

### Frontend
```
frontend/src/api/quotes.ts                [CREADO]     - Cliente API
frontend/src/pages/quotes/QuotesPage.tsx  [CREADO]     - Lista de presupuestos
frontend/src/pages/quotes/NewQuotePage.tsx [CREADO]    - Formulario nuevo presupuesto
frontend/src/pages/sales/NewSalePage.tsx  [MODIFICADO] - Integración conversión
frontend/src/App.tsx                      [MODIFICADO] - Rutas
frontend/src/components/layout/Sidebar.tsx [MODIFICADO] - Menú
```

---

## 🎉 Conclusión

El módulo de **Presupuestos** está **100% funcional y listo para producción**.

### Características Destacadas:
- ✅ Conversión parcial y total de presupuestos a ventas
- ✅ Control de cantidades pendientes por ítem
- ✅ Estados bien definidos con validaciones
- ✅ Integración perfecta con módulo de Ventas
- ✅ UI intuitiva y responsive
- ✅ Backend robusto con validaciones

### Próximos Pasos Sugeridos:
1. Implementar generación de PDF
2. Agregar sistema de emails
3. Dashboard de métricas de presupuestos
4. Conversión a Pedidos (Fase 2)

---

**Desarrollado:** 18 de Diciembre de 2024
**Estado:** ✅ PRODUCCIÓN READY
