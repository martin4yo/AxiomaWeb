import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const branchSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

// Get all branches
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const branches = await req.tenantDb!.branch.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { code: 'asc' }
      ]
    })

    res.json({ branches })
  } catch (error) {
    next(error)
  }
})

// Get branch by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const branch = await req.tenantDb!.branch.findUnique({
      where: { id: req.params.id }
    })

    if (!branch) {
      throw new AppError('Sucursal no encontrada', 404)
    }

    res.json({ branch })
  } catch (error) {
    next(error)
  }
})

// Create branch
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = branchSchema.parse(req.body)

    // Check if code already exists for this tenant
    const existing = await req.tenantDb!.branch.findFirst({
      where: {
        tenantId: req.tenant!.id,
        code: data.code
      }
    })

    if (existing) {
      throw new AppError(`El código de sucursal "${data.code}" ya existe`, 400)
    }

    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await req.tenantDb!.branch.updateMany({
        where: { tenantId: req.tenant!.id },
        data: { isDefault: false }
      })
    }

    const branch = await req.tenantDb!.branch.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Sucursal creada exitosamente',
      branch
    })
  } catch (error) {
    next(error)
  }
})

// Update branch
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = branchSchema.partial().parse(req.body)

    // Check if branch exists
    const existing = await req.tenantDb!.branch.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Sucursal no encontrada', 404)
    }

    // If updating code, check it's not taken
    if (data.code && data.code !== existing.code) {
      const codeTaken = await req.tenantDb!.branch.findFirst({
        where: {
          tenantId: req.tenant!.id,
          code: data.code,
          id: { not: req.params.id }
        }
      })

      if (codeTaken) {
        throw new AppError(`El código de sucursal "${data.code}" ya existe`, 400)
      }
    }

    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await req.tenantDb!.branch.updateMany({
        where: {
          tenantId: req.tenant!.id,
          id: { not: req.params.id }
        },
        data: { isDefault: false }
      })
    }

    const branch = await req.tenantDb!.branch.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Sucursal actualizada exitosamente',
      branch
    })
  } catch (error) {
    next(error)
  }
})

// Delete branch
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if branch exists
    const existing = await req.tenantDb!.branch.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Sucursal no encontrada', 404)
    }

    // Check if branch is being used in voucher configurations
    const configCount = await req.tenantDb!.voucherConfiguration.count({
      where: { branchId: req.params.id }
    })

    if (configCount > 0) {
      throw new AppError(
        'No se puede eliminar la sucursal porque está siendo usada en configuraciones de comprobantes',
        400
      )
    }

    // Check if branch is being used in sales
    const salesCount = await req.tenantDb!.sale.count({
      where: { branchId: req.params.id }
    })

    if (salesCount > 0) {
      throw new AppError(
        'No se puede eliminar la sucursal porque tiene ventas asociadas',
        400
      )
    }

    await req.tenantDb!.branch.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Sucursal eliminada exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

export default router
