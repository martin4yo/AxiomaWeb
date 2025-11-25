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
        const error = response.Errors.Err[0]
        throw new AppError(
          `Error AFIP ${error.Code}: ${error.Msg}`,
          400
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
              ImpTotal: voucherData.total,
              ImpTotConc: 0, // Importe neto no gravado
              ImpNeto: voucherData.subtotal,
              ImpOpEx: 0, // Importe exento
              ImpIVA: voucherData.iva,
              ImpTrib: 0, // Otros tributos
              MonId: 'PES', // Moneda (PES=Pesos)
              MonCotiz: 1,
              Iva: voucherData.items.length > 0 ? {
                AlicIva: voucherData.items.map(item => ({
                  Id: item.ivaRate === 21 ? 5 : (item.ivaRate === 10.5 ? 4 : 3), // 5=21%, 4=10.5%, 3=0%
                  BaseImp: item.subtotal,
                  Importe: item.ivaAmount
                }))
              } : undefined
            }
          }
        }
      }

      console.log('[WSFE] Solicitando CAE...')
      console.log(JSON.stringify(request, null, 2))

      // Llamar a FECAESolicitar
      const result = await client.FECAESolicitarAsync(request)

      const response = result[0].FECAESolicitarResult

      // Verificar errores
      if (response.Errors) {
        const error = response.Errors.Err[0]
        throw new AppError(
          `Error AFIP ${error.Code}: ${error.Msg}`,
          400
        )
      }

      const detalle = response.FeDetResp.FECAEDetResponse[0]

      // Verificar resultado
      if (detalle.Resultado !== 'A') {
        const obs = detalle.Observaciones?.Obs?.[0]
        throw new AppError(
          `Comprobante rechazado por AFIP: ${obs ? `${obs.Code} - ${obs.Msg}` : 'Sin detalles'}`,
          400
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
