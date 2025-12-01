import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Empresa Demo',
      planType: 'pro',
      status: 'active',
      settings: {
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        dateFormat: 'DD/MM/YYYY',
        language: 'es'
      }
    }
  })

  console.log('[OK] Demo tenant created:', demoTenant.name)

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@axioma.com' },
    update: {},
    create: {
      email: 'demo@axioma.com',
      passwordHash,
      firstName: 'Usuario',
      lastName: 'Demo',
      isActive: true
    }
  })

  console.log('[OK] Demo user created:', demoUser.email)

  // Create tenant-user relationship
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: demoUser.id
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoUser.id,
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
          tenantId: demoTenant.id,
          code: docType.code
        }
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...docType,
        isActive: true
      }
    })
  }

  console.log('[OK] Document types created')

  // Create demo entities (clients/suppliers)
  const entities = [
    {
      code: 'CLI001',
      name: 'Cliente Premium S.A.',
      taxId: '30-12345678-9',
      email: 'contacto@clientepremium.com',
      phone: '+54 11 1234-5678',
      addressLine1: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1043',
      country: 'AR',
      isCustomer: true,
      isSupplier: false,
      isEmployee: false,
      category: 'A',
      currency: 'ARS',
      customerPaymentTerms: 30,
      customerCreditLimit: 100000
    },
    {
      code: 'CLI002',
      name: 'Distribuidora ABC S.R.L.',
      taxId: '30-87654321-2',
      email: 'ventas@distribuidoraabc.com',
      phone: '+54 11 8765-4321',
      addressLine1: 'Av. Santa Fe 5678',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1425',
      country: 'AR',
      isCustomer: true,
      isSupplier: true,
      isEmployee: false,
      category: 'B',
      currency: 'ARS',
      customerPaymentTerms: 45,
      customerCreditLimit: 50000,
      supplierPaymentTerms: 30,
      supplierCategory: 'A'
    },
    {
      code: 'PRV001',
      name: 'Proveedor Tech S.A.',
      taxId: '30-11111111-8',
      email: 'compras@proveedortech.com',
      phone: '+54 11 1111-1111',
      addressLine1: 'Av. Rivadavia 9876',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1406',
      country: 'AR',
      isCustomer: false,
      isSupplier: true,
      isEmployee: false,
      category: 'A',
      currency: 'ARS',
      supplierPaymentTerms: 30,
      supplierCategory: 'A'
    }
  ]

  for (const entity of entities) {
    await prisma.entity.upsert({
      where: {
        tenantId_code: {
          tenantId: demoTenant.id,
          code: entity.code!
        }
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...entity,
        isActive: true
      }
    })
  }

  console.log('[OK] Demo entities created')

  // Create demo products
  const products = [
    {
      sku: 'LAPTOP001',
      name: 'Laptop Profesional',
      description: 'Laptop para uso profesional con 16GB RAM y SSD 512GB',
      costPrice: 80000,
      salePrice: 120000,
      currency: 'ARS',
      trackStock: true,
      currentStock: 15,
      minStock: 5
    },
    {
      sku: 'MOUSE001',
      name: 'Mouse Inalámbrico',
      description: 'Mouse inalámbrico ergonómico',
      costPrice: 2000,
      salePrice: 3500,
      currency: 'ARS',
      trackStock: true,
      currentStock: 50,
      minStock: 10
    },
    {
      sku: 'CONS001',
      name: 'Consultoría IT',
      description: 'Servicio de consultoría en tecnología',
      costPrice: 0,
      salePrice: 8000,
      currency: 'ARS',
      trackStock: false,
      currentStock: 0,
      minStock: 0
    },
    {
      sku: 'SOFT001',
      name: 'Licencia Software',
      description: 'Licencia anual de software empresarial',
      costPrice: 15000,
      salePrice: 25000,
      currency: 'ARS',
      trackStock: true,
      currentStock: 3,
      minStock: 1
    }
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: demoTenant.id,
          sku: product.sku
        }
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...product,
        isActive: true
      }
    })
  }

  console.log('[OK] Demo products created')

  // Create demo warehouses
  const warehouse = await prisma.warehouse.upsert({
    where: {
      tenantId_code: {
        tenantId: demoTenant.id,
        code: 'MAIN'
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      code: 'MAIN',
      name: 'Almacén Principal',
      description: 'Almacén principal de la empresa',
      address: 'Calle Principal 123, Ciudad',
      isActive: true,
      isDefault: true
    }
  })

  console.log('[OK] Demo warehouse created')

  // Create warehouse stock for products with inventory
  const stockProducts = await prisma.product.findMany({
    where: {
      tenantId: demoTenant.id,
      trackStock: true
    }
  })

  for (const product of stockProducts) {
    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: warehouse.id,
          productId: product.id
        }
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: product.currentStock,
        reservedQty: 0,
        availableQty: product.currentStock,
        lastMovement: new Date()
      }
    })

    // Create initial stock movement for each product
    await prisma.stockMovement.create({
      data: {
        tenantId: demoTenant.id,
        warehouseId: warehouse.id,
        productId: product.id,
        movementType: 'IN',
        quantity: product.currentStock,
        unitCost: product.costPrice,
        totalCost: Number(product.currentStock) * Number(product.costPrice),
        documentType: 'INITIAL',
        referenceNumber: 'INIT-001',
        notes: 'Stock inicial del sistema',
        userId: demoUser.id
      }
    })
  }

  console.log('[OK] Demo warehouse stock created')

  // ============================================
  // SISTEMA DE FACTURACIÓN
  // ============================================

  console.log('[DOC] Creating voucher types...')

  // Crear tipos de comprobante
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

  // Actualizar condiciones de IVA con códigos AFIP
  console.log('💼 Updating VAT conditions with AFIP codes...')

  const vatConditions = await prisma.vatCondition.findMany({
    where: { tenantId: demoTenant.id }
  })

  for (const vc of vatConditions) {
    let afipCode = null
    let canIssueA = false
    let issuesOnlyC = false

    switch (vc.code) {
      case 'RI':
        afipCode = 1
        canIssueA = true
        break
      case 'MT':
        afipCode = 6
        issuesOnlyC = true
        break
      case 'CF':
        afipCode = 5
        break
      case 'EX':
        afipCode = 4
        break
      case 'NR':
        afipCode = 7
        break
    }

    await prisma.vatCondition.update({
      where: { id: vc.id },
      data: { afipCode, canIssueA, issuesOnlyC }
    })
  }

  console.log('[OK] VAT conditions updated with AFIP codes')

  // Crear sucursal por defecto
  console.log('[COMPANY] Creating default branch...')

  const defaultBranch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: demoTenant.id,
        code: 'CENTRAL'
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      code: 'CENTRAL',
      name: 'Casa Central',
      addressLine1: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      postalCode: '1043',
      isDefault: true,
      isActive: true
    }
  })

  console.log('[OK] Default branch created:', defaultBranch.name)

  // Crear conexión AFIP de testing
  console.log('🔌 Creating AFIP connection...')

  const afipConnection = await prisma.afipConnection.upsert({
    where: {
      id: 'demo-afip-testing' // ID fijo para el demo
    },
    update: {},
    create: {
      id: 'demo-afip-testing',
      tenantId: demoTenant.id,
      name: 'Testing AFIP',
      description: 'Configuración de homologación para testing',
      cuit: '20123456789',
      environment: 'testing',
      isActive: true
    }
  })

  console.log('[OK] AFIP connection created:', afipConnection.name)

  // Crear punto de venta
  console.log('[INFO] Creating sales point...')

  const salesPoint = await prisma.salesPoint.upsert({
    where: {
      tenantId_number: {
        tenantId: demoTenant.id,
        number: 1
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      number: 1,
      name: 'Punto de Venta 1',
      description: 'PV principal',
      isActive: true
    }
  })

  console.log('[OK] Sales point created:', salesPoint.name)

  // Configurar comprobantes para la sucursal (solo facturas por ahora)
  console.log('⚙️ Creating voucher configurations...')

  const voucherTypesToConfigure = ['FA', 'FB', 'FC']

  for (const vtCode of voucherTypesToConfigure) {
    const voucherType = await prisma.voucherType.findUnique({
      where: { code: vtCode }
    })

    if (voucherType) {
      await prisma.voucherConfiguration.upsert({
        where: {
          tenantId_voucherTypeId_branchId: {
            tenantId: demoTenant.id,
            voucherTypeId: voucherType.id,
            branchId: defaultBranch.id
          }
        },
        update: {},
        create: {
          tenantId: demoTenant.id,
          voucherTypeId: voucherType.id,
          branchId: defaultBranch.id,
          afipConnectionId: afipConnection.id,
          salesPointId: salesPoint.id,
          nextVoucherNumber: 1,
          isActive: true
        }
      })
    }
  }

  console.log('[OK] Voucher configurations created')

  console.log('🎉 Seeding completed successfully!')
  console.log('')
  console.log('Demo credentials:')
  console.log('Email: demo@axioma.com')
  console.log('Password: demo123')
  console.log('Tenant: demo (demo.axioma.com)')
}

main()
  .catch((e) => {
    console.error('[ERROR] Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })