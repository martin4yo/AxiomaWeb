import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'

const router = Router({ mergeParams: true })

// Get current tenant info
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      tenant: req.tenant,
      userRole: req.user?.tenantRole,
      userPermissions: req.user?.tenantPermissions
    })
  } catch (error) {
    next(error)
  }
})

// Update tenant settings (admin only)
router.put('/settings', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const tenant = await req.tenantDb!.tenant.update({
      where: { id: req.tenant!.id },
      data: {
        settings: req.body.settings || req.tenant!.settings
      }
    })

    res.json({
      message: 'Tenant settings updated',
      tenant
    })
  } catch (error) {
    next(error)
  }
})

export default router