# Plan de Implementación: Sistema de Workflow de Comprobantes

## Concepto Central

Un **sistema de aplicación y encadenamiento de comprobantes** que permite:

1. **Relacionar comprobantes entre sí** (Presupuesto → Pedido → Remito → Factura)
2. **Cancelar cantidades parciales** de items (ej: facturar 50 de 100 unidades de un remito)
3. **Gestionar pendientes** (saber qué falta facturar de un remito)
4. **Workflows configurables por tenant** (cada negocio define su circuito)
5. **Validaciones automáticas** (no facturar más de lo remitado, etc.)

---

## Problema a Resolver

### Ejemplo Real:

**Cliente pide cotización:**
- Presupuesto PRE-001: 100 tornillos + 50 tuercas

**Cliente acepta:**
- Pedido PED-001 (aplicado sobre PRE-001): 80 tornillos + 50 tuercas

**Primera entrega:**
- Remito REM-001 (aplicado sobre PED-001): 50 tornillos + 30 tuercas

**Segunda entrega:**
- Remito REM-002 (aplicado sobre PED-001): 30 tornillos + 20 tuercas

**Facturación:**
- Factura FAC-001 (aplicada sobre REM-001 + REM-002): 80 tornillos + 50 tuercas

**Desafíos:**
1. Saber qué cantidad de cada item del pedido ya fue remitada
2. Saber qué cantidad de cada remito ya fue facturada
3. No permitir facturar más de lo remitado
4. No permitir remitir más de lo pedido
5. Poder consultar "pendientes de remitir" y "pendientes de facturar"

---

## Arquitectura Propuesta: Sistema de Aplicaciones

### Concepto: "DocumentApplication"

Cada vez que un comprobante se genera **en base a otro**, se crea un registro de **aplicación** que indica:
- Qué comprobante origen se está usando
- Qué comprobante destino se está generando
- Qué cantidades de cada item se están transfiriendo

```
Presupuesto (100 unidades)
    ↓ [Application: 80 unidades]
Pedido (80 unidades)
    ↓ [Application: 50 unidades]
Remito 1 (50 unidades)
    ↓ [Application: 30 unidades]
    ↓ [Application: 20 unidades]
Factura 1 (50 unidades)
```

---

## Schema de Base de Datos

### 1. Tabla Central: `document_applications`

```prisma
model DocumentApplication {
  id                String   @id @default(cuid())
  tenantId          String

  // Documento origen (el que se está "aplicando")
  sourceDocumentId   String
  sourceDocumentType DocumentType  // QUOTE, ORDER, DELIVERY_NOTE, INVOICE, etc.
  sourceDocument     Json          // Referencia polimórfica

  // Documento destino (el que se está "generando")
  targetDocumentId   String
  targetDocumentType DocumentType
  targetDocument     Json          // Referencia polimórfica

  // Cantidades aplicadas por item
  items             DocumentApplicationItem[]

  // Estado
  status            ApplicationStatus @default(ACTIVE)

  // Auditoría
  createdBy         String
  creator           User     @relation(fields: [createdBy], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([sourceDocumentId, sourceDocumentType])
  @@index([targetDocumentId, targetDocumentType])
  @@map("document_applications")
}

enum DocumentType {
  QUOTE           // Presupuesto
  ORDER           // Pedido
  DELIVERY_NOTE   // Remito
  INVOICE         // Factura
  CREDIT_NOTE     // Nota de Crédito
  DEBIT_NOTE      // Nota de Débito
  PURCHASE_ORDER  // Orden de Compra (futuro)
}

enum ApplicationStatus {
  ACTIVE          // Aplicación vigente
  CANCELLED       // Aplicación cancelada (si se anula el comprobante destino)
  REPLACED        // Reemplazada por otra aplicación
}

model DocumentApplicationItem {
  id                    String               @id @default(cuid())
  applicationId         String
  application           DocumentApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  // Item del documento origen
  sourceItemId          String
  sourceProductId       String?
  sourceProductName     String
  sourceQuantity        Decimal              @db.Decimal(15, 3) // Cantidad original en origen

  // Item del documento destino
  targetItemId          String?              // Puede ser null si aún no se creó el destino
  targetProductId       String?
  targetProductName     String?

  // Cantidad aplicada (transferida del origen al destino)
  appliedQuantity       Decimal              @db.Decimal(15, 3)

  // Metadata adicional
  unitPrice             Decimal?             @db.Decimal(15, 2)
  notes                 String?

  @@index([applicationId])
  @@index([sourceItemId])
  @@index([targetItemId])
  @@map("document_application_items")
}
```

