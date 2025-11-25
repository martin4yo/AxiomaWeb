import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { z } from 'zod'

const router = Router({ mergeParams: true })
const prisma = new PrismaClient()

// Schemas de validaci�n
const createUserSchema = z.object({
  email: z.string().email('Email inv�lido'),
  password: z.string().min(6, 'La contrase�a debe tener al menos 6 caracteres'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'user']).default('user'),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'user']).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'La contrase�a debe tener al menos 6 caracteres'),
})

// GET /api/:tenantSlug/users - Listar usuarios del tenant
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenantUsers = await prisma.tenantUser.findMany({
      where: {
        tenantId: req.tenant!.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const users = tenantUsers.map((tu) => ({
      id: tu.user.id,
      email: tu.user.email,
      firstName: tu.user.firstName,
      lastName: tu.user.lastName,
      role: tu.role,
      permissions: tu.permissions,
      isActive: tu.isActive,
      createdAt: tu.user.createdAt,
    }))

    res.json({ users })
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// GET /api/:tenantSlug/users/:id - Obtener un usuario espec�fico
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenantId: req.tenant!.id,
        userId: req.params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    })

    if (!tenantUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = {
      id: tenantUser.user.id,
      email: tenantUser.user.email,
      firstName: tenantUser.user.firstName,
      lastName: tenantUser.user.lastName,
      role: tenantUser.role,
      permissions: tenantUser.permissions,
      isActive: tenantUser.isActive,
      createdAt: tenantUser.user.createdAt,
    }

    res.json({ user })
  } catch (error: any) {
    console.error('Error al obtener usuario:', error)
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
})

// POST /api/:tenantSlug/users - Crear nuevo usuario
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  validateRequest(createUserSchema),
  async (req, res) => {
    try {
      const data = req.body

      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })

      let user

      if (existingUser) {
        // Verificar si ya est� en este tenant
        const existingTenantUser = await prisma.tenantUser.findFirst({
          where: {
            tenantId: req.tenant!.id,
            userId: existingUser.id,
          },
        })

        if (existingTenantUser) {
          return res.status(400).json({ error: 'El usuario ya existe en este tenant' })
        }

        user = existingUser
      } else {
        // Crear nuevo usuario
        const passwordHash = await bcrypt.hash(data.password, 12)
        user = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            isActive: data.isActive,
          },
        })
      }

      // Crear relaci�n con el tenant
      const tenantUser = await prisma.tenantUser.create({
        data: {
          tenantId: req.tenant!.id,
          userId: user.id,
          role: data.role,
          permissions: data.permissions || [],
          isActive: data.isActive,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      })

      const userResponse = {
        id: tenantUser.user.id,
        email: tenantUser.user.email,
        firstName: tenantUser.user.firstName,
        lastName: tenantUser.user.lastName,
        role: tenantUser.role,
        permissions: tenantUser.permissions,
        isActive: tenantUser.isActive,
        createdAt: tenantUser.user.createdAt,
      }

      res.status(201).json({ user: userResponse })
    } catch (error: any) {
      console.error('Error al crear usuario:', error)
      res.status(500).json({ error: 'Error al crear usuario' })
    }
  }
)

// PUT /api/:tenantSlug/users/:id - Actualizar usuario
router.put(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  validateRequest(updateUserSchema),
  async (req, res) => {
    try {
      const data = req.body

      // Verificar que el usuario existe en el tenant
      const existingTenantUser = await prisma.tenantUser.findFirst({
        where: {
          tenantId: req.tenant!.id,
          userId: req.params.id,
        },
      })

      if (!existingTenantUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }

      // Actualizar datos del usuario (tabla User)
      const userUpdateData: any = {}
      if (data.email) userUpdateData.email = data.email
      if (data.firstName !== undefined) userUpdateData.firstName = data.firstName
      if (data.lastName !== undefined) userUpdateData.lastName = data.lastName

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: req.params.id },
          data: userUpdateData,
        })
      }

      // Actualizar datos del tenant-user (tabla TenantUser)
      const tenantUserUpdateData: any = {}
      if (data.role) tenantUserUpdateData.role = data.role
      if (data.permissions) tenantUserUpdateData.permissions = data.permissions
      if (data.isActive !== undefined) tenantUserUpdateData.isActive = data.isActive

      const updatedTenantUser = await prisma.tenantUser.update({
        where: { id: existingTenantUser.id },
        data: tenantUserUpdateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      })

      const userResponse = {
        id: updatedTenantUser.user.id,
        email: updatedTenantUser.user.email,
        firstName: updatedTenantUser.user.firstName,
        lastName: updatedTenantUser.user.lastName,
        role: updatedTenantUser.role,
        permissions: updatedTenantUser.permissions,
        isActive: updatedTenantUser.isActive,
        createdAt: updatedTenantUser.user.createdAt,
      }

      res.json({ user: userResponse })
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error)
      res.status(500).json({ error: 'Error al actualizar usuario' })
    }
  }
)

// DELETE /api/:tenantSlug/users/:id - Remover usuario del tenant
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Verificar que no sea el �ltimo admin
    const adminCount = await prisma.tenantUser.count({
      where: {
        tenantId: req.tenant!.id,
        role: 'admin',
        isActive: true,
      },
    })

    const userToDelete = await prisma.tenantUser.findFirst({
      where: {
        tenantId: req.tenant!.id,
        userId: req.params.id,
      },
    })

    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (userToDelete.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({
        error: 'No se puede eliminar el �ltimo administrador del tenant'
      })
    }

    // Remover del tenant (soft delete)
    await prisma.tenantUser.update({
      where: { id: userToDelete.id },
      data: { isActive: false },
    })

    res.json({ message: 'Usuario removido del tenant' })
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

// PUT /api/:tenantSlug/users/:id/password - Cambiar contrase�a
router.put(
  '/:id/password',
  authMiddleware,
  requireRole('admin'),
  validateRequest(changePasswordSchema),
  async (req, res) => {
    try {
      const { newPassword } = req.body

      const passwordHash = await bcrypt.hash(newPassword, 12)

      await prisma.user.update({
        where: { id: req.params.id },
        data: { passwordHash },
      })

      res.json({ message: 'Contrase�a actualizada correctamente' })
    } catch (error: any) {
      console.error('Error al cambiar contrase�a:', error)
      res.status(500).json({ error: 'Error al cambiar contrase�a' })
    }
  }
)

// GET /api/:tenantSlug/users/all - Listar todos los usuarios del sistema (para asignar a tenants)
router.get('/all', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
      orderBy: {
        email: 'asc',
      },
    })

    res.json({ users })
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

export default router
