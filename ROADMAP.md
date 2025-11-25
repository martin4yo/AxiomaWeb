# 🗺️ ROADMAP - Axioma ERP MVP

**Objetivo:** Sistema completo para gestión de productos, clientes, ventas con múltiples formas de pago y facturación electrónica AFIP/ARCA.

**Última actualización:** 2025-11-24

---

## 📊 ESTADO ACTUAL - LO QUE YA ESTÁ HECHO

### ✅ Infraestructura Base
- [x] Base de datos PostgreSQL configurada
- [x] Backend con Express + Prisma ORM
- [x] Frontend con React + TypeScript + Vite
- [x] Sistema de autenticación JWT
- [x] Arquitectura multi-tenant (SaaS ready)
- [x] Middleware de seguridad (helmet, cors)
- [x] Logger centralizado
- [x] Manejo de errores global

### ✅ Módulos Completados

#### **Productos y Categorización**
- [x] ABM completo de Productos
  - Código/SKU único
  - Nombre, descripción
  - Precio de costo y venta
  - Control de stock
  - Código de barras
  - Moneda
  - Metadatos flexibles
- [x] ABM de Categorías de Productos
- [x] ABM de Marcas de Productos
- [x] Relaciones M:N (producto puede tener múltiples categorías/marcas)

#### **Gestión de Inventario**
- [x] Sistema multi-almacén
- [x] Control de stock por almacén
- [x] Movimientos de stock (entrada, salida, transferencia)
- [x] Ajustes de inventario
- [x] Stock reservado vs disponible
- [x] Historial de movimientos

#### **Gestión de Clientes**
- [x] ABM de Entidades (unificado: clientes/proveedores/empleados)
- [x] ABM de Categorías de Clientes
  - Descuentos por categoría
  - Términos de pago
- [x] Datos fiscales completos
  - CUIT
  - Condición IVA
  - Número de ingresos brutos
  - Actividad comercial
- [x] Direcciones de entrega múltiples
- [x] Límite de crédito
- [x] Términos de pago

#### **Configuración del Sistema**
- [x] ABM de Impuestos
  - Tipos: IVA, Ingresos Brutos, Otros
  - Tasas configurables
- [x] ABM de Formas de Pago
  - Tipos: Efectivo, Transferencia, Cheque, Tarjeta, Otros
  - Requiere referencia (sí/no)
  - Días hasta cobro
- [x] ABM de Condiciones de IVA
  - Código AFIP
  - Tasa impositiva
  - Exento (sí/no)
- [x] ABM de Tipos de Comprobante
  - Configuración flexible
  - Requiere autorización
  - Facturación electrónica (flag)
  - Workflow configurable

#### **Sistema de Documentos**
- [x] Modelo de documento genérico
- [x] Relación con tipo de comprobante
- [x] Items de documento
- [x] Cálculo de subtotales e impuestos
- [x] Estados de documento
- [x] Referencias entre documentos
- [x] Auditoría (createdBy, updatedBy)

---

## 🚀 PROGRESO DEL MÓDULO DE VENTAS - 95% COMPLETADO ✅

### ✅ COMPLETADO - Módulo de Ventas (Backend + Frontend)

#### **1. ✅ Modelo de Datos - Ventas y Pagos**

**Estado:** ✅ COMPLETADO
**Migración:** `20251124192038_add_sales_module`
**Archivo:** `backend/prisma/schema.prisma`

**Modelos implementados:**

