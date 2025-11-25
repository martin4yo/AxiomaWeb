import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AppError } from './errorHandler.js'

const prisma = new PrismaClient()

interface JwtPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        firstName: string | null
        lastName: string | null
        tenantRole?: string
        tenantPermissions?: string[]
      }
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const authHeaderLower = req.headers['Authorization'] as string | undefined

    console.log('🔍 Auth Debug - Full Details:', {
      authorization: authHeader,
      authorizationAlt: authHeaderLower,
      allHeaders: req.headers,
      method: req.method,
      url: req.url,
      path: req.path
    })

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ Auth failed - No valid Bearer token found')
      throw new AppError('Authentication token required', 401)
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new AppError('JWT secret not configured', 500)
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401)
    }

    // If we have tenant context, get user's role and permissions for this tenant
    if (req.tenant) {
      const tenantUser = await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: req.tenant.id,
            userId: user.id
          }
        }
      })

      if (!tenantUser || !tenantUser.isActive) {
        throw new AppError('User does not have access to this tenant', 403)
      }

      req.user = {
        ...user,
        tenantRole: tenantUser.role,
        tenantPermissions: Array.isArray(tenantUser.permissions)
          ? tenantUser.permissions as string[]
          : []
      }
    } else {
      req.user = user
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid authentication token', 401))
    } else {
      next(error)
    }
  }
}

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.tenantPermissions?.includes(permission) &&
        req.user?.tenantRole !== 'admin') {
      throw new AppError('Insufficient permissions', 403)
    }
    next()
  }
}

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.tenantRole !== role && req.user?.tenantRole !== 'admin') {
      throw new AppError('Insufficient role permissions', 403)
    }
    next()
  }
}