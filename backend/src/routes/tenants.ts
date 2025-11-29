import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { z } from 'zod'

const router = Router({ mergeParams: true })
const prisma = new PrismaClient()

// Schemas de validación
const createTenantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo se permiten letras minúsculas, números y guiones'),
  planType: z.enum(['free', 'basic', 'premium']).default('free'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  settings: z.object({
    currency: z.string().default('ARS'),
    timezone: z.string().default('America/Argentina/Buenos_Aires'),
    dateFormat: z.string().default('DD/MM/YYYY'),
  }).optional(),
})

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  planType: z.enum(['free', 'basic', 'premium']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  settings: z.object({
    currency: z.string().optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
  }).optional(),
})

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

// Get tenant settings
router.get('/settings', authMiddleware, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant!.id },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        defaultDocumentClass: true
      }
    })

    res.json({
      tenant
    })
  } catch (error) {
    next(error)
  }
})

// Update tenant settings (admin only)
router.put('/settings', authMiddleware, requireRole('admin'), async (req, res, next) => {
  try {
    const updateData: any = {}

    if (req.body.settings) {
      updateData.settings = req.body.settings
    }

    if (req.body.defaultDocumentClass) {
      updateData.defaultDocumentClass = req.body.defaultDocumentClass
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.tenant!.id },
      data: updateData
    })

    res.json({
      message: 'Tenant settings updated',
      tenant
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/tenants - Listar todos los tenants (solo superadmin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            tenantUsers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({ tenants })
  } catch (error: any) {
    console.error('Error al obtener tenants:', error)
    res.status(500).json({ error: 'Error al obtener tenants' })
  }
})

// GET /api/tenants/:id - Obtener un tenant específico
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        tenantUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            tenantUsers: true,
          },
        },
      },
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    res.json({ tenant })
  } catch (error: any) {
    console.error('Error al obtener tenant:', error)
    res.status(500).json({ error: 'Error al obtener tenant' })
  }
})

// POST /api/tenants - Crear nuevo tenant
router.post(
  '/',
  authMiddleware,
  validateRequest(createTenantSchema),
  async (req, res) => {
    try {
      const data = req.body

      // Verificar que el slug no exista
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: data.slug },
      })

      if (existingTenant) {
        return res.status(400).json({ error: 'El slug ya está en uso' })
      }

      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          planType: data.planType,
          status: data.status,
          settings: data.settings || {
            currency: 'ARS',
            timezone: 'America/Argentina/Buenos_Aires',
            dateFormat: 'DD/MM/YYYY',
          },
        },
      })

      res.status(201).json({ tenant })
    } catch (error: any) {
      console.error('Error al crear tenant:', error)
      res.status(500).json({ error: 'Error al crear tenant' })
    }
  }
)

// PUT /api/tenants/:id - Actualizar tenant
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateTenantSchema),
  async (req, res) => {
    try {
      const data = req.body

      // Verificar que el tenant exista
      const existingTenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
      })

      if (!existingTenant) {
        return res.status(404).json({ error: 'Tenant no encontrado' })
      }

      // Si se actualiza el slug, verificar que no exista
      if (data.slug && data.slug !== existingTenant.slug) {
        const slugExists = await prisma.tenant.findUnique({
          where: { slug: data.slug },
        })

        if (slugExists) {
          return res.status(400).json({ error: 'El slug ya está en uso' })
        }
      }

      // Preparar datos de actualización
      const updateData: any = {}
      if (data.name) updateData.name = data.name
      if (data.slug) updateData.slug = data.slug
      if (data.planType) updateData.planType = data.planType
      if (data.status) updateData.status = data.status
      if (data.settings) {
        updateData.settings = {
          ...(existingTenant.settings as any),
          ...data.settings,
        }
      }

      const tenant = await prisma.tenant.update({
        where: { id: req.params.id },
        data: updateData,
      })

      res.json({ tenant })
    } catch (error: any) {
      console.error('Error al actualizar tenant:', error)
      res.status(500).json({ error: 'Error al actualizar tenant' })
    }
  }
)

// DELETE /api/tenants/:id - Desactivar tenant (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    // Desactivar en lugar de eliminar
    const updatedTenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { status: 'inactive' },
    })

    res.json({ tenant: updatedTenant })
  } catch (error: any) {
    console.error('Error al desactivar tenant:', error)
    res.status(500).json({ error: 'Error al desactivar tenant' })
  }
})

// Get users of a tenant
router.get('/:tenantId/users', authMiddleware, async (req, res, next) => {
  try {
    const { tenantId } = req.params

    const tenantUsers = await prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    })

    const usersWithRoles = tenantUsers.map(tu => ({
      ...tu.user,
      role: tu.role,
      tenantUserId: tu.id,
      tenantPermissions: tu.permissions,
    }))

    res.json({ users: usersWithRoles })
  } catch (error: any) {
    console.error('Error al obtener usuarios del tenant:', error)
    res.status(500).json({ error: 'Error al obtener usuarios del tenant' })
  }
})

// Assign user to tenant
router.post('/:tenantId/users', authMiddleware, async (req, res, next) => {
  try {
    const { tenantId } = req.params
    const { userId, role = 'user', permissions = [] } = req.body

    // Verificar que el tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Verificar si ya existe la relación
    const existingRelation = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    })

    if (existingRelation) {
      return res.status(400).json({ error: 'El usuario ya está asignado a este tenant' })
    }

    // Crear la relación
    const tenantUser = await prisma.tenantUser.create({
      data: {
        tenantId,
        userId,
        role,
        permissions,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    })

    res.json({
      message: 'Usuario asignado al tenant exitosamente',
      tenantUser: {
        ...tenantUser.user,
        role: tenantUser.role,
        tenantUserId: tenantUser.id,
        tenantPermissions: tenantUser.permissions,
      },
    })
  } catch (error: any) {
    console.error('Error al asignar usuario al tenant:', error)
    res.status(500).json({ error: 'Error al asignar usuario al tenant' })
  }
})

// Remove user from tenant
router.delete('/:tenantId/users/:tenantUserId', authMiddleware, async (req, res, next) => {
  try {
    const { tenantUserId } = req.params

    await prisma.tenantUser.delete({
      where: { id: tenantUserId },
    })

    res.json({ message: 'Usuario removido del tenant exitosamente' })
  } catch (error: any) {
    console.error('Error al remover usuario del tenant:', error)
    res.status(500).json({ error: 'Error al remover usuario del tenant' })
  }
})

export default router