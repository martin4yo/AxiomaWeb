import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router({ mergeParams: true })

// Get all voucher types
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const voucherTypes = await req.tenantDb!.voucherType.findMany({
      orderBy: [
        { documentClass: 'asc' },
        { letter: 'asc' }
      ]
    })

    res.json({ voucherTypes })
  } catch (error) {
    next(error)
  }
})

export default router
