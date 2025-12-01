import { Request, Response } from 'express'
import { inventoryService } from '../services/inventoryService.js'

class InventoryController {
  // Almacenes
  async getWarehouses(req: Request, res: Response) {
    try {
      const warehouses = await inventoryService.getWarehouses(req.tenantDb)
      res.json(warehouses)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener almacenes' })
    }
  }

  async getWarehouse(req: Request, res: Response) {
    try {
      const warehouse = await inventoryService.getWarehouse(req.tenantDb, req.params.id)
      if (!warehouse) {
        return res.status(404).json({ error: 'Almacén no encontrado' })
      }
      res.json(warehouse)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener almacén' })
    }
  }

  async createWarehouse(req: Request, res: Response) {
    try {
      console.log('[PACKAGE] Creating warehouse with data:', req.body)
      console.log('🔑 Tenant ID:', req.tenant?.id)
      const warehouse = await inventoryService.createWarehouse(req.tenantDb, req.body)
      console.log('[OK] Warehouse created:', warehouse)
      res.status(201).json(warehouse)
    } catch (error: any) {
      console.error('[ERROR] Error creating warehouse:', error)
      console.error('[ERROR] Error stack:', error.stack)
      res.status(500).json({ error: error.message || 'Error al crear almacén' })
    }
  }

  async updateWarehouse(req: Request, res: Response) {
    try {
      const warehouse = await inventoryService.updateWarehouse(
        req.tenantDb,
        req.params.id,
        req.body
      )
      res.json(warehouse)
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar almacén' })
    }
  }

  async deleteWarehouse(req: Request, res: Response) {
    try {
      await inventoryService.deleteWarehouse(req.tenantDb, req.params.id)
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar almacén' })
    }
  }

  // Stock
  async getStock(req: Request, res: Response) {
    try {
      const { warehouseId, productId } = req.query
      const stock = await inventoryService.getStock(req.tenantDb, {
        warehouseId: warehouseId as string,
        productId: productId as string
      })
      res.json(stock)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener stock' })
    }
  }

  async getProductStock(req: Request, res: Response) {
    try {
      const stock = await inventoryService.getProductStock(
        req.tenantDb,
        req.params.productId
      )
      res.json(stock)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener stock del producto' })
    }
  }

  async getWarehouseStock(req: Request, res: Response) {
    try {
      const stock = await inventoryService.getWarehouseStock(
        req.tenantDb,
        req.params.warehouseId
      )
      res.json(stock)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener stock del almacén' })
    }
  }

  async getLowStock(req: Request, res: Response) {
    try {
      const lowStock = await inventoryService.getLowStock(req.tenantDb)
      res.json(lowStock)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener productos con stock bajo' })
    }
  }

  // Movimientos
  async getMovements(req: Request, res: Response) {
    try {
      const { startDate, endDate, warehouseId, productId, movementType } = req.query
      const movements = await inventoryService.getMovements(req.tenantDb, {
        startDate: startDate as string,
        endDate: endDate as string,
        warehouseId: warehouseId as string,
        productId: productId as string,
        movementType: movementType as string
      })
      res.json(movements)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener movimientos' })
    }
  }

  async getMovement(req: Request, res: Response) {
    try {
      const movement = await inventoryService.getMovement(req.tenantDb, req.params.id)
      if (!movement) {
        return res.status(404).json({ error: 'Movimiento no encontrado' })
      }
      res.json(movement)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener movimiento' })
    }
  }

  async createMovement(req: Request, res: Response) {
    try {
      const movement = await inventoryService.createMovement(
        req.tenantDb,
        req.body,
        req.user!.id
      )
      res.status(201).json(movement)
    } catch (error) {
      res.status(500).json({ error: 'Error al crear movimiento' })
    }
  }

  // Ajustes
  async getAdjustments(req: Request, res: Response) {
    try {
      const adjustments = await inventoryService.getAdjustments(req.tenantDb)
      res.json(adjustments)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener ajustes' })
    }
  }

  async getAdjustment(req: Request, res: Response) {
    try {
      const adjustment = await inventoryService.getAdjustment(req.tenantDb, req.params.id)
      if (!adjustment) {
        return res.status(404).json({ error: 'Ajuste no encontrado' })
      }
      res.json(adjustment)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener ajuste' })
    }
  }

  async createAdjustment(req: Request, res: Response) {
    try {
      const adjustment = await inventoryService.createAdjustment(
        req.tenantDb,
        req.body,
        req.user!.id
      )
      res.status(201).json(adjustment)
    } catch (error) {
      res.status(500).json({ error: 'Error al crear ajuste' })
    }
  }

  async approveAdjustment(req: Request, res: Response) {
    try {
      const adjustment = await inventoryService.approveAdjustment(
        req.tenantDb,
        req.params.id,
        req.user!.id
      )
      res.json(adjustment)
    } catch (error) {
      res.status(500).json({ error: 'Error al aprobar ajuste' })
    }
  }

  async cancelAdjustment(req: Request, res: Response) {
    try {
      const adjustment = await inventoryService.cancelAdjustment(
        req.tenantDb,
        req.params.id
      )
      res.json(adjustment)
    } catch (error) {
      res.status(500).json({ error: 'Error al cancelar ajuste' })
    }
  }

  // Reportes
  async getInventoryValuation(req: Request, res: Response) {
    try {
      const valuation = await inventoryService.getInventoryValuation(
        req.tenantDb,
        req.query.warehouseId as string
      )
      res.json(valuation)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener valoración de inventario' })
    }
  }

  async getMovementsSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query
      const summary = await inventoryService.getMovementsSummary(req.tenantDb, {
        startDate: startDate as string,
        endDate: endDate as string
      })
      res.json(summary)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener resumen de movimientos' })
    }
  }

  async getProductKardex(req: Request, res: Response) {
    try {
      const { startDate, endDate, warehouseId } = req.query
      const kardex = await inventoryService.getProductKardex(
        req.tenantDb,
        req.params.productId,
        {
          startDate: startDate as string,
          endDate: endDate as string,
          warehouseId: warehouseId as string
        }
      )
      res.json(kardex)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener kardex del producto' })
    }
  }
}

export const inventoryController = new InventoryController()