### 2. Agregar campos a los modelos existentes

```prisma
// En Quote, CustomerOrder, DeliveryNote, Sale

model Quote {
  // ... campos existentes ...

  // Aplicaciones donde este documento es origen
  applicationsAsSource  DocumentApplication[]  @relation("QuoteAsSource")

  // Aplicaciones donde este documento es destino
  applicationsAsTarget  DocumentApplication[]  @relation("QuoteAsTarget")
}

model CustomerOrder {
  // ... campos existentes ...

  applicationsAsSource  DocumentApplication[]  @relation("OrderAsSource")
  applicationsAsTarget  DocumentApplication[]  @relation("OrderAsTarget")
}

model DeliveryNote {
  // ... campos existentes ...

  applicationsAsSource  DocumentApplication[]  @relation("DeliveryNoteAsSource")
  applicationsAsTarget  DocumentApplication[]  @relation("DeliveryNoteAsTarget")
}

model Sale {
  // ... campos existentes ...

  applicationsAsSource  DocumentApplication[]  @relation("SaleAsSource")
  applicationsAsTarget  DocumentApplication[]  @relation("SaleAsTarget")
}
```

**Problema:** Prisma no soporta bien relaciones polimórficas.

**Solución Alternativa:** Usar una tabla intermedia para cada tipo:

```prisma
model QuoteApplication {
  id                    String               @id @default(cuid())
  applicationId         String               @unique
  application           DocumentApplication  @relation(fields: [applicationId], references: [id])

  sourceQuoteId         String?
  sourceQuote           Quote?               @relation("QuoteAsSource", fields: [sourceQuoteId], references: [id])

  targetQuoteId         String?
  targetQuote           Quote?               @relation("QuoteAsTarget", fields: [targetQuoteId], references: [id])

  @@map("quote_applications")
}

// Repetir para OrderApplication, DeliveryNoteApplication, SaleApplication
```

---

## Alternativa Más Simple: Campos Directos

En lugar de usar una tabla polimórfica compleja, agregar campos directos en cada modelo:

```prisma
model CustomerOrder {
  id                String   @id @default(cuid())
  // ... otros campos ...

  // Relación con presupuesto origen
  originQuoteId     String?
  originQuote       Quote?   @relation("OrdersFromQuote", fields: [originQuoteId], references: [id])

  // Items aplicados desde el presupuesto
  itemApplications  Json?    // Array de { quoteItemId, orderItemId, appliedQuantity }
}

model DeliveryNote {
  id                String   @id @default(cuid())
  // ... otros campos ...

  // Relación con pedido origen
  originOrderId     String?
  originOrder       CustomerOrder? @relation("DeliveryNotesFromOrder", fields: [originOrderId], references: [id])

  // Items aplicados desde el pedido
  itemApplications  Json?    // Array de { orderItemId, deliveryItemId, appliedQuantity }
}

model Sale {
  id                   String   @id @default(cuid())
  // ... otros campos ...

  // Relación con remito origen (puede ser múltiple)
  originDeliveryNoteIds String[]  // Array de IDs

  // Items aplicados desde los remitos
  itemApplications     Json?     // Array de { deliveryNoteId, deliveryItemId, saleItemId, appliedQuantity }
}
```

**Ventaja:** Más simple, menos joins
**Desventaja:** Menos flexible, difícil de consultar aplicaciones complejas

---

## Solución Híbrida (RECOMENDADA)

Combinar ambas aproximaciones:

1. **Tabla central `document_applications`** para trazabilidad y consultas
2. **Campos directos** en cada modelo para acceso rápido

