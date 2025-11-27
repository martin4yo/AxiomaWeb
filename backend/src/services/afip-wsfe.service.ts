import { PrismaClient } from '@prisma/client'
import * as soap from 'soap'
import { AppError } from '../middleware/errorHandler.js'
import { AfipWSAAService } from './afip-wsaa.service.js'

/**
 * Servicio para interactuar con AFIP WSFEv1 (Web Service de Facturación Electrónica)
 */
export class AfipWSFEService {
  private wsaaService: AfipWSAAService

  constructor(private prisma: PrismaClient) {
    this.wsaaService = new AfipWSAAService(prisma)
  }


  /**
   * Obtiene el último número de comprobante autorizado en AFIP
   */
  async getLastAuthorizedNumber(
    afipConnectionId: string,
    salesPointNumber: number,
    voucherTypeAfipCode: number
  ): Promise<number> {
    try {
      const connection = await this.prisma.afipConnection.findUnique({
        where: { id: afipConnectionId }
      })

      if (!connection) {
        throw new AppError('Conexión AFIP no encontrada', 404)
      }

      // Obtener TA
      const ta = await this.wsaaService.getTicketAcceso(afipConnectionId)

      // Determinar URL según ambiente
      const wsfeUrl = connection.wsfeUrl || (
        connection.environment === 'production'
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
      )

      // Crear cliente SOAP
      const client = await soap.createClientAsync(wsfeUrl)

      // Llamar a FECompUltimoAutorizado
      const result = await client.FECompUltimoAutorizadoAsync({
        Auth: {
          Token: ta.token,
          Sign: ta.sign,
          Cuit: connection.cuit
        },
        PtoVta: salesPointNumber,
        CbteTipo: voucherTypeAfipCode
      })

      const response = result[0].FECompUltimoAutorizadoResult

      // Verificar errores
      if (response.Errors) {
        const errors = Array.isArray(response.Errors.Err) ? response.Errors.Err : [response.Errors.Err]
        const primaryError = errors[0]

        // Construir mensaje detallado con todos los errores
        const errorDetails = errors.map((err: any) => `[${err.Code}] ${err.Msg}`).join('\n')

        throw new AppError(
          `Error AFIP: ${primaryError.Msg}`,
          400,
          {
            code: primaryError.Code,
            afipErrors: errors,
            detail: errorDetails
          }
        )
      }

      const lastNumber = parseInt(response.CbteNro)
      console.log(`[WSFE] Último comprobante autorizado: ${lastNumber}`)

      return lastNumber
    } catch (error: any) {
      if (error instanceof AppError) throw error

      console.error('[WSFE] Error consultando último número:', error.message)
      // En caso de error, retornar 0 para usar numeración local
      return 0
    }
  }

  /**
   * Solicita CAE (Código de Autorización Electrónica) a AFIP
   */
  async requestCAE(
    afipConnectionId: string,
    voucherData: {
      salesPointNumber: number
      voucherTypeCode: number
      voucherNumber: number
      documentDate: Date
      customerDocType: number // 80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final
      customerDocNumber: string
      customerVatConditionAfipCode: number | null // Código AFIP de condición IVA: 1=RI, 3=NR, 4=EX, 5=CF, 6=MT
      subtotal: number
      iva: number
      total: number
      items: Array<{
        description: string
        quantity: number
        unitPrice: number
        subtotal: number
        ivaRate: number
        ivaAmount: number
      }>
    }
  ): Promise<{
    cae: string
    caeExpiration: Date
    afipResponse: any
  }> {
    try {
      const connection = await this.prisma.afipConnection.findUnique({
        where: { id: afipConnectionId }
      })

      if (!connection) {
        throw new AppError('Conexión AFIP no encontrada', 404)
      }

      // Obtener TA
      const ta = await this.wsaaService.getTicketAcceso(afipConnectionId)

      // Determinar URL según ambiente
      const wsfeUrl = connection.wsfeUrl || (
        connection.environment === 'production'
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
      )

      // Crear cliente SOAP
      const client = await soap.createClientAsync(wsfeUrl)

      // Condición de IVA del receptor (RG 5616)
      const ivaReceptor = voucherData.customerVatConditionAfipCode || 5 // Default: Consumidor Final

      // Helper para redondear a 2 decimales
      const round2 = (num: number) => Math.round(num * 100) / 100

      // Preparar request
      const request = {
        Auth: {
          Token: ta.token,
          Sign: ta.sign,
          Cuit: connection.cuit
        },
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: voucherData.salesPointNumber,
            CbteTipo: voucherData.voucherTypeCode
          },
          FeDetReq: {
            FECAEDetRequest: {
              Concepto: 1, // 1=Productos, 2=Servicios, 3=Productos y Servicios
              DocTipo: voucherData.customerDocType,
              DocNro: voucherData.customerDocNumber,
              CbteDesde: voucherData.voucherNumber,
              CbteHasta: voucherData.voucherNumber,
              CbteFch: voucherData.documentDate.toISOString().slice(0, 10).replace(/-/g, ''),
              ImpTotal: round2(voucherData.total),
              ImpTotConc: 0, // Importe neto no gravado
              ImpNeto: round2(voucherData.subtotal),
              ImpOpEx: 0, // Importe exento
              ImpIVA: round2(voucherData.iva),
              ImpTrib: 0, // Otros tributos
              MonId: 'PES', // Moneda (PES=Pesos)
              MonCotiz: 1,
              CondicionIVAReceptorId: ivaReceptor, // RG 5616 - Condición IVA del receptor
              Iva: voucherData.items.length > 0 ? {
                AlicIva: (() => {
                  // Agrupar items por alícuota de IVA
                  const alicuotasMap = new Map<number, { baseImp: number, importe: number }>()

                  voucherData.items.forEach(item => {
                    // Determinar código de alícuota según tasa y monto
                    let alicuotaId = 3 // Default: 0% / No gravado
                    if (item.ivaAmount > 0) {
                      if (item.ivaRate === 21) {
                        alicuotaId = 5 // 21%
                      } else if (item.ivaRate === 10.5) {
                        alicuotaId = 4 // 10.5%
                      }
                    }

                    // Calcular base imponible sin IVA
                    // subtotal incluye IVA, entonces base = subtotal - ivaAmount
                    const baseImponible = item.subtotal - item.ivaAmount

                    const existing = alicuotasMap.get(alicuotaId)
                    if (existing) {
                      existing.baseImp += baseImponible
                      existing.importe += item.ivaAmount
                    } else {
                      alicuotasMap.set(alicuotaId, {
                        baseImp: baseImponible,
                        importe: item.ivaAmount
                      })
                    }
                  })

                  // Convertir a array para AFIP (redondear a 2 decimales)
                  return Array.from(alicuotasMap.entries()).map(([id, values]) => ({
                    Id: id,
                    BaseImp: round2(values.baseImp),
                    Importe: round2(values.importe)
                  }))
                })()
              } : undefined
            }
          }
        }
      }

