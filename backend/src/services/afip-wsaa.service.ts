import { PrismaClient } from '@prisma/client'
import * as soap from 'soap'
import { parseStringPromise } from 'xml2js'
import { AppError } from '../middleware/errorHandler.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const forge = require('node-forge')

interface TicketAcceso {
  token: string
  sign: string
  expirationTime: Date
}

/**
 * Servicio de autenticación con AFIP WSAA (Web Services Authentication and Authorization)
 *
 * Proceso de autenticación:
 * 1. Generar TRA (Ticket de Requerimiento de Acceso) en XML
 * 2. Firmar TRA con certificado y clave privada (CMS/PKCS#7)
 * 3. Enviar TRA firmado a WSAA
 * 4. WSAA valida y devuelve TA (Ticket de Acceso) con token y sign
 * 5. Usar token y sign para llamar a otros web services (WSFEv1)
 *
 * El TA se guarda en la base de datos para reutilizarlo entre requests y reinicios.
 */
export class AfipWSAAService {
  private readonly SERVICE = 'wsfe' // Servicio al que se solicita acceso

  constructor(private prisma: PrismaClient) {}

  /**
   * Genera el TRA (Ticket de Requerimiento de Acceso)
   */
  private generateTRA(service: string, cuit: string): string {
    const now = new Date()

    // AFIP requiere formato: YYYY-MM-DDTHH:MM:SS sin timezone
    // Y debe estar en hora de Argentina
    const formatForAfip = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }

    const generationTime = formatForAfip(now)

    // Expiración: 12 horas desde ahora
    const expiration = new Date(now.getTime() + 12 * 60 * 60 * 1000)
    const expirationTime = formatForAfip(expiration)

    const uniqueId = Math.floor(now.getTime() / 1000)

