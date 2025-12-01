import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdditionalCashAccounts() {
  console.log('[CASH] Creando cuentas de caja adicionales...\n');

  try {
    // Obtener todos los tenants
    const tenants = await prisma.tenant.findMany();

    for (const tenant of tenants) {
      console.log(`📋 Procesando tenant: ${tenant.name} (${tenant.slug})`);

      // Obtener el primer usuario del tenant para asignarlo como creador
      const tenantUser = await prisma.tenantUser.findFirst({
        where: { tenantId: tenant.id },
      });

      if (!tenantUser) {
        console.log(`   [WARNING]  No hay usuarios para este tenant\n`);
        continue;
      }

      // Verificar si ya existe cuenta bancaria
      const existingBank = await prisma.cashAccount.findFirst({
        where: {
          tenantId: tenant.id,
          accountType: 'bank',
        },
      });

      if (!existingBank) {
        await prisma.cashAccount.create({
          data: {
            tenantId: tenant.id,
            name: 'Cuenta Bancaria',
            description: 'Cuenta bancaria principal',
            accountType: 'bank',
            isActive: true,
            isDefault: false,
            initialBalance: 0,
            createdBy: tenantUser.userId,
          },
        });
        console.log('   [OK] Cuenta Bancaria creada');
      } else {
        console.log('   ℹ️  Cuenta Bancaria ya existe');
      }

      // Verificar si ya existe cuenta de Mercado Pago
      const existingMP = await prisma.cashAccount.findFirst({
        where: {
          tenantId: tenant.id,
          accountType: 'mercadopago',
        },
      });

      if (!existingMP) {
        await prisma.cashAccount.create({
          data: {
            tenantId: tenant.id,
            name: 'Mercado Pago',
            description: 'Cuenta de Mercado Pago',
            accountType: 'mercadopago',
            isActive: true,
            isDefault: false,
            initialBalance: 0,
            createdBy: tenantUser.userId,
          },
        });
        console.log('   [OK] Mercado Pago creada');
      } else {
        console.log('   ℹ️  Mercado Pago ya existe');
      }

      console.log('');
    }

    console.log('[OK] Proceso completado exitosamente');
  } catch (error) {
    console.error('[ERROR] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createAdditionalCashAccounts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
