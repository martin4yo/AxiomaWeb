import { Router } from 'express'
import { inventoryController } from '../controllers/inventoryController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { z } from 'zod'

const router = Router()

// Schemas de validación
const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  isDefault: z.boolean().optional()
})

const stockMovementSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  movementType: z.enum(['IN', 'OUT', 'TRANSFER']),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  documentType: z.string().optional(),
  documentId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
})

const stockAdjustmentSchema = z.object({
  warehouseId: z.string(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    currentQty: z.number(),
    adjustedQty: z.number(),
    unitCost: z.number(),
    reason: z.string().optional()
  }))
})

// Rutas protegidas con autenticación
router.use(authMiddleware)

// Almacenes
router.get('/warehouses', inventoryController.getWarehouses)
router.get('/warehouses/:id', inventoryController.getWarehouse)
router.post('/warehouses', validateRequest(warehouseSchema), inventoryController.createWarehouse)
router.put('/warehouses/:id', validateRequest(warehouseSchema), inventoryController.updateWarehouse)
router.delete('/warehouses/:id', inventoryController.deleteWarehouse)

// Stock por almacén
router.get('/stock', inventoryController.getStock)
router.get('/stock/product/:productId', inventoryController.getProductStock)
router.get('/stock/warehouse/:warehouseId', inventoryController.getWarehouseStock)
router.get('/stock/low', inventoryController.getLowStock)

// Movimientos de stock
router.get('/movements', inventoryController.getMovements)
router.get('/movements/:id', inventoryController.getMovement)
router.post('/movements', validateRequest(stockMovementSchema), inventoryController.createMovement)

// Ajustes de inventario
router.get('/adjustments', inventoryController.getAdjustments)
router.get('/adjustments/:id', inventoryController.getAdjustment)
router.post('/adjustments', validateRequest(stockAdjustmentSchema), inventoryController.createAdjustment)
router.put('/adjustments/:id/approve', inventoryController.approveAdjustment)
router.put('/adjustments/:id/cancel', inventoryController.cancelAdjustment)

// Reportes
router.get('/reports/valuation', inventoryController.getInventoryValuation)
router.get('/reports/movements-summary', inventoryController.getMovementsSummary)
router.get('/reports/kardex/:productId', inventoryController.getProductKardex)

export default router