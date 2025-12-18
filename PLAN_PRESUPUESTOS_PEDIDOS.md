# Plan de Implementación: Presupuestos y Pedidos

## Diagrama de Flujos

```
┌─────────────────┐
│  PRESUPUESTO    │  (Quote)
│  PRE-00001      │
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          │
         │ Aceptado + Pago         │ Aceptado + Requiere preparación
         │ inmediato               │
         ↓                          ↓
┌─────────────────┐        ┌─────────────────┐
│     VENTA       │        │     PEDIDO      │  (CustomerOrder)
│  (Sale)         │        │  PED-00001      │
│  + Factura      │        └────────┬────────┘
│  + Pago         │                 │
│  + CAE (si AFC) │                 │ Estados operativos:
└─────────────────┘                 │ PENDING → CONFIRMED
                                    │ → PROCESSING → READY
                                    │ → DELIVERED
                                    │
                                    │ Cuando se factura
                                    ↓
                            ┌─────────────────┐
                            │     VENTA       │
                            │  (Sale)         │
                            │  + Factura      │
                            │  + Pago         │
                            └─────────────────┘
```

**Flujos soportados:**
1. **Presupuesto → Venta** (directo, sin pedido intermedio)
2. **Presupuesto → Pedido → Venta** (con preparación/reserva)
3. **Pedido → Venta** (sin presupuesto previo)

---

## Decisión Arquitectónica: Tablas Separadas

Se decidió implementar **tablas separadas** (`quotes` y `customer_orders`) en lugar de usar la tabla `sales` existente.

### Razones:
1. **Claridad conceptual**: Presupuestos y pedidos NO son ventas
2. **Ciclo de vida diferente**: Estados, validaciones y flujos propios
3. **Performance**: No contaminar tabla de ventas con datos temporales
4. **Mantenibilidad**: Código más limpio sin condicionales complejos
5. **Flexibilidad**: Campos y lógica específica para cada entidad

---

## Fase 1: Presupuestos (Quotes)

### 1.1. Schema de Base de Datos

**Archivo:** `backend/prisma/schema.prisma`

```prisma
model Quote {
  id                String      @id @default(cuid())
  tenantId          String
  quoteNumber       String      // PRE-00001
  quoteDate         DateTime    @default(now())
  validUntil        DateTime?   // Fecha de vencimiento del presupuesto

  // Cliente
  customerId        String?
  customer          Entity?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  customerName      String      // Denormalizado para histórico

  // Montos
  subtotal          Decimal     @db.Decimal(15, 2)
  discountAmount    Decimal     @default(0) @db.Decimal(15, 2)
  discountPercent   Decimal     @default(0) @db.Decimal(5, 2)
  taxAmount         Decimal     @default(0) @db.Decimal(15, 2)
  totalAmount       Decimal     @db.Decimal(15, 2)

  // Datos adicionales
  notes             String?     @db.Text
  termsAndConditions String?   @db.Text
  internalNotes     String?     @db.Text  // Notas internas no visibles en PDF

  // Estado
  status            QuoteStatus @default(PENDING)

  // Conversión (ya no es @unique porque puede haber múltiples conversiones parciales)
  convertedToSales   Sale[]
  convertedToOrders  CustomerOrder[]

  // Relaciones
  tenant            Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  items             QuoteItem[]

  // Auditoría
  createdBy         String
  creator           User        @relation(fields: [createdBy], references: [id])
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@unique([tenantId, quoteNumber])
  @@index([tenantId])
  @@index([customerId])
  @@index([status])
  @@index([quoteDate])
  @@map("quotes")
}

enum QuoteStatus {
  PENDING               // Pendiente de respuesta del cliente
  APPROVED              // Cliente aprobó
  REJECTED              // Cliente rechazó
  EXPIRED               // Venció la validez
  PARTIALLY_CONVERTED   // Conversión parcial en progreso
  FULLY_CONVERTED       // Totalmente convertido
  CANCELLED             // Cancelado por el negocio
}

model QuoteItem {
  id              String   @id @default(cuid())
  quoteId         String
  quote           Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  lineNumber      Int

  // Producto
  productId       String?
  product         Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  productSku      String?
  productName     String
  description     String?  @db.Text

  // Cantidades y precios
  quantity        Decimal  @db.Decimal(15, 3)
  unitPrice       Decimal  @db.Decimal(15, 2)

  // Control de conversión parcial
  quantityConverted Decimal @default(0) @db.Decimal(15, 3)  // Cantidad ya convertida a pedidos/ventas
  quantityPending   Decimal @db.Decimal(15, 3)             // Calculado: quantity - quantityConverted

  // Descuentos
  discountPercent Decimal  @default(0) @db.Decimal(5, 2)
  discountAmount  Decimal  @default(0) @db.Decimal(15, 2)

  // Impuestos
  taxRate         Decimal  @default(0) @db.Decimal(5, 2)
  taxAmount       Decimal  @default(0) @db.Decimal(15, 2)

  // Totales
  subtotal        Decimal  @db.Decimal(15, 2)  // quantity * unitPrice
  lineTotal       Decimal  @db.Decimal(15, 2)  // subtotal - discount + tax

  @@index([quoteId])
  @@map("quote_items")
}
```

**Migración:**
```bash
cd backend
npx prisma migrate dev --name add_quotes_table
```

---

### 1.2. Backend - Servicio de Presupuestos

**Archivo:** `backend/src/services/quoteService.ts`

```typescript
import { PrismaClient, Prisma, QuoteStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateSaleItem,
  calculateSaleTotals,
  SaleItemResult
} from '../utils/calculationService.js'
import { AppError } from '../middleware/errorHandler.js'

interface CreateQuoteItemInput {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
  description?: string
}

interface CreateQuoteInput {
  customerId?: string
  items: CreateQuoteItemInput[]
  notes?: string
  termsAndConditions?: string
  internalNotes?: string
  validUntil?: string  // ISO date string
  discountPercent?: number
}

export class QuoteService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private userId: string
  ) {}

  /**
   * Crear presupuesto (sin pagos, sin afectar stock)
   */
  async createQuote(data: CreateQuoteInput) {
    const {
      customerId,
      items: itemsInput,
      notes,
      termsAndConditions,
      internalNotes,
      validUntil,
      discountPercent = 0
    } = data

    // 1. Obtener tenant y configuración
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantId },
      include: { tenantVatCondition: true }
    })

    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404)
    }

    // 2. Obtener datos del cliente
    let customer = null
    let customerName = 'Consumidor Final'

    if (customerId) {
      customer = await this.prisma.entity.findFirst({
        where: {
          id: customerId,
          tenantId: this.tenantId,
          isActive: true,
          isCustomer: true
        }
      })

      if (!customer) {
        throw new AppError('Cliente no encontrado', 404)
      }

      customerName = customer.name
    }

    // 3. Determinar si discrimina IVA (según condición del tenant)
    const customerVatCondition = customer?.ivaCondition
    const discriminateVAT = customerVatCondition === 'RI' // Responsable Inscripto

    // 4. Procesar items (sin validar stock)
    const processedItems: Array<{
      product: any
      input: CreateQuoteItemInput
      calculation: SaleItemResult
    }> = []

    const defaultTaxRate = tenant.tenantVatCondition?.taxRate || new Decimal(21)

    for (const itemInput of itemsInput) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: itemInput.productId,
          tenantId: this.tenantId,
          isActive: true
        }
      })

      if (!product) {
        throw new AppError(`Producto ${itemInput.productId} no encontrado`, 404)
      }

      const unitPrice = itemInput.unitPrice !== undefined
        ? new Decimal(itemInput.unitPrice)
        : product.salePrice

      const taxRate = itemInput.taxRate !== undefined
        ? new Decimal(itemInput.taxRate)
        : defaultTaxRate

      const calculation = calculateSaleItem({
        quantity: new Decimal(itemInput.quantity),
        unitPrice,
        discountPercent: new Decimal(itemInput.discountPercent || 0),
        taxRate,
        discriminateVAT,
        unitCost: product.costPrice
      })

      processedItems.push({
        product,
        input: itemInput,
        calculation
      })
    }

    // 5. Calcular totales
    const totals = calculateSaleTotals(
      processedItems.map(item => item.calculation)
    )

    // 6. Generar número de presupuesto
    const quoteNumber = await this.generateQuoteNumber()

    // 7. Crear presupuesto en base de datos
    const quote = await this.prisma.quote.create({
      data: {
        tenantId: this.tenantId,
        quoteNumber,
        quoteDate: new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        customerId: customerId || null,
        customerName,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountPercent: new Decimal(discountPercent),
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes,
        termsAndConditions,
        internalNotes,
        status: 'PENDING',
        createdBy: this.userId,
        items: {
          create: processedItems.map((item, index) => ({
            lineNumber: index + 1,
            productId: item.product.id,
            productSku: item.product.sku,
            productName: item.product.name,
            description: item.input.description || item.product.description,
            quantity: new Decimal(item.input.quantity),
            unitPrice: item.input.unitPrice !== undefined
              ? new Decimal(item.input.unitPrice)
              : item.product.salePrice,
            discountPercent: new Decimal(item.input.discountPercent || 0),
            discountAmount: item.calculation.discountAmount,
            taxRate: item.input.taxRate !== undefined
              ? new Decimal(item.input.taxRate)
              : defaultTaxRate,
            taxAmount: item.calculation.taxAmount,
            subtotal: item.calculation.subtotal,
            lineTotal: item.calculation.lineTotal
          }))
        }
      },
      include: {
        items: true,
        customer: true
      }
    })

    return quote
  }

  /**
   * Generar número de presupuesto secuencial
   */
  private async generateQuoteNumber(): Promise<string> {
    const lastQuote = await this.prisma.quote.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { quoteNumber: 'desc' }
    })

    if (!lastQuote) {
      return 'PRE-00000001'
    }

    const match = lastQuote.quoteNumber.match(/PRE-(\d{8})/)
    if (match) {
      const num = parseInt(match[1]) + 1
      return `PRE-${num.toString().padStart(8, '0')}`
    }

    return 'PRE-00000001'
  }

  /**
   * Obtener datos pendientes para convertir presupuesto a venta
   * Retorna solo items con cantidad pendiente > 0
   */
  async getDataForSaleConversion(quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        tenantId: this.tenantId
      },
      include: {
        items: true,
        customer: true
      }
    })

    if (!quote) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    if (quote.status === 'FULLY_CONVERTED') {
      throw new AppError('Este presupuesto ya fue totalmente convertido', 400)
    }

    if (quote.status === 'CANCELLED') {
      throw new AppError('No se puede convertir un presupuesto cancelado', 400)
    }

    // Filtrar solo items con cantidad pendiente
    const itemsWithPending = quote.items
      .map(item => {
        const quantityPending = Number(item.quantity) - Number(item.quantityConverted)
        return {
          ...item,
          quantityPending
        }
      })
      .filter(item => item.quantityPending > 0)

    // Retornar datos para que el frontend abra el formulario de venta
    return {
      quoteId: quote.id,
      customerId: quote.customerId,
      items: itemsWithPending.map(item => ({
        quoteItemId: item.id,
        productId: item.productId!,
        productName: item.productName,
        quantity: item.quantityPending,  // Por defecto toda la cantidad pendiente
        maxQuantity: item.quantityPending,  // Límite máximo
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxRate: Number(item.taxRate),
        description: item.description
      })),
      notes: quote.notes
    }
  }

  /**
   * Registrar conversión de presupuesto a venta (después de crear la venta)
   * Actualiza las cantidades convertidas
   */
  async recordSaleConversion(quoteId: string, itemsConverted: Array<{
    quoteItemId: string
    quantityConverted: number
  }>) {
    // Actualizar quantityConverted en cada item
    for (const item of itemsConverted) {
      const quoteItem = await this.prisma.quoteItem.findUnique({
        where: { id: item.quoteItemId }
      })

      if (!quoteItem) continue

      const quantityPending = Number(quoteItem.quantity) - Number(quoteItem.quantityConverted)
      if (item.quantityConverted > quantityPending) {
        throw new AppError(
          `Cantidad convertida (${item.quantityConverted}) supera la pendiente (${quantityPending})`,
          400
        )
      }

      await this.prisma.quoteItem.update({
        where: { id: item.quoteItemId },
        data: {
          quantityConverted: {
            increment: new Decimal(item.quantityConverted)
          }
        }
      })
    }

    // Actualizar estado del presupuesto
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId },
      include: { items: true }
    })

    const allFullyConverted = quote!.items.every(item =>
      Number(item.quantity) === Number(item.quantityConverted)
    )

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: allFullyConverted ? 'FULLY_CONVERTED' : 'PARTIALLY_CONVERTED'
      }
    })
  }


  /**
   * Listar presupuestos con filtros
   */
  async listQuotes(filters: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
    customerId?: string
    status?: QuoteStatus
    search?: string
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    const {
      page = 1,
      limit = 50,
      dateFrom,
      dateTo,
      customerId,
      status,
      search,
      orderBy = 'quoteDate',
      orderDirection = 'desc'
    } = filters

    const skip = (page - 1) * limit
    const take = limit

    const where: Prisma.QuoteWhereInput = {
      tenantId: this.tenantId
    }

    if (dateFrom || dateTo) {
      where.quoteDate = {}
      if (dateFrom) where.quoteDate.gte = new Date(dateFrom)
      if (dateTo) where.quoteDate.lte = new Date(dateTo)
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const orderByClause: any = {}
    orderByClause[orderBy] = orderDirection

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          customer: true,
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true
            }
          },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      this.prisma.quote.count({ where })
    ])

    return {
      quotes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Obtener presupuesto por ID
   */
  async getQuoteById(id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id,
        tenantId: this.tenantId
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          },
          orderBy: {
            lineNumber: 'asc'
          }
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        convertedToSale: {
          select: {
            id: true,
            saleNumber: true,
            fullVoucherNumber: true
          }
        },
        tenant: {
          include: {
            tenantVatCondition: true
          }
        }
      }
    })

    if (!quote) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    return quote
  }

  /**
   * Actualizar estado del presupuesto
   */
  async updateStatus(id: string, status: QuoteStatus) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id,
        tenantId: this.tenantId
      }
    })

    if (!quote) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    if (quote.status === 'FULLY_CONVERTED') {
      throw new AppError('No se puede modificar un presupuesto totalmente convertido', 400)
    }

    return await this.prisma.quote.update({
      where: { id },
      data: { status }
    })
  }
}
```

