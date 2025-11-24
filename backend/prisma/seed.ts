import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear tenant de demo
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Empresa Demo',
      planType: 'premium',
      status: 'active',
      settings: {
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        dateFormat: 'DD/MM/YYYY',
      },
    },
  });
  console.log('✅ Tenant creado:', tenant.name);

  // Crear usuario superadmin
  const passwordHash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log('✅ Usuario creado:', user.email);

  // Relacionar usuario con tenant
  const tenantUser = await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'superadmin',
      permissions: ['*'],
      isActive: true,
    },
  });
  console.log('✅ Relación tenant-user creada:', tenantUser.role);

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('   Email: admin@demo.com');
  console.log('   Password: admin123');
  console.log('   Tenant: demo');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
