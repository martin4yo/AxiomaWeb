import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const paymentMethodSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  paymentType: z.enum(['CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER']),
  requiresReference: z.boolean().default(false),
  daysToCollection: z.number().int().min(0).default(0)
})

// GET /api/:tenantSlug/payment-methods - List all payment methods
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const paymentMethods = await req.tenantDb!.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    res.json({ paymentMethods })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/payment-methods/:id - Get payment method by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const paymentMethod = await req.tenantDb!.paymentMethod.findUnique({
      where: { id: req.params.id }
    })

    if (!paymentMethod) {
      throw new AppError('Payment method not found', 404)
    }

    res.json({ paymentMethod })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/payment-methods - Create payment method
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = paymentMethodSchema.parse(req.body)

    // Check if name is unique
    const existing = await req.tenantDb!.paymentMethod.findFirst({
      where: {
        name: data.name
      }
    })

    if (existing) {
      throw new AppError('Payment method name already exists', 400)
    }

    const paymentMethod = await req.tenantDb!.paymentMethod.create({
      data: {
        ...data,
        tenantId: req.tenantId!
      }
    })

    res.status(201).json({
      message: 'Payment method created successfully',
      paymentMethod
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/:tenantSlug/payment-methods/:id - Update payment method
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = paymentMethodSchema.partial().parse(req.body)

    // Check if payment method exists
    const existing = await req.tenantDb!.paymentMethod.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Payment method not found', 404)
    }

    // Check if new name is unique (if being updated)
    if (data.name && data.name !== existing.name) {
      const nameExists = await req.tenantDb!.paymentMethod.findFirst({
        where: {
          name: data.name,
          id: { not: req.params.id }
        }
      })

      if (nameExists) {
        throw new AppError('Payment method name already exists', 400)
      }
    }

    const paymentMethod = await req.tenantDb!.paymentMethod.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Payment method updated successfully',
      paymentMethod
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/:tenantSlug/payment-methods/:id - Delete payment method
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await req.tenantDb!.paymentMethod.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Payment method not found', 404)
    }

    await req.tenantDb!.paymentMethod.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Payment method deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
