import { Entity, VoucherConfiguration } from '@prisma/client'

export type PrintFormat = 'THERMAL' | 'PDF' | 'NONE'

export interface PrintMetadata {
  format: PrintFormat
  shouldPrintAutomatic: boolean
  canPrintThermal: boolean
  canPrintPDF: boolean
}

/**
 * Servicio para determinar el formato de impresión
 * según la configuración del cliente y el comprobante
 */
export class PrintDecisionService {
  /**
   * Determina el formato de impresión según la cascada:
   * 1. Preferencia del cliente (si no es DEFAULT)
   2. Default del tipo de comprobante
   * 3. NONE (no imprimir automáticamente)
   */
  determinePrintFormat(
    customer: Pick<Entity, 'preferredPrintFormat'> | null,
    voucherConfiguration: Pick<VoucherConfiguration, 'printFormat'> | null
  ): PrintFormat {
    // Prioridad 1: Preferencia del cliente
    if (customer?.preferredPrintFormat && customer.preferredPrintFormat !== 'DEFAULT') {
      const format = customer.preferredPrintFormat as PrintFormat
      // Validar que sea un formato válido
      if (format === 'THERMAL' || format === 'PDF') {
        return format
      }
    }

    // Prioridad 2: Default del comprobante
    if (voucherConfiguration?.printFormat && voucherConfiguration.printFormat !== 'NONE') {
      const format = voucherConfiguration.printFormat as PrintFormat
      // Validar que sea un formato válido
      if (format === 'THERMAL' || format === 'PDF') {
        return format
      }
    }

    // Sin configuración: no imprimir automáticamente
    return 'NONE'
  }

  /**
   * Retorna metadata completa de impresión
   */
  getPrintMetadata(
    customer: Pick<Entity, 'preferredPrintFormat'> | null,
    voucherConfiguration: Pick<VoucherConfiguration, 'printFormat'> | null
  ): PrintMetadata {
    const format = this.determinePrintFormat(customer, voucherConfiguration)

    return {
      format,
      shouldPrintAutomatic: format !== 'NONE',
      canPrintThermal: true,  // Siempre disponible manualmente
      canPrintPDF: true       // Siempre disponible manualmente
    }
  }
}

// Exportar instancia singleton
export const printDecisionService = new PrintDecisionService()
