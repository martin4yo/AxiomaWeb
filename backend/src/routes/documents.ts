import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schemas
const documentItemSchema = z.object({
  productId: z.string().optional(),
  productSku: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  metadata: z.record(z.any()).default({})
})

const documentSchema = z.object({
  documentTypeId: z.string(),
  entityId: z.string().optional(),
  documentDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().default('ARS'),
  metadata: z.record(z.any()).default({}),
  items: z.array(documentItemSchema).min(1)
})

// Get all documents
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status, documentTypeId, entityId } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    const where: any = {}

    if (search) {
      where.OR = [
        { number: { contains: search as string, mode: 'insensitive' } },
        { displayNumber: { contains: search as string, mode: 'insensitive' } },
        { entityName: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    if (status) where.status = status
    if (documentTypeId) where.documentTypeId = documentTypeId
    if (entityId) where.entityId = entityId

    const [documents, total] = await Promise.all([
      req.tenantDb!.document.findMany({
        where,
        skip,
        take,
        include: {
          documentType: true,
          entity: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      req.tenantDb!.document.count({ where })
    ])

    res.json({
      documents,
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

// Get document by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const document = await req.tenantDb!.document.findUnique({
      where: { id: req.params.id },
      include: {
        documentType: true,
        entity: true,
        items: {
          include: {
            product: true
          },
          orderBy: { lineNumber: 'asc' }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!document) {
      throw new AppError('Document not found', 404)
    }

    res.json({ document })
  } catch (error) {
    next(error)
  }
})

// Create document
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = documentSchema.parse(req.body)

    // Verify document type exists
    const documentType = await req.tenantDb!.documentType.findUnique({
      where: { id: data.documentTypeId }
    })

    if (!documentType || !documentType.isActive) {
      throw new AppError('Invalid or inactive document type', 400)
    }

    // Verify entity exists (if provided)
    let entity = null
    if (data.entityId) {
      entity = await req.tenantDb!.entity.findUnique({
        where: { id: data.entityId }
      })
      if (!entity) {
        throw new AppError('Entity not found', 404)
      }
    }

    // Generate document number
    const lastDocument = await req.tenantDb!.document.findFirst({
      where: { documentTypeId: data.documentTypeId },
      orderBy: { number: 'desc' }
    })

    const nextNumber = lastDocument
      ? String(Number(lastDocument.number) + 1).padStart(8, '0')
      : '00000001'

    // Calculate totals
    let subtotal = 0
    let totalTaxAmount = 0

    const itemsWithCalculations = data.items.map((item, index) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
      const taxAmount = lineTotal * (item.taxRate / 100)

      subtotal += lineTotal
      totalTaxAmount += taxAmount

      return {
        ...item,
        lineNumber: index + 1,
        lineTotal,
        taxAmount
      }
    })

    const totalAmount = subtotal + totalTaxAmount

    // Create document with items
    const document = await req.tenantDb!.document.create({
      data: {
        tenantId: req.tenant!.id,
        documentTypeId: data.documentTypeId,
        number: nextNumber,
        displayNumber: `${documentType.code}-${nextNumber}`,
        documentDate: data.documentDate ? new Date(data.documentDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        entityId: data.entityId,
        entityName: entity?.name,
        subtotal,
        taxAmount: totalTaxAmount,
        totalAmount,
        currency: data.currency,
        status: 'draft',
        metadata: data.metadata,
        createdBy: req.user!.id,
        items: {
          create: itemsWithCalculations.map(item => ({
            tenantId: req.tenant!.id,
            lineNumber: item.lineNumber,
            productId: item.productId,
            productSku: item.productSku,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            lineTotal: item.lineTotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            metadata: item.metadata
          }))
        }
      },
      include: {
        documentType: true,
        entity: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    res.status(201).json({
      message: 'Document created successfully',
      document
    })
  } catch (error) {
    next(error)
  }
})

// Update document status
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.string().min(1)
    }).parse(req.body)

    const document = await req.tenantDb!.document.update({
      where: { id: req.params.id },
      data: {
        status,
        updatedBy: req.user!.id
      },
      include: {
        documentType: true,
        entity: true,
        items: true
      }
    })

    res.json({
      message: 'Document status updated',
      document
    })
  } catch (error) {
    next(error)
  }
})

export default router