```prisma
model CustomerOrder {
  id                String   @id @default(cuid())
  tenantId          String
  orderNumber       String

  // ... otros campos del pedido ...

  // NUEVO: Relación directa con presupuesto
  baseQuoteId       String?  // Presupuesto del cual se generó este pedido
  baseQuote         Quote?   @relation(fields: [baseQuoteId], references: [id])

  // NUEVO: Tracking de cantidades
  items             CustomerOrderItem[]

  // Relaciones con aplicaciones (para trazabilidad completa)
  sourceApplications DocumentApplication[] @relation("OrderAsSource")
  targetApplications DocumentApplication[] @relation("OrderAsTarget")
}

model CustomerOrderItem {
  id                String        @id @default(cuid())
  orderId           String
  order             CustomerOrder @relation(fields: [orderId], references: [id])

  lineNumber        Int
  productId         String?
  productName       String
  description       String?

  // Cantidad original solicitada
  quantity          Decimal       @db.Decimal(15, 3)

  // NUEVO: Tracking de aplicaciones
  appliedQuantity   Decimal       @default(0) @db.Decimal(15, 3) // Cantidad ya "consumida" en otros comprobantes
  pendingQuantity   Decimal       @db.Decimal(15, 3) // Calculado: quantity - appliedQuantity

  // NUEVO: Referencia al item del presupuesto origen
  sourceQuoteItemId String?

  // Otros campos...
  unitPrice         Decimal       @db.Decimal(15, 2)
}
```

---

## Servicio de Aplicaciones

**Archivo:** `backend/src/services/documentApplicationService.ts`