```prisma
// 💰 VENTAS
model Sale {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  saleNumber      String   @map("sale_number")
  saleDate        DateTime @default(now()) @map("sale_date") @db.Date
  customerId      String?  @map("customer_id")
  customerName    String?  @map("customer_name")

  // Montos
  subtotal        Decimal  @default(0) @db.Decimal(15, 2)
  discountAmount  Decimal  @default(0) @map("discount_amount") @db.Decimal(15, 2)
  taxAmount       Decimal  @default(0) @map("tax_amount") @db.Decimal(15, 2)
  totalAmount     Decimal  @default(0) @map("total_amount") @db.Decimal(15, 2)

  // Estado de pago
  paidAmount      Decimal  @default(0) @map("paid_amount") @db.Decimal(15, 2)
  balanceAmount   Decimal  @default(0) @map("balance_amount") @db.Decimal(15, 2)
  paymentStatus   String   @default("pending") @map("payment_status") // pending, partial, paid

  // Facturación AFIP
  invoiceId       String?  @map("invoice_id") // Relación con Document si se facturó
  afipStatus      String?  @default("not_sent") @map("afip_status") // not_sent, pending, authorized, rejected
  afipCae         String?  @map("afip_cae")
  afipCaeExpiry   DateTime? @map("afip_cae_expiry")

  // Almacén de donde se descontó el stock
  warehouseId     String?  @map("warehouse_id")

  // Metadatos
  notes           String?
  metadata        Json     @default("{}")

  // Auditoría
  status          String   @default("completed") // draft, completed, cancelled
  createdBy       String   @map("created_by")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  tenant    Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer  Entity?      @relation(fields: [customerId], references: [id])
  warehouse Warehouse?   @relation(fields: [warehouseId], references: [id])
  invoice   Document?    @relation(fields: [invoiceId], references: [id])
  creator   User         @relation("SaleCreatedBy", fields: [createdBy], references: [id])
  items     SaleItem[]
  payments  SalePayment[]

  @@unique([tenantId, saleNumber])
  @@index([tenantId, saleDate])
  @@index([tenantId, paymentStatus])
  @@map("sales")
}

// 📝 ITEMS DE VENTA
model SaleItem {
  id              String  @id @default(cuid())
  saleId          String  @map("sale_id")
  lineNumber      Int     @map("line_number")
  productId       String? @map("product_id")
  productSku      String? @map("product_sku")
  productName     String  @map("product_name")
  description     String?

  // Cantidades y precios
  quantity        Decimal @db.Decimal(15, 4)
  unitPrice       Decimal @map("unit_price") @db.Decimal(15, 4)
  discountPercent Decimal @default(0) @map("discount_percent") @db.Decimal(5, 2)
  discountAmount  Decimal @default(0) @map("discount_amount") @db.Decimal(15, 2)

  // Impuestos
  taxRate         Decimal @default(0) @map("tax_rate") @db.Decimal(5, 2)
  taxAmount       Decimal @default(0) @map("tax_amount") @db.Decimal(15, 2)

  // Totales
  subtotal        Decimal @db.Decimal(15, 2)
  lineTotal       Decimal @map("line_total") @db.Decimal(15, 2)

  // Costo (para cálculo de margen)
  unitCost        Decimal? @map("unit_cost") @db.Decimal(15, 4)
  totalCost       Decimal? @map("total_cost") @db.Decimal(15, 2)

  metadata        Json    @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")

  // Relations
  sale    Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id])

  @@map("sale_items")
}

// 💳 PAGOS DE VENTA
model SalePayment {
  id                String   @id @default(cuid())
  saleId            String   @map("sale_id")
  paymentMethodId   String   @map("payment_method_id")
  paymentMethodName String   @map("payment_method_name")

  // Monto
  amount            Decimal  @db.Decimal(15, 2)

  // Referencias (cheque, transferencia, etc)
  reference         String?
  referenceDate     DateTime? @map("reference_date")

  // Estado del pago
  status            String   @default("completed") // pending, completed, cancelled
  collectionDate    DateTime? @map("collection_date") // Fecha efectiva de cobro

  // Notas
  notes             String?
  metadata          Json     @default("{}")

  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  sale          Sale          @relation(fields: [saleId], references: [id], onDelete: Cascade)
  paymentMethod PaymentMethod @relation(fields: [paymentMethodId], references: [id])

  @@index([saleId])
  @@index([paymentMethodId])
  @@index([status])
  @@index([collectionDate])
  @@map("sale_payments")
}

// 🧾 CONFIGURACIÓN AFIP
model AfipConfiguration {
  id              String   @id @default(cuid())
  tenantId        String   @unique @map("tenant_id")

  // Credenciales
  cuit            String
  certificatePath String?  @map("certificate_path")
  privateKeyPath  String?  @map("private_key_path")
  certificate     String?  @db.Text // Contenido del certificado
  privateKey      String?  @map("private_key") @db.Text // Contenido de la clave privada

  // Ambiente
  environment     String   @default("testing") // testing, production

  // Puntos de venta
  salesPoints     Json     @default("[]") @map("sales_points") // [{ pointOfSale: 1, lastNumber: 0, voucherType: "FC_A" }]

  // Token de acceso (cache)
  accessToken     String?  @map("access_token") @db.Text
  tokenExpiry     DateTime? @map("token_expiry")

  // Estado
  isActive        Boolean  @default(false) @map("is_active")
  lastSync        DateTime? @map("last_sync")

  metadata        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("afip_configurations")
}
```

**Agregar relaciones a modelos existentes:**

```prisma
// En model Tenant agregar:
  sales              Sale[]
  afipConfiguration  AfipConfiguration?

// En model Entity agregar:
  sales              Sale[]

// En model Warehouse agregar:
  sales              Sale[]

// En model Document agregar:
  sales              Sale[]

// En model User agregar:
  createdSales       Sale[] @relation("SaleCreatedBy")

// En model Product agregar:
  saleItems          SaleItem[]

// En model PaymentMethod agregar:
  salePayments       SalePayment[]
```

---

#### **2. ✅ Backend - API de Ventas**

**Estado:** ✅ COMPLETADO
**Archivos implementados:**
- `backend/src/routes/sales.ts` (130 líneas)
- `backend/src/services/salesService.ts` (603 líneas)
- `backend/src/utils/calculationService.ts` (271 líneas)
- `backend/src/routes/payment-methods.ts` (144 líneas)

**Endpoints implementados:**

```typescript
// Crear venta
POST /api/:tenantSlug/sales
Body: {
  customerId?: string,
  warehouseId: string,
  items: [
    {
      productId: string,
      quantity: number,
      unitPrice: number,
      discountPercent?: number,
      taxRate: number
    }
  ],
  payments: [
    {
      paymentMethodId: string,
      amount: number,
      reference?: string
    }
  ],
  notes?: string,
  shouldInvoice: boolean // Si debe generar factura AFIP
}

// Listar ventas
GET /api/:tenantSlug/sales
Query: {
  page?: number,
  limit?: number,
  dateFrom?: string,
  dateTo?: string,
  customerId?: string,
  paymentStatus?: string,
  afipStatus?: string
}

// Obtener detalle de venta
GET /api/:tenantSlug/sales/:id

// Actualizar estado de pago
PUT /api/:tenantSlug/sales/:id/payment-status

// Registrar pago adicional
POST /api/:tenantSlug/sales/:id/payments

// Generar factura AFIP
POST /api/:tenantSlug/sales/:id/invoice

// Cancelar venta
PUT /api/:tenantSlug/sales/:id/cancel
```

**Lógica de negocio implementada:**
- ✅ Validar stock disponible antes de crear venta
- ✅ Calcular subtotales, impuestos y totales
- ✅ Determinar tipo de factura (FC_A, FC_B, FC_C) según condición IVA
- ✅ Discriminar IVA automáticamente cuando corresponde
- ✅ Descontar stock del almacén
- ✅ Crear movimientos de stock
- ✅ Validar que suma de pagos = total de venta
- ✅ Actualizar estado de pago automáticamente (pending, partial, paid)
- ✅ Generar número de venta secuencial (VENTA-0001, VENTA-0002, etc.)
- ✅ Cancelar ventas con reversión de stock
- ✅ Soporte para múltiples formas de pago

---

#### **3. ✅ Frontend - Punto de Venta**

**Estado:** ✅ COMPLETADO
**Archivos implementados:**
- `frontend/src/pages/sales/SalesPage.tsx` (227 líneas) - Listado de ventas
- `frontend/src/pages/sales/NewSalePage.tsx` (630 líneas) - Formulario de venta
- `frontend/src/api/sales.ts` (64 líneas) - API client