      console.log('[WSFE] Solicitando CAE...')
      console.log(`[WSFE] Condición IVA receptor - Código AFIP: ${ivaReceptor}`)
      console.log(JSON.stringify(request, null, 2))

      // Llamar a FECAESolicitar
      const result = await client.FECAESolicitarAsync(request)

      const response = result[0].FECAESolicitarResult

      // Verificar errores
      if (response.Errors) {
        const errors = Array.isArray(response.Errors.Err) ? response.Errors.Err : [response.Errors.Err]
        const primaryError = errors[0]

        // Construir mensaje detallado con todos los errores
        const errorDetails = errors.map((err: any) => `[${err.Code}] ${err.Msg}`).join('\n')

        throw new AppError(
          `Error AFIP: ${primaryError.Msg}`,
          400,
          {
            code: primaryError.Code,
            afipErrors: errors,
            detail: errorDetails
          }
        )
      }

      const detalle = response.FeDetResp.FECAEDetResponse[0]

      // Verificar resultado
      if (detalle.Resultado !== 'A') {
        const observations = detalle.Observaciones?.Obs || []
        const obsArray = Array.isArray(observations) ? observations : [observations]
        const primaryObs = obsArray[0]

        // Construir mensaje detallado con todas las observaciones
        const obsDetails = obsArray.map((obs: any) => `[${obs.Code}] ${obs.Msg}`).join('\n')

        throw new AppError(
          `Comprobante rechazado por AFIP: ${primaryObs ? primaryObs.Msg : 'Sin detalles'}`,
          400,
          {
            code: primaryObs?.Code,
            resultado: detalle.Resultado,
            afipObservations: obsArray,
            detail: obsDetails || 'Sin observaciones detalladas'
          }
        )
      }

      const cae = detalle.CAE
      const caeExpiration = new Date(
        detalle.CAEFchVto.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
      )

      console.log(`[WSFE] CAE obtenido: ${cae}, vence: ${caeExpiration}`)

      return {
        cae,
        caeExpiration,
        afipResponse: response
      }
    } catch (error: any) {
      if (error instanceof AppError) throw error

      console.error('[WSFE] Error solicitando CAE:', error.message)
      throw new AppError(
        `Error comunicándose con AFIP: ${error.message}`,
        500
      )
    }
  }

  /**
   * Consulta datos del servidor AFIP (para testing)
   */
  async getServerStatus(
    afipConnectionId: string
  ): Promise<{
    appServer: string
    dbServer: string
    authServer: string
  }> {
    try {
      const connection = await this.prisma.afipConnection.findUnique({
        where: { id: afipConnectionId }
      })

      if (!connection) {
        throw new AppError('Conexión AFIP no encontrada', 404)
      }

      const wsfeUrl = connection.wsfeUrl || (
        connection.environment === 'production'
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
      )

      const client = await soap.createClientAsync(wsfeUrl)

      const result = await client.FEDummyAsync()
      const response = result[0].FEDummyResult

      return {
        appServer: response.AppServer,
        dbServer: response.DbServer,
        authServer: response.AuthServer
      }
    } catch (error: any) {
      throw new AppError(
        `Error consultando estado del servidor: ${error.message}`,
        500
      )
    }
  }
}