```typescript
import { PrismaClient, DocumentType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AppError } from '../middleware/errorHandler.js'

interface ApplyDocumentInput {
  sourceDocumentType: DocumentType
  sourceDocumentId: string
  targetDocumentType: DocumentType
  items: Array<{
    sourceItemId: string
    quantity: number // Cantidad a aplicar
  }>
}

export class DocumentApplicationService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private userId: string
  ) {}

  /**
   * Validar que se puede aplicar un documento sobre otro
   */
  async validateApplication(input: ApplyDocumentInput) {
    const { sourceDocumentType, sourceDocumentId, targetDocumentType, items } = input

    // 1. Validar workflow permitido
    const allowedWorkflows = this.getAllowedWorkflows()
    const workflow = `${sourceDocumentType}->${targetDocumentType}`

    if (!allowedWorkflows.includes(workflow)) {
      throw new AppError(
        `Workflow no permitido: ${workflow}. Workflows válidos: ${allowedWorkflows.join(', ')}`,
        400
      )
    }

    // 2. Obtener documento origen con sus items
    const sourceDocument = await this.getDocument(sourceDocumentType, sourceDocumentId)

    if (!sourceDocument) {
      throw new AppError('Documento origen no encontrado', 404)
    }

    // 3. Validar cantidades disponibles de cada item
    const validationResults = []

    for (const itemInput of items) {
      const sourceItem = sourceDocument.items.find((i: any) => i.id === itemInput.sourceItemId)

      if (!sourceItem) {
        throw new AppError(`Item ${itemInput.sourceItemId} no encontrado en documento origen`, 404)
      }

      // Calcular cantidad pendiente (no aplicada aún)
      const appliedQty = await this.getAppliedQuantity(
        sourceDocumentType,
        sourceDocumentId,
        itemInput.sourceItemId
      )

      const pendingQty = new Decimal(sourceItem.quantity).sub(appliedQty)

      if (new Decimal(itemInput.quantity).gt(pendingQty)) {
        throw new AppError(
          `Cantidad solicitada (${itemInput.quantity}) excede la cantidad pendiente (${pendingQty}) para el item ${sourceItem.productName}`,
          400
        )
      }

      validationResults.push({
        sourceItemId: itemInput.sourceItemId,
        productName: sourceItem.productName,
        requestedQuantity: itemInput.quantity,
        availableQuantity: pendingQty.toNumber(),
        valid: true
      })
    }

    return {
      valid: true,
      sourceDocument,
      validationResults
    }
  }

  /**
   * Crear aplicación de documento
   */
  async createApplication(input: ApplyDocumentInput, targetDocumentId: string) {
    const validation = await this.validateApplication(input)

    const application = await this.prisma.documentApplication.create({
      data: {
        tenantId: this.tenantId,
        sourceDocumentType: input.sourceDocumentType,
        sourceDocumentId: input.sourceDocumentId,
        targetDocumentType: input.targetDocumentType,
        targetDocumentId: targetDocumentId,
        status: 'ACTIVE',
        createdBy: this.userId,
        items: {
          create: input.items.map(item => {
            const sourceItem = validation.sourceDocument.items.find(
              (i: any) => i.id === item.sourceItemId
            )

            return {
              sourceItemId: item.sourceItemId,
              sourceProductId: sourceItem.productId,
              sourceProductName: sourceItem.productName,
              sourceQuantity: sourceItem.quantity,
              appliedQuantity: new Decimal(item.quantity),
              unitPrice: sourceItem.unitPrice
            }
          })
        }
      },
      include: {
        items: true
      }
    })

    return application
  }

  /**
   * Obtener cantidad ya aplicada de un item
   */
  async getAppliedQuantity(
    documentType: DocumentType,
    documentId: string,
    itemId: string
  ): Promise<Decimal> {
    const applications = await this.prisma.documentApplication.findMany({
      where: {
        sourceDocumentType: documentType,
        sourceDocumentId: documentId,
        status: 'ACTIVE'
      },
      include: {
        items: {
          where: {
            sourceItemId: itemId
          }
        }
      }
    })

    let totalApplied = new Decimal(0)

    for (const app of applications) {
      for (const item of app.items) {
        totalApplied = totalApplied.add(item.appliedQuantity)
      }
    }

    return totalApplied
  }

  /**
   * Obtener cantidades pendientes de un documento
   */
  async getPendingQuantities(documentType: DocumentType, documentId: string) {
    const document = await this.getDocument(documentType, documentId)

    if (!document) {
      throw new AppError('Documento no encontrado', 404)
    }

    const pendingItems = []

    for (const item of document.items) {
      const appliedQty = await this.getAppliedQuantity(documentType, documentId, item.id)
      const pendingQty = new Decimal(item.quantity).sub(appliedQty)

      if (pendingQty.gt(0)) {
        pendingItems.push({
          itemId: item.id,
          productId: item.productId,
          productName: item.productName,
          originalQuantity: Number(item.quantity),
          appliedQuantity: appliedQty.toNumber(),
          pendingQuantity: pendingQty.toNumber(),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null
        })
      }
    }

    return {
      documentType,
      documentId,
      documentNumber: document.number,
      totalItems: document.items.length,
      pendingItems,
      hasPending: pendingItems.length > 0,
      fullyApplied: pendingItems.length === 0
    }
  }

  /**
   * Obtener documento según tipo
   */
  private async getDocument(type: DocumentType, id: string) {
    switch (type) {
      case 'QUOTE':
        return await this.prisma.quote.findFirst({
          where: { id, tenantId: this.tenantId },
          include: { items: true }
        })

      case 'ORDER':
        return await this.prisma.customerOrder.findFirst({
          where: { id, tenantId: this.tenantId },
          include: { items: true }
        })

      case 'DELIVERY_NOTE':
        return await this.prisma.deliveryNote.findFirst({
          where: { id, tenantId: this.tenantId },
          include: { items: true }
        })

      case 'INVOICE':
        return await this.prisma.sale.findFirst({
          where: { id, tenantId: this.tenantId },
          include: { items: true }
        })

      default:
        throw new AppError(`Tipo de documento no soportado: ${type}`, 400)
    }
  }

  /**
   * Obtener workflows permitidos (configurables por tenant en el futuro)
   */
  private getAllowedWorkflows(): string[] {
    // TODO: Leer desde configuración del tenant
    return [
      'QUOTE->ORDER',           // Presupuesto → Pedido
      'QUOTE->INVOICE',         // Presupuesto → Factura (directo)
      'ORDER->DELIVERY_NOTE',   // Pedido → Remito
      'ORDER->INVOICE',         // Pedido → Factura (directo)
      'DELIVERY_NOTE->INVOICE', // Remito → Factura
      'INVOICE->CREDIT_NOTE',   // Factura → Nota de Crédito
      'INVOICE->DEBIT_NOTE'     // Factura → Nota de Débito
    ]
  }

  /**
   * Obtener cadena completa de comprobantes relacionados
   */
  async getDocumentChain(documentType: DocumentType, documentId: string) {
    const chain = []

    // Buscar hacia atrás (documentos origen)
    let currentType = documentType
    let currentId = documentId

    while (currentId) {
      const application = await this.prisma.documentApplication.findFirst({
        where: {
          targetDocumentType: currentType,
          targetDocumentId: currentId,
          status: 'ACTIVE'
        },
        include: {
          items: true
        }
      })

      if (!application) break

      const sourceDoc = await this.getDocument(
        application.sourceDocumentType,
        application.sourceDocumentId
      )

      chain.unshift({
        type: application.sourceDocumentType,
        id: application.sourceDocumentId,
        number: sourceDoc.number,
        document: sourceDoc,
        application: application
      })

      currentType = application.sourceDocumentType
      currentId = application.sourceDocumentId
    }

    // Agregar documento actual
    const currentDoc = await this.getDocument(documentType, documentId)
    chain.push({
      type: documentType,
      id: documentId,
      number: currentDoc.number,
      document: currentDoc,
      application: null
    })

    // Buscar hacia adelante (documentos destino)
    currentType = documentType
    currentId = documentId

    while (currentId) {
      const application = await this.prisma.documentApplication.findFirst({
        where: {
          sourceDocumentType: currentType,
          sourceDocumentId: currentId,
          status: 'ACTIVE'
        },
        include: {
          items: true
        }
      })

      if (!application) break

      const targetDoc = await this.getDocument(
        application.targetDocumentType,
        application.targetDocumentId
      )

      chain.push({
        type: application.targetDocumentType,
        id: application.targetDocumentId,
        number: targetDoc.number,
        document: targetDoc,
        application: application
      })

      currentType = application.targetDocumentType
      currentId = application.targetDocumentId
    }

    return chain
  }
}
```