**Componentes implementados:**

```
SalesPage (lista de ventas)
├── SalesList (tabla)
├── SaleFilters (filtros)
└── NewSaleButton → abre SaleModal

SaleModal (punto de venta)
├── CustomerSelector
├── WarehouseSelector
├── ProductSearch
├── SaleItemsList
│   ├── SaleItem (cada línea)
│   ├── Quantity, Price, Discount
│   └── Subtotal, Tax, Total
├── SaleTotals (resumen)
├── PaymentMethodsSection
│   ├── PaymentMethodSelector
│   └── PaymentsList (múltiples formas de pago)
└── Actions
    ├── SaveButton
    └── InvoiceCheckbox (¿Generar factura AFIP?)
```

**Funcionalidades implementadas:**
- ✅ Búsqueda de productos en tiempo real
- ✅ Agregar/quitar productos del carrito
- ✅ Editar cantidad, precio, descuento por item
- ✅ Cálculo automático de impuestos
- ✅ Vista previa de totales en tiempo real
- ✅ Asignar múltiples formas de pago
- ✅ Validación: suma de pagos = total
- ✅ Selección de cliente (opcional)
- ✅ Selección de almacén (obligatorio)
- ✅ Tabla de ventas con filtros
- ✅ Paginación
- ✅ Estados visuales (pendiente, parcial, pagado)
- ✅ Indicadores de estado AFIP

---

## 🚀 LO QUE FALTA PARA EL MVP

### 🟡 PRIORIDAD MEDIA - Informes (NO INICIADO)

#### **4. Informe de Ventas por Producto**

**Endpoint:** `GET /api/:tenantSlug/reports/sales-by-product`

**Query params:**
- `dateFrom` (required)
- `dateTo` (required)
- `productId` (optional)
- `categoryId` (optional)
- `customerId` (optional)
- `groupBy`: "product" | "category" | "day" | "month"

**Response:**
```json
{
  "summary": {
    "totalSales": 150000.00,
    "totalQuantity": 450,
    "totalCost": 90000.00,
    "totalProfit": 60000.00,
    "profitMargin": 40.0
  },
  "items": [
    {
      "productId": "xxx",
      "productSku": "PROD-001",
      "productName": "Producto 1",
      "quantitySold": 100,
      "totalRevenue": 50000.00,
      "totalCost": 30000.00,
      "profit": 20000.00,
      "profitMargin": 40.0,
      "averagePrice": 500.00,
      "salesCount": 25
    }
  ]
}
```

**Frontend:** `frontend/src/pages/reports/SalesByProductPage.tsx`
- Filtros de fecha, producto, categoría
- Tabla con datos
- Gráfico de barras (opcional)
- Exportar a Excel (futuro)

---

#### **5. Informe de Cobranzas por Forma de Pago**

**Endpoint:** `GET /api/:tenantSlug/reports/collections-by-payment-method`

**Query params:**
- `dateFrom` (required)
- `dateTo` (required)
- `paymentMethodId` (optional)
- `status`: "completed" | "pending" | "all"
- `groupBy`: "payment_method" | "day" | "month"

**Response:**
```json
{
  "summary": {
    "totalCollected": 150000.00,
    "totalPending": 25000.00,
    "transactionsCount": 230
  },
  "items": [
    {
      "paymentMethodId": "xxx",
      "paymentMethodName": "Efectivo",
      "paymentType": "CASH",
      "totalAmount": 80000.00,
      "transactionsCount": 150,
      "pendingAmount": 0,
      "collectedAmount": 80000.00,
      "averageTransaction": 533.33
    },
    {
      "paymentMethodName": "Tarjeta de Crédito",
      "paymentType": "CARD",
      "totalAmount": 70000.00,
      "transactionsCount": 80,
      "pendingAmount": 25000.00,
      "collectedAmount": 45000.00,
      "averageTransaction": 875.00
    }
  ]
}
```

**Frontend:** `frontend/src/pages/reports/CollectionsByPaymentMethodPage.tsx`
- Filtros de fecha, forma de pago, estado
- Tabla resumen por forma de pago
- Detalle expandible de transacciones
- Indicador de pendientes vs cobrados
- Gráfico de torta (opcional)

---

### 🟠 PRIORIDAD BAJA - Facturación Electrónica AFIP

> ⚠️ **NOTA:** Este módulo puede ser desarrollado después del MVP inicial. La aplicación puede funcionar registrando ventas sin facturación electrónica.

#### **6. Configuración AFIP**

**Frontend:** `frontend/src/pages/settings/afip/AfipConfigurationPage.tsx`

**Campos:**
- CUIT de la empresa
- Certificado AFIP (upload archivo .crt)
- Clave privada (upload archivo .key)
- Ambiente: Testing / Producción
- Puntos de venta configurados:
  - Número de punto de venta
  - Tipo de comprobante (FC_A, FC_B, etc)
  - Último número autorizado

**Endpoint:**
- `GET /api/:tenantSlug/afip/configuration`
- `PUT /api/:tenantSlug/afip/configuration`
- `POST /api/:tenantSlug/afip/test-connection` (probar conexión)

---

#### **7. Servicio de Autenticación AFIP (WSAA)**

**Archivo:** `backend/src/services/afip/wsaaService.ts`

**Funcionalidades:**
- Generar TRA (Ticket de Requerimiento de Acceso)
- Firmar TRA con clave privada
- Solicitar token y sign a AFIP WSAA
- Cachear token (válido por ~12 horas)
- Renovar token automáticamente

**Librerías recomendadas:**
- `@afipsdk/afip.js` (SDK completo)
- O implementación manual con `axios` + `node-forge`

---

#### **8. Servicio de Facturación Electrónica (WSFEv1)**

**Archivo:** `backend/src/services/afip/wsfev1Service.ts`

**Métodos:**
- `getLastAuthorizedNumber(pointOfSale, voucherType)` - Obtener último número
- `authorizeInvoice(invoiceData)` - Autorizar factura
- `getInvoiceStatus(cae)` - Consultar estado de factura

