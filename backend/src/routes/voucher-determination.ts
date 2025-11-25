import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { VoucherService } from '../services/voucher.service.js'

const router = Router({ mergeParams: true })

// Validation schema
const determinationSchema = z.object({
  customerId: z.string().min(1, 'El cliente es requerido'),
  documentClass: z.enum(['invoice', 'credit_note', 'debit_note', 'quote']),
  branchId: z.string().optional()
})

// Determine voucher type
router.post('/determine', authMiddleware, async (req, res, next) => {
  try {
    const data = determinationSchema.parse(req.body)

    const voucherService = new VoucherService(req.tenantDb!)

    const result = await voucherService.determineVoucherType(
      req.tenant!.id,
      data.customerId,
      data.documentClass,
      data.branchId
    )

    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