---

## Configuración de Workflows por Tenant

**Archivo:** `backend/prisma/schema.prisma`

```prisma
model TenantWorkflowConfig {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Workflow permitido (ej: "QUOTE->ORDER")
  workflow        String   // "SOURCE_TYPE->TARGET_TYPE"

  // Configuración
  enabled         Boolean  @default(true)
  required        Boolean  @default(false) // Si es obligatorio pasar por este paso
  autoCreate      Boolean  @default(false) // Si se crea automáticamente al aprobar el origen

  // Validaciones
  requireFullQuantity Boolean @default(false) // Requiere aplicar toda la cantidad
  allowPartial        Boolean @default(true)  // Permite aplicaciones parciales
  allowMultiple       Boolean @default(true)  // Permite múltiples destinos desde un origen

  // Metadata
  displayName     String?  // Nombre para mostrar en UI
  description     String?
  order           Int      @default(0) // Orden en el que aparece en la UI

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([tenantId, workflow])
  @@index([tenantId])
  @@map("tenant_workflow_configs")
}
```

### Configuración por Defecto (Seed)

```typescript
// Ejemplo de configuración para un tenant
const defaultWorkflows = [
  {
    workflow: 'QUOTE->ORDER',
    enabled: true,
    required: false,
    displayName: 'Presupuesto → Pedido',
    order: 1
  },
  {
    workflow: 'QUOTE->INVOICE',
    enabled: true,
    required: false,
    displayName: 'Presupuesto → Factura (directo)',
    order: 2
  },
  {
    workflow: 'ORDER->DELIVERY_NOTE',
    enabled: true,
    required: false,
    displayName: 'Pedido → Remito',
    order: 3
  },
  {
    workflow: 'ORDER->INVOICE',
    enabled: true,
    required: false,
    displayName: 'Pedido → Factura (sin remito)',
    order: 4
  },
  {
    workflow: 'DELIVERY_NOTE->INVOICE',
    enabled: true,
    required: true, // En Argentina, si hay remito debe facturarse
    displayName: 'Remito → Factura',
    order: 5
  }
]
```

---

## UI/UX - Experiencia de Usuario

### 1. Vista de Lista con Indicadores

```
┌─────────────────────────────────────────────────────────────┐
│ Pedidos                                     + Nuevo Pedido  │
├─────────────────────────────────────────────────────────────┤
│ PED-001  │ Juan Pérez    │ $12,500  │ ⚠️ Pendiente        │
│          │ 15/12/2025    │          │ 80% remitado        │
│          │ 🔗 PRE-001    │          │ 0% facturado        │
├─────────────────────────────────────────────────────────────┤
│ PED-002  │ María López   │ $8,300   │ ✅ Completado       │
│          │ 14/12/2025    │          │ 100% remitado       │
│          │ 🔗 PRE-002    │          │ 100% facturado      │
└─────────────────────────────────────────────────────────────┘
```

### 2. Vista de Detalle con Cadena de Comprobantes

