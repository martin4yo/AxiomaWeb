import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { prisma } from '../server.js'

const router = Router({ mergeParams: true })

// Get all voucher types
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    // Voucher types are global (not tenant-specific), so use prisma instead of tenantDb
    const voucherTypes = await prisma.voucherType.findMany({
      where: {
        isActive: true
      },
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
