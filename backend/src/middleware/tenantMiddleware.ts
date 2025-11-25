import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AppError } from './errorHandler.js'
import { logger } from '../utils/logger.js'

const prisma = new PrismaClient()

// Extend Request interface to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string
        slug: string
        name: string
        planType: string
        status: string
        settings: any
      }
      tenantDb?: any
    }
  }
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantSlug = req.params.tenantSlug

    if (!tenantSlug) {
      throw new AppError('Tenant slug is required', 400)
    }

    // Get tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })

    if (!tenant) {
      throw new AppError('Tenant not found', 404)
    }

    if (tenant.status !== 'active') {
      throw new AppError('Tenant is not active', 403)
    }

    // Add tenant to request
    req.tenant = tenant

    // Create tenant-isolated Prisma client
    req.tenantDb = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Models that should skip tenant isolation (don't have tenantId field)
            const skipModels = [
              'User',
              'Tenant',
              'SaleItem',
              'SalePayment',
              'EntityDeliveryAddress',
              'EntityCustomerCategory',
              'ProductCategoryMapping',
              'ProductBrandMapping',
              'DocumentItem'
            ]

            if (skipModels.includes(model)) {
              return query(args)
            }

            // Add tenant_id to CREATE operations
            if (operation === 'create' || operation === 'createMany') {
              if (args.data) {
                if (Array.isArray(args.data)) {
                  args.data = args.data.map((item: any) => ({ ...item, tenantId: tenant.id }))
                } else {
                  (args.data as any).tenantId = tenant.id
                }
              }
            }

            // Add tenant filter to WHERE clauses (for non-create operations)
            if (operation !== 'create' && operation !== 'createMany' && operation !== 'createManyAndReturn') {
              if ('where' in args && args.where) {
                (args.where as any).tenantId = tenant.id
              } else if ('where' in args) {
                (args as any).where = { tenantId: tenant.id }
              }
            }

            return query(args)
          }
        }
      }
    })

    logger.debug(`Tenant context set: ${tenant.slug}`, {
      tenantId: tenant.id,
      tenantName: tenant.name
    })

    next()
  } catch (error) {
    next(error)
  }
}