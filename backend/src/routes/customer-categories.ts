import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const customerCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).default(0),
  paymentTerms: z.number().optional(),
  isActive: z.boolean().default(true)
})

// Get all customer categories
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search, active } = req.query

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (active !== undefined) {
      where.isActive = active === 'true'
    }

    const categories = await req.tenantDb!.customerCategory.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    res.json({
      categories
    })
  } catch (error) {
    next(error)
  }
})

// Get category by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const category = await req.tenantDb!.customerCategory.findUnique({
      where: { id: req.params.id }
    })

    if (!category) {
      throw new AppError('Customer category not found', 404)
    }

    res.json({ category })
  } catch (error) {
    next(error)
  }
})

// Create category
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = customerCategorySchema.parse(req.body)

    // Check if name is unique
    const existing = await req.tenantDb!.customerCategory.findFirst({
      where: { name: data.name }
    })
    if (existing) {
      throw new AppError('Customer category name already exists', 400)
    }

    const category = await req.tenantDb!.customerCategory.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Customer category created successfully',
      category
    })
  } catch (error) {
    next(error)
  }
})

// Update category
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = customerCategorySchema.partial().parse(req.body)

    // Check if category exists
    const existing = await req.tenantDb!.customerCategory.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Customer category not found', 404)
    }

    // Check if name is unique (if being updated)
    if (data.name && data.name !== existing.name) {
      const nameExists = await req.tenantDb!.customerCategory.findFirst({
        where: {
          name: data.name,
          id: { not: req.params.id }
        }
      })
      if (nameExists) {
        throw new AppError('Customer category name already exists', 400)
      }
    }

    const category = await req.tenantDb!.customerCategory.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Customer category updated successfully',
      category
    })
  } catch (error) {
    next(error)
  }
})

// Delete category
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if category exists
    const existing = await req.tenantDb!.customerCategory.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Customer category not found', 404)
    }

    // Check if category has associated entities
    const entityCount = await req.tenantDb!.entityCustomerCategory.count({
      where: { categoryId: req.params.id }
    })

    if (entityCount > 0) {
      throw new AppError('Cannot delete category with associated entities', 400)
    }

    await req.tenantDb!.customerCategory.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Customer category deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

export default router