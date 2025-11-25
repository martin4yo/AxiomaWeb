import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { SalesService } from '../services/salesService.js'

const router = Router({ mergeParams: true })

// Validation schemas
const createSaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional()
})

const createSalePaymentSchema = z.object({
  paymentMethodId: z.string(),
  amount: z.number().positive(),
  reference: z.string().optional(),
  referenceDate: z.string().optional()
})

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string(),
  items: z.array(createSaleItemSchema).min(1, 'Debe haber al menos un item'),
  payments: z.array(createSalePaymentSchema).min(1, 'Debe haber al menos una forma de pago'),
  notes: z.string().optional(),
  shouldInvoice: z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional()
})

// POST /api/:tenantSlug/sales - Crear venta
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = createSaleSchema.parse(req.body)

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.createSale(validatedData)

    res.status(201).json({
      message: 'Venta creada exitosamente',
      sale
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales - Listar ventas
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      dateFrom,
      dateTo,
      customerId,
      paymentStatus,
      afipStatus,
      search
    } = req.query

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await salesService.listSales({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      paymentStatus: paymentStatus as string,
      afipStatus: afipStatus as string,
      search: search as string
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/:id - Obtener detalle de venta
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.getSaleById(req.params.id)

    res.json({ sale })
  } catch (error) {
    next(error)
  }
})

// PUT /api/:tenantSlug/sales/:id/cancel - Cancelar venta
router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.cancelSale(req.params.id)

    res.json({
      message: 'Venta cancelada exitosamente',
      sale
    })
  } catch (error) {
    next(error)
  }
})

export default router
