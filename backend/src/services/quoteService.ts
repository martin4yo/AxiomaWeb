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

    // 7. Crear presupuesto en base de datos (usando transaction para atomicidad)
    const quote = await this.prisma.$transaction(async (tx) => {
      // Calcular quantityPending para cada item
      const quoteData = await tx.quote.create({
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
            create: processedItems.map((item, index) => {
              const quantity = new Decimal(item.input.quantity)
              return {
                lineNumber: index + 1,
                productId: item.product.id,
                productSku: item.product.sku,
                productName: item.product.name,
                description: item.input.description || item.product.description,
                quantity,
                unitPrice: item.input.unitPrice !== undefined
                  ? new Decimal(item.input.unitPrice)
                  : item.product.salePrice,
                quantityConverted: new Decimal(0),
                quantityPending: quantity, // Inicialmente toda la cantidad está pendiente
                discountPercent: new Decimal(item.input.discountPercent || 0),
                discountAmount: item.calculation.discountAmount,
                taxRate: item.input.taxRate !== undefined
                  ? new Decimal(item.input.taxRate)
                  : defaultTaxRate,
                taxAmount: item.calculation.taxAmount,
                subtotal: item.calculation.subtotal,
                lineTotal: item.calculation.lineTotal
              }
            })
          }
        },
        include: {
          items: true,
          customer: true
        }
      })

      return quoteData
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
    return await this.prisma.$transaction(async (tx) => {
      // Actualizar quantityConverted en cada item
      for (const item of itemsConverted) {
        const quoteItem = await tx.quoteItem.findUnique({
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

        const newQuantityConverted = new Decimal(quoteItem.quantityConverted).plus(item.quantityConverted)
        const newQuantityPending = new Decimal(quoteItem.quantity).minus(newQuantityConverted)

        await tx.quoteItem.update({
          where: { id: item.quoteItemId },
          data: {
            quantityConverted: newQuantityConverted,
            quantityPending: newQuantityPending
          }
        })
      }

      // Actualizar estado del presupuesto
      const quote = await tx.quote.findFirst({
        where: { id: quoteId },
        include: { items: true }
      })

      const allFullyConverted = quote!.items.every(item =>
        new Decimal(item.quantity).equals(item.quantityConverted)
      )

      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: allFullyConverted ? 'FULLY_CONVERTED' : 'PARTIALLY_CONVERTED'
        }
      })
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
              quantityConverted: true,
              quantityPending: true,
              unitPrice: true,
              lineTotal: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      this.prisma.quote.count({ where })
    ])

    return {
      data: quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Obtener presupuesto por ID
   */
  async getQuoteById(quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        tenantId: this.tenantId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
  async updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        tenantId: this.tenantId
      }
    })

    if (!quote) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    // Validaciones de cambio de estado
    if (quote.status === 'FULLY_CONVERTED' && status !== 'FULLY_CONVERTED') {
      throw new AppError('No se puede cambiar el estado de un presupuesto totalmente convertido', 400)
    }

    return await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status }
    })
  }

  /**
   * Cancelar presupuesto
   */
  async cancelQuote(quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        tenantId: this.tenantId
      }
    })

    if (!quote) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    if (quote.status === 'FULLY_CONVERTED') {
      throw new AppError('No se puede cancelar un presupuesto totalmente convertido', 400)
    }

    if (quote.status === 'PARTIALLY_CONVERTED') {
      throw new AppError('No se puede cancelar un presupuesto parcialmente convertido', 400)
    }

    return await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'CANCELLED' }
    })
  }
}
