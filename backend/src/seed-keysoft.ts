import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding KeySoft tenant...')

  // Create KeySoft tenant
  const keysoftTenant = await prisma.tenant.upsert({
    where: { slug: 'keysoft' },
    update: {},
    create: {
      slug: 'keysoft',
      name: 'KeySoft',
      planType: 'enterprise',
      status: 'active',
      settings: {
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        dateFormat: 'DD/MM/YYYY',
        language: 'es'
      },
      businessName: 'KeySoft S.A.',
      cuit: '30-12345678-9', // REEMPLAZAR CON EL CUIT REAL
      address: 'Dirección de KeySoft', // REEMPLAZAR
      phone: '+54 11 1234-5678', // REEMPLAZAR
      email: 'info@keysoft.com' // REEMPLAZAR
    }
  })

  console.log('[OK] KeySoft tenant created:', keysoftTenant.name)

  // Create admin user
  const passwordHash = await bcrypt.hash('KeySoft2024!', 12) // CAMBIAR CONTRASEÑA
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@keysoft.com' }, // REEMPLAZAR CON EMAIL REAL
    update: {},
    create: {
      email: 'admin@keysoft.com', // REEMPLAZAR
      passwordHash,
      firstName: 'Administrador',
      lastName: 'KeySoft',
      isActive: true
    }
  })

  console.log('[OK] Admin user created:', adminUser.email)

  // Create tenant-user relationship
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: keysoftTenant.id,
        userId: adminUser.id
      }
    },
    update: {},
    create: {
      tenantId: keysoftTenant.id,
      userId: adminUser.id,
      role: 'admin',
      permissions: ['*'],
      isActive: true
    }
  })

  console.log('[OK] Tenant-user relationship created')

  // Create document types
  const documentTypes = [
    {
      code: 'PRE',
      name: 'Presupuesto',
      category: 'SALES',
      config: {
        affects_balance: false,
        affects_stock: false,
        requires_items: true,
        numbering: { auto: true, prefix: 'PRE', length: 8 }
      }
    },
    {
      code: 'FAC',
      name: 'Factura',
      category: 'SALES',
      config: {
        affects_balance: true,
        affects_stock: true,
        requires_items: true,
        numbering: { auto: true, prefix: 'FAC', length: 8 }
      }
    },
    {
      code: 'REM',
      name: 'Remito',
      category: 'SALES',
      config: {
        affects_balance: false,
        affects_stock: true,
        requires_items: true,
        numbering: { auto: true, prefix: 'REM', length: 8 }
      }
    },
    {
      code: 'OC',
      name: 'Orden de Compra',
      category: 'PURCHASES',
      config: {
        affects_balance: false,
        affects_stock: false,
        requires_items: true,
        numbering: { auto: true, prefix: 'OC', length: 8 }
      }
    },
  ]

  for (const docType of documentTypes) {
    await prisma.documentType.upsert({
      where: {
        tenantId_code: {
          tenantId: keysoftTenant.id,
          code: docType.code
        }
      },
      update: {},
      create: {
        tenantId: keysoftTenant.id,
        ...docType,
        isActive: true
      }
    })
  }

  console.log('[OK] Document types created')

  // Create VAT conditions
  console.log('💼 Creating VAT conditions...')

  const vatConditions = [
    { code: 'RI', name: 'Responsable Inscripto', afipCode: 1, canIssueA: true, issuesOnlyC: false },
    { code: 'MT', name: 'Monotributista', afipCode: 6, canIssueA: false, issuesOnlyC: true },
    { code: 'CF', name: 'Consumidor Final', afipCode: 5, canIssueA: false, issuesOnlyC: false },
    { code: 'EX', name: 'Exento', afipCode: 4, canIssueA: false, issuesOnlyC: false },
    { code: 'NR', name: 'No Responsable', afipCode: 7, canIssueA: false, issuesOnlyC: false }
  ]

  for (const vc of vatConditions) {
    await prisma.vatCondition.upsert({
      where: {
        tenantId_code: {
          tenantId: keysoftTenant.id,
          code: vc.code
        }
      },
      update: {},
      create: {
        tenantId: keysoftTenant.id,
        ...vc,
        description: vc.name
      }
    })
  }

  console.log('[OK] VAT conditions created')

  // Create voucher types
  console.log('[DOC] Creating voucher types...')

  const voucherTypes = [
    // Facturas
    { code: 'FA', name: 'Factura A', letter: 'A', documentClass: 'INVOICE', afipCode: 1, requiresCae: true, discriminatesVat: true },
    { code: 'FB', name: 'Factura B', letter: 'B', documentClass: 'INVOICE', afipCode: 6, requiresCae: true, discriminatesVat: false },
    { code: 'FC', name: 'Factura C', letter: 'C', documentClass: 'INVOICE', afipCode: 11, requiresCae: true, discriminatesVat: false },

    // Notas de Crédito
    { code: 'NCA', name: 'Nota de Crédito A', letter: 'A', documentClass: 'CREDIT_NOTE', afipCode: 3, requiresCae: true, discriminatesVat: true },
    { code: 'NCB', name: 'Nota de Crédito B', letter: 'B', documentClass: 'CREDIT_NOTE', afipCode: 8, requiresCae: true, discriminatesVat: false },
    { code: 'NCC', name: 'Nota de Crédito C', letter: 'C', documentClass: 'CREDIT_NOTE', afipCode: 13, requiresCae: true, discriminatesVat: false },

    // Notas de Débito
    { code: 'NDA', name: 'Nota de Débito A', letter: 'A', documentClass: 'DEBIT_NOTE', afipCode: 2, requiresCae: true, discriminatesVat: true },
    { code: 'NDB', name: 'Nota de Débito B', letter: 'B', documentClass: 'DEBIT_NOTE', afipCode: 7, requiresCae: true, discriminatesVat: false },
    { code: 'NDC', name: 'Nota de Débito C', letter: 'C', documentClass: 'DEBIT_NOTE', afipCode: 12, requiresCae: true, discriminatesVat: false },

    // Presupuesto (no fiscal)
    { code: 'PR', name: 'Presupuesto', letter: 'X', documentClass: 'QUOTE', afipCode: null, requiresCae: false, discriminatesVat: false }
  ]

  for (const vt of voucherTypes) {
    await prisma.voucherType.upsert({
      where: { code: vt.code },
      update: vt,
      create: vt
    })
  }

  console.log(`[OK] Created ${voucherTypes.length} voucher types`)

  // Create default branch
  console.log('[COMPANY] Creating default branch...')

  const defaultBranch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: keysoftTenant.id,
        code: 'CENTRAL'
      }
    },
    update: {},
    create: {
      tenantId: keysoftTenant.id,
      code: 'CENTRAL',
      name: 'Casa Central',
      addressLine1: 'Dirección Principal', // REEMPLAZAR
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1043',
      isDefault: true,
      isActive: true
    }
  })

  console.log('[OK] Default branch created:', defaultBranch.name)

  // Create AFIP connection
  console.log('🔌 Creating AFIP connection...')

  const afipConnection = await prisma.afipConnection.upsert({
    where: {
      id: 'keysoft-afip-testing'
    },
    update: {},
    create: {
      id: 'keysoft-afip-testing',
      tenantId: keysoftTenant.id,
      name: 'Testing AFIP',
      description: 'Configuración de homologación para testing',
      cuit: '30123456789', // REEMPLAZAR CON CUIT REAL
      environment: 'testing', // Cambiar a 'production' cuando esté listo
      isActive: true
    }
  })

  console.log('[OK] AFIP connection created:', afipConnection.name)

  // Create sales point
  console.log('[INFO] Creating sales point...')

  const salesPoint = await prisma.salesPoint.upsert({
    where: {
      tenantId_number: {
        tenantId: keysoftTenant.id,
        number: 1
      }
    },
    update: {},
    create: {
      tenantId: keysoftTenant.id,
      number: 1,
      name: 'Punto de Venta 1',
      description: 'PV principal',
      branchId: defaultBranch.id,
      isActive: true
    }
  })

  console.log('[OK] Sales point created:', salesPoint.name)

  // Create voucher configurations
  console.log('⚙️ Creating voucher configurations...')

  const voucherTypesToConfigure = ['FA', 'FB', 'FC', 'NCA', 'NCB', 'NCC', 'NDA', 'NDB', 'NDC', 'PR']

  for (const vtCode of voucherTypesToConfigure) {
    const voucherType = await prisma.voucherType.findUnique({
      where: { code: vtCode }
    })

    if (voucherType) {
      await prisma.voucherConfiguration.upsert({
        where: {
          tenantId_voucherTypeId_branchId: {
            tenantId: keysoftTenant.id,
            voucherTypeId: voucherType.id,
            branchId: defaultBranch.id
          }
        },
        update: {},
        create: {
          tenantId: keysoftTenant.id,
          voucherTypeId: voucherType.id,
          branchId: defaultBranch.id,
          afipConnectionId: voucherType.requiresCae ? afipConnection.id : null,
          salesPointId: salesPoint.id,
          nextVoucherNumber: 1,
          isActive: true,
          printTemplateId: vtCode.startsWith('NC') ? 'nota-credito-80mm' :
                          vtCode.startsWith('ND') ? 'nota-debito-80mm' :
                          vtCode === 'PR' ? 'presupuesto-80mm' :
                          vtCode === 'FA' ? 'factura-a-80mm' : 'factura-b-80mm'
        }
      })
    }
  }

  console.log('[OK] Voucher configurations created')

  // Create default warehouse
  console.log('[WAREHOUSE] Creating default warehouse...')

  const warehouse = await prisma.warehouse.upsert({
    where: {
      tenantId_code: {
        tenantId: keysoftTenant.id,
        code: 'MAIN'
      }
    },
    update: {},
    create: {
      tenantId: keysoftTenant.id,
      code: 'MAIN',
      name: 'Almacén Principal',
      description: 'Almacén principal',
      address: 'Dirección del almacén',
      isActive: true,
      isDefault: true
    }
  })

  console.log('[OK] Warehouse created:', warehouse.name)

  // Create cash accounts
  console.log('[CASH] Creating cash accounts...')

  const cashAccount = await prisma.cashAccount.create({
    data: {
      tenantId: keysoftTenant.id,
      name: 'Caja Principal',
      description: 'Cuenta de caja principal',
      accountType: 'cash',
      initialBalance: 0,
      isActive: true,
      isDefault: true,
      createdBy: adminUser.id
    }
  })

  console.log('[OK] Cash account created:', cashAccount.name)

  // Create payment methods
  console.log('[PAYMENT] Creating payment methods...')

  const paymentMethods = [
    { name: 'Efectivo', paymentType: 'CASH', requiresReference: false, daysToCollection: 0, cashAccountId: cashAccount.id },
    { name: 'Transferencia', paymentType: 'TRANSFER', requiresReference: true, daysToCollection: 0, cashAccountId: cashAccount.id },
    { name: 'Tarjeta de Débito', paymentType: 'CARD', requiresReference: true, daysToCollection: 1, cashAccountId: cashAccount.id },
    { name: 'Tarjeta de Crédito', paymentType: 'CARD', requiresReference: true, daysToCollection: 7, cashAccountId: cashAccount.id },
    { name: 'Mercado Pago', paymentType: 'OTHER', requiresReference: true, daysToCollection: 1, cashAccountId: cashAccount.id },
  ]

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: {
        tenantId_name: {
          tenantId: keysoftTenant.id,
          name: pm.name
        }
      },
      update: {},
      create: {
        tenantId: keysoftTenant.id,
        ...pm,
        isActive: true
      }
    })
  }

  console.log('[OK] Payment methods created')

  console.log('')
  console.log('🎉 KeySoft seeding completed successfully!')
  console.log('')
  console.log('='.repeat(50))
  console.log('CREDENCIALES DE ACCESO:')
  console.log('='.repeat(50))
  console.log('URL: https://keysoft.axioma.com')
  console.log('Email: admin@keysoft.com')
  console.log('Password: KeySoft2024!')
  console.log('Tenant: keysoft')
  console.log('='.repeat(50))
  console.log('')
  console.log('⚠️  IMPORTANTE: Cambiar la contraseña después del primer login')
}

main()
  .catch((e) => {
    console.error('[ERROR] Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
