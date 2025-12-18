/**
 * Servicio de cálculo de impuestos
 * Maneja la lógica compleja de cálculo de impuestos según:
 * - Impuestos del producto
 * - Impuestos del cliente
 * - Condición IVA del tenant
 */

import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

interface TaxItem {
  id: string
  code: string
  name: string
  rate: Decimal
  taxType: string
  calculationBase: string
  displayInInvoice: boolean
}

interface ProductTaxInfo {
  productId: string
  taxes: TaxItem[]
}

interface EntityTaxInfo {
  entityId: string
  taxes: TaxItem[]
}

interface TaxCalculationResult {
  ivaRate: Decimal
  ivaAmount: Decimal
  otherTaxes: Array<{
    taxId: string
    code: string
    name: string
    rate: Decimal
    amount: Decimal
    taxType: string
  }>
  totalTaxAmount: Decimal
}

export class TaxCalculationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calcula los impuestos aplicables a un item de venta/compra
   *
   * @param tenantId - ID del tenant
   * @param productId - ID del producto
   * @param entityId - ID del cliente/proveedor (opcional)
   * @param netAmount - Monto neto (sin IVA) sobre el cual calcular los impuestos
   * @param tenantVatCondition - Condición IVA del tenant (RI, MT, EX)
   * @returns Desglose de impuestos calculados
   */
  async calculateItemTaxes(
    tenantId: string,
    productId: string,
    entityId: string | null,
    netAmount: Decimal,
    tenantVatCondition: 'RI' | 'MT' | 'EX' = 'RI'
  ): Promise<TaxCalculationResult> {
    // 1. Obtener impuestos del producto
    const productTaxes = await this.prisma.productTax.findMany({
      where: {
        productId,
        tax: {
          tenantId,
          isActive: true
        }
      },
      include: {
        tax: true
      }
    })

    // 2. Obtener impuestos del cliente (si existe)
    let entityTaxes: any[] = []
    if (entityId) {
      entityTaxes = await this.prisma.entityTax.findMany({
        where: {
          entityId,
          tax: {
            tenantId,
            isActive: true
          }
        },
        include: {
          tax: true
        }
      })
    }

    // 3. Encontrar la intersección de impuestos
    // Solo se calculan los impuestos que están en AMBOS (producto Y cliente)
    // Si no hay cliente, se usan solo los del producto
    let applicableTaxes: any[] = []

    if (entityId && entityTaxes.length > 0) {
      // Crear un set con los IDs de impuestos del cliente
      const entityTaxIds = new Set(entityTaxes.map(et => et.taxId))

      // Filtrar solo los impuestos del producto que también están en el cliente
      applicableTaxes = productTaxes
        .filter(pt => entityTaxIds.has(pt.taxId))
        .map(pt => pt.tax)
    } else {
      // Si no hay cliente o no tiene impuestos, usar todos los del producto
      applicableTaxes = productTaxes.map(pt => pt.tax)
    }

    // 4. Filtrar por condición IVA del tenant
    // Usar el campo correspondiente según la condición del tenant
    const taxField = tenantVatCondition === 'RI' ? 'applicableToRI' :
                     tenantVatCondition === 'MT' ? 'applicableToMT' :
                     'applicableToEX'

    applicableTaxes = applicableTaxes.filter(tax => tax[taxField] === true)

    // 5. Separar IVA de otros impuestos
    const ivaTaxes = applicableTaxes.filter(tax => tax.taxType === 'IVA')
    const otherTaxes = applicableTaxes.filter(tax => tax.taxType !== 'IVA')

    // 6. Calcular IVA (usar el primer impuesto IVA encontrado)
    // Nota: Un producto debería tener solo un tipo de IVA (0%, 10.5%, o 21%)
    let ivaRate = new Decimal(0)
    let ivaAmount = new Decimal(0)

    if (ivaTaxes.length > 0) {
      // Tomar el IVA de mayor tasa (o el primero si hay varios)
      const primaryIva = ivaTaxes.reduce((max, tax) =>
        tax.rate.greaterThan(max.rate) ? tax : max
      , ivaTaxes[0])

      ivaRate = primaryIva.rate

      // El IVA se calcula sobre el monto neto
      ivaAmount = netAmount.mul(ivaRate).div(100)
    }

    // 7. Calcular otros impuestos (percepciones, internos, etc.)
    const calculatedOtherTaxes = otherTaxes.map(tax => {
      // Todos los impuestos se calculan sobre el monto NET (sin IVA)
      const amount = netAmount.mul(tax.rate).div(100)

      return {
        taxId: tax.id,
        code: tax.code,
        name: tax.name,
        rate: tax.rate,
        amount,
        taxType: tax.taxType
      }
    })

    // 8. Calcular total de impuestos
    const otherTaxesTotal = calculatedOtherTaxes.reduce(
      (sum, tax) => sum.add(tax.amount),
      new Decimal(0)
    )
    const totalTaxAmount = ivaAmount.add(otherTaxesTotal)

    return {
      ivaRate,
      ivaAmount,
      otherTaxes: calculatedOtherTaxes,
      totalTaxAmount
    }
  }

  /**
   * Obtiene todos los impuestos de un producto
   */
  async getProductTaxes(productId: string, tenantId: string): Promise<TaxItem[]> {
    const productTaxes = await this.prisma.productTax.findMany({
      where: {
        productId,
        tax: {
          tenantId,
          isActive: true
        }
      },
      include: {
        tax: true
      }
    })

    return productTaxes.map(pt => pt.tax)
  }

  /**
   * Obtiene todos los impuestos de una entidad (cliente/proveedor)
   */
  async getEntityTaxes(entityId: string, tenantId: string): Promise<TaxItem[]> {
    const entityTaxes = await this.prisma.entityTax.findMany({
      where: {
        entityId,
        tax: {
          tenantId,
          isActive: true
        }
      },
      include: {
        tax: true
      }
    })

    return entityTaxes.map(et => et.tax)
  }

  /**
   * Asigna impuestos a un producto
   */
  async assignTaxesToProduct(productId: string, taxIds: string[]): Promise<void> {
    // Eliminar asignaciones existentes
    await this.prisma.productTax.deleteMany({
      where: { productId }
    })

    // Crear nuevas asignaciones
    if (taxIds.length > 0) {
      await this.prisma.productTax.createMany({
        data: taxIds.map(taxId => ({
          productId,
          taxId
        }))
      })
    }
  }

  /**
   * Asigna impuestos a una entidad (cliente/proveedor)
   */
  async assignTaxesToEntity(entityId: string, taxIds: string[]): Promise<void> {
    // Eliminar asignaciones existentes
    await this.prisma.entityTax.deleteMany({
      where: { entityId }
    })

    // Crear nuevas asignaciones
    if (taxIds.length > 0) {
      await this.prisma.entityTax.createMany({
        data: taxIds.map(taxId => ({
          entityId,
          taxId
        }))
      })
    }
  }
}