**Datos a enviar a AFIP:**
```typescript
{
  pointOfSale: 1,
  voucherType: "FC_A", // Factura A
  voucherNumber: 123,
  voucherDate: "2025-11-24",
  totalAmount: 12100.00,
  netAmount: 10000.00,
  taxAmount: 2100.00,
  customer: {
    documentType: 80, // CUIT
    documentNumber: "20123456789",
    vatCondition: "RESPONSABLE_INSCRIPTO"
  },
  items: [...],
  taxes: [
    { id: 5, description: "IVA 21%", baseAmount: 10000, amount: 2100 }
  ]
}
```

**Respuesta de AFIP:**
```typescript
{
  cae: "72345678901234",
  caeExpiry: "2025-12-04",
  result: "A", // A = Aprobado, R = Rechazado
  observations: []
}
```

---

#### **9. Integración en Flujo de Venta**

**Lógica:**

1. Usuario completa venta y marca checkbox "Generar Factura"
2. Sistema valida:
   - Cliente tiene CUIT/CUIL
   - Cliente tiene condición IVA
   - Configuración AFIP está activa
3. Sistema determina tipo de comprobante:
   - Empresa Responsable Inscripto + Cliente Responsable Inscripto = Factura A
   - Empresa Responsable Inscripto + Cliente Consumidor Final = Factura B
4. Sistema crea documento en tabla `documents`
5. Sistema envía a AFIP
6. Si AFIP aprueba:
   - Actualiza `sale.afipStatus = "authorized"`
   - Guarda CAE y fecha de vencimiento
   - Genera PDF de factura con CAE
7. Si AFIP rechaza:
   - Actualiza `sale.afipStatus = "rejected"`
   - Muestra errores al usuario
   - Permite reintentar

---

## 📁 ESTRUCTURA DE ARCHIVOS NUEVA

