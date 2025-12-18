# Plan de Implementación: Gestión de Listas de Precios

## Índice
1. [Visión General](#visión-general)
2. [Análisis de Arquitectura](#análisis-de-arquitectura)
3. [Schema de Base de Datos](#schema-de-base-de-datos)
4. [Tipos de Listas](#tipos-de-listas)
5. [Reglas de Cálculo](#reglas-de-cálculo)
6. [Actualización Masiva](#actualización-masiva)
7. [Historial y Versionado](#historial-y-versionado)
8. [Aplicación de Precios](#aplicación-de-precios)
9. [Backend Implementation](#backend-implementation)
10. [Frontend UI](#frontend-ui)
11. [Casos de Uso](#casos-de-uso)
12. [Funcionalidades Avanzadas](#funcionalidades-avanzadas)

---

## Visión General

### Problema a Resolver

Los negocios necesitan manejar múltiples listas de precios para:
- Diferentes canales de venta (minorista, mayorista, distribuidor)
- Diferentes regiones geográficas
- Clientes especiales con precios negociados
- Promociones y descuentos temporales
- Diferentes monedas

### Objetivos

1. ✅ Gestionar múltiples listas de precios simultáneamente
2. ✅ Lista maestra con cálculos derivados
3. ✅ Actualización masiva eficiente
4. ✅ Historial completo de cambios
5. ✅ Aplicación automática según reglas
6. ✅ Performance óptima en consultas

---

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    LISTA MAESTRA                            │
│  Costo: $100 | Precio Base: $150 | Margen: 50%            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬──────────────┐
         │             │             │              │
         ▼             ▼             ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ MINORISTA   │ │ MAYORISTA   │ │  VIP        │ │ PROMO       │
│  +20%       │ │  -10%       │ │  -15%       │ │  -25%       │
│  = $180     │ │  = $135     │ │  = $127.50  │ │  = $112.50  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

         │             │             │              │
         └─────────────┴─────────────┴──────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   CLIENTE SELECCIONA        │
         │   Lista aplicable           │
         └─────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   VENTA usa precio de       │
         │   la lista seleccionada     │
         └─────────────────────────────┘
```

---

## Análisis de Arquitectura

### Opción A: Precio por Producto Simple ❌

**Estructura:**
```prisma
model Product {
  costPrice  Decimal
  salePrice  Decimal
}
```

**Problema:** Solo soporta UN precio, no escala.

---

### Opción B: Múltiples Campos en Producto ❌

**Estructura:**
```prisma
model Product {
  costPrice        Decimal
  salePrice        Decimal
  wholesalePrice   Decimal
  retailPrice      Decimal
  distributorPrice Decimal
}
```

**Problemas:**
- No es extensible (¿y si necesito más listas?)
- No permite precios dinámicos
- Dificulta auditoría

---

### Opción C: Tabla de Listas de Precios ✅ **RECOMENDADO**

**Estructura:**
```prisma
model PriceList {
  id          String
  name        String
  type        PriceListType  // MASTER | DERIVED | INDEPENDENT
  basedOnList String?        // Si es DERIVED
  items       PriceListItem[]
}

model PriceListItem {
  id           String
  priceListId  String
  productId    String
  costPrice    Decimal?
  salePrice    Decimal
  margin       Decimal?
}
```

**Ventajas:**
- ✅ Extensible infinitamente
- ✅ Soporta cálculos derivados
- ✅ Permite independencia total
- ✅ Fácil auditoría
- ✅ Performance con índices apropiados

---

## Schema de Base de Datos

### Modelo Principal

```prisma
// 💰 LISTA DE PRECIOS
model PriceList {
  id          String        @id @default(cuid())
  tenantId    String        @map("tenant_id")

  // Identificación
  name        String        // "Minorista", "Mayorista", "VIP"
  code        String?       // "MIN", "MAY", "VIP" (para APIs)
  description String?       @db.Text

  // Tipo de lista
  type        PriceListType @default(INDEPENDENT)

  // Configuración de lista derivada
  basePriceListId    String?       @map("base_price_list_id")
  basePriceList      PriceList?    @relation("DerivedPriceLists", fields: [basePriceListId], references: [id])
  derivedPriceLists  PriceList[]   @relation("DerivedPriceLists")

  calculationMethod  CalculationMethod? // PERCENTAGE | FIXED_AMOUNT | FORMULA
  adjustmentValue    Decimal?      @db.Decimal(10, 4)  // % o monto
  roundingRule       RoundingRule? @default(NONE)

  // Moneda
  currency    String        @default("ARS")

  // Vigencia
  validFrom   DateTime?     @map("valid_from")
  validTo     DateTime?     @map("valid_to")

  // Aplicación automática
  isDefault   Boolean       @default(false) @map("is_default")
  priority    Int           @default(0)     // Mayor prioridad = se aplica primero

  // Reglas de aplicación
  applyToNewProducts Boolean @default(true) @map("apply_to_new_products")
  autoUpdate         Boolean @default(false) @map("auto_update") // Auto-recalcular si base cambia

  // Metadata
  isActive    Boolean       @default(true) @map("is_active")
  metadata    Json          @default("{}")

  // Auditoría
  createdBy   String        @map("created_by")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  // Relaciones
  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator     User          @relation(fields: [createdBy], references: [id])
  items       PriceListItem[]
  customers   Entity[]      // Clientes asignados a esta lista
  sales       Sale[]        // Ventas que usaron esta lista
  history     PriceListHistory[]

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@index([tenantId, isDefault])
  @@index([type])
  @@map("price_lists")
}

enum PriceListType {
  MASTER       // Lista maestra con costos y márgenes
  DERIVED      // Calculada desde otra lista
  INDEPENDENT  // Precios manuales independientes
  PROMOTIONAL  // Lista temporal de promociones
}

enum CalculationMethod {
  PERCENTAGE    // Ajuste porcentual sobre base
  FIXED_AMOUNT  // Monto fijo sobre base
  MARGIN        // Calcular desde costo + margen
  FORMULA       // Fórmula personalizada
}

enum RoundingRule {
  NONE          // Sin redondeo
  NEAREST_1     // Al entero más cercano: 125.7 → 126
  NEAREST_5     // Al 5 más cercano: 127 → 125
  NEAREST_10    // Al 10 más cercano: 127 → 130
  NEAREST_50    // Al 50 más cercano: 127 → 150
  NEAREST_100   // Al 100 más cercano: 127 → 100
  CEIL_1        // Redondear arriba: 125.1 → 126
  CEIL_10       // Redondear arriba al 10: 125 → 130
  FLOOR_1       // Redondear abajo: 125.9 → 125
  FLOOR_10      // Redondear abajo al 10: 125 → 120
  CUSTOM        // Regla personalizada en metadata
}

// 📦 ITEMS DE LISTA DE PRECIOS
model PriceListItem {
  id          String    @id @default(cuid())
  priceListId String    @map("price_list_id")
  productId   String    @map("product_id")

  // Precios
  costPrice   Decimal?  @map("cost_price") @db.Decimal(15, 4)
  salePrice   Decimal   @map("sale_price") @db.Decimal(15, 4)

  // Cálculos
  margin      Decimal?  @db.Decimal(10, 4)  // % de margen
  markup      Decimal?  @db.Decimal(10, 4)  // % de markup

  // Precios mínimos/máximos
  minPrice    Decimal?  @map("min_price") @db.Decimal(15, 4)
  maxPrice    Decimal?  @map("max_price") @db.Decimal(15, 4)

  // Precios sugeridos (para ventas)
  suggestedPrice Decimal? @map("suggested_price") @db.Decimal(15, 4)

  // Metadata
  isActive    Boolean   @default(true) @map("is_active")
  notes       String?   @db.Text

  // Vigencia específica del item (sobreescribe la de la lista)
  validFrom   DateTime? @map("valid_from")
  validTo     DateTime? @map("valid_to")

  // Auditoría
  lastModifiedBy String? @map("last_modified_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relaciones
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  modifier    User?     @relation(fields: [lastModifiedBy], references: [id])

  @@unique([priceListId, productId])
  @@index([productId])
  @@index([priceListId, isActive])
  @@map("price_list_items")
}

// 📊 HISTORIAL DE CAMBIOS
model PriceListHistory {
  id          String    @id @default(cuid())
  priceListId String    @map("price_list_id")
  productId   String?   @map("product_id")  // null = cambio a nivel lista

  // Qué cambió
  changeType  ChangeType
  field       String?   // Campo que cambió
  oldValue    String?   @map("old_value") @db.Text
  newValue    String?   @map("new_value") @db.Text

  // Contexto
  reason      String?   @db.Text
  batchId     String?   @map("batch_id")  // Para agrupar cambios masivos

  // Auditoría
  changedBy   String    @map("changed_by")
  changedAt   DateTime  @default(now()) @map("changed_at")

  // Relaciones
  priceList   PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  product     Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  user        User      @relation(fields: [changedBy], references: [id])

  @@index([priceListId])
  @@index([productId])
  @@index([changedAt])
  @@index([batchId])
  @@map("price_list_history")
}

enum ChangeType {
  PRICE_CHANGE       // Cambio de precio individual
  COST_CHANGE        // Cambio de costo
  MARGIN_CHANGE      // Cambio de margen
  MASS_UPDATE        // Actualización masiva
  LIST_CREATED       // Lista creada
  LIST_UPDATED       // Configuración de lista actualizada
  LIST_DELETED       // Lista eliminada
  ITEM_ADDED         // Item agregado
  ITEM_REMOVED       // Item removido
  RECALCULATION      // Recálculo desde lista base
}

// Agregar relación en Entity (cliente)
model Entity {
  // ... campos existentes ...

  priceListId String?   @map("price_list_id")
  priceList   PriceList? @relation(fields: [priceListId], references: [id])

  // ... resto del modelo ...
}

// Agregar relación en Sale
model Sale {
  // ... campos existentes ...

  priceListId String?   @map("price_list_id")
  priceList   PriceList? @relation(fields: [priceListId], references: [id])

  // ... resto del modelo ...
}

// Agregar relación en Product
model Product {
  // ... campos existentes ...

  priceListItems PriceListItem[]
  priceHistory   PriceListHistory[]

  // ... resto del modelo ...
}
```

---

## Tipos de Listas

### 1. Lista Maestra (MASTER)

**Propósito:** Lista base con costos reales y márgenes objetivo.

**Características:**
- Contiene `costPrice` real del proveedor
- Calcula `salePrice` basado en `margin`
- No depende de otras listas
- Sirve como base para listas derivadas

**Ejemplo:**
```typescript
{
  name: "Lista Maestra",
  type: "MASTER",
  items: [
    {
      product: "Producto A",
      costPrice: 100,
      margin: 50,         // 50%
      salePrice: 150      // Calculado: 100 * (1 + 0.50)
    }
  ]
}
```

**Cálculo de margen:**
```typescript
margin = ((salePrice - costPrice) / costPrice) * 100
// margin = ((150 - 100) / 100) * 100 = 50%

markup = ((salePrice - costPrice) / salePrice) * 100
// markup = ((150 - 100) / 150) * 100 = 33.33%
```

---

### 2. Lista Derivada (DERIVED)

**Propósito:** Calculada automáticamente desde otra lista (típicamente la maestra).

**Características:**
- `basePriceListId` apunta a lista padre
- `calculationMethod` define cómo calcular
- `adjustmentValue` es el % o monto
- `autoUpdate = true` recalcula cuando base cambia

**Ejemplo - Mayorista (-10%):**
```typescript
{
  name: "Mayorista",
  type: "DERIVED",
  basePriceListId: "master-list-id",
  calculationMethod: "PERCENTAGE",
  adjustmentValue: -10,      // -10%
  roundingRule: "NEAREST_10",
  autoUpdate: true,

  // Items se calculan automáticamente:
  // Si master tiene $150 → mayorista: 150 * 0.90 = 135 → redondeado: 140
}
```

**Ejemplo - Minorista (+20%):**
```typescript
{
  name: "Minorista",
  type: "DERIVED",
  basePriceListId: "master-list-id",
  calculationMethod: "PERCENTAGE",
  adjustmentValue: 20,       // +20%
  roundingRule: "NEAREST_5",
}
```

**Ejemplo - Distribuidor (Margen desde costo):**
```typescript
{
  name: "Distribuidor",
  type: "DERIVED",
  basePriceListId: "master-list-id",
  calculationMethod: "MARGIN",
  adjustmentValue: 25,       // 25% de margen sobre costo

  // Si master costPrice = $100 → distribuidor: 100 * 1.25 = $125
}
```

---

### 3. Lista Independiente (INDEPENDENT)

**Propósito:** Precios manuales totalmente independientes.

**Características:**
- No se basa en ninguna lista
- Cada precio se ingresa manualmente
- Útil para clientes especiales, promociones únicas

**Ejemplo:**
```typescript
{
  name: "Cliente VIP - Contrato Anual",
  type: "INDEPENDENT",
  items: [
    {
      product: "Producto A",
      salePrice: 127.50,   // Precio negociado
      minPrice: 120,       // No vender por debajo
      maxPrice: 130        // No vender por encima
    }
  ]
}
```

---

### 4. Lista Promocional (PROMOTIONAL)

**Propósito:** Descuentos temporales.

**Características:**
- `validFrom` y `validTo` obligatorios
- Prioridad alta para aplicarse antes
- Se desactiva automáticamente al vencer

**Ejemplo:**
```typescript
{
  name: "Black Friday 2024",
  type: "PROMOTIONAL",
  priority: 100,              // Alta prioridad
  validFrom: "2024-11-25",
  validTo: "2024-11-30",
  basePriceListId: "master-list-id",
  calculationMethod: "PERCENTAGE",
  adjustmentValue: -30        // -30% descuento
}
```

---

## Reglas de Cálculo

### Métodos de Cálculo

#### 1. PERCENTAGE (Ajuste Porcentual)

Ajusta el precio base por un porcentaje.

```typescript
// Fórmula
newPrice = basePrice * (1 + (adjustmentValue / 100))

// Ejemplo: Mayorista -10%
basePrice = 150
adjustmentValue = -10
newPrice = 150 * (1 + (-10/100)) = 150 * 0.90 = 135

// Ejemplo: Minorista +20%
basePrice = 150
adjustmentValue = 20
newPrice = 150 * (1 + (20/100)) = 150 * 1.20 = 180
```

#### 2. FIXED_AMOUNT (Monto Fijo)

Suma o resta un monto fijo.

```typescript
// Fórmula
newPrice = basePrice + adjustmentValue

// Ejemplo: +$50
basePrice = 150
adjustmentValue = 50
newPrice = 150 + 50 = 200

// Ejemplo: -$20
basePrice = 150
adjustmentValue = -20
newPrice = 150 - 20 = 130
```

#### 3. MARGIN (Margen sobre Costo)

Calcula precio desde el costo aplicando un margen.

```typescript
// Fórmula
newPrice = costPrice * (1 + (margin / 100))

// Ejemplo: Margen 50%
costPrice = 100
margin = 50
newPrice = 100 * (1 + (50/100)) = 100 * 1.50 = 150

// Ejemplo: Margen 30%
costPrice = 100
margin = 30
newPrice = 100 * 1.30 = 130
```

#### 4. FORMULA (Fórmula Personalizada)

Permite expresiones matemáticas complejas.

```typescript
// Ejemplos de fórmulas guardadas en metadata.formula:

// 1. Precio escalonado por cantidad
formula: "cost * 1.5 - (quantity > 10 ? cost * 0.1 : 0)"

// 2. Precio según categoría
formula: "cost * (category === 'premium' ? 1.8 : 1.5)"

// 3. Precio con tope
formula: "min(cost * 1.6, 1000)"

// 4. Precio dinámico por temporada
formula: "cost * (season === 'high' ? 2.0 : 1.5)"
```

---

### Reglas de Redondeo

```typescript
// Implementación de redondeo
function applyRounding(price: number, rule: RoundingRule): number {
  switch (rule) {
    case 'NONE':
      return price

    case 'NEAREST_1':
      return Math.round(price)

    case 'NEAREST_5':
      return Math.round(price / 5) * 5

    case 'NEAREST_10':
      return Math.round(price / 10) * 10

    case 'NEAREST_50':
      return Math.round(price / 50) * 50

    case 'NEAREST_100':
      return Math.round(price / 100) * 100

    case 'CEIL_1':
      return Math.ceil(price)

    case 'CEIL_10':
      return Math.ceil(price / 10) * 10

    case 'FLOOR_1':
      return Math.floor(price)

    case 'FLOOR_10':
      return Math.floor(price / 10) * 10

    default:
      return price
  }
}

// Ejemplos:
applyRounding(127.5, 'NEAREST_1')   // → 128
applyRounding(127.5, 'NEAREST_5')   // → 125
applyRounding(127.5, 'NEAREST_10')  // → 130
applyRounding(127.5, 'CEIL_10')     // → 130
applyRounding(127.5, 'FLOOR_10')    // → 120
```

---

## Actualización Masiva

### Casos de Uso

1. **Aumento general de precios** (ej: por inflación)
2. **Actualización por categoría** (ej: solo electrónicos +15%)
3. **Actualización por marca** (ej: productos Samsung +10%)
4. **Actualización por proveedor** (ej: proveedor X aumentó costos)
5. **Actualización por rango de precios** (ej: productos > $1000 +5%)

### Estructura de Actualización

```typescript
interface MassUpdateRequest {
  priceListId: string

  // Filtros (todos opcionales, se combinan con AND)
  filters: {
    productIds?: string[]           // IDs específicos
    categoryIds?: string[]          // Por categoría
    brandIds?: string[]             // Por marca
    supplierIds?: string[]          // Por proveedor
    tags?: string[]                 // Por etiquetas
    priceRange?: {                  // Por rango de precio
      min?: number
      max?: number
    }
    costRange?: {                   // Por rango de costo
      min?: number
      max?: number
    }
    marginRange?: {                 // Por rango de margen
      min?: number
      max?: number
    }
  }

  // Tipo de actualización
  updateType: 'COST' | 'PRICE' | 'MARGIN' | 'ALL'

  // Método de ajuste
  adjustmentMethod: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'SET_VALUE'

  // Valores
  costAdjustment?: number          // Para ajustar costo
  priceAdjustment?: number         // Para ajustar precio
  marginAdjustment?: number        // Para ajustar margen

  // Opciones
  roundingRule?: RoundingRule
  respectMinMax?: boolean          // Respetar precios mín/máx

  // Previsualización
  preview?: boolean                // Si true, solo simula

  // Auditoría
  reason?: string                  // Motivo del cambio
}
```

### Ejemplos de Actualización Masiva

#### Ejemplo 1: Aumento general del 10%

```typescript
{
  priceListId: "master-list-id",
  filters: {},                     // Sin filtros = todos
  updateType: "PRICE",
  adjustmentMethod: "PERCENTAGE",
  priceAdjustment: 10,             // +10%
  roundingRule: "NEAREST_5",
  reason: "Ajuste por inflación Q1 2025"
}
```

#### Ejemplo 2: Actualizar solo categoría "Electrónicos"

```typescript
{
  priceListId: "retail-list-id",
  filters: {
    categoryIds: ["cat-electronics-id"]
  },
  updateType: "PRICE",
  adjustmentMethod: "PERCENTAGE",
  priceAdjustment: 15,             // +15%
  reason: "Aumento proveedor internacional"
}
```

#### Ejemplo 3: Ajustar margen de productos caros

```typescript
{
  priceListId: "master-list-id",
  filters: {
    priceRange: {
      min: 1000                    // Solo productos > $1000
    }
  },
  updateType: "MARGIN",
  adjustmentMethod: "SET_VALUE",
  marginAdjustment: 35,            // Fijar margen en 35%
  reason: "Normalización de márgenes premium"
}
```

#### Ejemplo 4: Actualizar costos de un proveedor

```typescript
{
  priceListId: "master-list-id",
  filters: {
    supplierIds: ["supplier-xyz-id"]
  },
  updateType: "COST",
  adjustmentMethod: "PERCENTAGE",
  costAdjustment: 8,               // +8%
  reason: "Nueva lista de precios Proveedor XYZ"
}
```

---

## Historial y Versionado

### Registro de Cambios

Cada cambio se registra automáticamente:

```typescript
// Cambio individual
{
  priceListId: "master-list-id",
  productId: "prod-123",
  changeType: "PRICE_CHANGE",
  field: "salePrice",
  oldValue: "150.00",
  newValue: "165.00",
  changedBy: "user-id",
  changedAt: "2025-01-15T10:30:00Z",
  reason: "Ajuste de precio manual"
}

// Cambio masivo
{
  priceListId: "master-list-id",
  productId: null,
  changeType: "MASS_UPDATE",
  field: "salePrice",
  oldValue: null,
  newValue: "+10%",
  batchId: "batch-abc123",        // Agrupa todos los cambios
  changedBy: "user-id",
  changedAt: "2025-01-15T14:00:00Z",
  reason: "Aumento trimestral"
}
```

### Consulta de Historial

```typescript
// Endpoint: GET /price-lists/:id/history

// Ver historial de un producto
GET /price-lists/master/history?productId=prod-123

// Ver cambios masivos
GET /price-lists/master/history?changeType=MASS_UPDATE

// Ver cambios en un rango de fechas
GET /price-lists/master/history?from=2025-01-01&to=2025-01-31

// Ver cambios por usuario
GET /price-lists/master/history?changedBy=user-123
```

### Rollback de Cambios

Permitir revertir cambios:

```typescript
// Revertir cambio individual
POST /price-lists/master/history/:historyId/rollback

// Revertir batch completo
POST /price-lists/master/history/batch/:batchId/rollback
```

---

## Aplicación de Precios

### Orden de Prioridad

Cuando un cliente hace una compra, el sistema debe decidir qué precio aplicar:

```typescript
function getPriceForCustomer(
  productId: string,
  customerId: string,
  quantity: number = 1
): PriceResult {

  // 1. Verificar si cliente tiene lista asignada
  const customer = await getCustomer(customerId)
  if (customer.priceListId) {
    const price = await getPriceFromList(customer.priceListId, productId)
    if (price) return price
  }

  // 2. Buscar lista promocional activa con mayor prioridad
  const promoPrice = await getActivePromotionalPrice(productId)
  if (promoPrice) return promoPrice

  // 3. Aplicar lista por defecto
  const defaultList = await getDefaultPriceList()
  const defaultPrice = await getPriceFromList(defaultList.id, productId)
  if (defaultPrice) return defaultPrice

  // 4. Fallback: precio del producto directamente
  const product = await getProduct(productId)
  return {
    price: product.salePrice,
    priceListId: null,
    priceListName: "Precio base"
  }
}
```

### Ejemplo de Prioridad

```
Cliente: Juan Pérez
Producto: Laptop XYZ

Paso 1: ¿Cliente tiene lista asignada?
  → Sí: "VIP" → Precio: $1,200 ✓ USAR ESTE

Paso 2: ¿Hay promoción activa?
  → Sí: "Black Friday" → Precio: $1,000 (pero cliente tiene VIP más bajo)

Paso 3: ¿Hay lista por defecto?
  → Sí: "Minorista" → Precio: $1,500

Paso 4: Precio base del producto
  → $1,400

RESULTADO: Se aplica $1,200 de lista VIP
```

---

## Backend Implementation

### Service: PriceListService

```typescript
// backend/src/services/priceListService.ts

import { PrismaClient, PriceListType, CalculationMethod, RoundingRule } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AppError } from '../middleware/errorHandler.js'

interface CreatePriceListInput {
  name: string
  code?: string
  description?: string
  type: PriceListType
  basePriceListId?: string
  calculationMethod?: CalculationMethod
  adjustmentValue?: number
  roundingRule?: RoundingRule
  currency?: string
  validFrom?: string
  validTo?: string
  isDefault?: boolean
  priority?: number
  autoUpdate?: boolean
}

interface MassUpdateInput {
  filters?: {
    productIds?: string[]
    categoryIds?: string[]
    brandIds?: string[]
    supplierIds?: string[]
    priceRange?: { min?: number; max?: number }
  }
  updateType: 'COST' | 'PRICE' | 'MARGIN'
  adjustmentMethod: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'SET_VALUE'
  value: number
  roundingRule?: RoundingRule
  reason?: string
  preview?: boolean
}

export class PriceListService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private userId: string
  ) {}

  /**
   * Crear nueva lista de precios
   */
  async createPriceList(data: CreatePriceListInput) {
    // Validar que código no exista
    if (data.code) {
      const existing = await this.prisma.priceList.findUnique({
        where: {
          tenantId_code: {
            tenantId: this.tenantId,
            code: data.code
          }
        }
      })
      if (existing) {
        throw new AppError('Ya existe una lista con ese código', 400)
      }
    }

    // Validar lista base si es DERIVED
    if (data.type === 'DERIVED') {
      if (!data.basePriceListId) {
        throw new AppError('Lista derivada requiere basePriceListId', 400)
      }
      if (!data.calculationMethod) {
        throw new AppError('Lista derivada requiere calculationMethod', 400)
      }
    }

    // Crear lista
    const priceList = await this.prisma.priceList.create({
      data: {
        tenantId: this.tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        type: data.type,
        basePriceListId: data.basePriceListId,
        calculationMethod: data.calculationMethod,
        adjustmentValue: data.adjustmentValue ? new Decimal(data.adjustmentValue) : null,
        roundingRule: data.roundingRule,
        currency: data.currency || 'ARS',
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        isDefault: data.isDefault || false,
        priority: data.priority || 0,
        autoUpdate: data.autoUpdate || false,
        createdBy: this.userId
      }
    })

    // Si es DERIVED, calcular precios automáticamente
    if (data.type === 'DERIVED' && data.basePriceListId) {
      await this.recalculateDerivedPrices(priceList.id)
    }

    // Registrar en historial
    await this.prisma.priceListHistory.create({
      data: {
        priceListId: priceList.id,
        changeType: 'LIST_CREATED',
        changedBy: this.userId,
        reason: 'Lista de precios creada'
      }
    })

    return priceList
  }

  /**
   * Recalcular precios de lista derivada desde su lista base
   */
  async recalculateDerivedPrices(priceListId: string) {
    const priceList = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
      include: { basePriceList: { include: { items: true } } }
    })

    if (!priceList || priceList.type !== 'DERIVED' || !priceList.basePriceList) {
      throw new AppError('Lista no es derivada o no tiene base', 400)
    }

    const baseItems = priceList.basePriceList.items
    const batchId = `batch-${Date.now()}`

    for (const baseItem of baseItems) {
      const newPrice = this.calculatePrice(
        Number(baseItem.salePrice),
        Number(baseItem.costPrice),
        priceList.calculationMethod!,
        Number(priceList.adjustmentValue || 0),
        priceList.roundingRule
      )

      // Verificar si item ya existe
      const existingItem = await this.prisma.priceListItem.findUnique({
        where: {
          priceListId_productId: {
            priceListId: priceListId,
            productId: baseItem.productId
          }
        }
      })

      if (existingItem) {
        // Actualizar
        const oldPrice = Number(existingItem.salePrice)

        await this.prisma.priceListItem.update({
          where: { id: existingItem.id },
          data: {
            salePrice: new Decimal(newPrice),
            costPrice: baseItem.costPrice,
            lastModifiedBy: this.userId
          }
        })

        // Historial
        await this.prisma.priceListHistory.create({
          data: {
            priceListId: priceListId,
            productId: baseItem.productId,
            changeType: 'RECALCULATION',
            field: 'salePrice',
            oldValue: oldPrice.toString(),
            newValue: newPrice.toString(),
            batchId,
            changedBy: this.userId,
            reason: 'Recálculo desde lista base'
          }
        })
      } else {
        // Crear
        await this.prisma.priceListItem.create({
          data: {
            priceListId: priceListId,
            productId: baseItem.productId,
            salePrice: new Decimal(newPrice),
            costPrice: baseItem.costPrice,
            lastModifiedBy: this.userId
          }
        })

        // Historial
        await this.prisma.priceListHistory.create({
          data: {
            priceListId: priceListId,
            productId: baseItem.productId,
            changeType: 'ITEM_ADDED',
            field: 'salePrice',
            newValue: newPrice.toString(),
            batchId,
            changedBy: this.userId,
            reason: 'Item agregado por recálculo'
          }
        })
      }
    }

    return { message: 'Recálculo completado', itemsProcessed: baseItems.length }
  }

  /**
   * Calcular precio según método
   */
  private calculatePrice(
    basePrice: number,
    baseCost: number | null,
    method: CalculationMethod,
    adjustment: number,
    rounding?: RoundingRule | null
  ): number {
    let price: number

    switch (method) {
      case 'PERCENTAGE':
        price = basePrice * (1 + adjustment / 100)
        break

      case 'FIXED_AMOUNT':
        price = basePrice + adjustment
        break

      case 'MARGIN':
        if (!baseCost) {
          throw new AppError('MARGIN requiere costo base', 400)
        }
        price = baseCost * (1 + adjustment / 100)
        break

      case 'FORMULA':
        // Implementar evaluación de fórmula custom
        throw new AppError('FORMULA no implementado aún', 501)

      default:
        price = basePrice
    }

    // Aplicar redondeo
    if (rounding) {
      price = this.applyRounding(price, rounding)
    }

    return price
  }

  /**
   * Aplicar regla de redondeo
   */
  private applyRounding(price: number, rule: RoundingRule): number {
    switch (rule) {
      case 'NONE':
        return price
      case 'NEAREST_1':
        return Math.round(price)
      case 'NEAREST_5':
        return Math.round(price / 5) * 5
      case 'NEAREST_10':
        return Math.round(price / 10) * 10
      case 'NEAREST_50':
        return Math.round(price / 50) * 50
      case 'NEAREST_100':
        return Math.round(price / 100) * 100
      case 'CEIL_1':
        return Math.ceil(price)
      case 'CEIL_10':
        return Math.ceil(price / 10) * 10
      case 'FLOOR_1':
        return Math.floor(price)
      case 'FLOOR_10':
        return Math.floor(price / 10) * 10
      default:
        return price
    }
  }

  /**
   * Actualización masiva de precios
   */
  async massUpdate(priceListId: string, data: MassUpdateInput) {
    // Construir WHERE clause para filtros
    const where: any = {
      priceListId,
      isActive: true
    }

    if (data.filters) {
      if (data.filters.productIds) {
        where.productId = { in: data.filters.productIds }
      }

      if (data.filters.categoryIds || data.filters.brandIds) {
        where.product = {}
        if (data.filters.categoryIds) {
          where.product.categoryId = { in: data.filters.categoryIds }
        }
        if (data.filters.brandIds) {
          where.product.brandId = { in: data.filters.brandIds }
        }
      }

      if (data.filters.priceRange) {
        where.salePrice = {}
        if (data.filters.priceRange.min) {
          where.salePrice.gte = data.filters.priceRange.min
        }
        if (data.filters.priceRange.max) {
          where.salePrice.lte = data.filters.priceRange.max
        }
      }
    }

    // Obtener items a actualizar
    const items = await this.prisma.priceListItem.findMany({
      where,
      include: { product: true }
    })

    if (items.length === 0) {
      return { message: 'No se encontraron items para actualizar', itemsAffected: 0 }
    }

    // Preview mode: solo retornar lo que cambiaría
    if (data.preview) {
      const preview = items.map(item => {
        const oldValue = this.getFieldValue(item, data.updateType)
        const newValue = this.calculateNewValue(oldValue, data.adjustmentMethod, data.value)

        return {
          productId: item.productId,
          productName: item.product.name,
          field: data.updateType.toLowerCase(),
          oldValue,
          newValue,
          change: newValue - oldValue
        }
      })

      return {
        preview: true,
        itemsAffected: items.length,
        changes: preview
      }
    }

    // Ejecutar actualización
    const batchId = `batch-${Date.now()}`

    for (const item of items) {
      const oldValue = this.getFieldValue(item, data.updateType)
      let newValue = this.calculateNewValue(oldValue, data.adjustmentMethod, data.value)

      // Aplicar redondeo
      if (data.roundingRule) {
        newValue = this.applyRounding(newValue, data.roundingRule)
      }

      // Construir objeto de actualización
      const updateData: any = {
        lastModifiedBy: this.userId
      }

      if (data.updateType === 'COST') {
        updateData.costPrice = new Decimal(newValue)
      } else if (data.updateType === 'PRICE') {
        updateData.salePrice = new Decimal(newValue)
      } else if (data.updateType === 'MARGIN') {
        updateData.margin = new Decimal(newValue)
        // Recalcular precio desde margen
        if (item.costPrice) {
          const newPrice = Number(item.costPrice) * (1 + newValue / 100)
          updateData.salePrice = new Decimal(newPrice)
        }
      }

      // Actualizar item
      await this.prisma.priceListItem.update({
        where: { id: item.id },
        data: updateData
      })

      // Registrar en historial
      await this.prisma.priceListHistory.create({
        data: {
          priceListId,
          productId: item.productId,
          changeType: 'MASS_UPDATE',
          field: data.updateType.toLowerCase(),
          oldValue: oldValue.toString(),
          newValue: newValue.toString(),
          batchId,
          changedBy: this.userId,
          reason: data.reason || 'Actualización masiva'
        }
      })
    }

    return {
      message: 'Actualización completada',
      itemsAffected: items.length,
      batchId
    }
  }

  private getFieldValue(item: any, field: string): number {
    switch (field) {
      case 'COST':
        return Number(item.costPrice || 0)
      case 'PRICE':
        return Number(item.salePrice)
      case 'MARGIN':
        return Number(item.margin || 0)
      default:
        return 0
    }
  }

  private calculateNewValue(
    currentValue: number,
    method: string,
    adjustment: number
  ): number {
    switch (method) {
      case 'PERCENTAGE':
        return currentValue * (1 + adjustment / 100)
      case 'FIXED_AMOUNT':
        return currentValue + adjustment
      case 'SET_VALUE':
        return adjustment
      default:
        return currentValue
    }
  }

  /**
   * Obtener precio para un cliente específico
   */
  async getPriceForCustomer(productId: string, customerId?: string) {
    // 1. Si hay cliente, verificar su lista asignada
    if (customerId) {
      const customer = await this.prisma.entity.findUnique({
        where: { id: customerId },
        include: { priceList: true }
      })

      if (customer?.priceListId) {
        const price = await this.prisma.priceListItem.findUnique({
          where: {
            priceListId_productId: {
              priceListId: customer.priceListId,
              productId
            }
          },
          include: { priceList: true }
        })

        if (price) {
          return {
            price: Number(price.salePrice),
            costPrice: price.costPrice ? Number(price.costPrice) : null,
            priceListId: price.priceListId,
            priceListName: price.priceList.name
          }
        }
      }
    }

    // 2. Buscar promoción activa
    const now = new Date()
    const promoPrice = await this.prisma.priceListItem.findFirst({
      where: {
        productId,
        priceList: {
          tenantId: this.tenantId,
          type: 'PROMOTIONAL',
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now }
        }
      },
      include: { priceList: true },
      orderBy: {
        priceList: { priority: 'desc' }
      }
    })

    if (promoPrice) {
      return {
        price: Number(promoPrice.salePrice),
        costPrice: promoPrice.costPrice ? Number(promoPrice.costPrice) : null,
        priceListId: promoPrice.priceListId,
        priceListName: promoPrice.priceList.name
      }
    }

    // 3. Lista por defecto
    const defaultList = await this.prisma.priceList.findFirst({
      where: {
        tenantId: this.tenantId,
        isDefault: true,
        isActive: true
      }
    })

    if (defaultList) {
      const price = await this.prisma.priceListItem.findUnique({
        where: {
          priceListId_productId: {
            priceListId: defaultList.id,
            productId
          }
        },
        include: { priceList: true }
      })

      if (price) {
        return {
          price: Number(price.salePrice),
          costPrice: price.costPrice ? Number(price.costPrice) : null,
          priceListId: price.priceListId,
          priceListName: price.priceList.name
        }
      }
    }

    // 4. Fallback: precio del producto
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      throw new AppError('Producto no encontrado', 404)
    }

    return {
      price: Number(product.salePrice),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      priceListId: null,
      priceListName: 'Precio base'
    }
  }
}
```

---

## Frontend UI

### Página Principal: Lista de Listas de Precios

```tsx
// frontend/src/pages/price-lists/PriceListsPage.tsx

import React, { useState, useEffect } from 'react'
import { priceListsApi } from '../../api/priceLists'

export const PriceListsPage = () => {
  const [priceLists, setPriceLists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPriceLists()
  }, [])

  const loadPriceLists = async () => {
    try {
      const data = await priceListsApi.getAll()
      setPriceLists(data.priceLists)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="price-lists-page">
      <div className="page-header">
        <h1>Listas de Precios</h1>
        <button onClick={() => navigate('/price-lists/new')}>
          Nueva Lista
        </button>
      </div>

      <div className="price-lists-grid">
        {priceLists.map(list => (
          <PriceListCard
            key={list.id}
            priceList={list}
            onEdit={() => navigate(`/price-lists/${list.id}/edit`)}
            onView={() => navigate(`/price-lists/${list.id}`)}
            onDelete={() => handleDelete(list.id)}
          />
        ))}
      </div>
    </div>
  )
}

const PriceListCard = ({ priceList, onEdit, onView, onDelete }) => {
  const typeLabels = {
    MASTER: 'Maestra',
    DERIVED: 'Derivada',
    INDEPENDENT: 'Independiente',
    PROMOTIONAL: 'Promocional'
  }

  const typeBadgeColors = {
    MASTER: 'purple',
    DERIVED: 'blue',
    INDEPENDENT: 'green',
    PROMOTIONAL: 'orange'
  }

  return (
    <div className="price-list-card">
      <div className="card-header">
        <h3>{priceList.name}</h3>
        <span className={`badge badge-${typeBadgeColors[priceList.type]}`}>
          {typeLabels[priceList.type]}
        </span>
      </div>

      <div className="card-body">
        {priceList.description && (
          <p className="description">{priceList.description}</p>
        )}

        <div className="stats">
          <div className="stat">
            <label>Items:</label>
            <span>{priceList.itemCount}</span>
          </div>

          {priceList.type === 'DERIVED' && (
            <div className="stat">
              <label>Basada en:</label>
              <span>{priceList.basePriceList?.name}</span>
            </div>
          )}

          {priceList.isDefault && (
            <div className="stat">
              <span className="badge badge-success">Por Defecto</span>
            </div>
          )}
        </div>

        {priceList.validFrom && (
          <div className="validity">
            <small>
              Válida desde: {formatDate(priceList.validFrom)}
              {priceList.validTo && ` hasta ${formatDate(priceList.validTo)}`}
            </small>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button onClick={onView}>Ver Precios</button>
        <button onClick={onEdit}>Editar</button>
        <button onClick={onDelete} className="danger">Eliminar</button>
      </div>
    </div>
  )
}
```

---

### Página de Items: Ver/Editar Precios

```tsx
// frontend/src/pages/price-lists/PriceListItemsPage.tsx

import React, { useState, useEffect } from 'react'
import { DataGrid } from '../../components/DataGrid'
import { priceListsApi } from '../../api/priceLists'

export const PriceListItemsPage = ({ priceListId }) => {
  const [priceList, setPriceList] = useState(null)
  const [items, setItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [filters, setFilters] = useState({})

  useEffect(() => {
    loadPriceList()
    loadItems()
  }, [priceListId])

  const columns = [
    {
      field: 'product.sku',
      header: 'SKU',
      width: 120
    },
    {
      field: 'product.name',
      header: 'Producto',
      width: 300
    },
    {
      field: 'costPrice',
      header: 'Costo',
      width: 120,
      render: (item) => formatCurrency(item.costPrice),
      editable: priceList?.type === 'MASTER'
    },
    {
      field: 'salePrice',
      header: 'Precio',
      width: 120,
      render: (item) => formatCurrency(item.salePrice),
      editable: true
    },
    {
      field: 'margin',
      header: 'Margen %',
      width: 100,
      render: (item) => {
        if (!item.costPrice) return '-'
        const margin = ((item.salePrice - item.costPrice) / item.costPrice) * 100
        return `${margin.toFixed(2)}%`
      },
      editable: priceList?.type === 'MASTER'
    },
    {
      field: 'product.category.name',
      header: 'Categoría',
      width: 150
    },
    {
      field: 'updatedAt',
      header: 'Última Act.',
      width: 120,
      render: (item) => formatDateTime(item.updatedAt)
    }
  ]

  const handleCellEdit = async (itemId, field, value) => {
    try {
      await priceListsApi.updateItem(priceListId, itemId, {
        [field]: value
      })
      toast.success('Precio actualizado')
      loadItems() // Recargar
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleMassUpdate = () => {
    // Abrir modal de actualización masiva
    setShowMassUpdateModal(true)
  }

  return (
    <div className="price-list-items-page">
      <div className="page-header">
        <div>
          <h1>{priceList?.name}</h1>
          <p className="subtitle">
            {priceList?.type === 'DERIVED' && (
              <>Calculada desde: {priceList.basePriceList?.name}</>
            )}
          </p>
        </div>

        <div className="actions">
          {priceList?.type === 'DERIVED' && (
            <button onClick={handleRecalculate}>
              🔄 Recalcular desde Base
            </button>
          )}

          <button onClick={handleMassUpdate}>
            📊 Actualización Masiva
          </button>

          <button onClick={handleExport}>
            📥 Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <select
          value={filters.categoryId}
          onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filters.brandId}
          onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
        >
          <option value="">Todas las marcas</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </div>

      {/* Grid editable */}
      <DataGrid
        columns={columns}
        data={items}
        editable={true}
        onCellEdit={handleCellEdit}
        selectable={true}
        selectedRows={selectedItems}
        onSelectionChange={setSelectedItems}
        pagination={true}
      />

      {/* Estadísticas */}
      <div className="stats-bar">
        <div className="stat">
          <label>Total items:</label>
          <span>{items.length}</span>
        </div>
        <div className="stat">
          <label>Margen promedio:</label>
          <span>{calculateAvgMargin(items)}%</span>
        </div>
        <div className="stat">
          <label>Precio promedio:</label>
          <span>{formatCurrency(calculateAvgPrice(items))}</span>
        </div>
      </div>
    </div>
  )
}
```

---

### Modal de Actualización Masiva

```tsx
// frontend/src/components/MassUpdateModal.tsx

import React, { useState } from 'react'

export const MassUpdateModal = ({ priceListId, onClose, onComplete }) => {
  const [step, setStep] = useState(1) // 1=filtros, 2=método, 3=preview, 4=confirm

  const [filters, setFilters] = useState({
    productIds: [],
    categoryIds: [],
    brandIds: [],
    supplierIds: [],
    priceRange: {}
  })

  const [update, setUpdate] = useState({
    updateType: 'PRICE',
    adjustmentMethod: 'PERCENTAGE',
    value: 0,
    roundingRule: 'NEAREST_1',
    reason: ''
  })

  const [preview, setPreview] = useState(null)

  const handlePreview = async () => {
    try {
      const result = await priceListsApi.massUpdate(priceListId, {
        filters,
        ...update,
        preview: true
      })
      setPreview(result)
      setStep(3)
    } catch (error) {
      toast.error('Error al generar preview')
    }
  }

  const handleConfirm = async () => {
    try {
      const result = await priceListsApi.massUpdate(priceListId, {
        filters,
        ...update,
        preview: false
      })

      toast.success(`${result.itemsAffected} items actualizados`)
      onComplete()
      onClose()
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  return (
    <Modal isOpen onClose={onClose} size="large">
      <div className="mass-update-modal">
        <h2>Actualización Masiva de Precios</h2>

        {/* Step 1: Filtros */}
        {step === 1 && (
          <div className="step-filters">
            <h3>Paso 1: Seleccionar Productos</h3>

            <div className="filter-group">
              <label>Categorías:</label>
              <MultiSelect
                options={categories}
                value={filters.categoryIds}
                onChange={(val) => setFilters({ ...filters, categoryIds: val })}
              />
            </div>

            <div className="filter-group">
              <label>Marcas:</label>
              <MultiSelect
                options={brands}
                value={filters.brandIds}
                onChange={(val) => setFilters({ ...filters, brandIds: val })}
              />
            </div>

            <div className="filter-group">
              <label>Rango de precios:</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.priceRange.min || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, min: e.target.value }
                  })}
                />
                <span>a</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={filters.priceRange.max || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, max: e.target.value }
                  })}
                />
              </div>
            </div>

            <button onClick={() => setStep(2)}>
              Siguiente →
            </button>
          </div>
        )}

        {/* Step 2: Método de actualización */}
        {step === 2 && (
          <div className="step-method">
            <h3>Paso 2: Método de Actualización</h3>

            <div className="form-group">
              <label>¿Qué actualizar?</label>
              <select
                value={update.updateType}
                onChange={(e) => setUpdate({ ...update, updateType: e.target.value })}
              >
                <option value="PRICE">Precio de Venta</option>
                <option value="COST">Costo</option>
                <option value="MARGIN">Margen</option>
              </select>
            </div>

            <div className="form-group">
              <label>Método:</label>
              <select
                value={update.adjustmentMethod}
                onChange={(e) => setUpdate({ ...update, adjustmentMethod: e.target.value })}
              >
                <option value="PERCENTAGE">Porcentaje</option>
                <option value="FIXED_AMOUNT">Monto Fijo</option>
                <option value="SET_VALUE">Establecer Valor</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                {update.adjustmentMethod === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Valor ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={update.value}
                onChange={(e) => setUpdate({ ...update, value: parseFloat(e.target.value) })}
              />

              {update.adjustmentMethod === 'PERCENTAGE' && (
                <small>
                  Ejemplo: 10 = aumentar 10%, -10 = disminuir 10%
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Redondeo:</label>
              <select
                value={update.roundingRule}
                onChange={(e) => setUpdate({ ...update, roundingRule: e.target.value })}
              >
                <option value="NONE">Sin redondeo</option>
                <option value="NEAREST_1">Al entero más cercano</option>
                <option value="NEAREST_5">Al 5 más cercano</option>
                <option value="NEAREST_10">Al 10 más cercano</option>
                <option value="NEAREST_100">Al 100 más cercano</option>
              </select>
            </div>

            <div className="form-group">
              <label>Motivo del cambio:</label>
              <textarea
                value={update.reason}
                onChange={(e) => setUpdate({ ...update, reason: e.target.value })}
                placeholder="Ej: Ajuste por inflación trimestral"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setStep(1)} className="secondary">
                ← Atrás
              </button>
              <button onClick={handlePreview}>
                Ver Preview →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <div className="step-preview">
            <h3>Paso 3: Previsualización</h3>

            <div className="summary">
              <p><strong>{preview.itemsAffected}</strong> productos serán actualizados</p>
            </div>

            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Valor Actual</th>
                    <th>Valor Nuevo</th>
                    <th>Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.slice(0, 10).map((change, idx) => (
                    <tr key={idx}>
                      <td>{change.productName}</td>
                      <td>{formatCurrency(change.oldValue)}</td>
                      <td>{formatCurrency(change.newValue)}</td>
                      <td className={change.change > 0 ? 'positive' : 'negative'}>
                        {change.change > 0 ? '+' : ''}
                        {formatCurrency(change.change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {preview.changes.length > 10 && (
                <p className="truncated-note">
                  Mostrando 10 de {preview.changes.length} cambios
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setStep(2)} className="secondary">
                ← Atrás
              </button>
              <button onClick={handleConfirm} className="primary">
                ✓ Confirmar Actualización
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

---

## Casos de Uso

### Caso 1: Tienda Minorista con 3 Listas

**Escenario:**
- Lista Maestra con costos y margen 50%
- Lista Minorista +20% sobre maestra (público general)
- Lista Mayorista -10% sobre maestra (compras > 10 unidades)

**Implementación:**

1. Crear Lista Maestra:
```typescript
await priceListsApi.create({
  name: "Lista Maestra",
  type: "MASTER",
  isDefault: true
})

// Agregar producto con costo
await priceListsApi.addItem(masterListId, {
  productId: "prod-123",
  costPrice: 100,
  margin: 50,
  salePrice: 150  // Calculado automáticamente
})
```

2. Crear Lista Minorista (derivada):
```typescript
await priceListsApi.create({
  name: "Minorista",
  type: "DERIVED",
  basePriceListId: masterListId,
  calculationMethod: "PERCENTAGE",
  adjustmentValue: 20,
  roundingRule: "NEAREST_5",
  autoUpdate: true
})
// Precios se calculan automáticamente: 150 * 1.20 = 180
```

3. Crear Lista Mayorista (derivada):
```typescript
await priceListsApi.create({
  name: "Mayorista",
  type: "DERIVED",
  basePriceListId: masterListId,
  calculationMethod: "PERCENTAGE",
  adjustmentValue: -10,
  roundingRule: "NEAREST_10",
  autoUpdate: true
})
// Precios se calculan automáticamente: 150 * 0.90 = 135 → redondeado: 140
```

---

### Caso 2: E-commerce con Promoción Temporal

**Escenario:**
- Black Friday: 30% de descuento sobre lista minorista
- Válido solo 5 días

**Implementación:**

```typescript
await priceListsApi.create({
  name: "Black Friday 2024",
  type: "PROMOTIONAL",
  basePriceListId: retailListId,
  calculationMethod: "PERCENTAGE",
  adjustmentValue: -30,
  validFrom: "2024-11-25T00:00:00Z",
  validTo: "2024-11-30T23:59:59Z",
  priority: 100,  // Alta prioridad
  autoUpdate: true
})

// El sistema automáticamente:
// - Aplica esta lista durante las fechas válidas
// - La desactiva después del validTo
// - Tiene prioridad sobre otras listas por su priority alto
```

---

### Caso 3: Distribuidora con Listas por Región

**Escenario:**
- Lista para Buenos Aires
- Lista para Interior (precios más altos por logística)
- Lista para Exportación (en USD)

**Implementación:**

```typescript
// Lista Buenos Aires (base)
await priceListsApi.create({
  name: "Buenos Aires",
  type: "INDEPENDENT",
  isDefault: true,
  currency: "ARS"
})

// Lista Interior (+15% por logística)
await priceListsApi.create({
  name: "Interior",
  type: "DERIVED",
  basePriceListId: buenosAiresListId,
  calculationMethod: "PERCENTAGE",
  adjustmentValue: 15,
  currency: "ARS"
})

// Lista Exportación (en USD)
await priceListsApi.create({
  name: "Exportación",
  type: "INDEPENDENT",
  currency: "USD"
})

// Asignar clientes a listas por región
await customersApi.update(customerId, {
  priceListId: interiorListId  // Cliente del interior
})
```

---

### Caso 4: Actualización Masiva por Inflación

**Escenario:**
- Inflación mensual del 8%
- Actualizar todos los costos y recalcular precios

**Implementación:**

```typescript
// 1. Actualizar costos en Lista Maestra
await priceListsApi.massUpdate(masterListId, {
  filters: {},  // Todos los productos
  updateType: "COST",
  adjustmentMethod: "PERCENTAGE",
  value: 8,  // +8%
  reason: "Ajuste inflación enero 2025"
})

// 2. Como las listas derivadas tienen autoUpdate=true,
//    se recalculan automáticamente

// 3. Verificar que las listas derivadas se actualizaron
const retailList = await priceListsApi.get(retailListId)
// Los precios ya estarán actualizados
```

---

### Caso 5: Cliente VIP con Precio Personalizado

**Escenario:**
- Cliente especial con contrato anual
- Precios negociados individualmente

**Implementación:**

```typescript
// 1. Crear lista personalizada
const vipList = await priceListsApi.create({
  name: "Cliente VIP - Contrato 2025",
  type: "INDEPENDENT",
  description: "Precios negociados en contrato anual"
})

// 2. Agregar productos con precios personalizados
await priceListsApi.addItem(vipList.id, {
  productId: "prod-123",
  salePrice: 120,  // Precio negociado
  minPrice: 115,   // No vender por debajo
  maxPrice: 125    // No vender por encima
})

// 3. Asignar lista al cliente
await customersApi.update(vipCustomerId, {
  priceListId: vipList.id
})

// 4. Al vender, automáticamente usa estos precios
const sale = await salesApi.create({
  customerId: vipCustomerId,
  items: [{ productId: "prod-123", quantity: 10 }]
  // salePrice se obtiene automáticamente de la lista VIP: $120
})
```

---

## Funcionalidades Avanzadas

### 1. Comparador de Listas

Comparar precios entre múltiples listas:

```typescript
// GET /price-lists/compare?lists=list1,list2,list3&productId=prod-123

{
  product: {
    id: "prod-123",
    name: "Laptop XYZ"
  },
  prices: [
    { listName: "Minorista", price: 180, margin: 50 },
    { listName: "Mayorista", price: 140, margin: 30 },
    { listName: "VIP", price: 120, margin: 20 }
  ]
}
```

**UI:**
```tsx
<ComparisonTable>
  <thead>
    <tr>
      <th>Producto</th>
      <th>Lista Minorista</th>
      <th>Lista Mayorista</th>
      <th>Lista VIP</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Laptop XYZ</td>
      <td>$180 (50%)</td>
      <td>$140 (30%)</td>
      <td>$120 (20%) ✓ Mejor para cliente</td>
    </tr>
  </tbody>
</ComparisonTable>
```

---

### 2. Alertas de Márgenes Bajos

Notificar cuando el margen cae por debajo de un umbral:

```typescript
// Cron job diario
async function checkLowMargins() {
  const threshold = 15  // 15% mínimo

  const lowMarginItems = await prisma.priceListItem.findMany({
    where: {
      priceList: { type: 'MASTER' },
      margin: { lt: threshold },
      costPrice: { not: null }
    },
    include: { product: true, priceList: true }
  })

  if (lowMarginItems.length > 0) {
    await sendAlert({
      type: 'LOW_MARGIN',
      message: `${lowMarginItems.length} productos tienen margen < ${threshold}%`,
      items: lowMarginItems
    })
  }
}
```

---

### 3. Simulador de Cambios

Simular impacto de cambios antes de aplicarlos:

```typescript
// POST /price-lists/:id/simulate

{
  simulation: {
    type: "PERCENTAGE_INCREASE",
    value: 10
  },
  report: {
    currentAvgMargin: 35,
    newAvgMargin: 42,
    currentAvgPrice: 150,
    newAvgPrice: 165,
    impact: {
      totalProducts: 500,
      avgPriceIncrease: 15,
      percentageIncrease: 10,
      estimatedRevenueIncrease: 50000
    }
  }
}
```

---

### 4. Importación/Exportación Masiva

Permitir importar precios desde Excel/CSV:

```typescript
// POST /price-lists/:id/import

// Formato CSV:
// sku,cost_price,sale_price,margin
// ABC-001,100,150,50
// ABC-002,200,280,40

const handleImport = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const result = await priceListsApi.import(priceListId, formData)

  toast.success(`${result.imported} precios importados`)
  if (result.errors.length > 0) {
    toast.warning(`${result.errors.length} errores encontrados`)
  }
}
```

---

### 5. Análisis de Competitividad

Comparar precios con competencia:

```typescript
model CompetitorPrice {
  id             String   @id @default(cuid())
  tenantId       String
  productId      String
  competitorName String
  price          Decimal
  url            String?
  checkedAt      DateTime @default(now())

  product        Product  @relation(fields: [productId], references: [id])

  @@map("competitor_prices")
}

// Análisis
{
  product: "Laptop XYZ",
  ourPrice: 180,
  competitorPrices: [
    { competitor: "Competidor A", price: 185, diff: -5 },
    { competitor: "Competidor B", price: 175, diff: +5 },
    { competitor: "Competidor C", price: 190, diff: -10 }
  ],
  recommendation: "Tu precio es competitivo (2° más bajo)"
}
```

---

### 6. Precios Escalonados por Cantidad

Descuentos automáticos por volumen:

```prisma
model PriceListItemTier {
  id             String  @id @default(cuid())
  priceListItemId String
  minQuantity    Decimal
  maxQuantity    Decimal?
  price          Decimal
  discountPercent Decimal?

  priceListItem  PriceListItem @relation(fields: [priceListItemId], references: [id])

  @@map("price_list_item_tiers")
}
```

**Ejemplo:**
```typescript
{
  product: "Producto A",
  basePrice: 100,
  tiers: [
    { minQty: 1, maxQty: 9, price: 100 },      // 1-9 unidades: $100
    { minQty: 10, maxQty: 49, price: 95 },     // 10-49: $95 (-5%)
    { minQty: 50, maxQty: 99, price: 90 },     // 50-99: $90 (-10%)
    { minQty: 100, maxQty: null, price: 85 }   // 100+: $85 (-15%)
  ]
}
```

---

### 7. Sincronización con Proveedor

Actualizar costos automáticamente desde API del proveedor:

```typescript
// Integración con proveedor
async function syncSupplierPrices(supplierId: string) {
  // 1. Obtener precios actualizados del proveedor (API o CSV)
  const supplierPrices = await fetchSupplierPrices(supplierId)

  // 2. Encontrar productos del proveedor en nuestra base
  const ourProducts = await prisma.product.findMany({
    where: { supplierId }
  })

  // 3. Actualizar costos en lista maestra
  const masterList = await prisma.priceList.findFirst({
    where: { type: 'MASTER', tenantId }
  })

  for (const supplierPrice of supplierPrices) {
    const product = ourProducts.find(p => p.supplierSku === supplierPrice.sku)
    if (!product) continue

    await prisma.priceListItem.upsert({
      where: {
        priceListId_productId: {
          priceListId: masterList.id,
          productId: product.id
        }
      },
      update: {
        costPrice: supplierPrice.cost
        // salePrice se recalcula automáticamente según margen
      },
      create: {
        priceListId: masterList.id,
        productId: product.id,
        costPrice: supplierPrice.cost
      }
    })
  }

  // 4. Las listas derivadas se actualizan automáticamente si tienen autoUpdate
}
```

---

## Roadmap de Implementación

### ✅ **Fase 1: Core MVP (2 semanas)**
- [ ] Schema completo de Prisma
- [ ] Migración de base de datos
- [ ] PriceListService básico
- [ ] Crear, listar, editar listas
- [ ] Agregar/editar items individualmente
- [ ] Cálculo de listas derivadas
- [ ] Testing básico

### 🎨 **Fase 2: Frontend Básico (1 semana)**
- [ ] Página de listas de precios
- [ ] Página de items (grid editable)
- [ ] Formulario de nueva lista
- [ ] Aplicación automática en ventas
- [ ] UI básica funcional

### 📊 **Fase 3: Actualización Masiva (1 semana)**
- [ ] Sistema de filtros
- [ ] Métodos de ajuste (%, fijo, margen)
- [ ] Preview antes de aplicar
- [ ] Reglas de redondeo
- [ ] Historial de cambios masivos
- [ ] UI de actualización masiva

### 📈 **Fase 4: Historial y Auditoría (3-4 días)**
- [ ] Registro automático de cambios
- [ ] Vista de historial
- [ ] Rollback de cambios
- [ ] Comparación de versiones
- [ ] Reportes de cambios

### 🚀 **Fase 5: Features Avanzadas (2 semanas)**
- [ ] Comparador de listas
- [ ] Alertas de márgenes bajos
- [ ] Importación masiva (CSV/Excel)
- [ ] Exportación
- [ ] Simulador de cambios
- [ ] Precios escalonados por cantidad

### 🔗 **Fase 6: Integraciones (1 semana)**
- [ ] Sincronización con proveedores
- [ ] Análisis de competencia
- [ ] APIs públicas
- [ ] Webhooks

---

## Resumen Ejecutivo

### Decisión de Arquitectura
**✅ Tabla separada `price_lists` + `price_list_items`**

### Tipos de Listas Soportadas
1. **MASTER** - Lista maestra con costos y márgenes
2. **DERIVED** - Calculadas desde otra lista
3. **INDEPENDENT** - Precios manuales independientes
4. **PROMOTIONAL** - Temporales con vigencia

### Características Clave
- ✅ Múltiples listas simultáneas
- ✅ Cálculo automático de listas derivadas
- ✅ Actualización masiva con filtros
- ✅ Historial completo de cambios
- ✅ Aplicación automática según prioridad
- ✅ Redondeo configurable
- ✅ Importación/exportación

### Estimación
- MVP básico: **2 semanas**
- Sistema completo: **6-8 semanas**

---

**Última actualización:** 2025-12-17
**Versión:** 1.0
**Estado:** Listo para implementación
