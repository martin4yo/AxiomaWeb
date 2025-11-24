import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Delivery address validation schema
const deliveryAddressSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().optional(),
  isDefault: z.boolean().default(false)
})

// Validation schema
const entitySchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('AR'),
  // Roles que puede tener la entidad
  isCustomer: z.boolean().default(false),
  isSupplier: z.boolean().default(false),
  isEmployee: z.boolean().default(false),
  category: z.string().optional(),
  currency: z.string().default('ARS'),
  // Configuración para clientes
  customerPaymentTerms: z.number().optional(),
  customerCreditLimit: z.number().optional(),
  // Configuración para proveedores
  supplierPaymentTerms: z.number().optional(),
  supplierCategory: z.string().optional(),
  // Configuración para empleados
  employeePosition: z.string().optional(),
  employeeSalary: z.number().optional(),
  // Datos fiscales
  cuit: z.string().optional(),
  ivaCondition: z.string().optional(),
  grossIncomeNumber: z.string().optional(),
  businessActivity: z.string().optional(),
  // Direcciones de entrega
  deliveryAddresses: z.array(deliveryAddressSchema).default([]),
  metadata: z.record(z.any()).default({})
})

// Get all entities
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, type } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { taxId: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    // Filter by entity type
    if (type) {
      switch (type) {
        case 'customer':
          where.isCustomer = true
          break
        case 'supplier':
          where.isSupplier = true
          break
        case 'employee':
          where.isEmployee = true
          break
      }
    }

    const [entities, total] = await Promise.all([
      req.tenantDb!.entity.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' }
      }),
      req.tenantDb!.entity.count({ where })
    ])

    res.json({
      entities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    next(error)
  }
})

// Get entity by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const entity = await req.tenantDb!.entity.findUnique({
      where: { id: req.params.id }
    })

    if (!entity) {
      throw new AppError('Entity not found', 404)
    }

    res.json({ entity })
  } catch (error) {
    next(error)
  }
})

// Create entity
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = entitySchema.parse(req.body)
    const { deliveryAddresses, ...entityData } = data

    // Check if code is unique (if provided)
    if (data.code) {
      const existing = await req.tenantDb!.entity.findFirst({
        where: { code: data.code }
      })
      if (existing) {
        throw new AppError('Entity code already exists', 400)
      }
    }

    // Create entity with delivery addresses in a transaction
    const entity = await req.tenantDb!.$transaction(async (tx) => {
      // Create the entity
      const newEntity = await tx.entity.create({
        data: entityData
      })

      // Create delivery addresses if provided
      if (deliveryAddresses && deliveryAddresses.length > 0) {
        await tx.entityDeliveryAddress.createMany({
          data: deliveryAddresses.map((addr, index) => ({
            entityId: newEntity.id,
            name: addr.name,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            isDefault: addr.isDefault || index === 0 // First address is default if none specified
          }))
        })
      }

      // Return entity with delivery addresses
      return await tx.entity.findUnique({
        where: { id: newEntity.id },
        include: {
          deliveryAddresses: true
        }
      })
    })

    res.status(201).json({
      message: 'Entity created successfully',
      entity
    })
  } catch (error) {
    next(error)
  }
})

// Update entity
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = entitySchema.partial().parse(req.body)

    // Check if entity exists
    const existing = await req.tenantDb!.entity.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Entity not found', 404)
    }

    // Check if code is unique (if being updated)
    if (data.code && data.code !== existing.code) {
      const codeExists = await req.tenantDb!.entity.findFirst({
        where: {
          code: data.code,
          id: { not: req.params.id }
        }
      })
      if (codeExists) {
        throw new AppError('Entity code already exists', 400)
      }
    }

    const entity = await req.tenantDb!.entity.update({
      where: { id: req.params.id },
      data
    })

    res.json({
      message: 'Entity updated successfully',
      entity
    })
  } catch (error) {
    next(error)
  }
})

// Delete entity
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if entity exists
    const existing = await req.tenantDb!.entity.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Entity not found', 404)
    }

    // Check if entity has documents
    const documentCount = await req.tenantDb!.document.count({
      where: { entityId: req.params.id }
    })

    if (documentCount > 0) {
      throw new AppError('Cannot delete entity with associated documents', 400)
    }

    await req.tenantDb!.entity.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Entity deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

// Get customers only
router.get('/customers', authMiddleware, async (req, res, next) => {
  try {
    const customers = await req.tenantDb!.entity.findMany({
      where: { isCustomer: true },
      orderBy: { name: 'asc' }
    })

    res.json({
      customers,
      total: customers.length
    })
  } catch (error) {
    next(error)
  }
})

// Get suppliers only
router.get('/suppliers', authMiddleware, async (req, res, next) => {
  try {
    const suppliers = await req.tenantDb!.entity.findMany({
      where: { isSupplier: true },
      orderBy: { name: 'asc' }
    })

    res.json({
      suppliers,
      total: suppliers.length
    })
  } catch (error) {
    next(error)
  }
})

// Get employees only
router.get('/employees', authMiddleware, async (req, res, next) => {
  try {
    const employees = await req.tenantDb!.entity.findMany({
      where: { isEmployee: true },
      orderBy: { name: 'asc' }
    })

    res.json({
      employees,
      total: employees.length
    })
  } catch (error) {
    next(error)
  }
})

export default router