---

### 1.3. Backend - Rutas de Presupuestos

**Archivo:** `backend/src/routes/quotes.ts`

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { QuoteService } from '../services/quoteService.js'
import { PDFService } from '../services/pdfService.js'

const router = Router({ mergeParams: true })

// Validation schemas
const createQuoteItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional(),
  description: z.string().optional()
})

const createQuoteSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(createQuoteItemSchema).min(1),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  internalNotes: z.string().optional(),
  validUntil: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional()
})

// POST /api/:tenantSlug/quotes - Crear presupuesto
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = createQuoteSchema.parse(req.body)

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.createQuote(validatedData)

    res.status(201).json({
      message: 'Presupuesto creado exitosamente',
      quote
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes - Listar presupuestos
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      dateFrom,
      dateTo,
      customerId,
      status,
      search,
      orderBy,
      orderDirection
    } = req.query

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await quoteService.listQuotes({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      status: status as any,
      search: search as string,
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc'
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes/:id - Obtener presupuesto
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.getQuoteById(req.params.id)

    res.json({ quote })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes/:id/pending-for-sale - Obtener items pendientes para convertir a venta
router.get('/:id/pending-for-sale', authMiddleware, async (req, res, next) => {
  try {
    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const data = await quoteService.getDataForSaleConversion(req.params.id)

    res.json(data)
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/quotes/:id/record-sale-conversion - Registrar conversión a venta
router.post('/:id/record-sale-conversion', authMiddleware, async (req, res, next) => {
  try {
    const { itemsConverted } = req.body

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    await quoteService.recordSaleConversion(req.params.id, itemsConverted)

    res.json({ message: 'Conversión registrada exitosamente' })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/quotes/:id/convert-to-order - Convertir a pedido (parcial o total)
router.post('/:id/convert-to-order', authMiddleware, async (req, res, next) => {
  try {
    const { items, deliveryDate, reserveStock, deliveryNotes } = req.body

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items requeridos' })
    }

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await quoteService.convertToOrder(req.params.id, {
      items,
      deliveryDate,
      reserveStock,
      deliveryNotes
    })

    res.json({
      message: 'Presupuesto convertido a pedido exitosamente',
      order
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/:tenantSlug/quotes/:id/status - Actualizar estado
router.put('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Estado requerido' })
    }

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.updateStatus(req.params.id, status)

    res.json({
      message: 'Estado actualizado',
      quote
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes/:id/pdf - Generar PDF del presupuesto
router.get('/:id/pdf', authMiddleware, async (req, res, next) => {
  try {
    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.getQuoteById(req.params.id)

    // Generar PDF usando el template de presupuesto
    const pdfService = new PDFService()
    const pdfBuffer = await pdfService.generateQuotePDF(quote)

    const filename = `Presupuesto-${quote.quoteNumber}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

export default router
```

**Registrar rutas en `server.ts`:**
```typescript
import quotesRoutes from './routes/quotes.js'

// ...

app.use('/api/:tenantSlug/quotes', quotesRoutes)
```

---

### 1.4. Frontend - API Client

**Archivo:** `frontend/src/api/quotes.ts`

```typescript
import { api } from '../services/api'

export interface QuoteItem {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
  description?: string
}

export interface CreateQuoteData {
  customerId?: string
  items: QuoteItem[]
  notes?: string
  termsAndConditions?: string
  internalNotes?: string
  validUntil?: string
  discountPercent?: number
}

export interface QuotesFilters {
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  customerId?: string
  status?: string
  search?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export const quotesApi = {
  // Crear presupuesto
  createQuote: async (tenantSlug: string, data: CreateQuoteData) => {
    const response = await api.post(`/${tenantSlug}/quotes`, data)
    return response.data
  },

  // Listar presupuestos
  getQuotes: async (filters?: QuotesFilters) => {
    const response = await api.get('/quotes', { params: filters })
    return response.data
  },

  // Obtener detalle de presupuesto
  getQuote: async (id: string) => {
    const response = await api.get(`/quotes/${id}`)
    return response.data
  },

  // Obtener items pendientes para convertir a venta
  getPendingForSale: async (id: string) => {
    const response = await api.get(`/quotes/${id}/pending-for-sale`)
    return response.data
  },

  // Registrar conversión a venta (después de crear la venta)
  recordSaleConversion: async (id: string, itemsConverted: Array<{
    quoteItemId: string
    quantityConverted: number
  }>) => {
    const response = await api.post(`/quotes/${id}/record-sale-conversion`, {
      itemsConverted
    })
    return response.data
  },

  // Convertir a pedido (parcial o total)
  convertToOrder: async (id: string, data: {
    items: Array<{
      quoteItemId: string
      quantity: number
    }>
    deliveryDate?: string
    reserveStock?: boolean
    deliveryNotes?: string
  }) => {
    const response = await api.post(`/quotes/${id}/convert-to-order`, data)
    return response.data
  },

  // Actualizar estado
  updateStatus: async (id: string, status: string) => {
    const response = await api.put(`/quotes/${id}/status`, { status })
    return response.data
  },

  // Obtener PDF
  getPDF: async (id: string) => {
    const response = await api.get(`/quotes/${id}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  }
}
```

---

### 1.5. Frontend - Páginas

**Estructura de archivos:**
```
frontend/src/
├── pages/
│   └── quotes/
│       ├── QuotesPage.tsx         # Lista de presupuestos
│       ├── NewQuotePage.tsx       # Nuevo presupuesto
│       └── QuoteDetailPage.tsx    # Detalle de presupuesto
```

**Página de lista (`QuotesPage.tsx`):**
- Similar a `SalesPage.tsx`
- Filtros: fecha, cliente, estado, búsqueda
- Columnas: número, fecha, cliente, total, estado, validez
- Acciones: Ver, PDF, Email, Convertir a Venta, Cambiar Estado

**Página de nuevo presupuesto (`NewQuotePage.tsx`):**
- Copiar `NewSalePage.tsx` y adaptar:
  - **QUITAR** sección de formas de pago
  - **AGREGAR** campo "Válido hasta" (date picker)
  - **AGREGAR** campo "Términos y Condiciones" (textarea)
  - **AGREGAR** campo "Notas internas" (textarea)
  - Botón "Guardar Presupuesto" en lugar de "Finalizar Venta"

**Flujo de conversión a venta:**
1. En lista de presupuestos → botón "Convertir a Venta"
2. Llama a `quotesApi.convertToSale(id)`
3. Navega a `/sales/new?fromQuote=${quoteId}` con datos precargados
4. Cuando se crea la venta exitosamente → llama a `quoteService.markAsConverted(quoteId, saleId)`

---

### 1.6. PDF Template para Presupuestos

**Archivo:** `backend/src/services/pdfService.ts`

Agregar método:
```typescript
async generateQuotePDF(quote: any): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []

  doc.on('data', (chunk) => chunks.push(chunk))

  // Header
  doc.fontSize(20).text('PRESUPUESTO', { align: 'center' })
  doc.fontSize(10).text(`N° ${quote.quoteNumber}`, { align: 'center' })
  doc.moveDown()

  // Business info (left)
  doc.fontSize(12).text(quote.tenant.businessName || quote.tenant.name, { bold: true })
  if (quote.tenant.cuit) doc.fontSize(9).text(`CUIT: ${quote.tenant.cuit}`)
  if (quote.tenant.address) doc.text(quote.tenant.address)
  doc.moveDown()

  // Quote info (right)
  const rightX = 400
  doc.fontSize(9)
  doc.text(`Fecha: ${new Date(quote.quoteDate).toLocaleDateString('es-AR')}`, rightX, 120)
  if (quote.validUntil) {
    doc.text(`Válido hasta: ${new Date(quote.validUntil).toLocaleDateString('es-AR')}`, rightX)
  }
  doc.moveDown()

  // Customer
  doc.fontSize(10).text('Cliente:', 50, doc.y)
  doc.fontSize(9).text(quote.customerName)
  doc.moveDown()

  // Items table
  // ... similar a generateInvoicePDF

  // Totals
  // ... similar a generateInvoicePDF

  // Terms and Conditions
  if (quote.termsAndConditions) {
    doc.moveDown()
    doc.fontSize(8).text('Términos y Condiciones:', { bold: true })
    doc.fontSize(7).text(quote.termsAndConditions, { align: 'justify' })
  }

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
```

---

## Fase 2: Pedidos/Notas de Venta (Customer Orders)

### 2.1. Schema de Base de Datos

```prisma
model CustomerOrder {
  id                String           @id @default(cuid())
  tenantId          String
  orderNumber       String           // PED-00001
  orderDate         DateTime         @default(now())
  deliveryDate      DateTime?        // Fecha estimada de entrega

  // Cliente
  customerId        String?
  customer          Entity?          @relation(fields: [customerId], references: [id])
  customerName      String

  // Montos
  subtotal          Decimal          @db.Decimal(15, 2)
  discountAmount    Decimal          @default(0) @db.Decimal(15, 2)
  taxAmount         Decimal          @default(0) @db.Decimal(15, 2)
  totalAmount       Decimal          @db.Decimal(15, 2)

  // Estado
  status            OrderStatus      @default(PENDING)
  reservedStock     Boolean          @default(false) // Si reserva stock

  // Conversión
  convertedFromQuoteId String?
  convertedFromQuote   Quote?        @relation(fields: [convertedFromQuoteId], references: [id])
  convertedToSales     Sale[]

  // Metadata de conversión parcial
  isPartialConversion  Boolean       @default(false)  // Si viene de conversión parcial

  // Notas
  notes             String?          @db.Text
  deliveryNotes     String?          @db.Text

  // Relaciones
  tenant            Tenant           @relation(fields: [tenantId], references: [id])
  items             CustomerOrderItem[]

  // Auditoría
  createdBy         String
  creator           User             @relation(fields: [createdBy], references: [id])
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@unique([tenantId, orderNumber])
  @@index([tenantId])
  @@index([customerId])
  @@index([status])
  @@map("customer_orders")
}

enum OrderStatus {
  PENDING               // Pendiente de procesar
  CONFIRMED             // Confirmado
  PROCESSING            // En preparación
  READY                 // Listo para entrega/retiro
  DELIVERED             // Entregado (sin facturar aún)
  PARTIALLY_CONVERTED   // Parcialmente facturado
  FULLY_CONVERTED       // Totalmente facturado
  CANCELLED             // Cancelado
}

model CustomerOrderItem {
  id              String        @id @default(cuid())
  orderId         String
  order           CustomerOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  lineNumber      Int
  productId       String?
  product         Product?      @relation(fields: [productId], references: [id])
  productName     String
  description     String?

  quantity        Decimal       @db.Decimal(15, 3)
  unitPrice       Decimal       @db.Decimal(15, 2)
  lineTotal       Decimal       @db.Decimal(15, 2)

  // Control de conversión parcial a venta
  quantityConverted Decimal     @default(0) @db.Decimal(15, 3)
  quantityPending   Decimal     @db.Decimal(15, 3)

  // Referencia al item del presupuesto original (si aplica)
  sourceQuoteItemId String?

  @@index([orderId])
  @@map("customer_order_items")
}
```

---

### 2.2. Conversión Parcial vs Total

El sistema soporta **conversión parcial** para mayor flexibilidad operativa.

#### Ejemplo de Conversión Parcial:

**Presupuesto original:**
```
Item 1: Producto A - 100 unidades
Item 2: Producto B - 50 unidades
```

**Primera conversión (parcial):**
Usuario selecciona:
- Producto A: 30 unidades → Crea Pedido #1
- Producto B: no seleccionado

Estado del presupuesto después:
```
Item 1: Producto A - 70 unidades pendientes (100 - 30)
Item 2: Producto B - 50 unidades pendientes
Status: PARTIALLY_CONVERTED
```

**Segunda conversión:**
Usuario selecciona:
- Producto A: 70 unidades → Crea Venta #1
- Producto B: 50 unidades → Crea Venta #1

Estado del presupuesto después:
```
Item 1: Producto A - 0 unidades pendientes
Item 2: Producto B - 0 unidades pendientes
Status: FULLY_CONVERTED
```

#### Reglas de Conversión Parcial:

1. **Selección de items**: Se pueden seleccionar algunos items y omitir otros
2. **Cantidades**: Cantidad a convertir ≤ cantidad pendiente
3. **Múltiples conversiones**: Un presupuesto puede generar N pedidos y/o M ventas
4. **Estados automáticos**:
   - `PENDING` → `PARTIALLY_CONVERTED` (cuando se convierte parcialmente)
   - `PARTIALLY_CONVERTED` → `FULLY_CONVERTED` (cuando cantidad pendiente = 0 en todos los items)
5. **Trazabilidad**: Se mantiene referencia a todos los pedidos/ventas generados

#### Cálculo de cantidades:

```typescript
// Para cada QuoteItem
quantityPending = quantity - quantityConverted

// Al convertir
if (cantidadAConvertir > quantityPending) {
  throw new Error('Cantidad supera lo pendiente')
}

// Después de convertir
quantityConverted += cantidadAConvertir
```

---

### 2.3. Diferencias entre Presupuesto, Pedido y Venta

| Característica | Presupuesto | Pedido | Venta |
|---------------|-------------|--------|-------|
| **Propósito** | Cotizar precios | Registrar compromiso | Facturar y cobrar |
| **Afecta stock** | ❌ No | ⚠️ Opcional (reserva) | ✅ Sí (descuenta) |
| **Requiere pago** | ❌ No | ❌ No | ✅ Sí |
| **Genera CAE** | ❌ No | ❌ No | ⚠️ Según tipo |
| **Mueve caja** | ❌ No | ❌ No | ✅ Sí |
| **Válido hasta** | ✅ Sí | ❌ No | ❌ No |
| **Fecha entrega** | ❌ No | ✅ Sí | ❌ No |
| **Conversión** | → Pedido o → Venta (total o parcial) | → Venta (total o parcial) | - |
| **Puede venir de** | - | Presupuesto (total o parcial) | Presupuesto o Pedido (total o parcial) |
| **Conversión parcial** | ✅ Sí | ✅ Sí | ❌ No |

---

### 2.3. Flujos de Conversión

#### Flujo 1: Presupuesto → Venta (Directo, Total o Parcial)
**Caso de uso:** Cliente acepta el presupuesto y paga inmediatamente.

```
PRESUPUESTO (PENDING)
    ↓ [Cliente acepta - puede ser parcial]
    ↓ [Selecciona items y cantidades]
    ↓ [Convierte y factura]
VENTA + PAGO
    ↓
PRESUPUESTO (PARTIALLY_CONVERTED o FULLY_CONVERTED)
```

**Acciones (conversión total):**
1. Usuario hace clic en "Convertir a Venta" desde el presupuesto
2. Sistema carga todos los items con cantidades completas
3. Usuario agrega forma de pago y confirma
4. Se crea la venta
5. Se actualiza `quantityConverted` en cada item
6. Estado del presupuesto → `FULLY_CONVERTED`

**Acciones (conversión parcial):**
1. Usuario hace clic en "Convertir a Venta (Parcial)"
2. Sistema muestra modal/formulario con items pendientes
3. Usuario selecciona items y ajusta cantidades (≤ cantidad pendiente)
4. Usuario agrega forma de pago y confirma
5. Se crea la venta con los items seleccionados
6. Se actualiza `quantityConverted` en los items convertidos
7. Estado del presupuesto → `PARTIALLY_CONVERTED`
8. Presupuesto queda disponible para nuevas conversiones

---

#### Flujo 2: Presupuesto → Pedido → Venta (Con compromiso, Total o Parcial)
**Caso de uso:** Cliente acepta el presupuesto pero el producto no está disponible o requiere preparación.

```
PRESUPUESTO (PENDING)
    ↓ [Cliente acepta - puede ser parcial]
    ↓ [Selecciona items y cantidades]
    ↓ [Convierte a pedido]
PEDIDO (CONFIRMED)
    ↓ [Se prepara el producto]
PEDIDO (PROCESSING)
    ↓ [Producto listo]
PEDIDO (READY)
    ↓ [Cliente retira/recibe - puede ser parcial]
PEDIDO (DELIVERED / PARTIALLY_CONVERTED)
    ↓ [Se factura - puede ser parcial]
VENTA + PAGO
    ↓
PEDIDO (PARTIALLY_CONVERTED o FULLY_CONVERTED)
```

**Acciones (conversión total de presupuesto a pedido):**
1. Usuario hace clic en "Convertir a Pedido" desde el presupuesto
2. Sistema carga todos los items con cantidades completas
3. Usuario opcionalmente ajusta fecha de entrega y reserva de stock
4. Se crea el pedido automáticamente
5. Se actualiza `quantityConverted` en cada item del presupuesto
6. Estado del presupuesto → `FULLY_CONVERTED`
7. El pedido avanza por los estados operativos

**Acciones (conversión parcial de presupuesto a pedido):**
1. Usuario hace clic en "Convertir a Pedido (Parcial)"
2. Sistema muestra items pendientes del presupuesto
3. Usuario selecciona items y cantidades
4. Se crea el pedido con los items seleccionados
5. Estado del presupuesto → `PARTIALLY_CONVERTED`
6. Presupuesto queda disponible para nuevas conversiones

**Conversión de pedido a venta (puede ser parcial):**
1. Usuario hace clic en "Facturar" desde el pedido
2. Sistema muestra items pendientes de facturar
3. Usuario selecciona qué y cuánto facturar
4. Se crea la venta
5. Se actualiza `quantityConverted` en items del pedido
6. Estado del pedido → `PARTIALLY_CONVERTED` o `FULLY_CONVERTED`

---

#### Flujo 3: Pedido → Venta (Sin presupuesto previo)
**Caso de uso:** Cliente hace un pedido directo sin presupuesto previo.

```
PEDIDO (PENDING)
    ↓ [Se confirma]
PEDIDO (CONFIRMED)
    ↓ [Ciclo operativo]
    ...
PEDIDO (DELIVERED)
    ↓ [Se factura]
VENTA + PAGO
    ↓
PEDIDO (CONVERTED_TO_SALE)
```

**Acciones:**
1. Usuario crea pedido directamente desde "Nuevo Pedido"
2. Sigue el ciclo operativo normal
3. Al facturar, se convierte en venta

---

### 2.4. Servicios Backend - Métodos de Conversión

#### En `quoteService.ts`:

```typescript
/**
 * Convertir presupuesto a pedido (total o parcial)
 */
async convertToOrder(quoteId: string, options: {
  items: Array<{
    quoteItemId: string
    quantity: number  // Cantidad a convertir (≤ quantityPending)
  }>
  deliveryDate?: string
  reserveStock?: boolean
  deliveryNotes?: string
}) {
  const quote = await this.prisma.quote.findFirst({
    where: { id: quoteId, tenantId: this.tenantId },
    include: { items: true, customer: true }
  })

  if (!quote) throw new AppError('Presupuesto no encontrado', 404)
  if (quote.status === 'FULLY_CONVERTED') {
    throw new AppError('Este presupuesto ya fue totalmente convertido', 400)
  }
  if (quote.status === 'CANCELLED') {
    throw new AppError('No se puede convertir un presupuesto cancelado', 400)
  }

  // Validar items y cantidades
  const itemsToConvert = []
  for (const itemInput of options.items) {
    const quoteItem = quote.items.find(i => i.id === itemInput.quoteItemId)
    if (!quoteItem) {
      throw new AppError(`Item ${itemInput.quoteItemId} no encontrado`, 404)
    }

    const quantityPending = Number(quoteItem.quantity) - Number(quoteItem.quantityConverted)
    if (itemInput.quantity > quantityPending) {
      throw new AppError(
        `Cantidad solicitada (${itemInput.quantity}) supera la pendiente (${quantityPending}) para ${quoteItem.productName}`,
        400
      )
    }

    itemsToConvert.push({
      quoteItem,
      quantityToConvert: itemInput.quantity
    })
  }

  // Crear el pedido
  const orderService = new OrderService(this.prisma, this.tenantId, this.userId)
  const order = await orderService.createOrder({
    customerId: quote.customerId || undefined,
    fromQuoteId: quote.id,
    items: itemsToConvert.map(item => ({
      productId: item.quoteItem.productId!,
      quantity: item.quantityToConvert,
      unitPrice: Number(item.quoteItem.unitPrice),
      description: item.quoteItem.description || undefined,
      sourceQuoteItemId: item.quoteItem.id
    })),
    deliveryDate: options.deliveryDate,
    reserveStock: options.reserveStock || false,
    deliveryNotes: options.deliveryNotes,
    notes: quote.notes || undefined
  })

  // Actualizar quantityConverted en cada item del presupuesto
  for (const item of itemsToConvert) {
    await this.prisma.quoteItem.update({
      where: { id: item.quoteItem.id },
      data: {
        quantityConverted: {
          increment: new Decimal(item.quantityToConvert)
        }
      }
    })
  }

  // Actualizar estado del presupuesto
  const updatedQuote = await this.prisma.quote.findFirst({
    where: { id: quoteId },
    include: { items: true }
  })

  const allFullyConverted = updatedQuote!.items.every(item =>
    Number(item.quantity) === Number(item.quantityConverted)
  )

  await this.prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: allFullyConverted ? 'FULLY_CONVERTED' : 'PARTIALLY_CONVERTED'
    }
  })

  return order
}

/**
 * Convertir presupuesto a venta (directo)
 */
async convertToSale(quoteId: string) {
  // Código existente, solo cambia el estado a CONVERTED_TO_SALE
  // ...
}
```

#### En `orderService.ts`:

```typescript
/**
 * Convertir pedido a venta
 */
async convertToSale(orderId: string) {
  const order = await this.prisma.customerOrder.findFirst({
    where: { id: orderId, tenantId: this.tenantId },
    include: { items: true, customer: true }
  })

  if (!order) throw new AppError('Pedido no encontrado', 404)
  if (order.status === 'CONVERTED_TO_SALE') {
    throw new AppError('Este pedido ya fue convertido a venta', 400)
  }

  // Retornar datos para que el frontend abra el formulario de venta
  return {
    customerId: order.customerId || undefined,
    items: order.items.map(item => ({
      productId: item.productId!,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      description: item.description || undefined
    })),
    notes: order.notes || undefined,
    orderId: order.id
  }
}

/**
 * Marcar pedido como convertido después de crear la venta
 */
async markAsConverted(orderId: string, saleId: string) {
  await this.prisma.customerOrder.update({
    where: { id: orderId },
    data: {
      status: 'CONVERTED_TO_SALE',
      convertedToSaleId: saleId,
      convertedAt: new Date()
    }
  })
}
```

---

### 2.5. Frontend - UI para Conversión Parcial

#### En `QuoteDetailPage.tsx`:

```tsx
// Mostrar tabla de items con cantidades pendientes
<Table>
  <thead>
    <tr>
      <th>Producto</th>
      <th>Cantidad Original</th>
      <th>Cantidad Convertida</th>
      <th>Cantidad Pendiente</th>
    </tr>
  </thead>
  <tbody>
    {quote.items.map(item => {
      const pending = item.quantity - item.quantityConverted
      return (
        <tr key={item.id}>
          <td>{item.productName}</td>
          <td>{item.quantity}</td>
          <td>{item.quantityConverted}</td>
          <td><strong>{pending}</strong></td>
        </tr>
      )
    })}
  </tbody>
</Table>

// Botones de conversión
{quote.status !== 'FULLY_CONVERTED' && (
  <>
    <Button onClick={() => handleConvertToOrder()}>
      Convertir a Pedido
    </Button>

    <Button onClick={() => handleConvertToSale()}>
      Convertir a Venta
    </Button>
  </>
)}

// Modal de conversión parcial
<Modal open={showConversionModal}>
  <h2>Seleccionar items a convertir</h2>
  {pendingItems.map(item => (
    <div key={item.id}>
      <Checkbox
        checked={selectedItems.includes(item.id)}
        onChange={(e) => handleToggleItem(item.id)}
      />
      <span>{item.productName}</span>

      {selectedItems.includes(item.id) && (
        <Input
          type="number"
          min={0}
          max={item.quantityPending}
          value={quantities[item.id] || item.quantityPending}
          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
        />
      )}
    </div>
  ))}

  <Button onClick={() => confirmConversion()}>
    Confirmar
  </Button>
</Modal>
```

#### Flujo en Frontend para Convertir a Venta:

```typescript
// 1. Usuario hace clic en "Convertir a Venta"
const handleConvertToSale = async () => {
  // Obtener items pendientes
  const { items, quoteId } = await quotesApi.getPendingForSale(quote.id)

  // Abrir modal para seleccionar items y cantidades
  setConversionData({ items, quoteId })
  setShowConversionModal(true)
}

// 2. Usuario confirma selección
const confirmConversion = async () => {
  // Navegar a formulario de venta con datos precargados
  navigate(`/sales/new?fromQuote=${quoteId}`, {
    state: {
      selectedItems: itemsToConvert  // items con cantidades ajustadas
    }
  })
}

// 3. En NewSalePage.tsx, después de crear la venta exitosamente:
const handleSaleCreated = async (sale) => {
  if (fromQuoteId) {
    // Registrar conversión en el presupuesto
    await quotesApi.recordSaleConversion(fromQuoteId, [
      { quoteItemId: 'xxx', quantityConverted: 10 },
      { quoteItemId: 'yyy', quantityConverted: 5 }
    ])
  }

  // Mostrar mensaje de éxito
  toast.success('Venta creada y presupuesto actualizado')
}
```

#### En `OrderDetailPage.tsx`:

```tsx
// Similar a presupuestos, mostrar cantidades pendientes
<Button onClick={() => handleConvertToSale()}>
  Facturar / Convertir a Venta
</Button>
```

---

## Tareas Pendientes (Checklist)

### Backend - Presupuestos
- [ ] Crear migración de Prisma para tabla `quotes`
- [ ] Crear `quoteService.ts` con métodos:
  - [ ] `createQuote()`
  - [ ] `convertToSale()` - retorna datos para formulario
  - [ ] `convertToOrder()` - crea pedido automáticamente
  - [ ] `markAsConvertedToSale()`
  - [ ] `listQuotes()`, `getQuoteById()`, `updateStatus()`
- [ ] Crear rutas `routes/quotes.ts`
- [ ] Registrar rutas en `server.ts`
- [ ] Adaptar `pdfService.ts` para generar PDF de presupuestos

### Backend - Pedidos
- [ ] Crear migración de Prisma para tabla `customer_orders`
- [ ] Crear `orderService.ts` con métodos:
  - [ ] `createOrder()`
  - [ ] `convertToSale()` - retorna datos para formulario
  - [ ] `markAsConverted()`
  - [ ] `updateStatus()`
  - [ ] `reserveStock()` / `releaseStock()` (opcional)
- [ ] Crear rutas `routes/orders.ts`
- [ ] Registrar rutas en `server.ts`

### Backend - Ventas
- [ ] Modificar `salesService.createSale()` para aceptar:
  - [ ] `quoteId` opcional
  - [ ] `orderId` opcional
- [ ] Después de crear venta, llamar a:
  - [ ] `quoteService.markAsConvertedToSale()` si viene de presupuesto
  - [ ] `orderService.markAsConverted()` si viene de pedido

### Frontend - Presupuestos
- [ ] Crear `api/quotes.ts`
- [ ] Crear página `QuotesPage.tsx` (lista)
- [ ] Crear página `NewQuotePage.tsx` (copiar y adaptar NewSalePage)
- [ ] Crear página `QuoteDetailPage.tsx` con botones:
  - [ ] "Convertir a Pedido"
  - [ ] "Convertir a Venta (Directo)"
- [ ] Agregar rutas en React Router
- [ ] Agregar enlace "Presupuestos" en menú de navegación

### Frontend - Pedidos
- [ ] Crear `api/orders.ts`
- [ ] Crear página `OrdersPage.tsx` (lista)
- [ ] Crear página `NewOrderPage.tsx`
- [ ] Crear página `OrderDetailPage.tsx` con:
  - [ ] Botón "Facturar / Convertir a Venta"
  - [ ] Gestión de estados (PENDING → CONFIRMED → PROCESSING → READY → DELIVERED)
- [ ] Agregar rutas en React Router
- [ ] Agregar enlace "Pedidos" en menú de navegación

### Frontend - Integración con Ventas
- [ ] Modificar `NewSalePage.tsx` para aceptar:
  - [ ] Query param `?fromQuote=xxx` - precargar datos de presupuesto
  - [ ] Query param `?fromOrder=xxx` - precargar datos de pedido
- [ ] Después de crear venta, llamar endpoint para marcar como convertido:
  - [ ] `/quotes/:id/mark-converted` si viene de presupuesto
  - [ ] `/orders/:id/mark-converted` si viene de pedido

### Pruebas - Presupuestos
- [ ] Crear presupuesto básico
- [ ] Generar PDF de presupuesto
- [ ] Enviar presupuesto por email
- [ ] Convertir presupuesto a venta directa
  - [ ] Verificar que presupuesto se marca como CONVERTED_TO_SALE
  - [ ] Verificar relación presupuesto → venta
- [ ] Convertir presupuesto a pedido
  - [ ] Verificar que presupuesto se marca como CONVERTED_TO_ORDER
  - [ ] Verificar relación presupuesto → pedido
- [ ] Verificar que no afecta stock
- [ ] Verificar estados (PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED)

### Pruebas - Pedidos
- [ ] Crear pedido directo (sin presupuesto)
- [ ] Crear pedido desde presupuesto
- [ ] Cambiar estados del pedido (PENDING → CONFIRMED → PROCESSING → READY → DELIVERED)
- [ ] Probar reserva de stock (si está habilitado)
- [ ] Convertir pedido a venta
  - [ ] Verificar que pedido se marca como CONVERTED_TO_SALE
  - [ ] Verificar relación pedido → venta

### Pruebas - Flujos completos
- [ ] Flujo 1: Presupuesto → Venta directa
- [ ] Flujo 2: Presupuesto → Pedido → Venta
- [ ] Flujo 3: Pedido directo → Venta
- [ ] Verificar trazabilidad completa en la base de datos

---

## Notas Adicionales

### Automatización de Estados
Considera agregar un cron job para marcar presupuestos como EXPIRED:
```typescript
// backend/src/jobs/expireQuotes.ts
import { PrismaClient } from '@prisma/client'

export async function expireQuotes() {
  const prisma = new PrismaClient()

  const result = await prisma.quote.updateMany({
    where: {
      status: 'PENDING',
      validUntil: {
        lt: new Date()
      }
    },
    data: {
      status: 'EXPIRED'
    }
  })

  console.log(`${result.count} presupuestos marcados como vencidos`)
}
```

### Email Templates
Crear templates específicos para presupuestos:
- `Presupuesto N° XXX - [Nombre Negocio]`
- Texto más comercial que facturas
- Incluir botón "Aceptar Presupuesto" (opcional)

### Permisos
Agregar permisos específicos:
- `quotes:create`
- `quotes:read`
- `quotes:update`
- `quotes:delete`
- `quotes:convert_to_sale`

---

## Estimación de Tiempo

| Tarea | Tiempo Estimado |
|-------|----------------|
| Backend (schema + service + routes) | 2-3 horas |
| Frontend (páginas + API) | 3-4 horas |
| PDF Template | 1 hora |
| Pruebas y ajustes | 1-2 horas |
| **TOTAL** | **7-10 horas** |

---

## Próximos Pasos

1. **Ahora:** Revisar este documento y confirmar arquitectura
2. **Luego:** Empezar con migración de Prisma
3. **Después:** Backend (service + routes)
4. **Finalmente:** Frontend (páginas)

---

---

## Análisis: ¿Tablas Separadas o Tabla Unificada?

### Opción A: Tablas Separadas (Diseño actual)

**Estructura:**
- `quotes` + `quote_items`
- `customer_orders` + `customer_order_items`
- Cada una con su servicio, rutas y API frontend

**Ventajas:**
- ✅ Claridad conceptual: cada entidad tiene su schema específico
- ✅ Campos específicos por tipo (ej: `validUntil` solo en quotes, `deliveryDate` solo en orders)
- ✅ Más fácil de entender para desarrolladores nuevos

**Desventajas:**
- ❌ **Duplicación masiva de código**: servicios casi idénticos
- ❌ Dos migrations, dos servicios, dos APIs, dos sets de páginas frontend
- ❌ Más difícil de mantener: cambios en lógica común requieren tocar múltiples archivos
- ❌ Testing más complejo (hay que testear todo dos veces)

---

### Opción B: Tabla Unificada ⭐ **RECOMENDADO**

**Estructura:**
```prisma
model Document {
  id                String          @id @default(cuid())
  tenantId          String
  documentType      DocumentType    // QUOTE | ORDER
  documentNumber    String          // PRE-00001 o PED-00001
  documentDate      DateTime        @default(now())

  // Campos comunes
  customerId        String?
  customer          Entity?
  customerName      String
  subtotal          Decimal
  discountAmount    Decimal
  taxAmount         Decimal
  totalAmount       Decimal
  notes             String?
  status            DocumentStatus

  // Campos opcionales (según tipo)
  validUntil        DateTime?       // Solo para QUOTE
  deliveryDate      DateTime?       // Solo para ORDER
  deliveryNotes     String?         // Solo para ORDER
  termsAndConditions String?        // Solo para QUOTE
  reservedStock     Boolean         @default(false)  // Solo para ORDER

  // Conversión
  convertedToSales  Sale[]

  // Relaciones
  tenant            Tenant
  items             DocumentItem[]
  createdBy         String
  creator           User

  @@unique([tenantId, documentNumber])
  @@index([tenantId, documentType])
  @@index([status])
  @@map("documents")
}

enum DocumentType {
  QUOTE    // Presupuesto
  ORDER    // Pedido
}

enum DocumentStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED              // Solo para QUOTE
  CONFIRMED            // Solo para ORDER
  PROCESSING           // Solo para ORDER
  READY                // Solo para ORDER
  DELIVERED            // Solo para ORDER
  PARTIALLY_CONVERTED
  FULLY_CONVERTED
  CANCELLED
}

model DocumentItem {
  id                String      @id @default(cuid())
  documentId        String
  document          Document

  lineNumber        Int
  productId         String?
  product           Product?
  productName       String
  quantity          Decimal
  unitPrice         Decimal

  // Control conversión parcial
  quantityConverted Decimal     @default(0)
  quantityPending   Decimal     // Computed

  @@index([documentId])
  @@map("document_items")
}
```

**Ventajas:**
- ✅ **Código unificado**: UN solo servicio (`documentService`) para ambos tipos
- ✅ **Una sola API**: `GET /documents?type=QUOTE` o `GET /documents?type=ORDER`
- ✅ **Lógica de conversión compartida**: mismo método `convertToSale()` para ambos
- ✅ **Más fácil de mantener**: cambios en un solo lugar
- ✅ **Testing simplificado**: testear una vez cubre ambos tipos
- ✅ **Frontend más simple**: componente `<DocumentList type="quote" />` reutilizable
- ✅ **Extensible**: agregar nuevos tipos (ej: PROFORMA) es trivial

**Desventajas:**
- ⚠️ Campos opcionales (algunos campos null según tipo)
- ⚠️ Validaciones condicionales en el código
- ⚠️ Estados compartidos (algunos estados solo aplican a ciertos tipos)

---

### Implementación Recomendada: Tabla Unificada

#### Servicio Unificado

```typescript
export class DocumentService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private userId: string,
    private type: 'QUOTE' | 'ORDER'  // Define el tipo
  ) {}

  /**
   * Crear documento (presupuesto u orden)
   */
  async create(data: CreateDocumentInput) {
    // Validaciones específicas por tipo
    if (this.type === 'QUOTE' && !data.validUntil) {
      // Advertencia: se recomienda fecha de validez
    }

    if (this.type === 'ORDER' && !data.deliveryDate) {
      // Advertencia: se recomienda fecha de entrega
    }

    const documentNumber = await this.generateNumber()

    const document = await this.prisma.document.create({
      data: {
        tenantId: this.tenantId,
        documentType: this.type,
        documentNumber,
        // ... resto de campos
      }
    })

    return document
  }

  /**
   * Generar número según tipo
   */
  private async generateNumber(): Promise<string> {
    const prefix = this.type === 'QUOTE' ? 'PRE' : 'PED'

    const lastDoc = await this.prisma.document.findFirst({
      where: {
        tenantId: this.tenantId,
        documentType: this.type
      },
      orderBy: { documentNumber: 'desc' }
    })

    // Lógica de numeración...
    return `${prefix}-00000001`
  }

  /**
   * Convertir a venta (funciona para ambos tipos)
   */
  async convertToSale(documentId: string, items: ConversionInput[]) {
    // Lógica única para ambos tipos
    // ...
  }

  /**
   * Convertir presupuesto a pedido
   */
  async convertQuoteToOrder(quoteId: string, items: ConversionInput[]) {
    // Validar que sea QUOTE
    const quote = await this.prisma.document.findFirst({
      where: {
        id: quoteId,
        documentType: 'QUOTE',
        tenantId: this.tenantId
      }
    })

    if (!quote) throw new AppError('Presupuesto no encontrado', 404)

    // Crear nuevo documento tipo ORDER con mismos items
    const orderService = new DocumentService(
      this.prisma,
      this.tenantId,
      this.userId,
      'ORDER'
    )

    return orderService.create({
      fromDocumentId: quoteId,
      items: items
      // ...
    })
  }
}
```

#### API Unificada

```typescript
// routes/documents.ts

// Listar presupuestos: GET /documents?type=QUOTE
// Listar pedidos: GET /documents?type=ORDER
router.get('/', authMiddleware, async (req, res, next) => {
  const { type, ...filters } = req.query

  const service = new DocumentService(
    req.tenantDb!,
    req.tenant!.id,
    req.user!.id,
    type as 'QUOTE' | 'ORDER'
  )

  const result = await service.list(filters)
  res.json(result)
})

// Crear: POST /documents?type=QUOTE o POST /documents?type=ORDER
router.post('/', authMiddleware, async (req, res, next) => {
  const { type } = req.query
  const service = new DocumentService(
    req.tenantDb!,
    req.tenant!.id,
    req.user!.id,
    type as 'QUOTE' | 'ORDER'
  )

  const document = await service.create(req.body)
  res.json(document)
})
```

#### Frontend Unificado

```typescript
// api/documents.ts
export const documentsApi = {
  // Listar presupuestos
  getQuotes: (filters) => documentsApi.getDocuments({ ...filters, type: 'QUOTE' }),

  // Listar pedidos
  getOrders: (filters) => documentsApi.getDocuments({ ...filters, type: 'ORDER' }),

  // Método base unificado
  getDocuments: (filters) => {
    return api.get('/documents', { params: filters })
  },

  createQuote: (data) => documentsApi.createDocument('QUOTE', data),
  createOrder: (data) => documentsApi.createDocument('ORDER', data),

  createDocument: (type, data) => {
    return api.post('/documents', data, { params: { type } })
  }
}
```

```tsx
// pages/QuotesPage.tsx
<DocumentList type="QUOTE" />

// pages/OrdersPage.tsx
<DocumentList type="ORDER" />

// components/DocumentList.tsx (componente reutilizable)
function DocumentList({ type }: { type: 'QUOTE' | 'ORDER' }) {
  const title = type === 'QUOTE' ? 'Presupuestos' : 'Pedidos'
  const columns = getColumnsForType(type)  // Columnas específicas

  return (
    <div>
      <h1>{title}</h1>
      <Table columns={columns} data={documents} />
    </div>
  )
}
```

---

### Opción C: Reutilizar tabla `sales` existente ⭐⭐ **MÁS RECOMENDADO**

Ya existe el campo `documentClass` en `Sale` y el campo `status` que podemos usar:

```prisma
model Sale {
  // ... campos existentes ...

  documentClass   String?   @map("document_class") // 'INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'QUOTE', 'ORDER'
  status          String    @default("completed")  // draft, completed, cancelled, pending, confirmed, processing, ready, delivered

  // Nuevos campos a agregar:
  validUntil      DateTime? @map("valid_until")     // Para presupuestos
  deliveryDate    DateTime? @map("delivery_date")   // Para pedidos
  deliveryNotes   String?   @map("delivery_notes")  // Para pedidos
  termsConditions String?   @map("terms_conditions") @db.Text // Para presupuestos
  internalNotes   String?   @map("internal_notes")  @db.Text
  reservedStock   Boolean   @default(false) @map("reserved_stock") // Para pedidos

  // ... resto de campos existentes ...
}

model SaleItem {
  // ... campos existentes ...

  // Agregar para conversión parcial:
  quantityConverted Decimal @default(0) @map("quantity_converted") @db.Decimal(15, 4)
  sourceDocumentId  String? @map("source_document_id") // Referencia al presupuesto/pedido original

  // ... resto de campos existentes ...
}
```

**Ventajas:**
- ✅ **CERO tablas nuevas**: reutilizamos completamente `sales` + `sale_items`
- ✅ **CERO servicios nuevos**: extendemos `salesService` con métodos para quotes/orders
- ✅ **CERO APIs nuevas**: `GET /sales?documentClass=QUOTE` o `GET /sales?documentClass=ORDER`
- ✅ **Frontend simplificado**: páginas de quotes/orders son casi idénticas a sales
- ✅ **Lógica de facturación unificada**: presupuestos y pedidos usan el mismo flujo que ventas
- ✅ **Numeración existente**: ya funciona con `saleNumber`
- ✅ **Reportes unificados**: fácil hacer reportes que incluyan quotes, orders y sales
- ✅ **Historial completo**: todo en una tabla, trazabilidad total

**Implementación:**

```typescript
// Extender salesService.ts existente
export class SalesService {
  // ... métodos existentes ...

  async createQuote(data: CreateQuoteInput) {
    return this.create({
      ...data,
      documentClass: 'QUOTE',
      status: 'pending',
      // No se registran pagos en quotes
      // No se afecta stock en quotes
    })
  }

  async createOrder(data: CreateOrderInput) {
    return this.create({
      ...data,
      documentClass: 'ORDER',
      status: 'pending',
      // No se registran pagos en orders
      // Opcionalmente se reserva stock
    })
  }

  async convertQuoteToOrder(quoteId: string, items: ConversionInput[]) {
    // Validar que sea QUOTE
    const quote = await this.getSaleById(quoteId)
    if (quote.documentClass !== 'QUOTE') {
      throw new AppError('Documento no es un presupuesto', 400)
    }

    // Crear ORDER con items seleccionados
    return this.createOrder({
      customerId: quote.customerId,
      items: items,
      sourceDocumentId: quoteId
    })
  }

  async convertToInvoice(documentId: string, items: ConversionInput[]) {
    // Funciona para QUOTE u ORDER
    const doc = await this.getSaleById(documentId)

    if (!['QUOTE', 'ORDER'].includes(doc.documentClass)) {
      throw new AppError('Solo se pueden facturar presupuestos o pedidos', 400)
    }

    // Crear INVOICE con items seleccionados
    return this.create({
      customerId: doc.customerId,
      documentClass: 'INVOICE',
      status: 'completed',
      items: items,
      sourceDocumentId: documentId,
      // Aquí SÍ se afecta stock y se registran pagos
    })
  }
}
```

**API simplificada:**

```typescript
// routes/sales.ts (ya existe)

// Listar presupuestos: GET /sales?documentClass=QUOTE
// Listar pedidos: GET /sales?documentClass=ORDER
// Listar facturas: GET /sales?documentClass=INVOICE
router.get('/', authMiddleware, async (req, res, next) => {
  const { documentClass, ...filters } = req.query

  const salesService = new SalesService(...)
  const result = await salesService.listSales({
    ...filters,
    documentClass  // Filtro opcional
  })

  res.json(result)
})

// POST /sales (con documentClass en el body)
router.post('/', authMiddleware, async (req, res, next) => {
  const { documentClass = 'INVOICE', ...data } = req.body

  const salesService = new SalesService(...)

  if (documentClass === 'QUOTE') {
    const quote = await salesService.createQuote(data)
    res.json({ quote })
  } else if (documentClass === 'ORDER') {
    const order = await salesService.createOrder(data)
    res.json({ order })
  } else {
    const sale = await salesService.createSale(data)
    res.json({ sale })
  }
})
```

**Diferencias en lógica:**

```typescript
// En salesService.create()
async create(data: CreateSaleInput) {
  const documentClass = data.documentClass || 'INVOICE'

  // 1. Validar stock solo si NO es QUOTE
  if (documentClass !== 'QUOTE') {
    await this.validateStock(data.items)
  }

  // 2. Descontar stock solo si es INVOICE o si ORDER tiene reservedStock
  if (documentClass === 'INVOICE' ||
     (documentClass === 'ORDER' && data.reservedStock)) {
    await this.updateStock(data.items)
  }

  // 3. Registrar pagos solo si es INVOICE
  if (documentClass === 'INVOICE') {
    await this.registerPayments(data.payments)
  }

  // 4. Solicitar CAE solo si es INVOICE
  if (documentClass === 'INVOICE' && needsAfip) {
    await this.requestAfipCae(sale)
  }

  return sale
}
```

---

### Recomendación Final ⭐

**Usar tabla `sales` existente** agregando solo 6 campos opcionales:

1. **CERO código duplicado**: todo reutiliza la lógica existente
2. **CERO nuevas tablas**: solo agregar campos opcionales
3. **Máxima simplicidad**: un solo servicio, una API, un frontend base
4. **Evolutivo**: ya está preparado para CREDIT_NOTE, DEBIT_NOTE, ahora agregamos QUOTE y ORDER
5. **Consistent**: todo el sistema usa la misma estructura

**Campos a agregar a `Sale`:**
- `validUntil` (DateTime, nullable)
- `deliveryDate` (DateTime, nullable)
- `deliveryNotes` (String, nullable)
- `termsConditions` (Text, nullable)
- `internalNotes` (Text, nullable)
- `reservedStock` (Boolean, default false)

**Campos a agregar a `SaleItem`:**
- `quantityConverted` (Decimal, default 0)
- `sourceDocumentId` (String, nullable)

---

## Consideraciones Importantes

### 1. Relaciones en el Schema de Sales

El modelo `Sale` necesitará agregar relaciones inversas opcionales:

```prisma
model Sale {
  // ... campos existentes ...

  // Relaciones inversas (opcional, para trazabilidad)
  sourceQuote        Quote?          @relation("ConvertedToSale")
  sourceOrder        CustomerOrder?  @relation("ConvertedToSale")
}
```

### 2. Manejo de Stock

- **Presupuestos**: NO afectan el stock en ningún momento
- **Pedidos**:
  - Por defecto NO afectan stock
  - Si `reservedStock = true`: se crea un registro en `stock_reservations` (tabla nueva, opcional)
  - Cuando se convierte a venta: se descuenta el stock definitivamente
- **Ventas**: Siempre descuentan stock (como funcionan actualmente)

### 3. Numeración

Cada entidad tiene su propia secuencia:
- Presupuestos: `PRE-00000001`, `PRE-00000002`, ...
- Pedidos: `PED-00000001`, `PED-00000002`, ...
- Ventas: Numeración existente según tipo de comprobante

### 4. Permisos y Roles

Considerar permisos granulares:
- `quotes:*` - Gestión de presupuestos
- `orders:*` - Gestión de pedidos
- `quotes:convert` - Puede convertir presupuestos
- `orders:convert` - Puede facturar pedidos

---

---

## Funcionalidades Adicionales Interesantes

### 1. **Versionado de Presupuestos** 📝

**Problema:** Cliente pide cambios al presupuesto original (más items, menos cantidad, otro precio).

**Solución:** Sistema de versiones para presupuestos.

```prisma
model Sale {
  // ... campos existentes ...

  version           Int      @default(1)
  parentDocumentId  String?  @map("parent_document_id")  // ID del presupuesto padre
  isLatestVersion   Boolean  @default(true) @map("is_latest_version")
  versionNotes      String?  @map("version_notes") @db.Text

  parentDocument    Sale?    @relation("DocumentVersions", fields: [parentDocumentId], references: [id])
  childVersions     Sale[]   @relation("DocumentVersions")
}
```

**Funcionalidad:**
- Usuario hace clic en "Nueva Versión" desde un presupuesto
- Sistema copia el presupuesto con `version = 2`, marca el anterior como `isLatestVersion = false`
- Usuario modifica precios, cantidades, items
- Historial completo de versiones visible
- Cliente ve comparación lado a lado de versiones

**UI:**
```tsx
<Button onClick={() => createNewVersion(quoteId)}>
  📝 Nueva Versión
</Button>

// Historial de versiones
<Timeline>
  <TimelineItem>V1 - 15/12/2024 - $10,000 - Pendiente</TimelineItem>
  <TimelineItem>V2 - 16/12/2024 - $9,500 - Aprobado ✓</TimelineItem>
</Timeline>
```

---

### 2. **Aprobación de Presupuestos por Email/Link Público** 🔗

**Problema:** Cliente necesita aprobar presupuesto pero no tiene acceso al sistema.

**Solución:** Link de aprobación público con token seguro.

```prisma
model Sale {
  // ... campos existentes ...

  approvalToken     String?   @unique @map("approval_token")
  approvalTokenExp  DateTime? @map("approval_token_exp")
  approvedAt        DateTime? @map("approved_at")
  approvedBy        String?   @map("approved_by")  // Email o nombre del que aprobó
  rejectionReason   String?   @map("rejection_reason") @db.Text
}
```

**Funcionalidad:**
- Botón "Enviar por Email" genera token único
- Email al cliente con link: `https://tu-erp.com/approve/{token}`
- Página pública donde cliente ve presupuesto y puede:
  - ✅ Aprobar
  - ❌ Rechazar (con motivo)
  - 💬 Dejar comentarios
  - 📧 Solicitar cambios
- Se registra quién aprobó y cuándo
- Usuario del ERP recibe notificación

**Email template:**
```html
Hola {cliente},

Tu presupuesto #{number} por ${total} está listo.

[Ver y Aprobar Presupuesto]

Válido hasta: {validUntil}

Saludos,
{empresa}
```

---

### 3. **Alertas y Recordatorios Automáticos** 🔔

**Problema:** Presupuestos vencen sin seguimiento, pedidos se olvidan.

**Solución:** Sistema de alertas automáticas.

```typescript
// Cron jobs automáticos
interface AutoAlert {
  type: 'QUOTE_EXPIRING' | 'QUOTE_EXPIRED' | 'ORDER_OVERDUE' | 'ORDER_READY'
  documentId: string
  message: string
  channel: 'EMAIL' | 'SYSTEM' | 'SMS'
}

// Ejemplos:
// - Presupuesto vence en 3 días → Email al vendedor
// - Presupuesto venció sin respuesta → Cambiar estado automático
// - Pedido tiene más de 7 días en "PROCESSING" → Alerta
// - Pedido está "READY" hace 2 días sin retirar → Notificar cliente
```

**Configuración:**
```typescript
const alertRules = [
  {
    trigger: 'QUOTE_EXPIRING_SOON',
    condition: 'validUntil - today < 3 days',
    action: 'EMAIL_TO_SALES_REP',
    message: 'Presupuesto {number} vence en {days} días'
  },
  {
    trigger: 'ORDER_STUCK',
    condition: 'status = PROCESSING AND age > 7 days',
    action: 'EMAIL_TO_MANAGER',
    message: 'Pedido {number} lleva {days} días en preparación'
  }
]
```

---

### 4. **Plantillas de Presupuestos** 📋

**Problema:** Presupuestos repetitivos para servicios/productos estándar.

**Solución:** Guardar presupuestos como plantillas reutilizables.

```prisma
model SaleTemplate {
  id          String   @id @default(cuid())
  tenantId    String
  name        String   // "Mantenimiento Mensual", "Pack Básico"
  description String?
  category    String?  // Para organizar

  // Items predefinidos
  items       SaleTemplateItem[]

  // Campos por defecto
  validityDays Int?    // Ej: 30 días de validez
  termsConditions String? @db.Text
  notes       String?

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@map("sale_templates")
}

model SaleTemplateItem {
  id         String       @id @default(cuid())
  templateId String
  productId  String
  quantity   Decimal
  // ... otros campos

  template   SaleTemplate @relation(fields: [templateId], references: [id])
  @@map("sale_template_items")
}
```

**Funcionalidad:**
- Guardar presupuesto actual como plantilla
- Botón "Nuevo desde Plantilla"
- Seleccionar plantilla → precarga todos los items
- Usuario ajusta cantidades/precios según cliente
- Enorme ahorro de tiempo para presupuestos repetitivos

**UI:**
```tsx
<Button onClick={() => createFromTemplate()}>
  📋 Nuevo desde Plantilla
</Button>

<TemplateSelector>
  <TemplateCard>
    <h3>Pack Básico - 3 Productos</h3>
    <p>Instalación + Configuración</p>
    <span>~$5,000</span>
  </TemplateCard>
</TemplateSelector>
```

---

### 5. **Comparador de Presupuestos/Pedidos** 📊

**Problema:** Cliente tiene varios presupuestos y quiere compararlos.

**Solución:** Vista de comparación lado a lado.

```typescript
// GET /sales/compare?ids=quote1,quote2,quote3
{
  comparison: {
    documents: [...],
    itemsComparison: [
      {
        product: 'Producto A',
        quantities: [10, 15, 12],  // En cada presupuesto
        prices: [100, 95, 98],
        totals: [1000, 1425, 1176]
      }
    ],
    totals: [5000, 5500, 4800],
    validUntil: ['2025-01-15', '2025-01-20', '2025-01-10']
  }
}
```

**UI:**
```tsx
<ComparisonTable>
  <thead>
    <tr>
      <th>Item</th>
      <th>Presupuesto A</th>
      <th>Presupuesto B</th>
      <th>Presupuesto C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Producto X</td>
      <td>10 × $100 = $1,000</td>
      <td>15 × $95 = $1,425 ⚡ Mejor precio</td>
      <td>12 × $98 = $1,176</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td><strong>TOTAL</strong></td>
      <td>$5,000</td>
      <td>$5,500</td>
      <td>$4,800 ✓ Más económico</td>
    </tr>
  </tfoot>
</ComparisonTable>
```

---

### 6. **Flujo de Seña/Anticipo** 💰

**Problema:** Cliente quiere confirmar pedido pero pagar después, necesita dejar seña.

**Solución:** Permitir pagos parciales en presupuestos/pedidos.

```prisma
model Sale {
  // ... campos existentes ...

  // Ya existen estos campos:
  paidAmount    Decimal  // Seña/anticipo
  balanceAmount Decimal  // Saldo pendiente
  paymentStatus String   // pending, partial, paid

  requiresDeposit      Boolean @default(false) @map("requires_deposit")
  depositPercent       Decimal? @map("deposit_percent") @db.Decimal(5,2)
  depositAmount        Decimal? @map("deposit_amount") @db.Decimal(15,2)
  depositPaidAt        DateTime? @map("deposit_paid_at")
  depositPaymentMethod String? @map("deposit_payment_method")
}
```

**Funcionalidad:**
- Configurar "Requiere seña del 30%"
- Cliente paga seña → Pedido se confirma automáticamente
- Estado: `PENDING` → `CONFIRMED` (con seña pagada)
- Al facturar: descuenta la seña del total
- Opción de facturar la seña por separado o junto con el total

**Flujo:**
```
PRESUPUESTO (cliente aprueba)
    ↓
PEDIDO (requiere seña 30%)
    ↓
Cliente paga $3,000 de seña
    ↓
PEDIDO (CONFIRMED, paidAmount=$3,000, balance=$7,000)
    ↓
Producto listo → READY
    ↓
Cliente retira y paga saldo $7,000
    ↓
FACTURA ($10,000, ya tiene $3,000 acreditados)
```

---

### 7. **Análisis y Reportes de Conversión** 📈

**Problema:** No se sabe qué presupuestos convierten, qué clientes son más rentables.

**Solución:** Dashboard de métricas.

```typescript
interface QuoteMetrics {
  conversionRate: number           // % de presupuestos que se convierten
  avgTimeToConversion: number      // Días promedio hasta conversión
  avgQuoteValue: number            // Valor promedio de presupuestos
  avgOrderValue: number            // Valor promedio de pedidos

  byStatus: {
    pending: number
    approved: number
    rejected: number
    expired: number
    converted: number
  }

  topCustomers: Array<{
    customerId: string
    customerName: string
    quoteCount: number
    conversionRate: number
    totalValue: number
  }>

  reasonsForRejection: Array<{
    reason: string
    count: number
    percent: number
  }>
}
```

**UI Dashboard:**
```tsx
<MetricsGrid>
  <MetricCard>
    <h3>Tasa de Conversión</h3>
    <span className="big">68%</span>
    <span className="trend">↑ 5% vs mes anterior</span>
  </MetricCard>

  <MetricCard>
    <h3>Tiempo Promedio</h3>
    <span className="big">5.2 días</span>
    <span>hasta conversión</span>
  </MetricCard>

  <MetricCard>
    <h3>Presupuestos Activos</h3>
    <span className="big">23</span>
    <span>12 vencen esta semana</span>
  </MetricCard>
</MetricsGrid>

<Chart type="funnel">
  100 Presupuestos → 68 Aprobados → 45 Pedidos → 40 Facturados
</Chart>
```

---

### 8. **Integración con WhatsApp/SMS** 📱

**Problema:** Clientes no revisan emails, prefieren WhatsApp.

**Solución:** Enviar presupuestos/notificaciones por WhatsApp.

```typescript
// Integración con WhatsApp Business API o Twilio
interface WhatsAppNotification {
  to: string              // Número del cliente
  message: string
  attachment?: string     // PDF del presupuesto
  buttons?: Array<{
    text: string
    url: string           // Link de aprobación
  }>
}

// Ejemplo
await whatsapp.send({
  to: '+5491123456789',
  message: `
Hola ${cliente.name}!

Tu presupuesto #${quote.number} está listo.
Total: $${quote.total}
Válido hasta: ${quote.validUntil}
  `,
  buttons: [
    { text: '✅ Aprobar', url: approvalLink },
    { text: '📄 Ver PDF', url: pdfLink }
  ]
})
```

---

### 9. **Pedidos con Seguimiento de Estado Visual** 🚚

**Problema:** Cliente no sabe en qué estado está su pedido.

**Solución:** Timeline visual + notificaciones automáticas.

```tsx
<OrderTimeline>
  <Step completed>
    <Icon>✓</Icon>
    <Title>Pedido Recibido</Title>
    <Date>15/12/2024 10:30</Date>
  </Step>

  <Step completed>
    <Icon>✓</Icon>
    <Title>Pago Confirmado</Title>
    <Date>15/12/2024 11:00</Date>
  </Step>

  <Step active>
    <Icon>⏳</Icon>
    <Title>En Preparación</Title>
    <Note>Estimado: 2 días</Note>
  </Step>

  <Step>
    <Icon>○</Icon>
    <Title>Listo para Retiro</Title>
  </Step>

  <Step>
    <Icon>○</Icon>
    <Title>Entregado</Title>
  </Step>
</OrderTimeline>

// Cliente recibe WhatsApp automático en cada cambio de estado
```

---

### 10. **Generación de Presupuestos con IA** 🤖

**Problema:** Usuario necesita ayuda para armar presupuestos óptimos.

**Solución:** Sugerencias inteligentes basadas en histórico.

```typescript
// Sistema de recomendaciones
interface QuoteRecommendation {
  type: 'FREQUENTLY_BOUGHT_TOGETHER' | 'CUSTOMER_USUALLY_BUYS' | 'SEASONAL'
  items: Array<{
    productId: string
    productName: string
    reason: string
    confidence: number
  }>
}

// Ejemplo:
{
  type: 'FREQUENTLY_BOUGHT_TOGETHER',
  items: [
    {
      product: 'Cable HDMI',
      reason: 'Comprado junto con TV en 85% de casos',
      confidence: 0.85
    }
  ]
}
```

**UI:**
```tsx
<RecommendationBox>
  <h4>💡 Sugerencias</h4>
  <p>Clientes que compraron "Smart TV" también compraron:</p>
  <ul>
    <li>
      Cable HDMI (85% de veces)
      <Button size="sm">+ Agregar</Button>
    </li>
    <li>
      Soporte de Pared (60%)
      <Button size="sm">+ Agregar</Button>
    </li>
  </ul>
</RecommendationBox>
```

---

## Priorización Recomendada

**Fase 1 (MVP):**
1. ✅ Conversión parcial
2. ✅ Versionado de presupuestos
3. ✅ Plantillas

**Fase 2 (Valor inmediato):**
4. Aprobación por email/link público
5. Flujo de seña/anticipo
6. Alertas automáticas

**Fase 3 (Avanzado):**
7. Seguimiento visual de pedidos
8. Comparador de presupuestos
9. Reportes y métricas

**Fase 4 (Nice to have):**
10. Integración WhatsApp
11. Sugerencias con IA

---

---

## Resumen Ejecutivo para Implementación

### Decisión Final de Arquitectura

**✅ OPCIÓN ELEGIDA: Reutilizar tabla `sales` existente (Opción C)**

**Razón:** Máxima simplicidad, cero duplicación de código, aprovecha toda la infraestructura existente.

**Cambios requeridos en schema:**
- Agregar 6 campos a `Sale`: `validUntil`, `deliveryDate`, `deliveryNotes`, `termsConditions`, `internalNotes`, `reservedStock`
- Agregar 2 campos a `SaleItem`: `quantityConverted`, `sourceDocumentId`
- Agregar campos de versionado: `version`, `parentDocumentId`, `isLatestVersion`, `versionNotes`
- Agregar campos de aprobación: `approvalToken`, `approvalTokenExp`, `approvedAt`, `approvedBy`, `rejectionReason`
- Agregar campos de seña: `requiresDeposit`, `depositPercent`, `depositAmount`, `depositPaidAt`, `depositPaymentMethod`

**Valores de `documentClass`:**
- `INVOICE` - Factura (actual)
- `CREDIT_NOTE` - Nota de crédito (actual)
- `DEBIT_NOTE` - Nota de débito (actual)
- `QUOTE` - Presupuesto (nuevo)
- `ORDER` - Pedido (nuevo)

**Valores de `status`:**
- Para INVOICE: `draft`, `completed`, `cancelled` (actuales)
- Para QUOTE: `pending`, `approved`, `rejected`, `expired`, `partially_converted`, `fully_converted`, `cancelled`
- Para ORDER: `pending`, `confirmed`, `processing`, `ready`, `delivered`, `partially_converted`, `fully_converted`, `cancelled`

---

### Roadmap de Implementación

#### ✅ **Fase 0: Preparación (1-2 días)**
- [ ] Crear rama `feature/quotes-orders`
- [ ] Crear migración de Prisma con nuevos campos
- [ ] Ejecutar migración en desarrollo
- [ ] Actualizar tipos TypeScript

#### 🚀 **Fase 1: MVP Core (1 semana)**
- [ ] Extender `salesService` con métodos `createQuote()` y `createOrder()`
- [ ] Implementar lógica condicional en `create()` según `documentClass`
- [ ] Agregar filtro `documentClass` en `listSales()`
- [ ] Crear método `convertQuoteToOrder()`
- [ ] Crear método `convertToInvoice()` (funciona para QUOTE y ORDER)
- [ ] Implementar conversión parcial con `quantityConverted`
- [ ] Agregar endpoints en `routes/sales.ts`
- [ ] Testing backend básico

#### 🎨 **Fase 2: Frontend Básico (1 semana)**
- [ ] Página `QuotesPage.tsx` (reutilizar `SalesPage` con filtro)
- [ ] Página `OrdersPage.tsx` (reutilizar `SalesPage` con filtro)
- [ ] Página `NewQuotePage.tsx` (copiar `NewSalePage`, sin pagos)
- [ ] Página `NewOrderPage.tsx` (copiar `NewSalePage`, sin pagos)
- [ ] Página `QuoteDetailPage.tsx` con botones de conversión
- [ ] Página `OrderDetailPage.tsx` con seguimiento de estados
- [ ] Modal de selección de items para conversión parcial
- [ ] Agregar links en menú de navegación

#### 📋 **Fase 3: Features Avanzadas Core (1 semana)**
- [ ] **Versionado de presupuestos**
  - [ ] Método `createNewVersion()` en service
  - [ ] UI de timeline de versiones
  - [ ] Comparador de versiones
- [ ] **Plantillas de presupuestos**
  - [ ] Crear tablas `sale_templates` y `sale_template_items`
  - [ ] Service para gestionar plantillas
  - [ ] UI de selector de plantillas
  - [ ] Botón "Guardar como plantilla"
- [ ] **Conversión parcial mejorada**
  - [ ] Mostrar cantidades pendientes en tablas
  - [ ] Validaciones de cantidades
  - [ ] Actualización automática de estados

#### 🔗 **Fase 4: Aprobación y Notificaciones (1 semana)**
- [ ] **Aprobación por link público**
  - [ ] Generar `approvalToken` único
  - [ ] Página pública `/approve/:token`
  - [ ] Endpoints de aprobación/rechazo
  - [ ] Email con link de aprobación
  - [ ] Registro de quién aprobó
- [ ] **Alertas automáticas**
  - [ ] Cron job para presupuestos por vencer
  - [ ] Cron job para presupuestos vencidos
  - [ ] Cron job para pedidos atrasados
  - [ ] Sistema de notificaciones internas
  - [ ] Emails automáticos

#### 💰 **Fase 5: Seña y Pagos Parciales (3-4 días)**
- [ ] Lógica de seña requerida en pedidos
- [ ] Registrar pago de seña
- [ ] Cambio automático de estado al pagar seña
- [ ] Al facturar, descontar seña del total
- [ ] UI para configurar % de seña
- [ ] Mostrar estado de pago en detalle

#### 📊 **Fase 6: Reportes y Analytics (1 semana)**
- [ ] Dashboard de métricas de presupuestos
- [ ] Tasa de conversión
- [ ] Tiempo promedio de conversión
- [ ] Top clientes por conversión
- [ ] Motivos de rechazo
- [ ] Embudo de conversión visual
- [ ] Exportación de reportes

#### 🎯 **Fase 7: UX Mejorado (3-4 días)**
- [ ] Timeline visual de estados en pedidos
- [ ] Comparador de presupuestos (lado a lado)
- [ ] Búsqueda avanzada con filtros
- [ ] Acciones en masa (aprobar múltiples, etc.)
- [ ] Drag & drop para reordenar items

#### 📱 **Fase 8: Integraciones Externas (2 semanas)**
- [ ] Integración con WhatsApp Business API
- [ ] Envío de presupuestos por WhatsApp
- [ ] Notificaciones de estado por WhatsApp
- [ ] Botones de aprobación en WhatsApp
- [ ] SMS como fallback

#### 🤖 **Fase 9: IA y Automatización (2 semanas)**
- [ ] Sistema de recomendaciones de productos
- [ ] "Frecuentemente comprados juntos"
- [ ] Análisis de histórico del cliente
- [ ] Sugerencias de precios basadas en histórico
- [ ] Auto-completado inteligente

---

### Estimación Total

| Fase | Tiempo | Prioridad | Valor |
|------|--------|-----------|-------|
| Fase 0: Preparación | 1-2 días | Alta | Fundacional |
| Fase 1: MVP Core | 1 semana | Alta | Crítico |
| Fase 2: Frontend Básico | 1 semana | Alta | Crítico |
| Fase 3: Features Avanzadas | 1 semana | Media | Alto |
| Fase 4: Aprobación | 1 semana | Media | Alto |
| Fase 5: Seña | 3-4 días | Media | Medio |
| Fase 6: Reportes | 1 semana | Baja | Medio |
| Fase 7: UX Mejorado | 3-4 días | Baja | Medio |
| Fase 8: Integraciones | 2 semanas | Baja | Alto |
| Fase 9: IA | 2 semanas | Baja | Medio |
| **TOTAL MVP (F1+F2)** | **2 semanas** | | |
| **TOTAL Completo** | **8-10 semanas** | | |

---

### Quick Start - Pasos Inmediatos

**Para comenzar la implementación:**

1. **Leer Secciones Clave:**
   - "Opción C: Reutilizar tabla sales" (línea 2140)
   - "Conversión Parcial vs Total" (línea 1120)
   - "Flujos de Conversión" (línea 1200)

2. **Crear migración:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_quotes_orders_fields
   ```

3. **Extender salesService:**
   - Agregar métodos `createQuote()` y `createOrder()`
   - Modificar método `create()` para lógica condicional
   - Agregar métodos de conversión

4. **Testing:**
   - Crear presupuesto desde Postman
   - Convertir a pedido
   - Convertir a factura
   - Verificar cantidades y estados

---

### Archivos Clave a Modificar

**Backend:**
- `backend/prisma/schema.prisma` - Agregar campos nuevos
- `backend/src/services/salesService.ts` - Extender con lógica de quotes/orders
- `backend/src/routes/sales.ts` - Ya tiene todos los endpoints necesarios
- `backend/src/utils/calculationService.ts` - Reutilizar tal cual

**Frontend:**
- `frontend/src/api/sales.ts` - Agregar filtros de `documentClass`
- `frontend/src/pages/sales/SalesPage.tsx` - Duplicar y adaptar para quotes/orders
- `frontend/src/pages/sales/NewSalePage.tsx` - Duplicar y adaptar
- Crear nuevos componentes: `ConversionModal.tsx`, `VersionTimeline.tsx`, etc.

---

### Preguntas Frecuentes

**Q: ¿Puedo facturar un presupuesto directamente sin crear pedido?**
A: Sí, usando `convertToInvoice()` directamente desde el presupuesto.

**Q: ¿Puedo convertir parcialmente múltiples veces?**
A: Sí, mientras haya cantidad pendiente (`quantityPending > 0`).

**Q: ¿Cómo se numeran los presupuestos y pedidos?**
A: Usan el campo `saleNumber` existente, con prefijos en el código (PRE-, PED-).

**Q: ¿Los presupuestos afectan el stock?**
A: No, solo las facturas (INVOICE) afectan stock.

**Q: ¿Los pedidos afectan el stock?**
A: Solo si `reservedStock = true`, caso contrario no.

**Q: ¿Se pueden hacer pagos en presupuestos?**
A: Técnicamente sí (usando campos existentes), pero no es el flujo recomendado. Los pagos se hacen en facturas.

**Q: ¿Cómo migro presupuestos/pedidos existentes si los tenía en otra tabla?**
A: Script de migración para copiar datos a `sales` con `documentClass` apropiado.

---

### Contacto y Soporte

**Documentación:**
- Este archivo: `PLAN_PRESUPUESTOS_PEDIDOS.md`
- Diagrama de flujos: Ver inicio de documento

**Para dudas durante implementación:**
- Revisar secciones de servicios y APIs (líneas 1300-1700)
- Revisar ejemplos de UI (líneas 1560-1675)
- Consultar tabla de diferencias (línea 1183)

---

**Última actualización:** 2025-12-17
**Versión del documento:** 2.0
**Estado:** Listo para implementación
**Arquitectura aprobada:** ✅ Opción C (Reutilizar `sales`)
