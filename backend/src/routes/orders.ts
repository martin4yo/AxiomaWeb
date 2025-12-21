import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { OrderService } from '../services/orderService.js'
import { OrderStatus, StockBehavior } from '@prisma/client'

const router = Router({ mergeParams: true })

// Validation schemas
const createOrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional(),
  description: z.string().optional(),
  quoteItemId: z.string().optional() // Para conversión desde presupuesto
})

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1, 'Debe haber al menos un item'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  expectedDate: z.string().optional(),
  stockBehavior: z.nativeEnum(StockBehavior).optional(),
  quoteId: z.string().optional() // Para conversión desde presupuesto
})

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
})

// POST /api/:tenantSlug/orders - Crear pedido
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = createOrderSchema.parse(req.body)

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await orderService.createOrder(validatedData)

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      order
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/orders - Listar pedidos
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page,
      limit,
      dateFrom,
      dateTo,
      customerId,
      status,
      search,
      orderBy,
      orderDirection
    } = req.query

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await orderService.listOrders({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      status: status as OrderStatus,
      search: search as string,
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc'
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/orders/:id - Obtener pedido por ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await orderService.getOrderById(id)

    res.json(order)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/orders/:id/conversion-data - Datos para convertir a venta
router.get('/:id/conversion-data', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const conversionData = await orderService.getDataForSaleConversion(id)

    res.json(conversionData)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/:tenantSlug/orders/:id/status - Actualizar estado
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = updateOrderStatusSchema.parse(req.body)

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await orderService.updateOrderStatus(id, status)

    res.json({
      message: 'Estado actualizado exitosamente',
      order
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/orders/:id/confirm - Confirmar pedido
router.post('/:id/confirm', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await orderService.confirmOrder(id)

    res.json({
      message: 'Pedido confirmado exitosamente',
      order
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/orders/:id/cancel - Cancelar pedido
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const order = await orderService.cancelOrder(id)

    res.json({
      message: 'Pedido cancelado exitosamente',
      order
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/orders/:id/record-conversion - Registrar conversión a venta
router.post('/:id/record-conversion', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { itemsConverted, saleId } = req.body

    if (!saleId) {
      return res.status(400).json({ error: 'El ID de la venta es requerido' })
    }

    const orderService = new OrderService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    await orderService.recordSaleConversion(id, itemsConverted, saleId)

    res.json({
      message: 'Conversión registrada exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

export default router
