import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  costPrice: z.number().default(0),
  salePrice: z.number().default(0),
  currency: z.string().default('ARS'),
  trackStock: z.boolean().default(true),
  currentStock: z.number().default(0),
  minStock: z.number().default(0),
  weight: z.number().optional().nullable(),
  weightUnit: z.string().optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  categories: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional()
})

// Get all products
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.category = category
    }

    const [products, total] = await Promise.all([
      req.tenantDb!.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' }
      }),
      req.tenantDb!.product.count({ where })
    ])

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    next(error)
  }
})

// Get product by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const product = await req.tenantDb!.product.findUnique({
      where: { id: req.params.id }
    })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    res.json({ product })
  } catch (error) {
    next(error)
  }
})

// Create product
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { categories, brands, ...data } = productSchema.parse(req.body)

    // Check if SKU is unique
    const existing = await req.tenantDb!.product.findFirst({
      where: { sku: data.sku }
    })
    if (existing) {
      throw new AppError('Product SKU already exists', 400)
    }

    const product = await req.tenantDb!.product.create({
      data: {
        ...data,
        // Create relations with categories
        ...(categories && categories.length > 0 && {
          productCategories: {
            create: categories.map(categoryId => ({
              categoryId
            }))
          }
        }),
        // Create relations with brands
        ...(brands && brands.length > 0 && {
          productBrands: {
            create: brands.map(brandId => ({
              brandId
            }))
          }
        })
      }
    })

    res.status(201).json({
      message: 'Product created successfully',
      product
    })
  } catch (error) {
    next(error)
  }
})

// Update product
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { categories, brands, ...data } = productSchema.partial().parse(req.body)

    // Check if product exists
    const existing = await req.tenantDb!.product.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Product not found', 404)
    }

    // Check if SKU is unique (if being updated)
    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await req.tenantDb!.product.findFirst({
        where: {
          sku: data.sku,
          id: { not: req.params.id }
        }
      })
      if (skuExists) {
        throw new AppError('Product SKU already exists', 400)
      }
    }

    const product = await req.tenantDb!.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        // Update categories if provided
        ...(categories !== undefined && {
          productCategories: {
            deleteMany: {},
            create: categories.map(categoryId => ({
              categoryId
            }))
          }
        }),
        // Update brands if provided
        ...(brands !== undefined && {
          productBrands: {
            deleteMany: {},
            create: brands.map(brandId => ({
              brandId
            }))
          }
        })
      }
    })

    res.json({
      message: 'Product updated successfully',
      product
    })
  } catch (error) {
    next(error)
  }
})

// Delete product
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if product exists
    const existing = await req.tenantDb!.product.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Product not found', 404)
    }

    // Check if product has document items
    const itemCount = await req.tenantDb!.documentItem.count({
      where: { productId: req.params.id }
    })

    if (itemCount > 0) {
      throw new AppError('Cannot delete product with associated document items', 400)
    }

    await req.tenantDb!.product.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Product deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

export default router