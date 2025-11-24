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

  console.log('✅ Demo tenant created:', demoTenant.name)

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

  console.log('✅ Demo user created:', demoUser.email)

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

  console.log('✅ Tenant-user relationship created')

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

  console.log('✅ Document types created')

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
      entityType: 'CLIENT',
      category: 'A',
      currency: 'ARS',
      paymentTermsDays: 30,
      creditLimit: 100000
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
      entityType: 'BOTH',
      category: 'B',
      currency: 'ARS',
      paymentTermsDays: 45,
      creditLimit: 50000
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
      entityType: 'SUPPLIER',
      category: 'A',
      currency: 'ARS',
      paymentTermsDays: 30,
      creditLimit: 0
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

  console.log('✅ Demo entities created')

  // Create demo products
  const products = [
    {
      sku: 'LAPTOP001',
      name: 'Laptop Profesional',
      description: 'Laptop para uso profesional con 16GB RAM y SSD 512GB',
      category: 'Electrónicos',
      brand: 'TechBrand',
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
      category: 'Accesorios',
      brand: 'TechBrand',
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
      category: 'Servicios',
      brand: '',
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
      category: 'Software',
      brand: 'SoftCorp',
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

  console.log('✅ Demo products created')

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

  console.log('✅ Demo warehouse created')

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

  console.log('✅ Demo warehouse stock created')

  console.log('🎉 Seeding completed successfully!')
  console.log('')
  console.log('Demo credentials:')
  console.log('Email: demo@axioma.com')
  console.log('Password: demo123')
  console.log('Tenant: demo (demo.axioma.com)')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })