/**
 * Servicio para generar códigos QR de ARCA (ex-AFIP)
 * Según la especificación de ARCA para comprobantes electrónicos
 *
 * Formato: JSON en base64
 * URL: https://www.afip.gob.ar/fe/qr/?p={base64_encoded_json}
 *
 * IMPORTANTE: El importe se multiplica por 100 y se envía sin decimales
 * Ejemplo: $1500.50 -> 150050
 */
export class AfipQRService {
  /**
   * Genera el contenido del QR de ARCA para un comprobante
   *
   * @param data Datos del comprobante
   * @returns URL del QR de ARCA
   */
  static generateQRData(data: {
    cuit: string                    // CUIT del emisor (se limpiará de guiones automáticamente)
    voucherTypeCode: number         // Código de tipo de comprobante ARCA (1=FA, 6=FB, 11=FC, etc.)
    salesPointNumber: number        // Punto de venta (1-9999)
    voucherNumber: number           // Número de comprobante
    amount: number                  // Importe total con decimales (se multiplicará x100)
    documentDate: Date              // Fecha del comprobante
    customerDocType: number         // Tipo de documento del receptor (80=CUIT, 96=DNI, 99=Sin identificar)
    customerDocNumber: string       // Número de documento del receptor (se limpiará de guiones)
    cae: string                     // CAE (Código de Autorización Electrónica)
  }): string {
    // Limpiar CUIT del emisor (solo números)
    const cuit = parseInt(data.cuit.replace(/\D/g, ''))

    // Formatear fecha en YYYY-MM-DD
    const year = data.documentDate.getFullYear()
    const month = String(data.documentDate.getMonth() + 1).padStart(2, '0')
    const day = String(data.documentDate.getDate()).padStart(2, '0')
    const fecha = `${year}-${month}-${day}`

    // Importe multiplicado por 100 y sin decimales
    const importe = Math.round(data.amount * 100)

    // Limpiar documento del receptor (solo números)
    const customerDoc = data.customerDocNumber.replace(/\D/g, '')
    const nroDocRec = customerDoc ? parseInt(customerDoc) : 0

    // Construir objeto JSON según especificación de ARCA
    const qrObject = {
      ver: 1,                               // Versión del formato
      fecha: fecha,                         // Fecha del comprobante YYYY-MM-DD
      cuit: cuit,                           // CUIT del emisor (número)
      ptoVta: data.salesPointNumber,        // Punto de venta (número)
      tipoCmp: data.voucherTypeCode,        // Tipo de comprobante (número)
      nroCmp: data.voucherNumber,           // Número de comprobante (número)
      importe: importe,                     // Importe * 100 sin decimales
      moneda: 'PES',                        // Moneda
      ctz: 1,                               // Cotización
      tipoDocRec: data.customerDocType,     // Tipo doc receptor
      nroDocRec: nroDocRec,                 // Nro doc receptor (número)
      tipoCodAut: 'E',                      // Tipo código autorización (E = CAE)
      codAut: parseInt(data.cae)            // Código de autorización (número)
    }

    // Convertir a JSON
    const jsonString = JSON.stringify(qrObject)

    // Codificar en base64
    const base64 = Buffer.from(jsonString, 'utf-8').toString('base64')

    // Retornar URL del QR de ARCA
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`
  }

  /**
   * Valida que los datos necesarios para el QR estén presentes
   * El documento del cliente es opcional (se puede usar 0 para consumidor final)
   */
  static canGenerateQR(data: {
    cae?: string | null
    cuit?: string | null
  }): boolean {
    return !!(data.cae && data.cuit)
  }

  /**
   * Ejemplo de uso:
   *
   * const qrUrl = AfipQRService.generateQRData({
   *   cuit: '20-12345678-9',              // CUIT del emisor
   *   voucherTypeCode: 1,                 // 1 = Factura A, 6 = Factura B, 11 = Factura C
   *   salesPointNumber: 1,                // Punto de venta
   *   voucherNumber: 123,                 // Número de comprobante
   *   amount: 1500.50,                    // Importe total (se multiplicará x100)
   *   documentDate: new Date(),           // Fecha del comprobante
   *   customerDocType: 80,                // 80 = CUIT, 96 = DNI, 99 = Sin identificar
   *   customerDocNumber: '20-98765432-1', // CUIT/DNI del cliente
   *   cae: '71234567890123'               // CAE de ARCA
   * })
   *
   * Genera JSON:
   * {
   *   "ver": 1,
   *   "fecha": "2025-01-15",
   *   "cuit": 20123456789,
   *   "ptoVta": 1,
   *   "tipoCmp": 1,
   *   "nroCmp": 123,
   *   "importe": 150050,    <- Nota: 1500.50 * 100
   *   "moneda": "PES",
   *   "ctz": 1,
   *   "tipoDocRec": 80,
   *   "nroDocRec": 20987654321,
   *   "tipoCodAut": "E",
   *   "codAut": 71234567890123
   * }
   *
   * Resultado:
   * https://www.afip.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoi...
   */
}
