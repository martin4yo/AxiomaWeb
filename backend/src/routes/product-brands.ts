import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const brandSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

// Get all product brands
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

    const brands = await req.tenantDb!.productBrand.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    res.json({
      brands
    })
  } catch (error) {
    next(error)
  }
})

// Get brand by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const brand = await req.tenantDb!.productBrand.findUnique({
      where: { id: req.params.id }
    })

    if (!brand) {
      throw new AppError('Brand not found', 404)
    }

    res.json({ brand })
  } catch (error) {
    next(error)
  }
})

// Create brand
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = brandSchema.parse(req.body)

    // Check if name is unique
    const existing = await req.tenantDb!.productBrand.findFirst({
      where: { name: data.name }
    })
    if (existing) {
      throw new AppError('Brand name already exists', 400)
    }

    const brand = await req.tenantDb!.productBrand.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Brand created successfully',
      brand
    })
  } catch (error) {
    next(error)
  }
})

// Update brand
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = brandSchema.partial().parse(req.body)

    // Check if brand exists
    const existing = await req.tenantDb!.productBrand.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Brand not found', 404)
    }

    // Check if name is unique (if being updated)
    if (data.name && data.name !== existing.name) {
      const nameExists = await req.tenantDb!.productBrand.findFirst({
        where: {
          name: data.name,
          id: { not: req.params.id }
        }
      })
      if (nameExists) {
        throw new AppError('Brand name already exists', 400)
      }
    }

    const brand = await req.tenantDb!.productBrand.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Brand updated successfully',
      brand
    })
  } catch (error) {
    next(error)
  }
})

// Delete brand
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if brand exists
    const existing = await req.tenantDb!.productBrand.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Brand not found', 404)
    }

    // Check if brand has associated products
    const productCount = await req.tenantDb!.productBrandProduct.count({
      where: { brandId: req.params.id }
    })

    if (productCount > 0) {
      throw new AppError('Cannot delete brand with associated products', 400)
    }

    await req.tenantDb!.productBrand.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Brand deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

export default router