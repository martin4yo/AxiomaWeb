import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkPaymentMethodsToCashAccounts() {
  console.log('🔗 Vinculando métodos de pago con cuentas de caja...\n');

  try {
    // Obtener todos los tenants
    const tenants = await prisma.tenant.findMany();

    for (const tenant of tenants) {
      console.log(`📋 Procesando tenant: ${tenant.name} (${tenant.slug})`);

      // Obtener cuentas de caja del tenant
      const cashAccounts = await prisma.cashAccount.findMany({
        where: { tenantId: tenant.id },
      });

      if (cashAccounts.length === 0) {
        console.log(`   [WARNING]  No hay cuentas de caja para este tenant\n`);
        continue;
      }

      // Crear mapeo de tipo de cuenta
      const accountsByType = new Map(
        cashAccounts.map((acc) => [acc.accountType.toLowerCase(), acc])
      );

      // Obtener métodos de pago del tenant
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { tenantId: tenant.id },
      });

      let updated = 0;

      for (const method of paymentMethods) {
        let targetAccountType: string;

        // Mapear paymentType a accountType
        switch (method.paymentType.toUpperCase()) {
          case 'CASH':
            targetAccountType = 'cash';
            break;
          case 'TRANSFER':
          case 'CHECK':
            targetAccountType = 'bank';
            break;
          case 'CARD':
            // Intentar con mercadopago, si no existe usar bank
            targetAccountType = accountsByType.has('mercadopago') ? 'mercadopago' : 'bank';
            break;
          default:
            targetAccountType = 'cash'; // Por defecto efectivo
        }

        // Buscar la cuenta correspondiente
        let cashAccount = accountsByType.get(targetAccountType);

        // Si no existe esa cuenta, usar la por defecto
        if (!cashAccount) {
          cashAccount = cashAccounts.find((acc) => acc.isDefault) || cashAccounts[0];
        }

        // Actualizar método de pago
        await prisma.paymentMethod.update({
          where: { id: method.id },
          data: { cashAccountId: cashAccount.id },
        });

        console.log(
          `   [OK] ${method.name} (${method.paymentType}) -> ${cashAccount.name} (${cashAccount.accountType})`
        );
        updated++;
      }

      console.log(`   [INFO] ${updated} métodos de pago actualizados\n`);
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
linkPaymentMethodsToCashAccounts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
