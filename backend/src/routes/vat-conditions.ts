import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router({ mergeParams: true })

const createVatConditionSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  isExempt: z.boolean().optional(),
  afipCode: z.number().optional(),
  afipDocumentType: z.number().optional(),
  canIssueA: z.boolean().optional(),
  issuesOnlyC: z.boolean().optional(),
  allowedVoucherTypes: z.array(z.string()).optional()
})

const updateVatConditionSchema = createVatConditionSchema.partial()

// GET /api/:tenantSlug/vat-conditions - Listar condiciones de IVA
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const conditions = await req.tenantDb!.vatCondition.findMany({
      orderBy: { name: 'asc' }
    })

    res.json({ conditions })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/vat-conditions - Crear condición de IVA
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = createVatConditionSchema.parse(req.body)

    const condition = await req.tenantDb!.vatCondition.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        description: validatedData.description,
        taxRate: validatedData.taxRate || 21,
        isExempt: validatedData.isExempt || false,
        afipCode: validatedData.afipCode,
        afipDocumentType: validatedData.afipDocumentType,
        canIssueA: validatedData.canIssueA || false,
        issuesOnlyC: validatedData.issuesOnlyC || false,
        allowedVoucherTypes: validatedData.allowedVoucherTypes || []
      }
    })

    res.status(201).json({
      message: 'Condición de IVA creada exitosamente',
      condition
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/:tenantSlug/vat-conditions/:id - Actualizar condición de IVA
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = updateVatConditionSchema.parse(req.body)

    const condition = await req.tenantDb!.vatCondition.update({
      where: { id: req.params.id },
      data: validatedData
    })

    res.json({
      message: 'Condición de IVA actualizada exitosamente',
      condition
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/:tenantSlug/vat-conditions/:id - Eliminar condición de IVA
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await req.tenantDb!.vatCondition.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Condición de IVA eliminada exitosamente' })
  } catch (error) {
    next(error)
  }
})

export default router