```
┌─────────────────────────────────────────────────────────────┐
│ Pedido PED-001                                    [Editar]  │
├─────────────────────────────────────────────────────────────┤
│ 📋 Cadena de Comprobantes                                   │
│                                                             │
│  PRE-001 (Presupuesto)                                     │
│      ↓ Aplicado: 80 tornillos, 50 tuercas                 │
│  PED-001 (Este Pedido) ← ESTÁS AQUÍ                        │
│      ↓ Aplicado: 50 tornillos, 30 tuercas                 │
│  REM-001 (Remito)                                          │
│      ↓ Aplicado: 50 tornillos, 30 tuercas                 │
│  FAC-001 (Factura)                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📦 Items del Pedido                                         │
│                                                             │
│ Tornillo M8 x 50mm                                         │
│   Cantidad: 80 unidades                                    │
│   Remitado: 50 unidades (62.5%) 🟡                         │
│   Pendiente: 30 unidades                                   │
│   [🚚 Crear Remito Pendiente]                              │
│                                                             │
│ Tuerca M8                                                  │
│   Cantidad: 50 unidades                                    │
│   Remitado: 30 unidades (60%) 🟡                           │
│   Pendiente: 20 unidades                                   │
│   [🚚 Crear Remito Pendiente]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Modal de "Crear Comprobante Desde..."

```
┌─────────────────────────────────────────────────────────────┐
│ Crear Remito desde Pedido PED-001              [✕ Cerrar]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Selecciona los items y cantidades a remitir:               │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ☑ Tornillo M8 x 50mm                                │   │
│ │   Pendiente: 30 unidades                            │   │
│ │   Remitir: [30] unidades  [Todo] [Parcial]         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ☑ Tuerca M8                                         │   │
│ │   Pendiente: 20 unidades                            │   │
│ │   Remitir: [20] unidades  [Todo] [Parcial]         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Datos adicionales:                                          │
│ Depósito: [Depósito Principal ▼]                           │
│ Chofer: [________________]                                  │
│ Vehículo: [________________]                                │
│                                                             │
│               [Cancelar]  [Crear Remito REM-003]           │
└─────────────────────────────────────────────────────────────┘
```

### 4. Dashboard de Pendientes

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Pendientes de Gestión                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📋 Presupuestos Pendientes de Convertir: 8                 │
│ 📦 Pedidos Pendientes de Remitir: 5                        │
│ 🚚 Remitos Pendientes de Facturar: 12                      │
│ 💰 Facturas Pendientes de Cobrar: 23                       │
│                                                             │
│ ⚠️ Alertas:                                                 │
│ • PED-015: Fecha de entrega vencida (3 días)              │
│ • REM-042: En tránsito hace 7 días                        │
│ • FAC-089: Vencimiento de pago en 2 días                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Obtener pendientes de un documento
GET /api/:tenant/documents/:type/:id/pending
Response: {
  documentType: 'ORDER',
  documentId: 'xxx',
  documentNumber: 'PED-001',
  pendingItems: [
    {
      itemId: 'yyy',
      productName: 'Tornillo M8',
      originalQuantity: 80,
      appliedQuantity: 50,
      pendingQuantity: 30,
      unitPrice: 15.50
    }
  ],
  hasPending: true,
  fullyApplied: false
}

// Crear documento aplicando sobre otro
POST /api/:tenant/documents/apply
Body: {
  sourceDocumentType: 'ORDER',
  sourceDocumentId: 'xxx',
  targetDocumentType: 'DELIVERY_NOTE',
  items: [
    { sourceItemId: 'yyy', quantity: 30 },
    { sourceItemId: 'zzz', quantity: 20 }
  ],
  // ... datos adicionales del documento destino
}

// Obtener cadena de comprobantes
GET /api/:tenant/documents/:type/:id/chain
Response: [
  {
    type: 'QUOTE',
    id: 'aaa',
    number: 'PRE-001',
    document: { ... },
    application: null
  },
  {
    type: 'ORDER',
    id: 'bbb',
    number: 'PED-001',
    document: { ... },
    application: { ... }
  },
  {
    type: 'DELIVERY_NOTE',
    id: 'ccc',
    number: 'REM-001',
    document: { ... },
    application: { ... }
  }
]

// Obtener configuración de workflows del tenant
GET /api/:tenant/workflows/config
Response: [
  {
    workflow: 'QUOTE->ORDER',
    enabled: true,
    required: false,
    displayName: 'Presupuesto → Pedido',
    order: 1
  },
  // ...
]

// Actualizar configuración de workflow
PUT /api/:tenant/workflows/config/:workflow
Body: {
  enabled: true,
  required: false,
  allowPartial: true
}
```

---

## Casos de Uso Avanzados

### Caso 1: Factura desde Múltiples Remitos

```typescript
// Cliente tiene 3 remitos pendientes de facturar
// Quiere facturar todo junto

POST /api/:tenant/sales/create-from-delivery-notes
Body: {
  deliveryNoteIds: ['REM-001', 'REM-002', 'REM-003'],
  customerId: 'xxx',
  paymentMethodId: 'yyy',
  // Se creará una factura con todos los items de los 3 remitos
}
```

