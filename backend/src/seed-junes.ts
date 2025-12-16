import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Ferreteria Junes tenant...')

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'ferreteria-junes' }
  })

  if (!tenant) {
    console.error('Tenant ferreteria-junes not found')
    return
  }

  console.log('[OK] Tenant found:', tenant.name, tenant.id)

  // Marcar wizard como completado
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      wizardCompleted: true,
      wizardStep: 11
    }
  })
  console.log('[OK] Wizard marked as completed')

  // Verificar que exista la sucursal
  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id }
  })

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: 'CENTRAL',
        name: 'Casa Central',
        addressLine1: tenant.address || '',
        isDefault: true
      }
    })
    console.log('[OK] Branch created')
  } else {
    console.log('[OK] Branch already exists')
  }

  // Crear formas de pago
  const paymentMethods = [
    { code: 'CASH', name: 'Efectivo' },
    { code: 'DEBIT', name: 'Tarjeta de Débito' },
    { code: 'CREDIT', name: 'Tarjeta de Crédito' },
    { code: 'TRANSFER', name: 'Transferencia' },
    { code: 'CHECK', name: 'Cheque' },
    { code: 'MP', name: 'Mercado Pago' },
    { code: 'CC', name: 'Cuenta Corriente' }
  ]

  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        tenantId: tenant.id,
        code: pm.code
      }
    })

    if (!existing) {
      await prisma.paymentMethod.create({
        data: {
          tenantId: tenant.id,
          code: pm.code,
          name: pm.name,
          isActive: true
        }
      })
      console.log(`[+] Payment method created: ${pm.name}`)
    }
  }
  console.log('[OK] Payment methods processed')

  // Crear categorías de productos
  const categories = [
    { code: 'HERR', name: 'Herramientas', description: 'Herramientas manuales y eléctricas' },
    { code: 'PINT', name: 'Pinturería', description: 'Pinturas y accesorios' },
    { code: 'ELEC', name: 'Electricidad', description: 'Materiales eléctricos' },
    { code: 'PLOM', name: 'Plomería', description: 'Artículos de plomería' },
    { code: 'FERRE', name: 'Ferretería General', description: 'Artículos varios de ferretería' }
  ]

  for (const cat of categories) {
    const existing = await prisma.productCategory.findFirst({
      where: {
        tenantId: tenant.id,
        code: cat.code
      }
    })

    if (!existing) {
      await prisma.productCategory.create({
        data: {
          tenantId: tenant.id,
          code: cat.code,
          name: cat.name,
          description: cat.description,
          isActive: true
        }
      })
      console.log(`[+] Category created: ${cat.name}`)
    }
  }
  console.log('[OK] Product categories processed')

  // Crear almacén
  const existingWarehouse = await prisma.warehouse.findFirst({
    where: {
      tenantId: tenant.id,
      code: 'MAIN'
    }
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
    console.log('[+] Warehouse created')
  } else {
    console.log('[OK] Warehouse already exists')
  }

  // Crear punto de venta
  const existingSalesPoint = await prisma.salesPoint.findFirst({
    where: {
      tenantId: tenant.id,
      number: 1
    }
  })

  let salesPoint = existingSalesPoint
  if (!salesPoint) {
    salesPoint = await prisma.salesPoint.create({
      data: {
        tenantId: tenant.id,
        number: 1,
        name: 'Punto de Venta 1',
        isActive: true
      }
    })
    console.log('[+] Sales point created')
  } else {
    console.log('[OK] Sales point already exists')
  }

  // Crear configuraciones de comprobantes
  const voucherTypes = [
    { code: 'FA', afipId: '1', name: 'Factura A' },
    { code: 'FB', afipId: '6', name: 'Factura B' },
    { code: 'FC', afipId: '11', name: 'Factura C' },
    { code: 'NCA', afipId: '3', name: 'Nota de Crédito A' },
    { code: 'NCB', afipId: '8', name: 'Nota de Crédito B' },
    { code: 'NCC', afipId: '13', name: 'Nota de Crédito C' }
  ]

  for (const vt of voucherTypes) {
    const existing = await prisma.voucherConfiguration.findFirst({
      where: {
        tenantId: tenant.id,
        voucherTypeId: vt.afipId
      }
    })

    if (!existing) {
      await prisma.voucherConfiguration.create({
        data: {
          tenantId: tenant.id,
          voucherTypeId: vt.afipId,
          branchId: branch.id,
          salesPointId: salesPoint.id,
          nextVoucherNumber: 1,
          printTemplate: 'thermal-80mm',
          isActive: true
        }
      })
      console.log(`[+] Voucher config created: ${vt.name}`)
    }
  }
  console.log('[OK] Voucher configurations processed')

  // Crear cliente Consumidor Final
  const cfVatCondition = await prisma.vatCondition.findFirst({
    where: { tenantId: tenant.id, code: 'CF' }
  })

  const existingEntity = await prisma.entity.findFirst({
    where: {
      tenantId: tenant.id,
      code: 'CF001'
    }
  })

  if (!existingEntity) {
    await prisma.entity.create({
      data: {
        tenantId: tenant.id,
        code: 'CF001',
        name: 'Consumidor Final',
        entityType: 'CLIENT',
        country: 'AR',
        currency: 'ARS',
        vatConditionId: cfVatCondition?.id || null,
        isActive: true,
        paymentTermsDays: 0,
        creditLimit: 0
      }
    })
    console.log('[+] Consumer entity created')
  } else {
    console.log('[OK] Consumer entity already exists')
  }

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
