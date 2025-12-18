/**
 * Script para eliminar un tenant y todos sus datos relacionados
 *
 * USO:
 *   cd backend
 *   npx tsx src/scripts/delete-tenant.ts <tenant-slug>
 *
 * EJEMPLO:
 *   npx tsx src/scripts/delete-tenant.ts keysoft
 *
 * NOTA: Este script elimina PERMANENTEMENTE todos los datos del tenant.
 *       Los usuarios que SOLO pertenecen a este tenant también se eliminan.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteTenant(slug: string) {
  console.log(`\n🔍 Buscando tenant: ${slug}...`)

  // 1. Buscar el tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      tenantUsers: {
        include: {
          user: {
            include: {
              tenantUsers: true // Para ver si el usuario pertenece a otros tenants
            }
          }
        }
      }
    }
  })

  if (!tenant) {
    console.log(`❌ No se encontró el tenant con slug: ${slug}`)
    return false
  }

  console.log(`✅ Tenant encontrado: ${tenant.name} (ID: ${tenant.id})`)

  // 2. Contar registros relacionados
  console.log('\n📊 Contando registros a eliminar...')

  const counts = await Promise.all([
    prisma.sale.count({ where: { tenantId: tenant.id } }),
    prisma.purchase.count({ where: { tenantId: tenant.id } }),
    prisma.product.count({ where: { tenantId: tenant.id } }),
    prisma.entity.count({ where: { tenantId: tenant.id } }),
    prisma.warehouse.count({ where: { tenantId: tenant.id } }),
    prisma.branch.count({ where: { tenantId: tenant.id } }),
    prisma.cashAccount.count({ where: { tenantId: tenant.id } }),
    prisma.cashMovement.count({ where: { tenantId: tenant.id } }),
    prisma.paymentMethod.count({ where: { tenantId: tenant.id } }),
    prisma.voucherConfiguration.count({ where: { tenantId: tenant.id } }),
    prisma.salesPoint.count({ where: { tenantId: tenant.id } }),
    prisma.afipConnection.count({ where: { tenantId: tenant.id } }),
    prisma.vatCondition.count({ where: { tenantId: tenant.id } }),
    prisma.quote.count({ where: { tenantId: tenant.id } }),
    prisma.entityMovement.count({ where: { tenantId: tenant.id } }),
    prisma.entityPayment.count({ where: { tenantId: tenant.id } }),
  ])

  const [sales, purchases, products, entities, warehouses, branches,
         cashAccounts, cashMovements, paymentMethods, voucherConfigs,
         salesPoints, afipConnections, vatConditions, quotes,
         entityMovements, entityPayments] = counts

  console.log(`   - Ventas: ${sales}`)
  console.log(`   - Compras: ${purchases}`)
  console.log(`   - Productos: ${products}`)
  console.log(`   - Entidades: ${entities}`)
  console.log(`   - Almacenes: ${warehouses}`)
  console.log(`   - Sucursales: ${branches}`)
  console.log(`   - Cuentas de caja: ${cashAccounts}`)
  console.log(`   - Movimientos de caja: ${cashMovements}`)
  console.log(`   - Métodos de pago: ${paymentMethods}`)
  console.log(`   - Config. comprobantes: ${voucherConfigs}`)
  console.log(`   - Puntos de venta: ${salesPoints}`)
  console.log(`   - Conexiones AFIP: ${afipConnections}`)
  console.log(`   - Condiciones IVA: ${vatConditions}`)
  console.log(`   - Presupuestos: ${quotes}`)
  console.log(`   - Mov. cuenta corriente: ${entityMovements}`)
  console.log(`   - Pagos cuenta corriente: ${entityPayments}`)
  console.log(`   - Usuarios del tenant: ${tenant.tenantUsers.length}`)

  // 3. Identificar usuarios a eliminar (solo los que pertenecen ÚNICAMENTE a este tenant)
  const usersToDelete = tenant.tenantUsers
    .filter(tu => tu.user.tenantUsers.length === 1)
    .map(tu => tu.user)

  console.log(`\n👥 Usuarios que se eliminarán (solo pertenecen a este tenant): ${usersToDelete.length}`)
  usersToDelete.forEach(u => console.log(`   - ${u.email}`))

  const usersToKeep = tenant.tenantUsers
    .filter(tu => tu.user.tenantUsers.length > 1)
    .map(tu => tu.user)

  if (usersToKeep.length > 0) {
    console.log(`\n👤 Usuarios que se mantendrán (pertenecen a otros tenants): ${usersToKeep.length}`)
    usersToKeep.forEach(u => console.log(`   - ${u.email}`))
  }

  // 4. Eliminar el tenant (cascade borra todo lo relacionado)
  console.log('\n🗑️  Eliminando tenant y todos sus datos...')

  // Primero eliminar el tenant (cascade eliminará TenantUser y todo lo relacionado)
  await prisma.tenant.delete({
    where: { id: tenant.id }
  })
  console.log(`   ✓ Tenant eliminado: ${tenant.slug}`)

  // Luego eliminar usuarios que ya no pertenecen a ningún tenant
  if (usersToDelete.length > 0) {
    const userIds = usersToDelete.map(u => u.id)
    try {
      await prisma.user.deleteMany({
        where: {
          id: { in: userIds }
        }
      })
      console.log(`   ✓ Usuarios huérfanos eliminados: ${usersToDelete.length}`)
    } catch (error: any) {
      if (error.code === 'P2003') {
        console.log(`   ⚠️  No se pudieron eliminar algunos usuarios (tienen referencias en otros tenants)`)
        console.log(`      Usuarios a revisar manualmente:`)
        usersToDelete.forEach(u => console.log(`      - ${u.email} (ID: ${u.id})`))
      } else {
        throw error
      }
    }
  }

  console.log('\n✅ Tenant y todos sus datos eliminados correctamente!')
  return true
}

// Main
const slug = process.argv[2]

if (!slug) {
  console.log('❌ Error: Debes proporcionar el slug del tenant')
  console.log('\nUso: npx tsx src/scripts/delete-tenant.ts <tenant-slug>')
  console.log('Ejemplo: npx tsx src/scripts/delete-tenant.ts keysoft')
  process.exit(1)
}

deleteTenant(slug)
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
