import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const salesPointSchema = z.object({
  number: z.number().int().min(1).max(99999),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

// Get all sales points
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const salesPoints = await req.tenantDb!.salesPoint.findMany({
      orderBy: { number: 'asc' }
    })

    res.json({ salesPoints })
  } catch (error) {
    next(error)
  }
})

// Get sales point by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const salesPoint = await req.tenantDb!.salesPoint.findUnique({
      where: { id: req.params.id }
    })

    if (!salesPoint) {
      throw new AppError('Punto de venta no encontrado', 404)
    }

    res.json({ salesPoint })
  } catch (error) {
    next(error)
  }
})

// Create sales point
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = salesPointSchema.parse(req.body)

    // Check if number already exists for this tenant
    const existing = await req.tenantDb!.salesPoint.findFirst({
      where: {
        tenantId: req.tenant!.id,
        number: data.number
      }
    })

    if (existing) {
      throw new AppError(`El número de punto de venta ${data.number} ya existe`, 400)
    }

    const salesPoint = await req.tenantDb!.salesPoint.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Punto de venta creado exitosamente',
      salesPoint
    })
  } catch (error) {
    next(error)
  }
})

// Update sales point
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = salesPointSchema.partial().parse(req.body)

    // Check if sales point exists
    const existing = await req.tenantDb!.salesPoint.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Punto de venta no encontrado', 404)
    }

    // If updating number, check it's not taken
    if (data.number && data.number !== existing.number) {
      const numberTaken = await req.tenantDb!.salesPoint.findFirst({
        where: {
          tenantId: req.tenant!.id,
          number: data.number,
          id: { not: req.params.id }
        }
      })

      if (numberTaken) {
        throw new AppError(`El número de punto de venta ${data.number} ya existe`, 400)
      }
    }

    const salesPoint = await req.tenantDb!.salesPoint.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Punto de venta actualizado exitosamente',
      salesPoint
    })
  } catch (error) {
    next(error)
  }
})

// Delete sales point
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if sales point exists
    const existing = await req.tenantDb!.salesPoint.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Punto de venta no encontrado', 404)
    }

    // Check if sales point is being used in voucher configurations
    const configCount = await req.tenantDb!.voucherConfiguration.count({
      where: { salesPointId: req.params.id }
    })

    if (configCount > 0) {
      throw new AppError(
        'No se puede eliminar el punto de venta porque está siendo usado en configuraciones de comprobantes',
        400
      )
    }

    await req.tenantDb!.salesPoint.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Punto de venta eliminado exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

export default router
