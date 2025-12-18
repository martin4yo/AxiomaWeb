/**
 * Rutas para gestión de impuestos
 */
import { Router } from 'express'
import { Decimal } from '@prisma/client/runtime/library'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router({ mergeParams: true })

// Listar todos los impuestos del tenant
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const taxes = await req.tenantDb!.tax.findMany({
      orderBy: [
        { taxType: 'asc' },
        { rate: 'asc' }
      ]
    })

    res.json({ taxes })
  } catch (error) {
    next(error)
  }
})

// Obtener un impuesto por ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const tax = await req.tenantDb!.tax.findUnique({
      where: { id: req.params.id }
    })

    if (!tax) {
      throw new AppError('Impuesto no encontrado', 404)
    }

    res.json({ tax })
  } catch (error) {
    next(error)
  }
})

// Crear un nuevo impuesto
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      code,
      name,
      description,
      rate,
      taxType,
      applicableToRI = true,
      applicableToMT = false,
      applicableToEX = false,
      calculationBase = 'NET',
      displayInInvoice = true,
      isActive = true
    } = req.body

    // Validaciones
    if (!code || !name || rate === undefined || !taxType) {
      throw new AppError('Faltan campos requeridos: code, name, rate, taxType', 400)
    }

    // Verificar que no exista un impuesto con el mismo código
    const existingTax = await req.tenantDb!.tax.findFirst({
      where: { code }
    })

    if (existingTax) {
      throw new AppError(`Ya existe un impuesto con el código ${code}`, 400)
    }

    // Crear impuesto
    const tax = await req.tenantDb!.tax.create({
      data: {
        code,
        name,
        description,
        rate: new Decimal(rate),
        taxType,
        applicableToRI,
        applicableToMT,
        applicableToEX,
        calculationBase,
        displayInInvoice,
        isActive
      }
    })

    res.status(201).json({
      tax,
      message: 'Impuesto creado exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

// Actualizar un impuesto
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const {
      code,
      name,
      description,
      rate,
      taxType,
      applicableToRI,
      applicableToMT,
      applicableToEX,
      calculationBase,
      displayInInvoice,
      isActive
    } = req.body

    // Verificar que el impuesto existe
    const existingTax = await req.tenantDb!.tax.findUnique({
      where: { id: req.params.id }
    })

    if (!existingTax) {
      throw new AppError('Impuesto no encontrado', 404)
    }

    // Si se está cambiando el código, verificar que no exista otro con ese código
    if (code && code !== existingTax.code) {
      const duplicateTax = await req.tenantDb!.tax.findFirst({
        where: {
          code,
          id: { not: req.params.id }
        }
      })

      if (duplicateTax) {
        throw new AppError(`Ya existe un impuesto con el código ${code}`, 400)
      }
    }

    // Actualizar impuesto
    const updatedData: any = {}
    if (code !== undefined) updatedData.code = code
    if (name !== undefined) updatedData.name = name
    if (description !== undefined) updatedData.description = description
    if (rate !== undefined) updatedData.rate = new Decimal(rate)
    if (taxType !== undefined) updatedData.taxType = taxType
    if (applicableToRI !== undefined) updatedData.applicableToRI = applicableToRI
    if (applicableToMT !== undefined) updatedData.applicableToMT = applicableToMT
    if (applicableToEX !== undefined) updatedData.applicableToEX = applicableToEX
    if (calculationBase !== undefined) updatedData.calculationBase = calculationBase
    if (displayInInvoice !== undefined) updatedData.displayInInvoice = displayInInvoice
    if (isActive !== undefined) updatedData.isActive = isActive

    const tax = await req.tenantDb!.tax.update({
      where: { id: req.params.id },
      data: updatedData
    })

    res.json({
      tax,
      message: 'Impuesto actualizado exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

// Eliminar un impuesto (soft delete)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Verificar que el impuesto existe
    const existingTax = await req.tenantDb!.tax.findUnique({
      where: { id: req.params.id }
    })

    if (!existingTax) {
      throw new AppError('Impuesto no encontrado', 404)
    }

    // Verificar si tiene productos o clientes asociados
    const [productCount, entityCount] = await Promise.all([
      req.tenantDb!.productTax.count({ where: { taxId: req.params.id } }),
      req.tenantDb!.entityTax.count({ where: { taxId: req.params.id } })
    ])

    if (productCount > 0 || entityCount > 0) {
      // No eliminar, solo desactivar
      const tax = await req.tenantDb!.tax.update({
        where: { id: req.params.id },
        data: { isActive: false }
      })

      res.json({
        tax,
        message: 'Impuesto desactivado (tiene productos o clientes asociados)'
      })
    } else {
      // Eliminar completamente
      await req.tenantDb!.tax.delete({
        where: { id: req.params.id }
      })

      res.json({
        message: 'Impuesto eliminado exitosamente'
      })
    }
  } catch (error) {
    next(error)
  }
})

export default router
