/**
 * Utilidad para generar códigos QR de ARCA (ex-AFIP)
 * Según la especificación de ARCA para comprobantes electrónicos
 *
 * Formato: JSON en base64
 * URL: https://www.afip.gob.ar/fe/qr/?p={base64_encoded_json}
 *
 * IMPORTANTE: El importe se multiplica por 100 y se envía sin decimales
 * Ejemplo: $1500.50 -> 150050
 */

export interface AfipQRData {
  cuit: string                    // CUIT del emisor (se limpiará de guiones automáticamente)
  voucherTypeCode: number         // Código de tipo de comprobante ARCA (1=FA, 6=FB, 11=FC, etc.)
  salesPointNumber: number        // Punto de venta (1-9999)
  voucherNumber: number           // Número de comprobante
  amount: number                  // Importe total con decimales (se multiplicará x100)
  documentDate: Date | string     // Fecha del comprobante
  customerDocType: number         // Tipo de documento del receptor (80=CUIT, 96=DNI, 99=Sin identificar)
  customerDocNumber: string       // Número de documento del receptor (se limpiará de guiones)
  cae: string                     // CAE (Código de Autorización Electrónica)
}

/**
 * Genera la URL del QR de ARCA para un comprobante
 * @param data Datos del comprobante
 * @returns URL del QR de ARCA o null si faltan datos
 */
export function generateAfipQRUrl(data: AfipQRData): string | null {
  // Validar datos mínimos
  if (!data.cae || !data.cuit) {
    return null
  }

  // Limpiar CUIT del emisor (solo números)
  const cuit = parseInt(data.cuit.replace(/\D/g, ''))

  // Formatear fecha en YYYY-MM-DD
  const date = data.documentDate instanceof Date
    ? data.documentDate
    : new Date(data.documentDate)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const fecha = `${year}-${month}-${day}`

  // Importe multiplicado por 100 y sin decimales
  const importe = Math.round(data.amount * 100)

  // Limpiar documento del receptor (solo números)
  const customerDoc = data.customerDocNumber?.replace(/\D/g, '') || ''
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

  // Convertir a JSON y codificar en base64
  const jsonString = JSON.stringify(qrObject)
  const base64 = btoa(jsonString)

  // Retornar URL del QR de ARCA
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`
}

/**
 * Valida si se puede generar un QR fiscal
 */
export function canGenerateAfipQR(data: { cae?: string | null; cuit?: string | null }): boolean {
  return !!(data.cae && data.cuit)
}

/**
 * Códigos de tipo de comprobante AFIP más comunes
 */
export const AFIP_VOUCHER_CODES = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
} as const

/**
 * Códigos de tipo de documento AFIP
 */
export const AFIP_DOC_TYPES = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  SIN_IDENTIFICAR: 99,  // Consumidor final
} as const