```
backend/
├── prisma/
│   └── schema.prisma (MODIFICAR: agregar modelos Sale, SaleItem, SalePayment, AfipConfiguration)
│   └── migrations/ (generar con prisma migrate)
├── src/
│   ├── routes/
│   │   ├── sales.ts (NUEVO)
│   │   └── reports.ts (NUEVO)
│   ├── services/
│   │   ├── salesService.ts (NUEVO)
│   │   ├── reportsService.ts (NUEVO)
│   │   └── afip/
│   │       ├── wsaaService.ts (NUEVO - FASE 3)
│   │       └── wsfev1Service.ts (NUEVO - FASE 3)
│   ├── controllers/
│   │   ├── salesController.ts (NUEVO)
│   │   └── reportsController.ts (NUEVO)
│   └── utils/
│       └── calculations.ts (NUEVO - helpers para cálculos)

frontend/
├── src/
│   ├── pages/
│   │   ├── sales/
│   │   │   ├── SalesPage.tsx (NUEVO)
│   │   │   ├── NewSalePage.tsx (NUEVO)
│   │   │   └── SaleDetailPage.tsx (NUEVO)
│   │   ├── reports/
│   │   │   ├── SalesByProductPage.tsx (NUEVO)
│   │   │   └── CollectionsByPaymentMethodPage.tsx (NUEVO)
│   │   └── settings/
│   │       └── afip/
│   │           └── AfipConfigurationPage.tsx (NUEVO - FASE 3)
│   ├── components/
│   │   ├── sales/
│   │   │   ├── SaleModal.tsx (NUEVO)
│   │   │   ├── ProductSearch.tsx (NUEVO)
│   │   │   ├── SaleItemsList.tsx (NUEVO)
│   │   │   ├── SaleTotalsCard.tsx (NUEVO)
│   │   │   └── PaymentMethodsSection.tsx (NUEVO)
│   │   └── reports/
│   │       ├── DateRangeFilter.tsx (NUEVO)
│   │       └── ReportTable.tsx (NUEVO)
│   └── api/
│       ├── sales.ts (NUEVO)
│       └── reports.ts (NUEVO)
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### ✅ **FASE 1: Ventas Básicas** - COMPLETADA

**✅ Backend** (COMPLETADO el 2025-11-24)
1. [x] Modificar `schema.prisma` (agregar Sale, SaleItem, SalePayment, AfipConfiguration)
2. [x] Ejecutar migración `20251124192038_add_sales_module`
3. [x] Crear `salesService.ts` con toda la lógica de negocio (603 líneas)
4. [x] Crear `calculationService.ts` con lógica de cálculos e IVA (271 líneas)
5. [x] Crear rutas API de ventas completas
6. [x] Crear rutas API de formas de pago

**✅ Frontend** (COMPLETADO)
7. [x] Crear página de listado de ventas con filtros y paginación
8. [x] Crear formulario de nueva venta (POS) completo (630 líneas)
9. [x] Implementar búsqueda de productos en tiempo real
10. [x] Implementar carrito de compra con cálculos automáticos
11. [x] Implementar sección de múltiples formas de pago
12. [x] Validaciones del lado del cliente

**✅ Integración y Testing**
13. [x] Flujo completo de venta funcional
14. [x] Validación de stock disponible
15. [x] Cálculo correcto de impuestos (IVA discriminado/incluido)
16. [x] Múltiples formas de pago validadas
17. [x] Cancelación de ventas con reversión de stock

---

### **FASE 2: Informes** (2-3 días) 🟡 IMPORTANTE

**Día 1: Backend**
1. [ ] Crear `reportsService.ts`
2. [ ] Implementar endpoint de ventas por producto
3. [ ] Implementar endpoint de cobranzas por forma de pago
4. [ ] Optimizar queries (usar agregaciones SQL)

**Día 2-3: Frontend**
5. [ ] Crear página de informe de ventas por producto
6. [ ] Crear página de informe de cobranzas
7. [ ] Implementar filtros de fecha/categorías
8. [ ] Agregar exportación a CSV (opcional)

---

### **FASE 3: AFIP** (4-6 días) 🟠 OPCIONAL PARA MVP

> ⚠️ **ADVERTENCIA:** Esta es la parte más compleja. Requiere certificados AFIP, pruebas en ambiente de testing, y manejo de muchos casos especiales.

**Día 1: Configuración**
1. [ ] Crear modelo `AfipConfiguration`
2. [ ] Migración de base de datos
3. [ ] Página de configuración AFIP
4. [ ] Upload de certificados

**Día 2-3: WSAA (Autenticación)**
5. [ ] Implementar servicio WSAA
6. [ ] Generar TRA
7. [ ] Obtener token
8. [ ] Probar en ambiente testing de AFIP

**Día 4-5: WSFEv1 (Facturación)**
9. [ ] Implementar servicio WSFEv1
10. [ ] Consultar último número autorizado
11. [ ] Autorizar factura
12. [ ] Mapear tipos de comprobante

**Día 6: Integración**
13. [ ] Integrar en flujo de venta
14. [ ] Determinar tipo de factura según condiciones IVA
15. [ ] Generar PDF de factura con CAE
16. [ ] Manejo de errores AFIP
17. [ ] Logging y auditoría

---

## 🚦 DECISIÓN ESTRATÉGICA

### **Opción A: MVP Completo con AFIP** (10-14 días)
- ✅ Sistema completo y profesional
- ✅ Facturación electrónica desde el inicio
- ❌ Más tiempo de desarrollo
- ❌ Mayor complejidad
- ❌ Requiere certificados AFIP y pruebas extensivas

### **Opción B: MVP sin AFIP** (5-8 días) ⭐ **RECOMENDADO**
- ✅ Lanzamiento rápido
- ✅ Sistema funcional inmediatamente
- ✅ Ventas, stock, informes operativos
- ✅ Agregar AFIP en Fase 2
- ⚠️ Facturas manuales o externas temporalmente

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### **Cálculo de Impuestos**
El sistema debe calcular impuestos automáticamente basándose en:
- Tasa de IVA configurada en el sistema
- Condición IVA del cliente
- Si es Responsable Inscripto → Discrimina IVA
- Si es Consumidor Final → Precio incluye IVA

### **Control de Stock**
- Al crear venta, descontar stock del almacén seleccionado
- Crear registro en `stock_movements` tipo "OUT"
- Si se cancela venta, revertir stock

### **Formas de Pago Múltiples**
- Usuario puede pagar con efectivo + tarjeta + transferencia
- Suma de pagos DEBE ser exactamente igual al total
- Frontend debe validar antes de enviar
- Backend debe validar también (nunca confiar en frontend)

### **Números de Venta**
- Generar secuencial por tenant: VENTA-0001, VENTA-0002...
- Usar transacción para evitar duplicados
- Considerar formato configurable en settings del tenant

### **Performance**
- Informes deben usar agregaciones SQL, no traer todos los registros
- Considerar índices en: tenantId, saleDate, paymentStatus
- Paginar listados de ventas

---

## 🔗 RECURSOS Y REFERENCIAS

### **AFIP/ARCA**
- [Documentación oficial AFIP Webservices](https://www.afip.gob.ar/ws/)
- [SDK AFIP para Node.js](https://github.com/afipsdk/afip.js)
- Tipos de comprobante: https://www.afip.gob.ar/fe/documentos/TABLADETIPODECOMPROBANTE.xls

### **Prisma**
- [Documentación Prisma](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)

### **Testing**
- Ambiente de homologación AFIP: https://wswhomo.afip.gov.ar/

---

## ✅ CHECKLIST DE COMPLETITUD

### ✅ Módulo de Ventas - 100% COMPLETADO
- [x] Modelos de datos creados (Sale, SaleItem, SalePayment, AfipConfiguration)
- [x] API backend funcionando con todos los endpoints
- [x] Frontend POS operativo (listado + formulario)
- [x] Integración con stock (descuento automático)
- [x] Múltiples formas de pago implementado
- [x] Validaciones completas
- [x] Cálculo automático de IVA según tipo de cliente
- [x] Cancelación de ventas con reversión de stock
- [x] Generación automática de números de venta

### 🟡 Informes - 0% COMPLETADO
- [ ] Ventas por producto
- [ ] Cobranzas por forma de pago
- [ ] Filtros funcionando
- [ ] Performance optimizada

### 🟠 AFIP (Opcional) - 10% COMPLETADO
- [x] Modelo de datos AfipConfiguration creado
- [x] Determinación automática de tipo de factura (FC_A, FC_B, FC_C)
- [x] Discriminación automática de IVA
- [ ] Configuración guardada (UI)
- [ ] Autenticación WSAA
- [ ] Facturación WSFEv1
- [ ] Integración completa con ventas
- [ ] Generación PDF con CAE

---

## 🐛 ISSUES CONOCIDOS Y PENDIENTES

_(Mantener actualizado durante el desarrollo)_

- [ ] TODO: Definir política de cancelación de ventas (¿devuelve stock?)
- [ ] TODO: ¿Permitir ventas con stock negativo?
- [ ] TODO: ¿Descuentos a nivel de venta o solo por item?
- [ ] TODO: ¿Soportar múltiples monedas?
- [ ] TODO: Definir permisos de usuario (quién puede cancelar ventas)

---

## 📞 CONTACTO Y SOPORTE

Para consultas durante el desarrollo:
- Prisma Discord: https://discord.gg/prisma
- AFIP Mesa de Ayuda: 0800-999-2347

---

**Última actualización:** 2025-11-24
**Versión del documento:** 2.0
**Estado del proyecto:** 🚀 FASE 1 COMPLETADA - Módulo de Ventas Operativo

## 📈 RESUMEN EJECUTIVO

### ✅ LO QUE FUNCIONA HOY (2025-11-24)

**Sistema Completamente Funcional:**
- ✅ Gestión completa de productos, inventario multi-almacén, clientes
- ✅ **PUNTO DE VENTA (POS) OPERATIVO**
  - Crear ventas con múltiples items
  - Búsqueda rápida de productos
  - Cálculo automático de IVA según tipo de cliente
  - Múltiples formas de pago en una misma venta
  - Descuento automático de stock
  - Generación de números de venta secuenciales
  - Cancelación de ventas con reversión de stock
  - Listado de ventas con filtros y paginación

**Líneas de código del Módulo de Ventas:**
- Backend: 1,148 líneas (routes + services + utils)
- Frontend: 857 líneas (pages + api)
- **TOTAL: 2,005 líneas de código productivo**

### 🎯 PRÓXIMOS PASOS

**Corto plazo (1-2 semanas):**
1. Módulo de Informes (ventas por producto, cobranzas)
2. Dashboard con métricas clave
3. Exportación de reportes

**Medio plazo (3-4 semanas):**
1. Integración AFIP completa (WSFEv1)
2. Generación de PDFs de facturas
3. Módulo de compras a proveedores

**Largo plazo:**
1. App móvil para ventas
2. Integración con medios de pago (Mercado Pago, etc.)
3. Analytics avanzados

---

## 🖨️ POST-MVP: SISTEMA DE IMPRESIÓN DE TICKETS (v2.0)

### **Axioma Print Manager - Aplicación Electron**

**Decisión arquitectónica:** Aplicación Electron standalone que corre en cada PC con impresora térmica.

#### **Arquitectura General**

```
┌─────────────────────────────────────────────────┐
│  Print Manager (Electron App)                   │
│  ┌───────────────────┐  ┌────────────────────┐ │
│  │   Renderer (UI)   │  │   Main Process     │ │
│  │   - React         │  │   - Express Server │ │
│  │   - Configuración │  │   - ESC/POS        │ │
│  │   - Logs          │  │   - File System    │ │
│  └───────────────────┘  └────────────────────┘ │
│           ↕                      ↕              │
│      IPC Bridge          Printer Hardware       │
└─────────────────────────────────────────────────┘
           ↑
    HTTP (localhost:9100)
           ↑
    ┌──────────────┐
    │   Browser    │
    │  (AxiomaERP) │
    └──────────────┘
