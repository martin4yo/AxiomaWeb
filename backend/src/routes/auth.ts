import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// Generate JWT token
const generateToken = (userId: string, email: string) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500)
  }

  return jwt.sign(
    { userId, email },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  )
}

// Register new user with tenant
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, tenantName, tenantSlug } =
      registerSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new AppError('User already exists with this email', 400)
    }

    // Check if tenant slug is available
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })

    if (existingTenant) {
      throw new AppError('Tenant slug is already taken', 400)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and tenant in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName
        }
      })

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          slug: tenantSlug,
          name: tenantName,
          planType: 'basic',
          status: 'active'
        }
      })

      // Create tenant-user relationship with admin role
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'admin',
          permissions: ['*'] // All permissions for admin
        }
      })

      // Create default VAT conditions
      const defaultVatConditions = [
        {
          tenantId: tenant.id,
          code: 'RI',
          name: 'Responsable Inscripto',
          description: 'Responsable Inscripto en IVA',
          taxRate: 21,
          isExempt: false,
          afipCode: 1,
          canIssueA: true,
          issuesOnlyC: false,
          allowedVoucherTypes: ['FA', 'NCA', 'NDA', 'FB', 'NCB', 'NDB', 'FC', 'NCC']
        },
        {
          tenantId: tenant.id,
          code: 'MT',
          name: 'Monotributo',
          description: 'Régimen Simplificado (Monotributo)',
          taxRate: 0,
          isExempt: true,
          afipCode: 6,
          canIssueA: false,
          issuesOnlyC: true,
          allowedVoucherTypes: ['FC', 'NCC']
        },
        {
          tenantId: tenant.id,
          code: 'CF',
          name: 'Consumidor Final',
          description: 'Consumidor Final',
          taxRate: 21,
          isExempt: false,
          afipCode: 5,
          canIssueA: false,
          issuesOnlyC: true,
          allowedVoucherTypes: ['FB', 'NCB', 'NDB', 'FC', 'NCC']
        },
        {
          tenantId: tenant.id,
          code: 'EX',
          name: 'Exento',
          description: 'Sujeto Exento',
          taxRate: 0,
          isExempt: true,
          afipCode: 4,
          canIssueA: false,
          issuesOnlyC: false,
          allowedVoucherTypes: ['FB', 'NCB', 'FC', 'NCC']
        },
        {
          tenantId: tenant.id,
          code: 'NR',
          name: 'No Responsable',
          description: 'No Responsable',
          taxRate: 0,
          isExempt: false,
          afipCode: 7,
          canIssueA: false,
          issuesOnlyC: true,
          allowedVoucherTypes: ['FC', 'NCC']
        }
      ]

      await tx.vatCondition.createMany({
        data: defaultVatConditions
      })

      return { user, tenant }
    })

    // Generate token
    const token = generateToken(result.user.id, result.user.email)

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
        wizardCompleted: result.tenant.wizardCompleted,
        wizardStep: result.tenant.wizardStep
      }
    })
  } catch (error) {
    next(error)
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                status: true,
                wizardCompleted: true,
                wizardStep: true,
                defaultDocumentClass: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Generate token
    const token = generateToken(user.id, user.email)

    // Get active tenants for user
    const tenants = user.tenantUsers
      .filter(tu => tu.tenant.status === 'active')
      .map(tu => ({
        id: tu.tenant.id,
        slug: tu.tenant.slug,
        name: tu.tenant.name,
        role: tu.role,
        wizardCompleted: tu.tenant.wizardCompleted,
        wizardStep: tu.tenant.wizardStep,
        defaultDocumentClass: tu.tenant.defaultDocumentClass
      }))

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      tenants
    })
  } catch (error) {
    next(error)
  }
})

// Get current user profile
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                status: true,
                wizardCompleted: true,
                wizardStep: true,
                defaultDocumentClass: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    const tenants = user.tenantUsers
      .filter(tu => tu.tenant.status === 'active')
      .map(tu => ({
        id: tu.tenant.id,
        slug: tu.tenant.slug,
        name: tu.tenant.name,
        role: tu.role,
        wizardCompleted: tu.tenant.wizardCompleted,
        wizardStep: tu.tenant.wizardStep,
        defaultDocumentClass: tu.tenant.defaultDocumentClass
      }))

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      tenants
    })
  } catch (error) {
    next(error)
  }
})

export default router