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

## 🚀 LO QUE FALTA PARA EL MVP

### 🔴 PRIORIDAD ALTA - Módulo de Ventas

#### **1. Modelo de Datos - Ventas y Pagos**

**Archivo:** `backend/prisma/schema.prisma`

**Agregar los siguientes modelos:**

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

#### **2. Backend - API de Ventas**

**Archivo:** `backend/src/routes/sales.ts`

**Endpoints requeridos:**

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

**Archivo:** `backend/src/services/salesService.ts`

**Lógica de negocio:**
- Validar stock disponible antes de crear venta
- Calcular subtotales, impuestos y totales
- Descontar stock del almacén
- Crear movimientos de stock
- Validar que suma de pagos = total de venta
- Actualizar estado de pago automáticamente
- Generar número de venta secuencial

---

#### **3. Frontend - Punto de Venta**

**Archivo:** `frontend/src/pages/sales/SalesPage.tsx`

**Componentes principales:**

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

**Archivo:** `frontend/src/pages/sales/NewSalePage.tsx`

**Funcionalidades:**
- Búsqueda de productos (por SKU, nombre, código de barras)
- Agregar/quitar productos del carrito
- Editar cantidad, precio, descuento
- Cálculo automático de impuestos
- Asignar múltiples formas de pago
- Validación: suma de pagos debe ser igual al total
- Selección de cliente (opcional)
- Selección de almacén (obligatorio)
- Opción para generar factura AFIP

**Archivo:** `frontend/src/api/sales.ts`

```typescript
export const salesApi = {
  createSale: (data) => api.post('/sales', data),
  getSales: (filters) => api.get('/sales', { params: filters }),
  getSale: (id) => api.get(`/sales/${id}`),
  addPayment: (id, payment) => api.post(`/sales/${id}/payments`, payment),
  generateInvoice: (id) => api.post(`/sales/${id}/invoice`),
  cancelSale: (id) => api.put(`/sales/${id}/cancel`)
}
```

---

### 🟡 PRIORIDAD MEDIA - Informes

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

### **FASE 1: Ventas Básicas** (3-5 días) 🔴 CRÍTICO

**Día 1-2: Backend**
1. [ ] Modificar `schema.prisma` (agregar Sale, SaleItem, SalePayment)
2. [ ] Ejecutar `npx prisma migrate dev --name add_sales_module`
3. [ ] Crear `salesService.ts` con lógica de negocio
4. [ ] Crear rutas API de ventas
5. [ ] Probar con Postman/Insomnia

**Día 3-4: Frontend**
6. [ ] Crear página de listado de ventas
7. [ ] Crear formulario de nueva venta (POS)
8. [ ] Implementar búsqueda de productos
9. [ ] Implementar carrito de compra
10. [ ] Implementar sección de formas de pago

**Día 5: Integración y Testing**
11. [ ] Probar flujo completo de venta
12. [ ] Validar descuento de stock
13. [ ] Validar cálculo de impuestos
14. [ ] Validar múltiples formas de pago
15. [ ] Fix bugs

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

### Módulo de Ventas
- [ ] Modelos de datos creados
- [ ] API backend funcionando
- [ ] Frontend POS operativo
- [ ] Integración con stock
- [ ] Múltiples formas de pago
- [ ] Testing completo

### Informes
- [ ] Ventas por producto
- [ ] Cobranzas por forma de pago
- [ ] Filtros funcionando
- [ ] Performance optimizada

### AFIP (Opcional)
- [ ] Configuración guardada
- [ ] Autenticación WSAA
- [ ] Facturación WSFEv1
- [ ] Integración con ventas
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
**Versión del documento:** 1.0
**Estado del proyecto:** En desarrollo - Fase de Planificación