```

#### **Características Principales**

✅ **Instalación Profesional**
- Ejecutable .exe para Windows (NSIS installer)
- AppImage + .deb para Linux
- Instalación estándar (siguiente → siguiente → finalizar)
- ~60-80MB tamaño instalador
- No requiere Node.js ni dependencias
- Auto-inicio con el sistema operativo
- Ícono en bandeja del sistema (system tray)

✅ **Interfaz Gráfica Intuitiva**
- Panel de configuración visual (React)
- No requiere editar JSON manualmente
- Auto-detección de impresoras USB/Red
- Preview de tickets antes de imprimir
- Test de impresión con un click
- Visualizador de logs en tiempo real
- Indicador de estado (activo/inactivo)

✅ **Sistema de Configuración Sin Código**
- Toda la configuración en UI
- Templates editables visualmente
- Datos de empresa configurables
- Selector de impresora gráfico
- Configuración de ancho de papel (48/58/80mm)
- Encoder de caracteres (cp850, utf8, etc.)

✅ **Características Técnicas**
- Servidor HTTP Express interno (puerto 9100)
- Comunicación ESC/POS nativa
- Soporte multi-impresora (USB, Red TCP/IP, Bluetooth)
- Templates configurables por tipo de documento
- Sistema de logs con rotación automática
- Fallback a impresión navegador si servicio falla
- Actualizaciones automáticas (electron-updater)

#### **Stack Tecnológico**

```json
{
  "main": {
    "electron": "^28.0.0",
    "express": "^4.18.2",
    "node-thermal-printer": "^4.4.0",
    "electron-store": "^8.1.0",
    "electron-log": "^5.0.0",
    "auto-launch": "^5.0.6",
    "electron-updater": "^6.1.0"
  },
  "renderer": {
    "react": "^18.2.0",
    "tailwindcss": "^3.4.0"
  },
  "build": {
    "electron-builder": "^24.0.0"
  }
}
```

#### **Estructura del Proyecto**

```
print-manager/
├── package.json
├── electron-builder.yml          # Configuración empaquetado
├── main/                         # Proceso principal Electron
│   ├── main.js                   # Entry point
│   ├── preload.js                # IPC bridge seguro
│   ├── server.js                 # Express HTTP server
│   ├── printer.js                # Lógica ESC/POS
│   ├── config.js                 # electron-store (persistencia)
│   ├── tray.js                   # Sistema tray
│   ├── updater.js                # Auto-actualización
│   └── logger.js                 # electron-log wrapper
├── renderer/                     # UI React
│   ├── index.html
│   ├── App.jsx
│   ├── components/
│   │   ├── Dashboard.jsx         # Estado del servicio
│   │   ├── ConfigPanel.jsx       # Configuración
│   │   ├── PrinterSelector.jsx   # Selector de impresora
│   │   ├── BusinessConfig.jsx    # Datos empresa
│   │   ├── TemplateEditor.jsx    # Editor de templates
│   │   ├── TestPrint.jsx         # Imprimir prueba
│   │   ├── LogViewer.jsx         # Ver logs
│   │   └── StatusIndicator.jsx   # Indicador estado
│   └── styles/
│       └── app.css
├── assets/
│   ├── icons/
│   │   ├── icon.png              # Icono app (512x512)
│   │   ├── icon.ico              # Icono Windows
│   │   └── tray-icon.png         # Icono bandeja
│   └── templates/
│       ├── ticket-venta.json     # Template ticket venta
│       ├── ticket-compra.json    # Template ticket compra
│       └── factura.json          # Template factura AFIP
└── docs/
    ├── API.md                    # Documentación API HTTP
    ├── TEMPLATES.md              # Guía de templates
    └── DEPLOYMENT.md             # Guía de distribución
