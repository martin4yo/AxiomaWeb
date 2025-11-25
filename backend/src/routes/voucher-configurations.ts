import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { AppError } from '../middleware/errorHandler.js'
import { prisma } from '../server.js'
import { AfipWSFEService } from '../services/afip-wsfe.service.js'

const router = Router({ mergeParams: true })

// Validation schema
const voucherConfigSchema = z.object({
  voucherTypeId: z.string().min(1, 'El tipo de comprobante es requerido'),
  branchId: z.string().optional().nullable(),
  afipConnectionId: z.string().optional().nullable(),
  salesPointId: z.string().optional().nullable(),
  nextVoucherNumber: z.number().int().min(1).default(1)
})

// Get all voucher configurations
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const configurations = await req.tenantDb!.voucherConfiguration.findMany({
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      },
      orderBy: [
        { voucherType: { code: 'asc' } },
        { branch: { code: 'asc' } }
      ]
    })

    res.json({ configurations })
  } catch (error) {
    next(error)
  }
})

// Get voucher configuration by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const configuration = await req.tenantDb!.voucherConfiguration.findUnique({
      where: { id: req.params.id },
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      }
    })

    if (!configuration) {
      throw new AppError('Configuración no encontrada', 404)
    }

    res.json({ configuration })
  } catch (error) {
    next(error)
  }
})

// Create voucher configuration
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = voucherConfigSchema.parse(req.body)

    // Verify voucher type exists (VoucherType is global, not tenant-scoped, so use global prisma)
    const voucherType = await prisma.voucherType.findUnique({
      where: { id: data.voucherTypeId }
    })

    if (!voucherType) {
      throw new AppError('Tipo de comprobante no encontrado', 404)
    }

    // Verify branch exists if provided
    if (data.branchId) {
      const branch = await req.tenantDb!.branch.findUnique({
        where: { id: data.branchId }
      })
      if (!branch) {
        throw new AppError('Sucursal no encontrada', 404)
      }
    }

    // Verify AFIP connection exists if provided
    if (data.afipConnectionId) {
      const connection = await req.tenantDb!.afipConnection.findUnique({
        where: { id: data.afipConnectionId }
      })
      if (!connection) {
        throw new AppError('Conexión AFIP no encontrada', 404)
      }
    }

    // Verify sales point exists if provided
    if (data.salesPointId) {
      const salesPoint = await req.tenantDb!.salesPoint.findUnique({
        where: { id: data.salesPointId }
      })
      if (!salesPoint) {
        throw new AppError('Punto de venta no encontrado', 404)
      }
    }

    // Check if configuration already exists for this combination
    const existing = await req.tenantDb!.voucherConfiguration.findFirst({
      where: {
        tenantId: req.tenant!.id,
        voucherTypeId: data.voucherTypeId,
        branchId: data.branchId || null
      }
    })

    if (existing) {
      throw new AppError(
        'Ya existe una configuración para este tipo de comprobante y sucursal',
        400
      )
    }

    const configuration = await req.tenantDb!.voucherConfiguration.create({
      data: {
        ...data,
        tenantId: req.tenant!.id
      },
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      }
    })

    res.status(201).json({
      message: 'Configuración creada exitosamente',
      configuration
    })
  } catch (error) {
    next(error)
  }
})

