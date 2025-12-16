# Plan de Implementación: Presupuestos y Pedidos

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

  // Conversión a venta
  convertedToSaleId String?     @unique
  convertedToSale   Sale?       @relation(fields: [convertedToSaleId], references: [id])
  convertedAt       DateTime?

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
  PENDING      // Pendiente de respuesta del cliente
  APPROVED     // Cliente aprobó
  REJECTED     // Cliente rechazó
  EXPIRED      // Venció la validez
  CONVERTED    // Convertido a venta
  CANCELLED    // Cancelado por el negocio
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
   * Convertir presupuesto a venta
   */
  async convertToSale(quoteId: string) {
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

    if (quote.status === 'CONVERTED') {
      throw new AppError('Este presupuesto ya fue convertido a venta', 400)
    }

    if (quote.status === 'CANCELLED') {
      throw new AppError('No se puede convertir un presupuesto cancelado', 400)
    }

    // Retornar datos para que el frontend abra el formulario de venta
    return {
      customerId: quote.customerId,
      items: quote.items.map(item => ({
        productId: item.productId!,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxRate: Number(item.taxRate),
        description: item.description
      })),
      notes: quote.notes,
      quoteId: quote.id
    }
  }

  /**
   * Marcar presupuesto como convertido después de crear la venta
   */
  async markAsConverted(quoteId: string, saleId: string) {
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
        convertedToSaleId: saleId,
        convertedAt: new Date()
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

    if (quote.status === 'CONVERTED') {
      throw new AppError('No se puede modificar un presupuesto convertido', 400)
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

// POST /api/:tenantSlug/quotes/:id/convert - Obtener datos para convertir a venta
router.post('/:id/convert', authMiddleware, async (req, res, next) => {
  try {
    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const saleData = await quoteService.convertToSale(req.params.id)

    res.json({ saleData })
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

  // Obtener datos para convertir a venta
  convertToSale: async (id: string) => {
    const response = await api.post(`/quotes/${id}/convert`)
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
  convertedToSaleId String?          @unique
  convertedToSale   Sale?            @relation(fields: [convertedToSaleId], references: [id])
  convertedAt       DateTime?

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
  PENDING      // Pendiente de procesar
  CONFIRMED    // Confirmado
  PROCESSING   // En preparación
  READY        // Listo para entrega/retiro
  DELIVERED    // Entregado
  CANCELLED    // Cancelado
  CONVERTED    // Convertido a venta
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

  @@index([orderId])
  @@map("customer_order_items")
}
```

---

### 2.2. Diferencias entre Presupuesto, Pedido y Venta

| Característica | Presupuesto | Pedido | Venta |
|---------------|-------------|--------|-------|
| **Propósito** | Cotizar precios | Registrar compromiso | Facturar y cobrar |
| **Afecta stock** | ❌ No | ⚠️ Opcional (reserva) | ✅ Sí (descuenta) |
| **Requiere pago** | ❌ No | ❌ No | ✅ Sí |
| **Genera CAE** | ❌ No | ❌ No | ⚠️ Según tipo |
| **Mueve caja** | ❌ No | ❌ No | ✅ Sí |
| **Válido hasta** | ✅ Sí | ❌ No | ❌ No |
| **Fecha entrega** | ❌ No | ✅ Sí | ❌ No |
| **Conversión** | → Venta | → Venta | - |

---

## Tareas Pendientes (Checklist)

### Backend
- [ ] Crear migración de Prisma para tabla `quotes`
- [ ] Crear `quoteService.ts`
- [ ] Crear rutas `routes/quotes.ts`
- [ ] Registrar rutas en `server.ts`
- [ ] Adaptar `pdfService.ts` para generar PDF de presupuestos
- [ ] Agregar método `markAsConverted` en `quoteService`
- [ ] Modificar `salesService.createSale` para aceptar `quoteId` opcional

### Frontend
- [ ] Crear `api/quotes.ts`
- [ ] Crear página `QuotesPage.tsx` (lista)
- [ ] Crear página `NewQuotePage.tsx` (copiar y adaptar NewSalePage)
- [ ] Crear página `QuoteDetailPage.tsx`
- [ ] Agregar rutas en React Router
- [ ] Agregar enlace "Presupuestos" en menú de navegación
- [ ] Implementar lógica de conversión a venta
- [ ] Agregar botón "Convertir a Venta" en lista y detalle

### Pruebas
- [ ] Crear presupuesto básico
- [ ] Generar PDF de presupuesto
- [ ] Enviar presupuesto por email
- [ ] Convertir presupuesto a venta
- [ ] Verificar que presupuesto se marca como CONVERTED
- [ ] Verificar que no afecta stock
- [ ] Verificar estados (PENDING, APPROVED, REJECTED, EXPIRED)

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

**Última actualización:** 2025-12-16