```

#### **Sistema de Templates Configurables**

**Formato JSON con interpolación de variables:**

```json
{
  "name": "Ticket de Venta Estándar",
  "version": "1.0",
  "paperWidth": 48,
  "encoding": "cp850",

  "sections": [
    {
      "id": "header",
      "type": "header",
      "align": "center",
      "items": [
        {
          "type": "text",
          "content": "{{business.name}}",
          "bold": true,
          "fontSize": 1
        },
        {
          "type": "text",
          "content": "CUIT: {{business.cuit}}",
          "fontSize": 0
        },
        {
          "type": "text",
          "content": "{{business.address}}"
        },
        {
          "type": "divider",
          "char": "=",
          "repeat": 48
        }
      ]
    },
    {
      "id": "document-info",
      "type": "info",
      "items": [
        {
          "type": "text",
          "content": "TICKET NO VÁLIDO COMO FACTURA",
          "bold": true,
          "align": "center"
        },
        { "type": "text", "content": "Nº: {{sale.number}}" },
        { "type": "text", "content": "Fecha: {{sale.date}} {{sale.time}}" },
        { "type": "text", "content": "Cliente: {{sale.customer}}" },
        { "type": "divider", "char": "=", "repeat": 48 }
      ]
    },
    {
      "id": "items-table",
      "type": "table",
      "columns": [
        { "header": "PRODUCTO", "field": "name", "width": 20, "align": "left" },
        { "header": "CANT", "field": "quantity", "width": 5, "align": "right", "decimals": 2 },
        { "header": "PRECIO", "field": "unitPrice", "width": 10, "align": "right", "decimals": 2 },
        { "header": "TOTAL", "field": "lineTotal", "width": 10, "align": "right", "decimals": 2 }
      ],
      "data": "{{sale.items}}"
    },
    {
      "id": "totals",
      "type": "totals",
      "align": "right",
      "items": [
        { "type": "divider", "char": "=", "repeat": 48 },
        { "label": "Subtotal:", "value": "{{sale.subtotal}}", "decimals": 2 },
        { "label": "Descuento:", "value": "{{sale.discount}}", "decimals": 2, "showIf": "{{sale.discount > 0}}" },
        { "label": "TOTAL:", "value": "{{sale.total}}", "bold": true, "fontSize": 1, "decimals": 2 },
        { "type": "divider", "char": "=", "repeat": 48 }
      ]
    },
    {
      "id": "payments",
      "type": "payments",
      "showIf": "{{sale.payments.length > 0}}",
      "items": [
        { "type": "text", "content": "FORMAS DE PAGO:", "bold": true },
        { "type": "list", "data": "{{sale.payments}}", "format": "{{name}}: ${{amount}}" }
      ]
    },
    {
      "id": "footer",
      "type": "footer",
      "align": "center",
      "items": [
        { "type": "text", "content": "¡Gracias por su compra!" },
        { "type": "qr", "content": "{{sale.url}}", "size": 6, "showIf": "{{sale.url}}" },
        { "type": "cut" }
      ]
    }
  ]
}
```

**Variables disponibles:**
```javascript
{
  business: {
    name: "MI NEGOCIO",
    cuit: "20-12345678-9",
    address: "Av. Siempre Viva 123",
    phone: "011-1234-5678",
    email: "info@minegocio.com"
  },
  sale: {
    number: "VENTA-0001",
    date: "24/11/2025",
    time: "15:30",
    customer: "Juan Pérez",
    items: [
      { name: "Producto 1", quantity: 2, unitPrice: 100.00, lineTotal: 200.00 },
      { name: "Producto 2", quantity: 1, unitPrice: 50.50, lineTotal: 50.50 }
    ],
    subtotal: 250.50,
    discount: 0,
    total: 250.50,
    payments: [
      { name: "Efectivo", amount: 250.50 }
    ],
    url: "https://axioma.com/v/VENTA-0001"
  }
}
```

#### **API HTTP del Servicio**

**Base URL:** `http://localhost:9100`

**1. Health Check**
```http
GET /health
Response: { "status": "ok", "version": "1.0.0" }
```

**2. Imprimir Ticket**
```http
POST /print/ticket
Content-Type: application/json

{
  "template": "ticket-venta", // Nombre del template
  "data": {
    "sale": {
      "number": "VENTA-0001",
      "date": "24/11/2025",
      "customer": "Consumidor Final",
      "items": [...],
      "total": 1250.00,
      "payments": [...]
    }
  }
}

Response:
  Success: { "success": true, "printedAt": "2025-11-24T15:30:00Z" }
  Error: { "success": false, "error": "Printer not found" }
```

**3. Obtener Configuración**
```http
GET /config
Response: { printer: {...}, business: {...}, server: {...} }
```

**4. Test de Impresión**
```http
POST /print/test
Response: { "success": true }
```

**5. Listar Templates**
```http
GET /templates
Response: {
  "templates": [
    { "id": "ticket-venta", "name": "Ticket de Venta" },
    { "id": "factura", "name": "Factura AFIP" }
  ]
}
```

#### **Integración con Frontend AxiomaERP**

**Servicio de Impresión:**

```typescript
// frontend/src/services/printService.ts
export class PrintService {
  private printServiceUrl: string
  private isAvailable: boolean = false

  constructor() {
    this.printServiceUrl = localStorage.getItem('printServiceUrl') || 'http://localhost:9100'
    this.checkAvailability()
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.printServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000) // 1 segundo timeout
      })
      this.isAvailable = response.ok
    } catch {
      this.isAvailable = false
    }
    return this.isAvailable
  }

  async printTicket(sale: Sale): Promise<boolean> {
    try {
      const response = await fetch(`${this.printServiceUrl}/print/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'ticket-venta',
          data: {
            sale: {
              number: sale.saleNumber,
              date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
              time: new Date(sale.createdAt).toLocaleTimeString('es-AR'),
              customer: sale.customerName || 'Consumidor Final',
              items: sale.items.map(item => ({
                name: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal
              })),
              subtotal: sale.subtotal,
              discount: sale.discountAmount,
              total: sale.totalAmount,
              payments: sale.payments.map(p => ({
                name: p.paymentMethodName,
                amount: p.amount
              }))
            }
          }
        }),
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      })

      if (!response.ok) throw new Error('Print failed')
      return true

    } catch (error) {
      console.error('Print service error:', error)
      // Fallback: abrir ventana de impresión del navegador
      this.printFallback(sale)
      return false
    }
  }

  private printFallback(sale: Sale) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(this.generateHTML(sale))
    printWindow.document.close()
    printWindow.print()
  }

  private generateHTML(sale: Sale): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold">MI NEGOCIO</div>
        <div class="center">CUIT: XX-XXXXXXXX-X</div>
        <hr>
        <div>Nº: ${sale.saleNumber}</div>
        <div>Fecha: ${new Date(sale.saleDate).toLocaleDateString('es-AR')}</div>
        <hr>
        <table>
          ${sale.items.map(item => `
            <tr>
              <td>${item.productName}</td>
              <td class="right">${item.quantity}</td>
              <td class="right">$${item.lineTotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        <hr>
        <div class="right bold">TOTAL: $${sale.totalAmount.toFixed(2)}</div>
        <hr>
        <div class="center">¡Gracias por su compra!</div>
      </body>
      </html>
    `
  }
}

