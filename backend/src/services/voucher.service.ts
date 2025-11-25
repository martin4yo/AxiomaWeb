import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { AfipWSFEService } from './afip-wsfe.service.js'

export class VoucherService {
  private afipService: AfipWSFEService

  constructor(private prisma: PrismaClient) {
    this.afipService = new AfipWSFEService(prisma)
  }

  /**
   * Determina el tipo de comprobante según las condiciones de IVA del tenant y cliente
   *
   * Reglas:
   * - RI → RI = Factura A
   * - RI → MT = Factura B
   * - RI → CF = Factura B
   * - RI → EX = Factura E (exportación)
   * - MT → * = Factura C (monotributista solo emite C)
   * - CF → * = No puede emitir (consumidor final no emite)
   */
  async determineVoucherType(
    tenantId: string,
    customerId: string,
    documentClass: 'invoice' | 'credit_note' | 'debit_note' | 'quote',
    branchId?: string
  ) {
    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404)
    }

    // Get customer
    const customer = await this.prisma.entity.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      throw new AppError('Cliente no encontrado', 404)
    }

    // Get VAT conditions
    let tenantVatCode: string | null = null
    let customerVatCode: string | null = customer.ivaCondition

    if (tenant.vatConditionId) {
      const tenantVatCondition = await this.prisma.vatCondition.findUnique({
        where: { id: tenant.vatConditionId }
      })
      tenantVatCode = tenantVatCondition?.code || null
    }

    // Determine voucher letter based on VAT conditions
    let letter: string

    const tenantVat = tenantVatCode
    const customerVat = customerVatCode

    if (tenantVat === 'MT') {
      // Monotributista always issues C
      letter = 'C'
    } else if (tenantVat === 'RI') {
      if (customerVat === 'RI') {
        letter = 'A'
      } else if (customerVat === 'EX') {
        letter = 'E'
      } else {
        // MT, CF, NR, etc.
        letter = 'B'
      }
    } else {
      throw new AppError('El tenant no puede emitir comprobantes', 400)
    }

    // Map document class to voucher code
    let codePrefix: string
    switch (documentClass) {
      case 'invoice':
        codePrefix = 'F'
        break
      case 'credit_note':
        codePrefix = 'NC'
        break
      case 'debit_note':
        codePrefix = 'ND'
        break
      case 'quote':
        return {
          voucherType: await this.prisma.voucherType.findUnique({
            where: { code: 'PR' }
          }),
          configuration: null,
          nextNumber: null
        }
      default:
        throw new AppError('Clase de documento inválida', 400)
    }

    const voucherCode = `${codePrefix}${letter}`

    // Find voucher type
    const voucherType = await this.prisma.voucherType.findUnique({
      where: { code: voucherCode }
    })

    if (!voucherType) {
      throw new AppError(`Tipo de comprobante ${voucherCode} no encontrado`, 404)
    }

    // Find configuration for this voucher type and branch
    const configuration = await this.prisma.voucherConfiguration.findFirst({
      where: {
        tenantId,
        voucherTypeId: voucherType.id,
        OR: [
          { branchId: branchId || null },
          { branchId: null } // Fallback to global config
        ]
      },
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      },
      orderBy: {
        branchId: 'desc' // Prefer specific branch config over global
      }
    })

    if (!configuration) {
      throw new AppError(
        `No hay configuración para ${voucherType.name}. Configure en Configuración de Comprobantes.`,
        404
      )
    }

    // Generate next voucher number
    let nextNumber = configuration.nextVoucherNumber

    // Si requiere CAE y hay conexión AFIP, consultar último número autorizado
    if (voucherType.requiresCae && configuration.afipConnectionId && voucherType.afipCode) {
      try {
        const lastAfipNumber = await this.afipService.getLastAuthorizedNumber(
          configuration.afipConnectionId,
          configuration.salesPoint?.number || 1,
          voucherType.afipCode
        )

        // Si AFIP devuelve un número mayor, usar ese + 1
        if (lastAfipNumber >= nextNumber) {
          nextNumber = lastAfipNumber + 1
          console.log(`[Voucher] Usando número de AFIP: ${nextNumber} (último autorizado: ${lastAfipNumber})`)
        } else {
          console.log(`[Voucher] Usando número local: ${nextNumber} (AFIP: ${lastAfipNumber})`)
        }
      } catch (error) {
        console.warn('[Voucher] Error consultando AFIP, usando número local:', error)
        // Continuar con número local si falla la consulta AFIP
      }
    }

    const formattedNumber = `${configuration.salesPoint?.number.toString().padStart(5, '0') || '00000'}-${nextNumber.toString().padStart(8, '0')}`

    return {
      voucherType,
      configuration,
      nextNumber: formattedNumber,
      nextNumberRaw: nextNumber,
      requiresCae: voucherType.requiresCae,
      salesPoint: configuration.salesPoint,
      afipConnection: configuration.afipConnection
    }
  }
}
