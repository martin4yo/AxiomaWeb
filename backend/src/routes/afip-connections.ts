import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'
import { AfipService } from '../services/afip.service.js'

const router = Router({ mergeParams: true })

// Validation schema
const afipConnectionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  cuit: z.string().regex(/^\d{11}$/, 'El CUIT debe tener 11 dígitos'),
  environment: z.enum(['testing', 'production']).default('testing'),
  certificate: z.string().optional(),
  privateKey: z.string().optional(),
  wsaaUrl: z.string().url().optional().or(z.literal('')),
  wsfeUrl: z.string().url().optional().or(z.literal('')),
  timeout: z.number().min(5000).max(120000).optional(),
  isActive: z.boolean().default(true)
})

// Get all AFIP connections
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const connections = await req.tenantDb!.afipConnection.findMany({
      orderBy: { createdAt: 'desc' }
    })

    res.json({ connections })
  } catch (error) {
    next(error)
  }
})

// Get AFIP connection by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const connection = await req.tenantDb!.afipConnection.findUnique({
      where: { id: req.params.id }
    })

    if (!connection) {
      throw new AppError('Conexión AFIP no encontrada', 404)
    }

    res.json({ connection })
  } catch (error) {
    next(error)
  }
})

// Create AFIP connection
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = afipConnectionSchema.parse(req.body)

    const connection = await req.tenantDb!.afipConnection.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Conexión AFIP creada exitosamente',
      connection
    })
  } catch (error) {
    next(error)
  }
})

// Update AFIP connection
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = afipConnectionSchema.partial().parse(req.body)

    // Check if connection exists
    const existing = await req.tenantDb!.afipConnection.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Conexión AFIP no encontrada', 404)
    }

    const connection = await req.tenantDb!.afipConnection.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Conexión AFIP actualizada exitosamente',
      connection
    })
  } catch (error) {
    next(error)
  }
})

// Delete AFIP connection
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if connection exists
    const existing = await req.tenantDb!.afipConnection.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Conexión AFIP no encontrada', 404)
    }

    // Check if connection is being used in voucher configurations
    const configCount = await req.tenantDb!.voucherConfiguration.count({
      where: { afipConnectionId: req.params.id }
    })

    if (configCount > 0) {
      throw new AppError(
        'No se puede eliminar la conexión porque está siendo usada en configuraciones de comprobantes',
        400
      )
    }

    await req.tenantDb!.afipConnection.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Conexión AFIP eliminada exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

// Test AFIP connection
router.post('/:id/test', authMiddleware, async (req, res, next) => {
  try {
    const afipService = new AfipService(req.tenantDb!)
    const result = await afipService.testConnection(req.params.id)

    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
