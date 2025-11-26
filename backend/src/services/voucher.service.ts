import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler.js'
import { AfipWSFEService } from './afip-wsfe.service.js'

export class VoucherService {
  private afipService: AfipWSFEService

  constructor(private prisma: PrismaClient) {
    this.afipService = new AfipWSFEService(prisma)
  }

  /**
   * Determina el tipo de comprobante según:
   * 1. Tipo de documento elegido por el usuario (invoice, credit_note, debit_note, quote)
   * 2. Condición de IVA del cliente
   * 3. Los allowedVoucherTypes configurados para esa condición de IVA
   *
   * La condición de IVA del tenant NO se toma en cuenta porque lo que define
   * qué comprobantes se pueden emitir está en allowedVoucherTypes de cada condición.
   *
   * Lógica de determinación de letra según condición IVA del cliente:
   * - RI (Responsable Inscripto) → Letra A
   * - MT (Monotributista) → Letra C
   * - CF (Consumidor Final) → Letra B
   * - EX (Exento) → Letra E
   * - NR (No Responsable) → Letra C
   */
  async determineVoucherType(
    tenantId: string,
    customerId: string,
    documentClass: 'invoice' | 'credit_note' | 'debit_note' | 'quote',
    branchId?: string
  ) {
    // Get customer
    const customer = await this.prisma.entity.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      throw new AppError('Cliente no encontrado', 404)
    }

    const customerVatCode = customer.ivaCondition

    if (!customerVatCode) {
      throw new AppError('El cliente no tiene condición de IVA configurada', 400)
    }

    // Get customer VAT condition
    const customerVatCondition = await this.prisma.vatCondition.findFirst({
      where: {
        tenantId,
        code: customerVatCode
      }
    })

    if (!customerVatCondition) {
      throw new AppError(`Condición de IVA "${customerVatCode}" no encontrada`, 404)
    }

    // Determine voucher letter based ONLY on customer's VAT condition
    let letter: string

    switch (customerVatCode) {
      case 'RI':
        letter = 'A'
        break
      case 'MT':
        letter = 'C'
        break
      case 'CF':
        letter = 'B'
        break
      case 'EX':
        letter = 'E'
        break
      case 'NR':
        letter = 'C'
        break
      default:
        throw new AppError(`Condición de IVA "${customerVatCode}" no soportada`, 400)
    }

    // Map document class to voucher code prefix
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

    // Validate that the customer's VAT condition allows this voucher type
    const allowedTypes = Array.isArray(customerVatCondition.allowedVoucherTypes)
      ? customerVatCondition.allowedVoucherTypes
      : []

    if (allowedTypes.length > 0 && !allowedTypes.includes(voucherCode)) {
      throw new AppError(
        `La condición de IVA "${customerVatCondition.name}" (${customerVatCode}) no permite emitir comprobantes tipo ${voucherCode}. Tipos permitidos: ${allowedTypes.join(', ')}`,
        400
      )
    }

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
