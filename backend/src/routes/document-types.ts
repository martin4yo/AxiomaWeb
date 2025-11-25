import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Validation schema
const documentTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional(),
  documentType: z.enum(['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'RECEIPT', 'ORDER', 'QUOTE', 'OTHER']),
  prefix: z.string().optional(),
  requiresAuthorization: z.boolean().optional(),
  hasElectronicBilling: z.boolean().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true)
})

// Get all document types
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search } = req.query

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const documentTypes = await req.tenantDb!.documentType.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    res.json({ documentTypes })
  } catch (error) {
    next(error)
  }
})

// Get document type by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const documentType = await req.tenantDb!.documentType.findUnique({
      where: { id: req.params.id }
    })

    if (!documentType) {
      throw new AppError('Tipo de documento no encontrado', 404)
    }

    res.json({ documentType })
  } catch (error) {
    next(error)
  }
})

// Create document type
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = documentTypeSchema.parse(req.body)

    // Check if code already exists for this tenant
    const existing = await req.tenantDb!.documentType.findFirst({
      where: {
        tenantId: req.tenant!.id,
        code: data.code
      }
    })

    if (existing) {
      throw new AppError(`El código "${data.code}" ya existe`, 400)
    }

    const documentType = await req.tenantDb!.documentType.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      }
    })

    res.status(201).json({
      message: 'Tipo de documento creado exitosamente',
      documentType
    })
  } catch (error) {
    next(error)
  }
})

// Update document type
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = documentTypeSchema.partial().parse(req.body)

    // Check if document type exists
    const existing = await req.tenantDb!.documentType.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Tipo de documento no encontrado', 404)
    }

    // If updating code, check it's not taken
    if (data.code && data.code !== existing.code) {
      const codeTaken = await req.tenantDb!.documentType.findFirst({
        where: {
          tenantId: req.tenant!.id,
          code: data.code,
          id: { not: req.params.id }
        }
      })

      if (codeTaken) {
        throw new AppError(`El código "${data.code}" ya existe`, 400)
      }
    }

    const documentType = await req.tenantDb!.documentType.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Tipo de documento actualizado exitosamente',
      documentType
    })
  } catch (error) {
    next(error)
  }
})

// Delete document type
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if document type exists
    const existing = await req.tenantDb!.documentType.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Tipo de documento no encontrado', 404)
    }

    // Check if document type is being used in documents
    const documentsCount = await req.tenantDb!.document.count({
      where: { documentTypeId: req.params.id }
    })

    if (documentsCount > 0) {
      throw new AppError(
        'No se puede eliminar el tipo de documento porque tiene documentos asociados',
        400
      )
    }

    await req.tenantDb!.documentType.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Tipo de documento eliminado exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

export default router