### Caso 2: Remito Parcial desde Pedido

```typescript
// Pedido de 100 unidades
// Primera entrega: 60 unidades
// Segunda entrega: 40 unidades

// Primera entrega
POST /api/:tenant/delivery-notes/create-from-order
Body: {
  orderId: 'PED-001',
  items: [
    { orderItemId: 'xxx', quantity: 60 } // Solo 60 de 100
  ]
}
// Genera REM-001

// Segunda entrega (automáticamente sabe que quedan 40 pendientes)
POST /api/:tenant/delivery-notes/create-from-order
Body: {
  orderId: 'PED-001',
  items: [
    { orderItemId: 'xxx', quantity: 40 } // Los 40 restantes
  ]
}
// Genera REM-002
```

### Caso 3: Devolución con Nota de Crédito

```typescript
// Cliente devuelve 10 unidades de una factura de 50

POST /api/:tenant/credit-notes/create-from-invoice
Body: {
  invoiceId: 'FAC-001',
  items: [
    { invoiceItemId: 'xxx', quantity: 10 } // Devolver 10
  ],
  reason: 'Producto defectuoso'
}

// La NC se aplica automáticamente sobre la factura
// Queda pendiente de aplicar: 40 unidades
```

---

## Reportes y Consultas

### Reporte de Pendientes por Cliente

```sql
-- Items pendientes de facturar por cliente
SELECT
  c.name AS cliente,
  dn.delivery_number AS remito,
  dni.product_name AS producto,
  dni.delivered_quantity AS remitado,
  COALESCE(SUM(dai.applied_quantity), 0) AS facturado,
  dni.delivered_quantity - COALESCE(SUM(dai.applied_quantity), 0) AS pendiente
FROM delivery_notes dn
JOIN delivery_note_items dni ON dni.delivery_note_id = dn.id
JOIN entities c ON c.id = dn.customer_id
LEFT JOIN document_applications da ON da.source_document_id = dn.id
  AND da.source_document_type = 'DELIVERY_NOTE'
  AND da.target_document_type = 'INVOICE'
  AND da.status = 'ACTIVE'
LEFT JOIN document_application_items dai ON dai.application_id = da.id
WHERE dn.status = 'DELIVERED'
GROUP BY c.id, dn.id, dni.id
HAVING (dni.delivered_quantity - COALESCE(SUM(dai.applied_quantity), 0)) > 0
ORDER BY c.name, dn.delivery_date;
```

### Reporte de Eficiencia de Workflow

```sql
-- Tiempo promedio entre cada etapa
SELECT
  AVG(EXTRACT(EPOCH FROM (order_date - quote_date)) / 86400) AS dias_presupuesto_a_pedido,
  AVG(EXTRACT(EPOCH FROM (delivery_date - order_date)) / 86400) AS dias_pedido_a_remito,
  AVG(EXTRACT(EPOCH FROM (invoice_date - delivery_date)) / 86400) AS dias_remito_a_factura
FROM (
  SELECT
    q.quote_date,
    o.order_date,
    dn.delivery_date,
    s.sale_date AS invoice_date
  FROM quotes q
  JOIN customer_orders o ON o.base_quote_id = q.id
  JOIN delivery_notes dn ON dn.origin_order_id = o.id
  JOIN sales s ON s.origin_delivery_note_ids @> ARRAY[dn.id]
  WHERE q.created_at > NOW() - INTERVAL '3 months'
) AS workflow_times;
```

---

## Validaciones y Reglas de Negocio

### Reglas Automáticas

1. **No sobre-aplicar**: No se puede aplicar más cantidad de la disponible
2. **Productos coincidentes**: Solo se pueden aplicar items del mismo producto
3. **Cliente coincidente**: El cliente debe ser el mismo en toda la cadena
4. **Estado válido**: Solo se pueden aplicar documentos en estado válido (no cancelados)
5. **Workflow permitido**: Solo workflows configurados como permitidos

### Validaciones Configurables (por tenant)

```typescript
{
  "DELIVERY_NOTE->INVOICE": {
    "requireCAE": true,              // Remito debe tener CAE antes de facturar
    "requireFullDelivery": false,    // No requiere que todo esté entregado
    "maxDaysBetween": 30,            // Máximo 30 días entre remito y factura
    "requireSameCustomer": true,     // Cliente debe coincidir
    "allowPartialInvoicing": true    // Permite facturar parcialmente
  }
}
```

