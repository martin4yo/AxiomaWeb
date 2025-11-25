import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

class InventoryService {
  // Almacenes
  async getWarehouses(db: any) {
    return await db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  }

  async getWarehouse(db: any, id: string) {
    return await db.warehouse.findUnique({
      where: { id },
      include: {
        warehouseStocks: {
          include: {
            product: true
          }
        }
      }
    })
  }

  async createWarehouse(db: any, data: any) {
    // Si es el primer almacén o se marca como default, actualizar otros
    if (data.isDefault) {
      await db.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    return await db.warehouse.create({
      data
    })
  }

  async updateWarehouse(db: any, id: string, data: any) {
    if (data.isDefault) {
      await db.warehouse.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }

    return await db.warehouse.update({
      where: { id },
      data
    })
  }

  async deleteWarehouse(db: any, id: string) {
    // Verificar que no tenga stock
    const hasStock = await db.warehouseStock.findFirst({
      where: {
        warehouseId: id,
        quantity: { gt: 0 }
      }
    })

    if (hasStock) {
      throw new Error('No se puede eliminar un almacén con stock')
    }

    return await db.warehouse.update({
      where: { id },
      data: { isActive: false }
    })
  }

  // Stock
  async getStock(db: any, filters: any) {
    const where: any = {}
    if (filters.warehouseId) where.warehouseId = filters.warehouseId
    if (filters.productId) where.productId = filters.productId

    return await db.warehouseStock.findMany({
      where,
      include: {
        warehouse: true,
        product: true
      }
    })
  }

  async getProductStock(db: any, productId: string) {
    const stocks = await db.warehouseStock.findMany({
      where: { productId },
      include: {
        warehouse: true
      }
    })

    const totalStock = stocks.reduce((sum: number, stock: any) => {
      return sum + Number(stock.quantity)
    }, 0)

    const totalReserved = stocks.reduce((sum: number, stock: any) => {
      return sum + Number(stock.reservedQty)
    }, 0)

    return {
      productId,
      totalStock,
      totalReserved,
      totalAvailable: totalStock - totalReserved,
      byWarehouse: stocks
    }
  }

  async getWarehouseStock(db: any, warehouseId: string) {
    return await db.warehouseStock.findMany({
      where: { warehouseId },
      include: {
        product: true
      },
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    })
  }

  async getLowStock(db: any) {
    const products = await db.product.findMany({
      where: {
        isActive: true,
        trackStock: true
      },
      include: {
        warehouseStocks: true
      }
    })

    return products.filter((product: any) => {
      const totalStock = product.warehouseStocks.reduce((sum: number, stock: any) => {
        return sum + Number(stock.quantity)
      }, 0)
      return totalStock <= Number(product.minStock)
    }).map((product: any) => {
      const totalStock = product.warehouseStocks.reduce((sum: number, stock: any) => {
        return sum + Number(stock.quantity)
      }, 0)
      return {
        ...product,
        currentStock: totalStock,
        stockStatus: totalStock === 0 ? 'out_of_stock' : 'low_stock'
      }
    })
  }

  // Movimientos
  async getMovements(db: any, filters: any) {
    const where: any = {}

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    if (filters.warehouseId) where.warehouseId = filters.warehouseId
    if (filters.productId) where.productId = filters.productId
    if (filters.movementType) where.movementType = filters.movementType

    return await db.stockMovement.findMany({
      where,
      include: {
        warehouse: true,
        product: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getMovement(db: any, id: string) {
    return await db.stockMovement.findUnique({
      where: { id },
      include: {
        warehouse: true,
        product: true,
        user: true
      }
    })
  }

  async createMovement(db: any, data: any, userId: string) {
    return await db.$transaction(async (tx: any) => {
      // Crear el movimiento
      const movement = await tx.stockMovement.create({
        data: {
          ...data,
          userId,
          totalCost: data.unitCost ? Number(data.quantity) * Number(data.unitCost) : null
        }
      })

      // Actualizar stock del almacén
      const warehouseStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: data.warehouseId,
            productId: data.productId
          }
        }
      })

      const quantityChange = data.movementType === 'IN'
        ? Number(data.quantity)
        : -Number(data.quantity)

      if (warehouseStock) {
        const newQuantity = Number(warehouseStock.quantity) + quantityChange

        if (newQuantity < 0) {
          throw new Error('Stock insuficiente para realizar el movimiento')
        }

        await tx.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: {
            quantity: newQuantity,
            availableQty: newQuantity - Number(warehouseStock.reservedQty),
            lastMovement: new Date()
          }
        })
      } else {
        if (data.movementType === 'OUT') {
          throw new Error('No hay stock disponible para realizar la salida')
        }

        await tx.warehouseStock.create({
          data: {
            tenantId: movement.tenantId,
            warehouseId: data.warehouseId,
            productId: data.productId,
            quantity: data.quantity,
            reservedQty: 0,
            availableQty: data.quantity,
            lastMovement: new Date()
          }
        })
      }

      // Actualizar el stock actual del producto
      const allStocks = await tx.warehouseStock.findMany({
        where: { productId: data.productId }
      })

      const totalStock = allStocks.reduce((sum: number, stock: any) => {
        return sum + Number(stock.quantity)
      }, 0)

      await tx.product.update({
        where: { id: data.productId },
        data: { currentStock: totalStock }
      })

      return movement
    })
  }

  // Ajustes
  async getAdjustments(db: any) {
    return await db.stockAdjustment.findMany({
      include: {
        warehouse: true,
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getAdjustment(db: any, id: string) {
    return await db.stockAdjustment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        creator: true,
        items: true
      }
    })
  }

  async createAdjustment(db: any, data: any, userId: string) {
    return await db.$transaction(async (tx: any) => {
      // Generar número de ajuste
      const lastAdjustment = await tx.stockAdjustment.findFirst({
        orderBy: { adjustmentNumber: 'desc' }
      })

      const adjustmentNumber = lastAdjustment
        ? `ADJ-${String(parseInt(lastAdjustment.adjustmentNumber.split('-')[1]) + 1).padStart(6, '0')}`
        : 'ADJ-000001'

      // Calcular totales
      let totalValue = 0
      for (const item of data.items) {
        const difference = Number(item.adjustedQty) - Number(item.currentQty)
        const itemValue = difference * Number(item.unitCost)
        totalValue += itemValue
      }

      // Crear ajuste
      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: data.warehouseId,
          adjustmentDate: new Date(),
          reason: data.reason,
          notes: data.notes,
          totalValue,
          createdBy: userId,
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              currentQty: item.currentQty,
              adjustedQty: item.adjustedQty,
              difference: Number(item.adjustedQty) - Number(item.currentQty),
              unitCost: item.unitCost,
              totalValue: (Number(item.adjustedQty) - Number(item.currentQty)) * Number(item.unitCost),
              reason: item.reason
            }))
          }
        },
        include: {
          items: true
        }
      })

      return adjustment
    })
  }

  async approveAdjustment(db: any, id: string, userId: string) {
    return await db.$transaction(async (tx: any) => {
      const adjustment = await tx.stockAdjustment.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!adjustment) {
        throw new Error('Ajuste no encontrado')
      }

      if (adjustment.status !== 'draft') {
        throw new Error('Solo se pueden aprobar ajustes en borrador')
      }

      // Aplicar ajustes al stock
      for (const item of adjustment.items) {
        const difference = Number(item.difference)

        // Crear movimiento de stock
        await tx.stockMovement.create({
          data: {
            tenantId: adjustment.tenantId,
            warehouseId: adjustment.warehouseId,
            productId: item.productId,
            movementType: difference > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(difference),
            unitCost: item.unitCost,
            totalCost: item.totalValue,
            documentType: 'ADJUSTMENT',
            documentId: adjustment.id,
            referenceNumber: adjustment.adjustmentNumber,
            notes: `Ajuste de inventario: ${adjustment.reason}`,
            userId
          }
        })

        // Actualizar stock del almacén
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: adjustment.warehouseId,
              productId: item.productId
            }
          }
        })

        if (warehouseStock) {
          await tx.warehouseStock.update({
            where: { id: warehouseStock.id },
            data: {
              quantity: item.adjustedQty,
              availableQty: Number(item.adjustedQty) - Number(warehouseStock.reservedQty),
              lastMovement: new Date()
            }
          })
        } else {
          await tx.warehouseStock.create({
            data: {
              tenantId: adjustment.tenantId,
              warehouseId: adjustment.warehouseId,
              productId: item.productId,
              quantity: item.adjustedQty,
              reservedQty: 0,
              availableQty: item.adjustedQty,
              lastMovement: new Date()
            }
          })
        }
      }

      // Actualizar estado del ajuste
      return await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date()
        }
      })
    })
  }

  async cancelAdjustment(db: any, id: string) {
    return await db.stockAdjustment.update({
      where: { id },
      data: { status: 'cancelled' }
    })
  }

  // Reportes
  async getInventoryValuation(db: any, warehouseId?: string) {
    const where: any = {}
    if (warehouseId) where.warehouseId = warehouseId

    const stocks = await db.warehouseStock.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      }
    })

    const valuation = stocks.map((stock: any) => {
      const value = Number(stock.quantity) * Number(stock.product.costPrice)
      return {
        warehouse: stock.warehouse.name,
        product: stock.product.name,
        sku: stock.product.sku,
        quantity: Number(stock.quantity),
        unitCost: Number(stock.product.costPrice),
        totalValue: value
      }
    })

    const totalValue = valuation.reduce((sum: number, item: any) => sum + item.totalValue, 0)

    return {
      items: valuation,
      totalValue,
      generatedAt: new Date()
    }
  }

  async getMovementsSummary(db: any, filters: any) {
    const where: any = {}

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    const movements = await db.stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      }
    })

    // Agrupar por tipo de movimiento
    const summary = {
      entries: movements.filter((m: any) => m.movementType === 'IN'),
      exits: movements.filter((m: any) => m.movementType === 'OUT'),
      transfers: movements.filter((m: any) => m.movementType === 'TRANSFER'),
      totalEntries: 0,
      totalExits: 0,
      totalTransfers: 0,
      totalValueIn: 0,
      totalValueOut: 0
    }

    summary.entries.forEach((m: any) => {
      summary.totalEntries += Number(m.quantity)
      summary.totalValueIn += Number(m.totalCost || 0)
    })

    summary.exits.forEach((m: any) => {
      summary.totalExits += Number(m.quantity)
      summary.totalValueOut += Number(m.totalCost || 0)
    })

    summary.transfers.forEach((m: any) => {
      summary.totalTransfers += Number(m.quantity)
    })

    return summary
  }

  async getProductKardex(db: any, productId: string, filters: any) {
    const where: any = { productId }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate)
    }

    if (filters.warehouseId) where.warehouseId = filters.warehouseId

    const movements = await db.stockMovement.findMany({
      where,
      include: {
        warehouse: true
      },
      orderBy: { createdAt: 'asc' }
    })

    let balance = 0
    const kardex = movements.map((movement: any) => {
      const quantity = Number(movement.quantity)
      const isEntry = movement.movementType === 'IN'

      if (isEntry) {
        balance += quantity
      } else {
        balance -= quantity
      }

      return {
        date: movement.createdAt,
        document: movement.referenceNumber || '-',
        warehouse: movement.warehouse.name,
        type: movement.movementType,
        entry: isEntry ? quantity : 0,
        exit: !isEntry ? quantity : 0,
        balance,
        unitCost: Number(movement.unitCost || 0),
        totalCost: Number(movement.totalCost || 0),
        notes: movement.notes
      }
    })

    return {
      product: await db.product.findUnique({ where: { id: productId } }),
      movements: kardex,
      finalBalance: balance
    }
  }
}

export const inventoryService = new InventoryService()