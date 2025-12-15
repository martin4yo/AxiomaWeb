import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { AfipWSFEService } from './afip-wsfe.service.js'

export class VoucherService {
  private afipService: AfipWSFEService

  constructor(private prisma: PrismaClient) {
    this.afipService = new AfipWSFEService(prisma)
  }

  /**
   * Determina el tipo de comprobante según las reglas de AFIP:
   *
   * La letra del comprobante depende de la combinación entre:
   * - Condición IVA del EMISOR (tenant)
   * - Condición IVA del RECEPTOR (cliente)
   *
   * Reglas principales:
   * - Emisor MONOTRIBUTISTA (MT) → Siempre Factura C (a cualquier cliente)
   * - Emisor RI + Cliente RI → Factura A
   * - Emisor RI + Cliente CF/MT/EX/NR → Factura B
   * - Emisor EXENTO → Factura C
   */
  async determineVoucherType(
    tenantId: string,
    customerId: string,
    documentClass: 'invoice' | 'credit_note' | 'debit_note' | 'quote',
    branchId?: string
  ) {
    console.log('[VoucherService] determineVoucherType called with:', {
      tenantId,
      customerId,
      documentClass,
      branchId
    })

    // Get tenant to check its VAT condition
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        tenantVatCondition: true
      }
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

    const customerVatCode = customer.ivaCondition
    const tenantVatCode = tenant.tenantVatCondition?.code

    if (!customerVatCode) {
      throw new AppError('El cliente no tiene condición de IVA configurada', 400)
    }

    console.log('[VoucherService] VAT conditions:', {
      tenantVatCode,
      customerVatCode
    })

    // Determine voucher letter based on BOTH tenant and customer VAT conditions
    let letter: string

    // Si el tenant es Monotributista o Exento → siempre Factura C
    if (tenantVatCode === 'MT' || tenantVatCode === 'EX' || tenantVatCode === 'NR') {
      letter = 'C'
    }
    // Si el tenant es RI → depende del cliente
    else if (tenantVatCode === 'RI') {
      switch (customerVatCode) {
        case 'RI':
          letter = 'A'
          break
        case 'CF':
        case 'MT':
        case 'EX':
        case 'NR':
        default:
          letter = 'B'
          break
      }
    }
    // Si el tenant no tiene condición configurada, intentar determinar por configuraciones existentes
    else {
      // Fallback: buscar qué configuraciones tiene el tenant
      const existingConfigs = await this.prisma.voucherConfiguration.findMany({
        where: { tenantId },
        include: { voucherType: true },
        take: 1
      })

      if (existingConfigs.length > 0) {
        // Usar la letra de las configuraciones existentes
        const existingLetter = existingConfigs[0].voucherType.letter
        letter = existingLetter || 'C'
        console.log('[VoucherService] Using letter from existing config:', letter)
      } else {
        // Default a C si no hay nada configurado
        letter = 'C'
        console.log('[VoucherService] No tenant VAT condition, defaulting to C')
      }
    }

    console.log('[VoucherService] Determined letter:', letter)

    // Map document class to voucher code prefix
    let voucherCode: string

    switch (documentClass) {
      case 'invoice':
        voucherCode = `F${letter}`
        break
      case 'credit_note':
        voucherCode = `NC${letter}`
        break
      case 'debit_note':
        voucherCode = `ND${letter}`
        break
      case 'quote':
        voucherCode = 'PR' // Presupuesto no tiene letra
        break
      default:
        throw new AppError('Clase de documento inválida', 400)
    }

    console.log('[VoucherService] Voucher code:', voucherCode)

    // Find voucher type
    const voucherType = await this.prisma.voucherType.findUnique({
      where: { code: voucherCode }
    })

    if (!voucherType) {
      throw new AppError(`Tipo de comprobante ${voucherCode} no encontrado`, 404)
    }

    // Find configuration for this voucher type and branch
    console.log('[VoucherService] Searching configuration with:', {
      tenantId,
      voucherTypeId: voucherType.id,
      voucherCode: voucherType.code,
      branchId
    })

    // First try to find configuration specific for this branch
    let configuration = branchId ? await this.prisma.voucherConfiguration.findFirst({
      where: {
        tenantId,
        voucherTypeId: voucherType.id,
        branchId
      },
      include: {
        voucherType: true,
        branch: true,
        afipConnection: true,
        salesPoint: true
      }
    }) : null

    console.log('[VoucherService] Configuration found for branch:', configuration ? 'YES' : 'NO')

    // If not found, fallback to global configuration (without branch)
    if (!configuration) {
      configuration = await this.prisma.voucherConfiguration.findFirst({
        where: {
          tenantId,
          voucherTypeId: voucherType.id,
          branchId: null
        },
        include: {
          voucherType: true,
          branch: true,
          afipConnection: true,
          salesPoint: true
        }
      })
      console.log('[VoucherService] Global configuration found:', configuration ? 'YES' : 'NO')
    }

    if (!configuration) {
      throw new AppError(
        `No hay configuración para ${voucherType.name}${branchId ? ' en la sucursal seleccionada' : ''}. Configure en Configuración de Comprobantes.`,
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