---

## Plan de Implementación

### Fase 1: Fundamentos (Semana 1-2)
- [ ] Crear tabla `document_applications` y `document_application_items`
- [ ] Crear `DocumentApplicationService`
- [ ] Implementar métodos básicos: validate, create, getPending
- [ ] Tests unitarios del servicio

### Fase 2: Integración con Comprobantes Existentes (Semana 3)
- [ ] Modificar `CustomerOrderService` para soportar `baseQuoteId`
- [ ] Modificar `DeliveryNoteService` para soportar `originOrderId`
- [ ] Modificar `SalesService` para soportar múltiples `originDeliveryNoteIds`
- [ ] Agregar campos `appliedQuantity` y `pendingQuantity` a items

### Fase 3: API y Endpoints (Semana 4)
- [ ] Crear rutas `/documents/apply`
- [ ] Crear rutas `/documents/:type/:id/pending`
- [ ] Crear rutas `/documents/:type/:id/chain`
- [ ] Crear rutas `/workflows/config`

### Fase 4: UI Básica (Semana 5-6)
- [ ] Indicadores de pendientes en listas
- [ ] Modal "Crear desde..." con selector de items
- [ ] Vista de cadena de comprobantes
- [ ] Página de configuración de workflows

### Fase 5: Workflows Configurables (Semana 7)
- [ ] Tabla `TenantWorkflowConfig`
- [ ] UI de configuración por tenant
- [ ] Validaciones dinámicas según configuración
- [ ] Reglas de negocio configurables

### Fase 6: Reportes y Optimizaciones (Semana 8)
- [ ] Dashboard de pendientes
- [ ] Reportes de eficiencia
- [ ] Alertas automáticas
- [ ] Índices y optimizaciones de consultas

---

## Estimación Total

**Desarrollo completo:** 8-10 semanas (con 1 desarrollador)

**MVP (solo Fases 1-3):** 3-4 semanas

---

## Consideraciones Técnicas

### Performance

1. **Índices necesarios:**
```sql
CREATE INDEX idx_doc_apps_source ON document_applications(source_document_type, source_document_id, status);
CREATE INDEX idx_doc_apps_target ON document_applications(target_document_type, target_document_id, status);
CREATE INDEX idx_doc_app_items_source ON document_application_items(source_item_id);
```

2. **Caché de cantidades pendientes:**
```typescript
// Guardar cantidades pendientes desnormalizadas para evitar cálculos
model CustomerOrderItem {
  // ...
  pendingQuantityCache Decimal @db.Decimal(15, 3)
  lastCacheUpdate DateTime
}
```

3. **Consultas optimizadas:**
```typescript
// Usar proyecciones para traer solo campos necesarios
const pendingItems = await prisma.customerOrderItem.findMany({
  where: { orderId },
  select: {
    id: true,
    productName: true,
    quantity: true,
    pendingQuantityCache: true
  }
})
```

### Escalabilidad

- Usar transacciones para operaciones críticas
- Implementar locks optimistas para evitar race conditions
- Considerar event sourcing para auditoría completa
- Queue para procesamiento asíncrono de aplicaciones masivas

---

## Alternativas y Trade-offs

### Opción A: Sistema Rígido (más simple)
**Pro:** Menos complejidad, más rápido de implementar
**Con:** Menos flexible, cada tenant igual

### Opción B: Sistema Configurable (RECOMENDADA)
**Pro:** Cada tenant puede definir su workflow
**Con:** Más complejo de implementar y mantener

### Opción C: Sistema de Eventos
**Pro:** Totalmente desacoplado, auditoría completa
**Con:** Complejidad muy alta, overkill para mayoría de casos

---

## Preguntas Abiertas para Discutir

1. ¿Los workflows deben ser configurables por tenant desde el inicio o empezamos con workflows fijos?
2. ¿Necesitamos soportar "aplicaciones cruzadas" (ej: un remito que aplica sobre 2 pedidos diferentes)?
3. ¿Cómo manejamos cambios de precio entre presupuesto y factura?
4. ¿Permitimos editar/eliminar aplicaciones ya creadas?
5. ¿Necesitamos versioning de documentos cuando se modifica un origen que ya tiene destinos?
6. ¿Implementamos aprobaciones multi-nivel (ej: supervisor debe aprobar antes de facturar)?

---

**Última actualización:** 2025-12-16
**Estado:** Borrador para revisión