    const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`

    console.log('[WSAA] TRA generado:', {
      generationTime,
      expirationTime,
      uniqueId,
      serverLocalTime: now.toString()
    })

    return tra
  }

  /**
   * Firma el TRA con el certificado y clave privada
   */
  private signTRA(tra: string, certificate: string, privateKey: string): string {
    try {
      // Parsear certificado y clave privada
      const cert = forge.pki.certificateFromPem(certificate)
      const key = forge.pki.privateKeyFromPem(privateKey)

      // Crear mensaje PKCS#7
      const p7 = forge.pkcs7.createSignedData()
      p7.content = forge.util.createBuffer(tra, 'utf8')

      p7.addCertificate(cert)
      p7.addSigner({
        key: key,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data
          },
          {
            type: forge.pki.oids.messageDigest
          },
          {
            type: forge.pki.oids.signingTime
            // value se genera automáticamente
          }
        ]
      })

      // Firmar
      p7.sign()

      // Convertir a DER y luego a Base64
      const asn1 = p7.toAsn1()
      const der = forge.asn1.toDer(asn1).getBytes()
      const cms = forge.util.encode64(der)

      return cms
    } catch (error: any) {
      throw new AppError(`Error firmando TRA: ${error.message}`, 500)
    }
  }

  /**
   * Solicita el TA (Ticket de Acceso) a WSAA
   */
  private async requestTA(
    wsaaUrl: string,
    traCMS: string,
    timeout: number = 30000
  ): Promise<TicketAcceso> {
    try {
      console.log(`[WSAA] Conectando a: ${wsaaUrl}`)
      console.log(`[WSAA] Timeout configurado: ${timeout}ms`)

      // Opciones para el cliente SOAP
      const options = {
        wsdl_options: {
          timeout: timeout,
          rejectUnauthorized: false,
          strictSSL: false,
          gzip: true
        },
        forceSoap12Headers: false
      }

      const client = await soap.createClientAsync(wsaaUrl, options)

      console.log('[WSAA] Cliente SOAP creado exitosamente')
      console.log('[WSAA] Métodos disponibles:', Object.keys(client))

      // Llamar al método loginCms
      console.log('[WSAA] Llamando a loginCms...')

      const result = await client.loginCmsAsync({
        in0: traCMS
      })

      console.log('[WSAA] Respuesta recibida de AFIP')

      // Parsear respuesta XML
      const response = result[0].loginCmsReturn
      const parsed = await parseStringPromise(response)

      const credentials = parsed.loginTicketResponse.credentials[0]
      const header = parsed.loginTicketResponse.header[0]

      return {
        token: credentials.token[0],
        sign: credentials.sign[0],
        expirationTime: new Date(header.expirationTime[0])
      }
    } catch (error: any) {
      console.error('[WSAA] Error detallado:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      })

      // Errores específicos de AFIP
      if (error.message && error.message.includes('coe.alreadyAuthenticated')) {
        throw new AppError(
          'AFIP indica que ya existe un TA válido. Espere unos minutos antes de volver a solicitar autenticación.',
          400
        )
      }

      if (error.message && error.message.includes('cert.expired')) {
        throw new AppError(
          'Certificado AFIP expirado. Debe generar un nuevo certificado desde AFIP y actualizarlo en la configuración.',
          400
        )
      }

      if (error.message && error.message.includes('cert.invalid')) {
        throw new AppError(
          'Certificado AFIP inválido. Verifique que el certificado y la clave privada sean correctos y correspondan al CUIT configurado.',
          400
        )
      }

      if (error.message && error.message.includes('generationTime')) {
        throw new AppError(
          'Error de sincronización de hora con AFIP. El reloj del servidor puede estar desincronizado. Verifique la hora del sistema.',
          400
        )
      }

      if (error.message && error.message.includes('cuit')) {
        throw new AppError(
          'CUIT inválido o no autorizado. Verifique que el CUIT esté habilitado para usar Web Services de AFIP.',
          400
        )
      }

      if (error.message && error.message.includes('WSDL')) {
        throw new AppError(
          `No se pudo cargar el WSDL de AFIP. URL: ${wsaaUrl}. Error: ${error.message}. Verifique conectividad a internet.`,
          500
        )
      }

      if (error.message && error.message.includes('timeout')) {
        throw new AppError(
          `Timeout conectando a AFIP WSAA. Verifique conexión a internet o firewall.`,
          500
        )
      }

      throw new AppError(`Error solicitando TA a WSAA: ${error.message}`, 500)
    }
  }

  /**
   * Obtiene un TA válido (usa el guardado en DB si está vigente)
   */
  async getTicketAcceso(connectionId: string): Promise<TicketAcceso> {
    // Obtener configuración de conexión
    const connection = await this.prisma.afipConnection.findUnique({
      where: { id: connectionId },
      include: { tenant: true }
    })

    if (!connection) {
      throw new AppError('Conexión AFIP no encontrada', 404)
    }

    // Verificar si hay un TA válido en la base de datos
    // Agregamos margen de 5 minutos para evitar que expire durante una operación
    const now = new Date()
    const safetyMargin = 5 * 60 * 1000 // 5 minutos

    if (
      connection.taToken &&
      connection.taSign &&
      connection.taExpiresAt &&
      connection.taExpiresAt.getTime() > (now.getTime() + safetyMargin)
    ) {
      console.log(`[WSAA] Usando TA guardado en DB para conexión ${connectionId}, expira: ${connection.taExpiresAt}`)
      return {
        token: connection.taToken,
        sign: connection.taSign,
        expirationTime: connection.taExpiresAt
      }
    }

    console.log(`[WSAA] Solicitando nuevo TA para conexión ${connectionId}`)

    if (!connection.certificate || !connection.privateKey) {
      throw new AppError('Certificado y clave privada no configurados', 400)
    }

    // Determinar URL según ambiente
    const wsaaUrl = connection.wsaaUrl || (
      connection.environment === 'production'
        ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL'
        : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL'
    )

    // Generar TRA
    const tra = this.generateTRA(this.SERVICE, connection.cuit)

    // Firmar TRA
    const traCMS = this.signTRA(tra, connection.certificate, connection.privateKey)

    // Solicitar TA con timeout configurado
    const timeout = connection.timeout || 30000
    const ta = await this.requestTA(wsaaUrl, traCMS, timeout)

    // Guardar en base de datos
    await this.prisma.afipConnection.update({
      where: { id: connectionId },
      data: {
        taToken: ta.token,
        taSign: ta.sign,
        taExpiresAt: ta.expirationTime
      }
    })

    console.log(`[WSAA] TA obtenido y guardado exitosamente, expira en ${ta.expirationTime}`)

    return ta
  }

  /**
   * Invalida el TA guardado para una conexión
   */
  async invalidateTicket(connectionId: string) {
    await this.prisma.afipConnection.update({
      where: { id: connectionId },
      data: {
        taToken: null,
        taSign: null,
        taExpiresAt: null
      }
    })
    console.log(`[WSAA] TA invalidado para conexión ${connectionId}`)
  }
}
