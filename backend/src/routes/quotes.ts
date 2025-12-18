import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { QuoteService } from '../services/quoteService.js'
import { QuoteStatus } from '@prisma/client'

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
  items: z.array(createQuoteItemSchema).min(1, 'Debe haber al menos un item'),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  internalNotes: z.string().optional(),
  validUntil: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional()
})

const updateQuoteStatusSchema = z.object({
  status: z.nativeEnum(QuoteStatus)
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

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await quoteService.listQuotes({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      status: status as QuoteStatus,
      search: search as string,
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc'
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes/:id - Obtener presupuesto por ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.getQuoteById(id)

    res.json(quote)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/quotes/:id/conversion-data - Obtener datos para conversión a venta
router.get('/:id/conversion-data', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const conversionData = await quoteService.getDataForSaleConversion(id)

    res.json(conversionData)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/:tenantSlug/quotes/:id/status - Actualizar estado
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = updateQuoteStatusSchema.parse(req.body)

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.updateQuoteStatus(id, status)

    res.json({
      message: 'Estado actualizado exitosamente',
      quote
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/quotes/:id/cancel - Cancelar presupuesto
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const quote = await quoteService.cancelQuote(id)

    res.json({
      message: 'Presupuesto cancelado exitosamente',
      quote
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/quotes/:id/record-conversion - Registrar conversión
router.post('/:id/record-conversion', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { itemsConverted } = req.body

    const quoteService = new QuoteService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    await quoteService.recordSaleConversion(id, itemsConverted)

    res.json({
      message: 'Conversión registrada exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

export default router
