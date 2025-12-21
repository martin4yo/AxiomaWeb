import { PrismaClient, Prisma, OrderStatus, StockBehavior } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateSaleItem,
  calculateSaleTotals,
  SaleItemResult
} from '../utils/calculationService.js'
import { AppError } from '../middleware/errorHandler.js'

interface CreateOrderItemInput {
  productId: string
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
  description?: string
  // Para conversión desde presupuesto
  quoteItemId?: string
}

interface CreateOrderInput {
  customerId?: string
  warehouseId?: string
  items: CreateOrderItemInput[]
  notes?: string
  internalNotes?: string
  expectedDate?: string  // ISO date string
  stockBehavior?: StockBehavior
  // Para conversión desde presupuesto
  quoteId?: string
}

export class OrderService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string,
    private userId: string
  ) {}

  /**
   * Crear pedido (puede reservar o descontar stock según configuración)
   */
  async createOrder(data: CreateOrderInput) {
    const {
      customerId,
      warehouseId,
      items: itemsInput,
      notes,
      internalNotes,
      expectedDate,
      stockBehavior = 'NONE',
      quoteId
    } = data

    // 1. Obtener tenant y configuración
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantId },
      include: { tenantVatCondition: true }
    })

    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404)
    }

    // 2. Validar almacén si se requiere stock
    let warehouse = null
    if (stockBehavior !== 'NONE') {
      if (!warehouseId) {
        throw new AppError('Debe seleccionar un almacén para reservar o descontar stock', 400)
      }
      warehouse = await this.prisma.warehouse.findFirst({
        where: {
          id: warehouseId,
          tenantId: this.tenantId,
          isActive: true
        }
      })
      if (!warehouse) {
        throw new AppError('Almacén no encontrado', 404)
      }
    }

    // 3. Obtener datos del cliente
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

    // 4. Determinar si discrimina IVA
    const customerVatCondition = customer?.ivaCondition
    const discriminateVAT = customerVatCondition === 'RI'

    // 5. Procesar items y validar stock si es necesario
    const processedItems: Array<{
      product: any
      input: CreateOrderItemInput
      calculation: SaleItemResult
      currentStock?: number
    }> = []

    // Usar tasa de IVA por defecto de 21% (VatCondition no tiene taxRate)
    const defaultTaxRate = new Decimal(21)

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

      // Validar stock si se va a reservar o descontar
      if (stockBehavior !== 'NONE' && warehouseId && product.trackStock) {
        const stockRecord = await this.prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: product.id
            }
          }
        })

        const currentStock = stockRecord ? Number(stockRecord.quantity) : 0

        // Si hay reservas activas, calcular stock disponible
        const reservedStock = await this.prisma.stockReservation.aggregate({
          where: {
            productId: product.id,
            warehouseId,
            status: 'active'
          },
          _sum: {
            quantity: true
          }
        })

        const availableStock = currentStock - Number(reservedStock._sum.quantity || 0)

        if (itemInput.quantity > availableStock) {
          throw new AppError(
            `Stock insuficiente para ${product.name}. Disponible: ${availableStock}, Solicitado: ${itemInput.quantity}`,
            400
          )
        }

        processedItems.push({
          product,
          input: itemInput,
          calculation: {} as SaleItemResult,
          currentStock: availableStock
        })
      } else {
        processedItems.push({
          product,
          input: itemInput,
          calculation: {} as SaleItemResult
        })
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

      processedItems[processedItems.length - 1].calculation = calculation
    }

    // 6. Calcular totales
    const totals = calculateSaleTotals(
      processedItems.map(item => item.calculation)
    )

    // 7. Generar número de pedido
    const orderNumber = await this.generateOrderNumber()

    // 8. Crear pedido en transacción
    const order = await this.prisma.$transaction(async (tx) => {
      // Crear el pedido
      const orderData = await tx.customerOrder.create({
        data: {
          tenantId: this.tenantId,
          orderNumber,
          orderDate: new Date(),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          customerId: customerId || null,
          customerName,
          warehouseId: warehouseId || null,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountPercent: new Decimal(0),
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          invoicedAmount: new Decimal(0),
          pendingAmount: totals.totalAmount,
          stockBehavior,
          notes,
          internalNotes,
          status: 'DRAFT',
          quoteId: quoteId || null,
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
                quantityInvoiced: new Decimal(0),
                quantityPending: quantity,
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
              }
            })
          }
        },
        include: {
          items: true,
          customer: true,
          warehouse: true
        }
      })

      // Si hay reserva de stock, crear las reservas
      if (stockBehavior === 'RESERVE' && warehouseId) {
        for (const item of processedItems) {
          if (item.product.trackStock) {
            await tx.stockReservation.create({
              data: {
                tenantId: this.tenantId,
                orderId: orderData.id,
                productId: item.product.id,
                warehouseId,
                quantity: new Decimal(item.input.quantity),
                quantityUsed: new Decimal(0),
                quantityReleased: new Decimal(0),
                status: 'active'
              }
            })
          }
        }
      }

      // Si es descuento inmediato, descontar stock
      if (stockBehavior === 'DEDUCT' && warehouseId) {
        for (const item of processedItems) {
          if (item.product.trackStock) {
            // Descontar del stock del almacén
            await tx.warehouseStock.update({
              where: {
                warehouseId_productId: {
                  warehouseId,
                  productId: item.product.id
                }
              },
              data: {
                quantity: {
                  decrement: new Decimal(item.input.quantity)
                }
              }
            })

            // Actualizar stock global del producto
            await tx.product.update({
              where: { id: item.product.id },
              data: {
                currentStock: {
                  decrement: new Decimal(item.input.quantity)
                }
              }
            })

            // Registrar movimiento de stock
            await tx.stockMovement.create({
              data: {
                tenantId: this.tenantId,
                productId: item.product.id,
                warehouseId,
                movementType: 'OUT',
                quantity: new Decimal(item.input.quantity).negated(),
                referenceNumber: `Pedido ${orderNumber}`,
                notes: `Stock descontado por pedido`,
                userId: this.userId
              }
            })
          }
        }
      }

      return orderData
    })

    // Si viene de un presupuesto, actualizar el presupuesto
    if (quoteId) {
      await this.updateQuoteAfterOrderCreation(quoteId, itemsInput)
    }

    return order
  }

  /**
   * Actualizar presupuesto después de crear pedido
   */
  private async updateQuoteAfterOrderCreation(
    quoteId: string,
    items: CreateOrderItemInput[]
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.quoteItemId) {
          const quoteItem = await tx.quoteItem.findUnique({
            where: { id: item.quoteItemId }
          })

          if (quoteItem) {
            const newConverted = new Decimal(quoteItem.quantityConverted).plus(item.quantity)
            const newPending = new Decimal(quoteItem.quantity).minus(newConverted)

            await tx.quoteItem.update({
              where: { id: item.quoteItemId },
              data: {
                quantityConverted: newConverted,
                quantityPending: newPending
              }
            })
          }
        }
      }

      // Verificar si el presupuesto está completamente convertido
      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { items: true }
      })

      if (quote) {
        const allConverted = quote.items.every(item =>
          new Decimal(item.quantity).equals(item.quantityConverted)
        )

        await tx.quote.update({
          where: { id: quoteId },
          data: {
            status: allConverted ? 'FULLY_CONVERTED' : 'PARTIALLY_CONVERTED'
          }
        })
      }
    })
  }

  /**
   * Generar número de pedido secuencial
   */
  private async generateOrderNumber(): Promise<string> {
    const lastOrder = await this.prisma.customerOrder.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { orderNumber: 'desc' }
    })

    if (!lastOrder) {
      return 'PED-00000001'
    }

    const match = lastOrder.orderNumber.match(/PED-(\d{8})/)
    if (match) {
      const num = parseInt(match[1]) + 1
      return `PED-${num.toString().padStart(8, '0')}`
    }

    return 'PED-00000001'
  }

  /**
   * Listar pedidos con filtros
   */
  async listOrders(filters: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
    customerId?: string
    status?: OrderStatus
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
      orderBy = 'orderDate',
      orderDirection = 'desc'
    } = filters

    const skip = (page - 1) * limit
    const take = limit

    const where: Prisma.CustomerOrderWhereInput = {
      tenantId: this.tenantId
    }

    if (dateFrom || dateTo) {
      where.orderDate = {}
      if (dateFrom) where.orderDate.gte = new Date(dateFrom)
      if (dateTo) where.orderDate.lte = new Date(dateTo)
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const orderByClause: any = {}
    orderByClause[orderBy] = orderDirection

    const [orders, total] = await Promise.all([
      this.prisma.customerOrder.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          customer: true,
          warehouse: true,
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              quantityInvoiced: true,
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
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true
            }
          }
        }
      }),
      this.prisma.customerOrder.count({ where })
    ])

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Obtener pedido por ID
   */
  async getOrderById(orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: {
        id: orderId,
        tenantId: this.tenantId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        warehouse: true,
        quote: true,
        stockReservations: true,
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

    if (!order) {
      throw new AppError('Pedido no encontrado', 404)
    }

    return order
  }

  /**
   * Actualizar estado del pedido
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.customerOrder.findFirst({
      where: {
        id: orderId,
        tenantId: this.tenantId
      }
    })

    if (!order) {
      throw new AppError('Pedido no encontrado', 404)
    }

    // Validaciones de cambio de estado
    if (order.status === 'COMPLETED') {
      throw new AppError('No se puede cambiar el estado de un pedido completado', 400)
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('No se puede cambiar el estado de un pedido cancelado', 400)
    }

    return await this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status }
    })
  }

  /**
   * Confirmar pedido (cambiar de DRAFT a CONFIRMED)
   */
  async confirmOrder(orderId: string) {
    return this.updateOrderStatus(orderId, 'CONFIRMED')
  }

  /**
   * Cancelar pedido y liberar stock reservado
   */
  async cancelOrder(orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: {
        id: orderId,
        tenantId: this.tenantId
      },
      include: {
        stockReservations: true,
        items: true
      }
    })

    if (!order) {
      throw new AppError('Pedido no encontrado', 404)
    }

    if (order.status === 'COMPLETED') {
      throw new AppError('No se puede cancelar un pedido completado', 400)
    }

    if (order.status === 'PARTIALLY_INVOICED') {
      throw new AppError('No se puede cancelar un pedido parcialmente facturado', 400)
    }

    await this.prisma.$transaction(async (tx) => {
      // Liberar reservas de stock
      for (const reservation of order.stockReservations) {
        if (reservation.status === 'active') {
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: {
              status: 'released',
              quantityReleased: reservation.quantity
            }
          })
        }
      }

      // Si el stock fue descontado (DEDUCT), devolverlo
      if (order.stockBehavior === 'DEDUCT' && order.warehouseId) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await tx.product.findUnique({
              where: { id: item.productId }
            })

            if (product?.trackStock) {
              // Devolver stock al almacén
              await tx.warehouseStock.update({
                where: {
                  warehouseId_productId: {
                    warehouseId: order.warehouseId,
                    productId: item.productId
                  }
                },
                data: {
                  quantity: {
                    increment: item.quantity
                  }
                }
              })

              // Devolver stock global
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  currentStock: {
                    increment: item.quantity
                  }
                }
              })

              // Registrar movimiento
              await tx.stockMovement.create({
                data: {
                  tenantId: this.tenantId,
                  productId: item.productId,
                  warehouseId: order.warehouseId,
                  movementType: 'IN',
                  quantity: item.quantity,
                  referenceNumber: `Cancelación pedido ${order.orderNumber}`,
                  notes: 'Devolución de stock por cancelación de pedido',
                  userId: this.userId
                }
              })
            }
          }
        }
      }

      // Actualizar estado del pedido
      await tx.customerOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })
    })

    return this.getOrderById(orderId)
  }

  /**
   * Obtener datos para convertir pedido a venta
   */
  async getDataForSaleConversion(orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: {
        id: orderId,
        tenantId: this.tenantId
      },
      include: {
        items: true,
        customer: true,
        warehouse: true
      }
    })

    if (!order) {
      throw new AppError('Pedido no encontrado', 404)
    }

    if (order.status === 'COMPLETED') {
      throw new AppError('Este pedido ya fue completamente facturado', 400)
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('No se puede facturar un pedido cancelado', 400)
    }

    if (order.status === 'DRAFT') {
      throw new AppError('Debe confirmar el pedido antes de facturarlo', 400)
    }

    // Filtrar solo items con cantidad pendiente
    const itemsWithPending = order.items
      .map(item => ({
        ...item,
        quantityPending: Number(item.quantity) - Number(item.quantityInvoiced)
      }))
      .filter(item => item.quantityPending > 0)

    return {
      orderId: order.id,
      customerId: order.customerId,
      warehouseId: order.warehouseId,
      stockBehavior: order.stockBehavior,
      items: itemsWithPending.map(item => ({
        orderItemId: item.id,
        productId: item.productId!,
        productName: item.productName,
        quantity: item.quantityPending,
        maxQuantity: item.quantityPending,
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent),
        taxRate: Number(item.taxRate),
        description: item.description
      })),
      notes: order.notes
    }
  }

  /**
   * Registrar conversión de pedido a venta
   */
  async recordSaleConversion(orderId: string, itemsConverted: Array<{
    orderItemId: string
    quantityConverted: number
  }>, saleId: string) {
    return await this.prisma.$transaction(async (tx) => {
      let totalInvoiced = new Decimal(0)

      // Actualizar cantidades facturadas en cada item
      for (const item of itemsConverted) {
        const orderItem = await tx.customerOrderItem.findUnique({
          where: { id: item.orderItemId }
        })

        if (!orderItem) continue

        const quantityPending = Number(orderItem.quantity) - Number(orderItem.quantityInvoiced)
        if (item.quantityConverted > quantityPending) {
          throw new AppError(
            `Cantidad a facturar (${item.quantityConverted}) supera la pendiente (${quantityPending})`,
            400
          )
        }

        const newInvoiced = new Decimal(orderItem.quantityInvoiced).plus(item.quantityConverted)
        const newPending = new Decimal(orderItem.quantity).minus(newInvoiced)
        const itemTotal = new Decimal(item.quantityConverted).times(orderItem.unitPrice)
        totalInvoiced = totalInvoiced.plus(itemTotal)

        await tx.customerOrderItem.update({
          where: { id: item.orderItemId },
          data: {
            quantityInvoiced: newInvoiced,
            quantityPending: newPending
          }
        })
      }

      // Obtener pedido actualizado
      const order = await tx.customerOrder.findFirst({
        where: { id: orderId },
        include: {
          items: true,
          stockReservations: true
        }
      })

      if (!order) throw new AppError('Pedido no encontrado', 404)

      // Verificar si está completamente facturado
      const allInvoiced = order.items.every(item =>
        new Decimal(item.quantity).equals(item.quantityInvoiced)
      )

      // Actualizar monto facturado y estado
      const newInvoicedAmount = new Decimal(order.invoicedAmount).plus(totalInvoiced)

      await tx.customerOrder.update({
        where: { id: orderId },
        data: {
          invoicedAmount: newInvoicedAmount,
          pendingAmount: new Decimal(order.totalAmount).minus(newInvoicedAmount),
          status: allInvoiced ? 'COMPLETED' : 'PARTIALLY_INVOICED'
        }
      })

      // Consumir reservas de stock si aplica
      if (order.stockBehavior === 'RESERVE') {
        for (const item of itemsConverted) {
          const orderItem = await tx.customerOrderItem.findUnique({
            where: { id: item.orderItemId }
          })

          if (orderItem?.productId) {
            const reservation = order.stockReservations.find(
              r => r.productId === orderItem.productId && r.status === 'active'
            )

            if (reservation) {
              const newUsed = new Decimal(reservation.quantityUsed).plus(item.quantityConverted)
              const isFullyConsumed = newUsed.gte(reservation.quantity)

              await tx.stockReservation.update({
                where: { id: reservation.id },
                data: {
                  quantityUsed: newUsed,
                  status: isFullyConsumed ? 'consumed' : 'active'
                }
              })
            }
          }
        }
      }
    })
  }
}
