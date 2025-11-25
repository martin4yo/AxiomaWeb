import { PrismaClient } from '@prisma/client'
import { AfipWSAAService } from './afip-wsaa.service.js'
import { AfipWSFEService } from './afip-wsfe.service.js'

// URLs por defecto según ambiente
const AFIP_URLS = {
  testing: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
  },
  production: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
  }
}

export class AfipService {
  private wsaaService: AfipWSAAService
  private wsfeService: AfipWSFEService

  constructor(private prisma: PrismaClient) {
    this.wsaaService = new AfipWSAAService(prisma)
    this.wsfeService = new AfipWSFEService(prisma)
  }

  /**
   * Obtiene las URLs de los servicios AFIP según el ambiente
   */
  getServiceUrls(connection: any) {
    const env = connection.environment === 'production' ? 'production' : 'testing'

    return {
      wsaa: connection.wsaaUrl || AFIP_URLS[env].wsaa,
      wsfe: connection.wsfeUrl || AFIP_URLS[env].wsfe
    }
  }

  /**
   * Prueba la conexión a AFIP verificando:
   * 1. Certificado y clave privada válidos
   * 2. Conectividad a WSAA
   * 3. Generación de TA (Ticket de Acceso)
   * 4. Conectividad a WSFE
   * 5. Estado del servidor AFIP
   */
  async testConnection(connectionId: string) {
    const testSteps: Array<{ step: string; status: string; details?: string; error?: string }> = []

    try {
      const connection = await this.prisma.afipConnection.findUnique({
        where: { id: connectionId }
      })

      if (!connection) {
        throw new Error('Conexión no encontrada')
      }

      // PASO 1: Validar certificado y clave privada
      testSteps.push({ step: 'Validar certificado y clave privada', status: 'running' })

      if (!connection.certificate || !connection.privateKey) {
        testSteps[0].status = 'error'
        testSteps[0].error = 'Certificado y/o clave privada no configurados'

        await this.prisma.afipConnection.update({
          where: { id: connectionId },
          data: { lastTest: new Date(), lastTestStatus: 'error' }
        })

        return {
          success: false,
          error: 'Certificado y clave privada son requeridos',
          testSteps
        }
      }

      testSteps[0].status = 'success'
      testSteps[0].details = 'Certificado y clave privada presentes'

      // PASO 2: Obtener Ticket de Acceso (TA) de WSAA
      testSteps.push({ step: 'Autenticar con WSAA', status: 'running' })

      try {
        const ta = await this.wsaaService.getTicketAcceso(connectionId)
        testSteps[1].status = 'success'
        testSteps[1].details = `TA obtenido. Expira: ${ta.expirationTime.toLocaleString()}`
      } catch (error: any) {
        testSteps[1].status = 'error'
        testSteps[1].error = error.message

        await this.prisma.afipConnection.update({
          where: { id: connectionId },
          data: { lastTest: new Date(), lastTestStatus: 'error' }
        })

        return {
          success: false,
          error: 'Error autenticando con WSAA',
          details: error.message,
          testSteps
        }
      }

      // PASO 3: Verificar conectividad con WSFE
      testSteps.push({ step: 'Conectar con WSFE (FEDummy)', status: 'running' })

      try {
        const serverStatus = await this.wsfeService.getServerStatus(connectionId)
        testSteps[2].status = 'success'
        testSteps[2].details = `AppServer: ${serverStatus.appServer}, DbServer: ${serverStatus.dbServer}, AuthServer: ${serverStatus.authServer}`
      } catch (error: any) {
        testSteps[2].status = 'error'
        testSteps[2].error = error.message

        await this.prisma.afipConnection.update({
          where: { id: connectionId },
          data: { lastTest: new Date(), lastTestStatus: 'error' }
        })

        return {
          success: false,
          error: 'Error conectando con WSFE',
          details: error.message,
          testSteps
        }
      }

      // Todo exitoso
      await this.prisma.afipConnection.update({
        where: { id: connectionId },
        data: {
          lastTest: new Date(),
          lastTestStatus: 'success'
        }
      })

      return {
        success: true,
        message: '✓ Conexión AFIP verificada exitosamente',
        environment: connection.environment,
        cuit: connection.cuit,
        testSteps
      }
    } catch (error: any) {
      // Actualizar el estado del test como error
      await this.prisma.afipConnection.update({
        where: { id: connectionId },
        data: {
          lastTest: new Date(),
          lastTestStatus: 'error'
        }
      })

      return {
        success: false,
        error: error.message,
        testSteps
      }
    }
  }

  /**
   * Obtiene el estado del servidor WSAA
   */
  async getServerStatus(environment: 'testing' | 'production' = 'testing') {
    const urls = AFIP_URLS[environment]

    return {
      environment,
      urls,
      note: 'Use este servicio para verificar las URLs de los web services de AFIP'
    }
  }
}