// Uso en componente
const printService = new PrintService()

// Al crear venta exitosa
const handleSaleCreated = async (sale: Sale) => {
  // Preguntar si desea imprimir
  if (confirm('¿Imprimir ticket?')) {
    await printService.printTicket(sale)
  }
}
```

**Configuración en Settings:**

```typescript
// frontend/src/pages/settings/PrintSettingsPage.tsx
export default function PrintSettingsPage() {
  const [printServiceUrl, setPrintServiceUrl] = useState(
    localStorage.getItem('printServiceUrl') || 'http://localhost:9100'
  )
  const [isConnected, setIsConnected] = useState(false)

  const testConnection = async () => {
    const printService = new PrintService()
    const available = await printService.checkAvailability()
    setIsConnected(available)
    if (available) {
      alert('✅ Conexión exitosa con Print Manager')
    } else {
      alert('❌ No se pudo conectar. Verifique que Print Manager esté ejecutándose.')
    }
  }

  const handleSave = () => {
    localStorage.setItem('printServiceUrl', printServiceUrl)
    alert('Configuración guardada')
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Configuración de Impresión</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            URL del Servicio de Impresión
          </label>
          <input
            type="text"
            value={printServiceUrl}
            onChange={(e) => setPrintServiceUrl(e.target.value)}
            className="w-full rounded-md border-gray-300"
            placeholder="http://localhost:9100"
          />
          <p className="text-sm text-gray-500 mt-1">
            Debe tener Axioma Print Manager instalado y ejecutándose
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="text-green-600 flex items-center gap-2">
              🟢 Conectado
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Probar Conexión
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Guardar
          </button>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-2">¿No tienes Print Manager?</h3>
          <p className="text-sm text-gray-600 mb-3">
            Descarga e instala Axioma Print Manager para imprimir tickets térmicos.
          </p>
          <a
            href="https://axioma.com/downloads/print-manager"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Descargar Print Manager →
          </a>
        </div>
      </div>
    </div>
  )
}
```

#### **Distribución y Deployment**

**Compilación:**
```bash
# Windows (desde Windows o con wine)
npm run build:win
# Genera: dist/Axioma Print Manager Setup 1.0.0.exe

# Linux
npm run build:linux
# Genera:
#   - dist/Axioma-Print-Manager-1.0.0.AppImage
#   - dist/axioma-print-manager_1.0.0_amd64.deb
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder -wl"
  }
}
```

**Auto-actualización:**
```javascript
// main/updater.js
const { autoUpdater } = require('electron-updater')

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'tu-usuario',
  repo: 'axioma-print-manager'
})

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización disponible',
    message: 'Hay una nueva versión. Se descargará en segundo plano.',
    buttons: ['OK']
  })
})

autoUpdater.checkForUpdatesAndNotify()
```

#### **Plan de Implementación (Post-MVP)**

**Estimación:** 2-3 semanas de desarrollo

**Semana 1: Base de la aplicación**
- [ ] Setup proyecto Electron + React
- [ ] Estructura de carpetas
- [ ] Proceso principal (main.js)
- [ ] IPC bridge (preload.js)
- [ ] Servidor Express básico
- [ ] electron-store configuración
- [ ] System tray básico

**Semana 2: Funcionalidad core**
- [ ] Integración node-thermal-printer
- [ ] Sistema de templates JSON
- [ ] Parser de templates
- [ ] Auto-detección de impresoras
- [ ] UI React (configuración)
- [ ] Test de impresión
- [ ] Logs viewer

**Semana 3: Polish y distribución**
- [ ] Instalador Windows (NSIS)
- [ ] AppImage Linux
- [ ] Auto-inicio
- [ ] Auto-actualización
- [ ] Documentación
- [ ] Testing en diferentes impresoras
- [ ] Página de descarga

#### **Mantenimiento y Soporte**

**Versioning:**
- Seguir Semantic Versioning (1.0.0, 1.1.0, 2.0.0)
- Releases en GitHub con changelog
- Auto-update desde GitHub Releases

**Soporte a impresoras:**
- EPSON TM-T20, TM-T88 (más comunes)
- Star Micronics
- Bixolon
- Genéricas ESC/POS

**Logs para debugging:**
- Ubicación: `%APPDATA%/axioma-print-manager/logs/`
- Rotación automática (5MB max por archivo)
- Usuario puede exportar logs desde UI

---

## 📦 ENTREGABLES POST-MVP v2.0

### **Aplicación Print Manager**
1. ✅ Instalador Windows (.exe)
2. ✅ Instalador Linux (.AppImage + .deb)
3. ✅ Documentación de instalación
4. ✅ Documentación API HTTP
5. ✅ Guía de templates
6. ✅ Videos tutoriales

### **Integración en AxiomaERP**
1. ✅ PrintService en frontend
2. ✅ Página de configuración
3. ✅ Botón "Imprimir" en ventas
4. ✅ Fallback a impresión navegador
5. ✅ Documentación para usuarios
