import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { tenantMiddleware } from '../middleware/tenantMiddleware.js'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /:tenantSlug/onboarding/status
// Obtiene el estado actual del wizard de onboarding
router.get('/:tenantSlug/onboarding/status', tenantMiddleware, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenant } = req as any

    res.json({
      wizardCompleted: tenant.wizardCompleted,
      wizardStep: tenant.wizardStep,
      data: {} // TODO: Recuperar datos guardados del wizard si se implementa persistencia
    })
  } catch (error: any) {
    console.error('Error getting onboarding status:', error)
    res.status(500).json({ error: 'Error al obtener el estado del onboarding' })
  }
})

// PUT /:tenantSlug/onboarding/step/:step
// Guarda el progreso de un paso del wizard
router.put('/:tenantSlug/onboarding/step/:step', tenantMiddleware, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenant } = req as any
    const step = parseInt(req.params.step)
    const { wizardStep, data } = req.body

    // Actualizar el paso actual en el tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        wizardStep: Math.max(tenant.wizardStep, step)
      }
    })

    // TODO: Guardar datos del wizard si se implementa persistencia

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error saving wizard step:', error)
    res.status(500).json({ error: 'Error al guardar el progreso del wizard' })
  }
})

// PUT /:tenantSlug/onboarding/complete
// Completa el wizard y crea todos los datos necesarios
router.put('/:tenantSlug/onboarding/complete', tenantMiddleware, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenant, user } = req as any
    const { data } = req.body

    // Actualizar datos del tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        wizardCompleted: true,
        wizardStep: 11,
        businessName: data.businessName,
        cuit: data.cuit,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        vatConditionId: data.vatConditionId,
        grossIncomeNumber: data.grossIncomeNumber,
        activityStartDate: data.activityStartDate ? new Date(data.activityStartDate) : null
      }
    })

    // Crear sucursal por defecto si no existe
    const existingBranch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id }
    })

    let branch = existingBranch
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          code: 'CENTRAL',
          name: 'Casa Central',
          addressLine1: data.address || '',
          isDefault: true
        }
      })
    }

    // Crear formas de pago si fueron seleccionadas
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      const paymentMethodMap: Record<string, { name: string, paymentType: string, createCashAccount: boolean }> = {
        CASH: { name: 'Efectivo', paymentType: 'CASH', createCashAccount: true },
        DEBIT: { name: 'Tarjeta de Débito', paymentType: 'CARD', createCashAccount: true },
        CREDIT: { name: 'Tarjeta de Crédito', paymentType: 'CARD', createCashAccount: true },
        TRANSFER: { name: 'Transferencia', paymentType: 'TRANSFER', createCashAccount: true },
        CHECK: { name: 'Cheque', paymentType: 'CHECK', createCashAccount: true },
        MP: { name: 'Mercado Pago', paymentType: 'TRANSFER', createCashAccount: true },
        CC: { name: 'Cuenta Corriente', paymentType: 'OTHER', createCashAccount: false } // No crear cuenta para CC
      }

      for (const code of data.paymentMethods) {
        const pmData = paymentMethodMap[code]
        if (!pmData) continue

        const existing = await prisma.paymentMethod.findFirst({
          where: {
            tenantId: tenant.id,
            name: pmData.name
          }
        })

        if (!existing) {
          await prisma.paymentMethod.create({
            data: {
              tenantId: tenant.id,
              name: pmData.name,
              paymentType: pmData.paymentType,
              isActive: true
            }
          })
        }

        // Crear cuenta de fondos para esta forma de pago (excepto Cuenta Corriente)
        if (pmData.createCashAccount) {
          const existingAccount = await prisma.cashAccount.findFirst({
            where: {
              tenantId: tenant.id,
              name: pmData.name
            }
          })

          if (!existingAccount) {
            await prisma.cashAccount.create({
              data: {
                tenantId: tenant.id,
                name: pmData.name,
                accountType: pmData.paymentType,
                initialBalance: 0,
                isActive: true,
                createdBy: user.id
              }
            })
          }
        }
      }
    }

    // Crear categorías de productos si fueron seleccionadas
    if (data.categories && data.categories.length > 0) {
      const categoryMap: Record<string, string> = {
        PROD: 'Productos',
        SERV: 'Servicios',
        INSU: 'Insumos',
        REPR: 'Repuestos',
        OTRO: 'Otros'
      }

      for (const code of data.categories) {
        const categoryName = categoryMap[code]
        if (!categoryName) continue

        const existing = await prisma.productCategory.findFirst({
          where: {
            tenantId: tenant.id,
            name: categoryName
          }
        })

        if (!existing) {
          await prisma.productCategory.create({
            data: {
              tenantId: tenant.id,
              name: categoryName,
              isActive: true
            }
          })
        }
      }
    }

    // Crear almacenes
    if (data.warehouses && data.warehouses.length > 0) {
      for (const warehouse of data.warehouses) {
        const existing = await prisma.warehouse.findFirst({
          where: { tenantId: tenant.id, code: warehouse.code }
        })

        if (!existing) {
          await prisma.warehouse.create({
            data: {
              tenantId: tenant.id,
              code: warehouse.code,
              name: warehouse.name,
              address: warehouse.address || null,
              isActive: true
            }
          })
        }
      }
    } else {
      // Crear almacén por defecto si no se proporcionó ninguno
      const existingWarehouse = await prisma.warehouse.findFirst({
        where: { tenantId: tenant.id }
      })

      if (!existingWarehouse) {
        await prisma.warehouse.create({
          data: {
            tenantId: tenant.id,
            code: 'MAIN',
            name: 'Almacén Principal',
            address: null,
            isActive: true
          }
        })
      }
    }

    // Crear punto de venta por defecto
    let salesPoint = await prisma.salesPoint.findFirst({
      where: { tenantId: tenant.id }
    })

    if (!salesPoint) {
      salesPoint = await prisma.salesPoint.create({
        data: {
          tenantId: tenant.id,
          number: data.afipSalesPoint || 1,
          name: `Punto de Venta ${data.afipSalesPoint || 1}`,
          isActive: true
        }
      })
    }

    // Crear configuración AFIP si fue configurada
    let afipConnection = null
    if (data.afipCertificate && data.afipPrivateKey) {
      const existingAfipConnection = await prisma.afipConnection.findFirst({
        where: { tenantId: tenant.id }
      })

      if (!existingAfipConnection) {
        afipConnection = await prisma.afipConnection.create({
          data: {
            tenantId: tenant.id,
            name: data.afipEnvironment === 'production' ? 'Producción AFIP' : 'Testing AFIP',
            cuit: data.cuit,
            environment: data.afipEnvironment || 'testing',
            isActive: true
          }
        })
      } else {
        afipConnection = existingAfipConnection
      }
    }

    // Crear configuraciones de comprobantes según la condición IVA del tenant
    if (data.voucherTypes && data.voucherTypes.length > 0) {
      // Obtener la condición IVA del tenant
      const tenantVatCondition = await prisma.vatCondition.findUnique({
        where: { id: data.vatConditionId }
      })

      // Obtener todas las condiciones de IVA
      const allVatConditions = await prisma.vatCondition.findMany({
        where: { tenantId: tenant.id }
      })

      // Determinar los códigos de comprobantes a habilitar según lógica de negocio
      let voucherCodesToEnable: string[] = []

      if (tenantVatCondition?.code === 'MT') {
        // Si el tenant es MONOTRIBUTISTA: Solo Factura C y Presupuesto para TODAS las condiciones
        voucherCodesToEnable = ['FC', 'PRE', 'NCC', 'NDC']
      } else if (tenantVatCondition?.code === 'RI') {
        // Si el tenant es RESPONSABLE INSCRIPTO: Depende de cada condición de IVA
        // Se crearán configuraciones específicas por condición
        voucherCodesToEnable = data.voucherTypes // Usar los seleccionados
      } else {
        // Para otros casos, usar los seleccionados
        voucherCodesToEnable = data.voucherTypes
      }

      // Obtener los tipos de comprobantes
      const voucherTypes = await prisma.voucherType.findMany({
        where: {
          code: {
            in: voucherCodesToEnable
          }
        }
      })

      // Si el tenant es RI, crear configuraciones específicas por condición de IVA
      if (tenantVatCondition?.code === 'RI') {
        for (const vatCond of allVatConditions) {
          let voucherTypesToCreate: typeof voucherTypes = []

          if (vatCond.code === 'RI') {
            // Para clientes RI: Factura A y Presupuesto (+ NC y ND tipo A)
            voucherTypesToCreate = voucherTypes.filter(vt =>
              ['FA', 'PRE', 'NCA', 'NDA'].includes(vt.code)
            )
          } else {
            // Para otros (CF, MT, EX): Factura B y Presupuesto (+ NC y ND tipo B)
            voucherTypesToCreate = voucherTypes.filter(vt =>
              ['FB', 'PRE', 'NCB', 'NDB'].includes(vt.code)
            )
          }

          for (const voucherType of voucherTypesToCreate) {
            const existing = await prisma.voucherConfiguration.findFirst({
              where: {
                tenantId: tenant.id,
                voucherTypeId: voucherType.id,
                vatConditionId: vatCond.id
              }
            })

            if (!existing) {
              const printTemplate = data.printConfigs?.[voucherType.code] || 'thermal-80mm'

              await prisma.voucherConfiguration.create({
                data: {
                  tenantId: tenant.id,
                  voucherTypeId: voucherType.id,
                  branchId: branch.id,
                  afipConnectionId: afipConnection?.id || null,
                  salesPointId: salesPoint.id,
                  vatConditionId: vatCond.id,
                  nextVoucherNumber: 1,
                  printTemplate: printTemplate,
                  isActive: true
                }
              })
            }
          }
        }
      } else {
        // Para Monotributistas u otros, crear configuración general
        for (const voucherType of voucherTypes) {
          const existing = await prisma.voucherConfiguration.findFirst({
            where: {
              tenantId: tenant.id,
              voucherTypeId: voucherType.id
            }
          })

          if (!existing) {
            const printTemplate = data.printConfigs?.[voucherType.code] || 'thermal-80mm'

            await prisma.voucherConfiguration.create({
              data: {
                tenantId: tenant.id,
                voucherTypeId: voucherType.id,
                branchId: branch.id,
                afipConnectionId: afipConnection?.id || null,
                salesPointId: salesPoint.id,
                nextVoucherNumber: 1,
                printTemplate: printTemplate,
                isActive: true
              }
            })
          }
        }
      }
    }

    // Crear cliente "Consumidor Final" por defecto
    const existingConsumidorFinal = await prisma.entity.findFirst({
      where: {
        tenantId: tenant.id,
        code: 'CF001'
      }
    })

    if (!existingConsumidorFinal) {
      // Buscar la condición de IVA "Consumidor Final"
      const cfVatCondition = await prisma.vatCondition.findFirst({
        where: {
          tenantId: tenant.id,
          code: 'CF'
        }
      })

      await prisma.entity.create({
        data: {
          tenantId: tenant.id,
          code: 'CF001',
          name: 'Consumidor Final',
          isCustomer: true,
          isSupplier: false,
          isEmployee: false,
          country: 'AR',
          currency: 'ARS',
          cuit: cfVatCondition?.code || null,
          ivaCondition: cfVatCondition?.code || null,
          isDefaultCustomer: true,
          customerPaymentTerms: 0,
          customerCreditLimit: 0
        }
      })
    }

    // TODO: Invitar usuarios si hay en data.invitedUsers

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error completing wizard:', error)
    res.status(500).json({ error: 'Error al completar el wizard de configuración' })
  }
})

// POST /:tenantSlug/onboarding/skip
// Permite omitir el wizard completamente (solo admin)
router.post('/:tenantSlug/onboarding/skip', tenantMiddleware, authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenant, user } = req as any

    // Verificar que sea admin
    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'admin'
      }
    })

    if (!tenantUser) {
      return res.status(403).json({ error: 'Solo los administradores pueden omitir el wizard' })
    }

    // Marcar como completado
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        wizardCompleted: true,
        wizardStep: 11
      }
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error skipping wizard:', error)
    res.status(500).json({ error: 'Error al omitir el wizard' })
  }
})

export default router
