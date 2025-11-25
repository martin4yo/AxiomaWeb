import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateSaleItem,
  calculateSaleTotals,
  determineVoucherType,
  validatePayments,
  calculatePaymentStatus,
  SaleItemResult
} from '../utils/calculationService.js'
import { AppError } from '../middleware/errorHandler.js'

interface CreateSaleItemInput {
  productId: string
  quantity: number
  unitPrice?: number  // Opcional, se toma del producto si no se proporciona
  discountPercent?: number
  taxRate?: number  // Opcional, se usa tasa por defecto si no se proporciona
}

interface CreateSalePaymentInput {
  paymentMethodId: string
  amount: number
  reference?: string
  referenceDate?: string
}

interface CreateSaleInput {
  customerId?: string
  warehouseId: string
  items: CreateSaleItemInput[]
  payments: CreateSalePaymentInput[]
  notes?: string
  shouldInvoice?: boolean
  discountPercent?: number
}

export class SalesService {
  constructor(private prisma: PrismaClient, private tenantId: string, private userId: string) {}

  /**
   * Crea una nueva venta con todos sus items y pagos
   * - Valida stock disponible
   * - Calcula totales e impuestos
   * - Descuenta stock del almacén
   * - Crea movimientos de stock
   * - Valida que suma de pagos = total
   */
  async createSale(data: CreateSaleInput) {
    const {
      customerId,
      warehouseId,
      items: itemsInput,
      payments: paymentsInput,
      notes,
      shouldInvoice = false,
      discountPercent = 0
    } = data

    // 1. Validar que el almacén existe y está activo
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        tenantId: this.tenantId,
        isActive: true
      }
    })

    if (!warehouse) {
      throw new AppError('Almacén no encontrado o inactivo', 404)
    }

    // 2. Obtener configuración del tenant (condición IVA)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantId },
      include: {
        tenantVatCondition: true
      }
    })

    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404)
    }

    // 3. Si hay cliente, obtener sus datos y condición IVA
    let customer = null
    let customerVatCondition = null
    let customerName = 'Consumidor Final'
    let customerType = 'final'

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
      customerVatCondition = customer.ivaCondition
      customerType = 'registered'
    }

    // 4. Determinar tipo de factura y si discrimina IVA
    const { voucherType, discriminateVAT } = determineVoucherType(
      tenant.tenantVatCondition?.code || null,
      customerVatCondition
    )

    // 5. Obtener tasa de IVA por defecto (21% para Argentina)
    const defaultTaxRate = tenant.tenantVatCondition?.taxRate || new Decimal(21)

    // 6. Procesar items y validar stock
    const processedItems: Array<{
      product: any
      input: CreateSaleItemInput
      calculation: SaleItemResult
      warehouseStock: any
    }> = []

    for (const itemInput of itemsInput) {
      // Obtener producto
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

      // Verificar stock disponible
      if (product.trackStock) {
        const warehouseStock = await this.prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: product.id
            }
          }
        })

        const availableQty = warehouseStock?.availableQty || new Decimal(0)
        const requestedQty = new Decimal(itemInput.quantity)

        if (availableQty.lessThan(requestedQty)) {
          throw new AppError(
            `Stock insuficiente para ${product.name}. Disponible: ${availableQty}, Solicitado: ${requestedQty}`,
            400
          )
        }

        processedItems.push({
          product,
          input: itemInput,
          calculation: null as any, // Se calcula después
          warehouseStock
        })
      } else {
        processedItems.push({
          product,
          input: itemInput,
          calculation: null as any,
          warehouseStock: null
        })
      }
    }

    // 7. Calcular montos de cada item
    const itemCalculations: SaleItemResult[] = []

    for (const item of processedItems) {
      const unitPrice = item.input.unitPrice !== undefined
        ? new Decimal(item.input.unitPrice)
        : item.product.salePrice

      const taxRate = item.input.taxRate !== undefined
        ? new Decimal(item.input.taxRate)
        : defaultTaxRate

      const calculation = calculateSaleItem({
        quantity: new Decimal(item.input.quantity),
        unitPrice,
        discountPercent: new Decimal(item.input.discountPercent || 0),
        taxRate,
        discriminateVAT,
        unitCost: item.product.costPrice
      })

      item.calculation = calculation
      itemCalculations.push(calculation)
    }

    // 8. Calcular totales de la venta
    const totals = calculateSaleTotals(itemCalculations)

    // 9. Validar que suma de pagos = total
    if (!validatePayments(totals.totalAmount, paymentsInput.map(p => ({ amount: new Decimal(p.amount) })))) {
      throw new AppError(
        `La suma de pagos (${paymentsInput.reduce((acc, p) => acc + p.amount, 0)}) debe ser igual al total (${totals.totalAmount})`,
        400
      )
    }

    // 10. Generar número de venta
    const saleNumber = await this.generateSaleNumber(warehouse.code)

    // 11. Calcular estado de pago
    const totalPaid = paymentsInput.reduce((acc, p) => acc + p.amount, 0)
    const paymentStatus = calculatePaymentStatus(totals.totalAmount, new Decimal(totalPaid))

    // 12. Crear venta en transacción
    const sale = await this.prisma.$transaction(async (tx) => {
      // Obtener fecha local sin hora
      const now = new Date()
      const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Crear venta
      const newSale = await tx.sale.create({
        data: {
          tenantId: this.tenantId,
          saleNumber,
          saleDate: localDate,
          customerId: customerId || null,
          customerName,
          customerType,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paidAmount: new Decimal(totalPaid),
          balanceAmount: totals.totalAmount.sub(new Decimal(totalPaid)),
          paymentStatus,
          voucherType,
          warehouseId,
          notes: notes || null,
          status: 'completed',
          createdBy: this.userId,
          discountPercent: new Decimal(discountPercent),
          afipStatus: shouldInvoice ? 'pending' : 'not_sent'
        }
      })

      // Crear items
      let lineNumber = 1
      for (const item of processedItems) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            lineNumber: lineNumber++,
            productId: item.product.id,
            productSku: item.product.sku,
            productName: item.product.name,
            description: item.product.description,
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
            lineTotal: item.calculation.lineTotal,
            unitCost: item.product.costPrice,
            totalCost: item.calculation.totalCost || null,
            priceIncludesTax: true
          }
        })

        // Descontar stock si aplica
        if (item.product.trackStock && item.warehouseStock) {
          const newQuantity = item.warehouseStock.quantity.sub(new Decimal(item.input.quantity))
          const newAvailable = item.warehouseStock.availableQty.sub(new Decimal(item.input.quantity))

          await tx.warehouseStock.update({
            where: {
              id: item.warehouseStock.id
            },
            data: {
              quantity: newQuantity,
              availableQty: newAvailable,
              lastMovement: new Date()
            }
          })

          // Crear movimiento de stock
          await tx.stockMovement.create({
            data: {
              tenantId: this.tenantId,
              warehouseId,
              productId: item.product.id,
              movementType: 'OUT',
              quantity: new Decimal(item.input.quantity),
              unitCost: item.product.costPrice,
              totalCost: new Decimal(item.input.quantity).mul(item.product.costPrice),
              documentType: 'SALE',
              documentId: newSale.id,
              referenceNumber: saleNumber,
              notes: `Venta ${saleNumber}`,
              userId: this.userId
            }
          })
        }
      }

      // Crear pagos
      for (const paymentInput of paymentsInput) {
        const paymentMethod = await tx.paymentMethod.findFirst({
          where: {
            id: paymentInput.paymentMethodId,
            tenantId: this.tenantId,
            isActive: true
          }
        })

        if (!paymentMethod) {
          throw new AppError(`Forma de pago ${paymentInput.paymentMethodId} no encontrada`, 404)
        }

        await tx.salePayment.create({
          data: {
            saleId: newSale.id,
            paymentMethodId: paymentMethod.id,
            paymentMethodName: paymentMethod.name,
            amount: new Decimal(paymentInput.amount),
            reference: paymentInput.reference || null,
            referenceDate: paymentInput.referenceDate ? new Date(paymentInput.referenceDate) : null,
            status: 'completed',
            collectionDate: new Date()
          }
        })
      }

      return newSale
    })

    // 13. Retornar venta con todos sus datos
    return this.getSaleById(sale.id)
  }

  /**
   * Genera número secuencial de venta para el tenant en formato: 00000-00000000
   * Donde el primer número es el código de sucursal y el segundo es el número correlativo
   */
  private async generateSaleNumber(warehouseCode: string): Promise<string> {
    // Formatear código de warehouse a 5 dígitos
    const branchCode = warehouseCode.padStart(5, '0')

    // Obtener el último número de venta para este tenant y warehouse
    const lastSale = await this.prisma.sale.findFirst({
      where: {
        tenantId: this.tenantId,
        saleNumber: {
          startsWith: `${branchCode}-`
        }
      },
      orderBy: { saleNumber: 'desc' }
    })

    if (!lastSale) {
      return `${branchCode}-00000001`
    }

    // Extraer número correlativo y sumar 1
    const match = lastSale.saleNumber.match(/^\d{5}-(\d{8})$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      return `${branchCode}-${num.toString().padStart(8, '0')}`
    }

    return `${branchCode}-00000001`
  }

  /**
   * Obtiene una venta por ID con todos sus datos
   */
  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        tenantId: this.tenantId
      },
      include: {
        customer: true,
        warehouse: true,
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: true
          },
          orderBy: {
            lineNumber: 'asc'
          }
        },
        payments: {
          include: {
            paymentMethod: true
          }
        },
        invoice: true
      }
    })

    if (!sale) {
      throw new AppError('Venta no encontrada', 404)
    }

    return sale
  }

  /**
   * Lista ventas con filtros y paginación
   */
  async listSales(filters: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
    customerId?: string
    paymentStatus?: string
    afipStatus?: string
    search?: string
  }) {
    const {
      page = 1,
      limit = 50,
      dateFrom,
      dateTo,
      customerId,
      paymentStatus,
      afipStatus,
      search
    } = filters

    const skip = (page - 1) * limit
    const take = limit

    const where: Prisma.SaleWhereInput = {
      tenantId: this.tenantId
    }

    if (dateFrom) {
      where.saleDate = { ...where.saleDate, gte: new Date(dateFrom) }
    }

    if (dateTo) {
      where.saleDate = { ...where.saleDate, lte: new Date(dateTo) }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (afipStatus) {
      where.afipStatus = afipStatus
    }

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: true,
          warehouse: true,
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true
            }
          },
          payments: {
            select: {
              id: true,
              paymentMethodName: true,
              amount: true,
              status: true
            }
          }
        }
      }),
      this.prisma.sale.count({ where })
    ])

    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Cancela una venta y revierte el stock
   */
  async cancelSale(id: string) {
    const sale = await this.getSaleById(id)

    if (sale.status === 'cancelled') {
      throw new AppError('La venta ya está cancelada', 400)
    }

    if (sale.afipStatus === 'authorized') {
      throw new AppError('No se puede cancelar una venta con factura AFIP autorizada', 400)
    }

    // Cancelar en transacción
    return await this.prisma.$transaction(async (tx) => {
      // Actualizar estado de venta
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      })

      // Revertir stock de cada item
      for (const item of sale.items) {
        if (item.product && item.product.trackStock) {
          const warehouseStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: sale.warehouseId!,
                productId: item.productId!
              }
            }
          })

          if (warehouseStock) {
            await tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: {
                quantity: warehouseStock.quantity.add(item.quantity),
                availableQty: warehouseStock.availableQty.add(item.quantity),
                lastMovement: new Date()
              }
            })

            // Crear movimiento de reversión
            await tx.stockMovement.create({
              data: {
                tenantId: this.tenantId,
                warehouseId: sale.warehouseId!,
                productId: item.productId!,
                movementType: 'IN',
                quantity: item.quantity,
                unitCost: item.unitCost || new Decimal(0),
                totalCost: item.totalCost || new Decimal(0),
                documentType: 'SALE_CANCELLATION',
                documentId: sale.id,
                referenceNumber: sale.saleNumber,
                notes: `Cancelación de venta ${sale.saleNumber}`,
                userId: this.userId
              }
            })
          }
        }
      }

      // Cancelar pagos
      await tx.salePayment.updateMany({
        where: { saleId: id },
        data: { status: 'cancelled' }
      })

      return updatedSale
    })
  }
}