// Update voucher configuration
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = voucherConfigSchema.partial().parse(req.body)

    // Check if configuration exists
    const existing = await req.tenantDb!.voucherConfiguration.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Configuración no encontrada', 404)
    }

    // Verify references if they are being updated (VoucherType is global, not tenant-scoped, so use global prisma)
    if (data.voucherTypeId) {
      const voucherType = await prisma.voucherType.findUnique({
        where: { id: data.voucherTypeId }
      })
      if (!voucherType) {
        throw new AppError('Tipo de comprobante no encontrado', 404)
      }
    }

    if (data.branchId) {
      const branch = await req.tenantDb!.branch.findUnique({
        where: { id: data.branchId }
      })
      if (!branch) {
        throw new AppError('Sucursal no encontrada', 404)
      }
    }

    if (data.afipConnectionId) {
      const connection = await req.tenantDb!.afipConnection.findUnique({
        where: { id: data.afipConnectionId }
      })
      if (!connection) {
        throw new AppError('Conexión AFIP no encontrada', 404)
      }
    }

    if (data.salesPointId) {
      const salesPoint = await req.tenantDb!.salesPoint.findUnique({
        where: { id: data.salesPointId }
      })
      if (!salesPoint) {
        throw new AppError('Punto de venta no encontrado', 404)
      }
    }

    const configuration = await req.tenantDb!.voucherConfiguration.update({
      where: { id: req.params.id },
      data,
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      }
    })

    res.json({
      message: 'Configuración actualizada exitosamente',
      configuration
    })
  } catch (error) {
    next(error)
  }
})

// Delete voucher configuration
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    // Check if configuration exists
    const existing = await req.tenantDb!.voucherConfiguration.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      throw new AppError('Configuración no encontrada', 404)
    }

    // Check if configuration is being used in sales
    const salesCount = await req.tenantDb!.sale.count({
      where: { voucherConfigurationId: req.params.id }
    })

    if (salesCount > 0) {
      throw new AppError(
        'No se puede eliminar la configuración porque tiene ventas asociadas',
        400
      )
    }

    await req.tenantDb!.voucherConfiguration.delete({
      where: { id: req.params.id }
    })

    res.json({
      message: 'Configuración eliminada exitosamente'
    })
  } catch (error) {
    next(error)
  }
})

// Get last authorized voucher number from AFIP
router.post('/:id/check-afip-number', authMiddleware, async (req, res, next) => {
  try {
    const configuration = await req.tenantDb!.voucherConfiguration.findUnique({
      where: { id: req.params.id },
      include: {
        voucherType: true,
        afipConnection: true,
        salesPoint: true
      }
    })

    if (!configuration) {
      throw new AppError('Configuración no encontrada', 404)
    }

    // Verificar que tenga conexión AFIP y punto de venta
    if (!configuration.afipConnectionId || !configuration.salesPointId) {
      return res.json({
        success: false,
        error: 'Esta configuración no tiene conexión AFIP o punto de venta asociado',
        localNumber: configuration.nextVoucherNumber
      })
    }

    // Verificar que el tipo de comprobante tenga código AFIP
    if (!configuration.voucherType.afipCode) {
      return res.json({
        success: false,
        error: 'Este tipo de comprobante no requiere CAE',
        localNumber: configuration.nextVoucherNumber
      })
    }

    // Consultar último número en AFIP
    const afipService = new AfipWSFEService(prisma)

    const lastAfipNumber = await afipService.getLastAuthorizedNumber(
      configuration.afipConnectionId,
      configuration.salesPoint!.number,
      configuration.voucherType.afipCode
    )

    const nextSuggested = lastAfipNumber + 1
    const needsSync = lastAfipNumber >= configuration.nextVoucherNumber
    let wasUpdated = false

    // Si el número local es menor al de AFIP, actualizar automáticamente
    // Si el número local es mayor, no actualizar (hay comprobantes pendientes de CAE)
    if (needsSync) {
      await req.tenantDb!.voucherConfiguration.update({
        where: { id: req.params.id },
        data: { nextVoucherNumber: nextSuggested }
      })
      wasUpdated = true
    }

    res.json({
      success: true,
      localNumber: configuration.nextVoucherNumber,
      afipNumber: lastAfipNumber,
      nextSuggested,
      needsSync,
      wasUpdated,
      newLocalNumber: wasUpdated ? nextSuggested : configuration.nextVoucherNumber
    })
  } catch (error: any) {
    // Si falla AFIP, devolver info local
    const configuration = await req.tenantDb!.voucherConfiguration.findUnique({
      where: { id: req.params.id }
    })

    res.json({
      success: false,
      error: error.message || 'Error consultando AFIP',
      localNumber: configuration?.nextVoucherNumber || 0
    })
  }
})

export default router
