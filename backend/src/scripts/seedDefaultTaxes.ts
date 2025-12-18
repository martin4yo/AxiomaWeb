/**
 * Script para crear impuestos por defecto para todos los tenants existentes
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTaxes = [
  {
    code: 'IVA0',
    name: 'IVA 0%',
    description: 'Sin IVA',
    rate: 0,
    taxType: 'IVA',
    applicableToRI: true,
    applicableToMT: false,
    applicableToEX: false,
    calculationBase: 'NET',
    displayInInvoice: true
  },
  {
    code: 'IVA105',
    name: 'IVA 10.5%',
    description: 'IVA Reducido 10.5%',
    rate: 10.5,
    taxType: 'IVA',
    applicableToRI: true,
    applicableToMT: false,
    applicableToEX: false,
    calculationBase: 'NET',
    displayInInvoice: true
  },
  {
    code: 'IVA21',
    name: 'IVA 21%',
    description: 'IVA General 21%',
    rate: 21,
    taxType: 'IVA',
    applicableToRI: true,
    applicableToMT: false,
    applicableToEX: false,
    calculationBase: 'NET',
    displayInInvoice: true
  },
  {
    code: 'PERCIIBB',
    name: 'Percepción IIBB',
    description: 'Percepción de Ingresos Brutos',
    rate: 3,
    taxType: 'PERCEPTION',
    applicableToRI: true,
    applicableToMT: false,
    applicableToEX: false,
    calculationBase: 'NET',
    displayInInvoice: true
  },
  {
    code: 'PERCIVA',
    name: 'Percepción IVA',
    description: 'Percepción de IVA',
    rate: 2,
    taxType: 'PERCEPTION',
    applicableToRI: true,
    applicableToMT: false,
    applicableToEX: false,
    calculationBase: 'NET',
    displayInInvoice: true
  }
]

async function seedDefaultTaxes() {
  console.log('🌱 Iniciando creación de impuestos por defecto...')

  try {
    // Obtener todos los tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true }
    })

    console.log(`📊 Encontrados ${tenants.length} tenants`)

    for (const tenant of tenants) {
      console.log(`\n📦 Procesando tenant: ${tenant.name} (${tenant.slug})`)

      for (const taxData of defaultTaxes) {
        // Verificar si ya existe este impuesto para el tenant
        const existingTax = await prisma.tax.findFirst({
          where: {
            tenantId: tenant.id,
            code: taxData.code
          }
        })

        if (existingTax) {
          console.log(`   ⏭️  ${taxData.code} ya existe, saltando...`)
          continue
        }

        // Crear el impuesto
        const tax = await prisma.tax.create({
          data: {
            tenantId: tenant.id,
            code: taxData.code,
            name: taxData.name,
            description: taxData.description,
            rate: taxData.rate,
            taxType: taxData.taxType,
            applicableToRI: taxData.applicableToRI,
            applicableToMT: taxData.applicableToMT,
            applicableToEX: taxData.applicableToEX,
            calculationBase: taxData.calculationBase,
            displayInInvoice: taxData.displayInInvoice,
            isActive: true
          }
        })

        console.log(`   ✅ Creado: ${tax.name} (${tax.code})`)
      }
    }

    console.log('\n✨ Proceso completado exitosamente')
  } catch (error) {
    console.error('❌ Error al crear impuestos por defecto:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
seedDefaultTaxes()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
