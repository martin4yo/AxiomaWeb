/**
 * Sistema de Templates para Impresión de Tickets
 *
 * Permite configurar el formato y contenido de los tickets
 * sin modificar código. Solo editar este archivo.
 */

// ==================== INTERFACES ====================

export interface TicketTemplate {
  name: string
  description?: string
  paperWidth: number  // en mm (48, 58, 80)
  fontSize: number    // tamaño base de fuente
  encoding?: string   // 'utf-8', 'cp850', etc.
  sections: TemplateSection[]
}

export interface TemplateSection {
  type: 'header' | 'info' | 'table' | 'totals' | 'footer' | 'divider' | 'divider-solid' | 'text' | 'payments' | 'qrcode'
  items?: any[]
  columns?: ColumnDef[]
  content?: string
  data?: string  // Para QR code: el contenido a codificar
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  size?: 'small' | 'normal' | 'large'
}

export interface ColumnDef {
  header: string
  field: string
  width?: number
  align?: 'left' | 'center' | 'right'
  decimals?: number
}

export interface TicketData {
  business: {
    name: string
    cuit?: string
    address?: string
    phone?: string
    email?: string
  }
  sale?: {
    number: string
    date: string
    time: string
    customer?: string
    items: SaleItemData[]
    subtotal: number
    discountAmount?: number
    taxAmount?: number
    totalAmount: number
    payments?: PaymentData[]
    notes?: string
    // Datos AFIP
    caeNumber?: string
    caeExpiration?: string
    qrData?: string  // Datos para generar QR code
  }
  purchase?: {
    number: string
    date: string
    time: string
    supplier?: string
    items: PurchaseItemData[]
    subtotal: number
    discountAmount?: number
    taxAmount?: number
    totalAmount: number
    payments?: PaymentData[]
    notes?: string
  }
}

export interface SaleItemData {
  productName: string
  productSku?: string
  description?: string
  quantity: number
  unitPrice: number
  discountPercent?: number
  lineTotal: number
}

export interface PurchaseItemData {
  productName: string
  productSku?: string
  description?: string
  expirationDate?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PaymentData {
  name: string
  amount: number
  reference?: string
}

// ==================== TEMPLATES ====================

/**
 * Template para Ticket de Venta Estándar (80mm)
 */
export const TICKET_VENTA_80MM: TicketTemplate = {
  name: 'Ticket de Venta 80mm',
  description: 'Ticket estándar para ventas en papel térmico 80mm',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    // HEADER - Datos de la empresa
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: 'CUIT: {{business.cuit}}', size: 'small', align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
        { content: 'Tel: {{business.phone}}', size: 'small', align: 'center' },
      ]
    },

    // Separador
    { type: 'divider-solid' },

    // INFO - Información del documento
    {
      type: 'info',
      items: [
        { content: 'TICKET NO VÁLIDO COMO FACTURA', bold: true, align: 'center' },
        { content: 'Comprobante Nº: {{sale.number}}', bold: true },
        { content: 'Fecha: {{sale.date}} {{sale.time}}' },
        { content: 'Cliente: {{sale.customer}}' },
      ]
    },

    // Separador
    { type: 'divider' },

    // TABLA - Items de la venta
    {
      type: 'table',
      columns: [
        { header: 'Producto', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },

    // TOTALES
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'Subtotal:', value: '{{sale.subtotal}}', align: 'right' },
        { label: 'Descuento:', value: '{{sale.discountAmount}}', align: 'right' },
        { label: 'IVA:', value: '{{sale.taxAmount}}', align: 'right' },
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },

    // FORMAS DE PAGO (si hay)
    {
      type: 'payments',
      items: [
        { content: 'FORMAS DE PAGO:', bold: true }
      ]
    },

    // FOOTER
    {
      type: 'footer',
      items: [
        { content: '¡Gracias por su compra!', bold: true, align: 'center' },
        { content: 'Vuelva pronto', align: 'center', size: 'small' },
      ]
    }
  ]
}

/**
 * Template para Ticket de Venta Compacto (58mm)
 */
export const TICKET_VENTA_58MM: TicketTemplate = {
  name: 'Ticket de Venta 58mm',
  description: 'Ticket compacto para ventas en papel térmico 58mm',
  paperWidth: 58,
  fontSize: 10,
  sections: [
    // HEADER
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, align: 'center' },
        { content: 'CUIT: {{business.cuit}}', size: 'small', align: 'center' },
      ]
    },

    { type: 'divider-solid' },

    // INFO
    {
      type: 'info',
      items: [
        { content: 'TICKET', bold: true, align: 'center' },
        { content: 'Nº {{sale.number}}', bold: true, align: 'center' },
        { content: '{{sale.date}} {{sale.time}}', size: 'small', align: 'center' },
      ]
    },

    { type: 'divider' },

    // TABLA (simplificada)
    {
      type: 'table',
      columns: [
        { header: 'Prod.', field: 'productName', align: 'left' },
        { header: 'Cant', field: 'quantity', align: 'right', decimals: 0 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },

    // TOTALES
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },

    // FOOTER
    {
      type: 'footer',
      items: [
        { content: '¡Gracias!', bold: true, align: 'center' },
      ]
    }
  ]
}

/**
 * Template para Factura A (80mm) - Con discriminación de IVA
 */
export const FACTURA_A_80MM: TicketTemplate = {
  name: 'Factura A 80mm',
  description: 'Factura A con discriminación de IVA',
  paperWidth: 80,
  fontSize: 11,
  sections: [
    // HEADER
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: 'CUIT: {{business.cuit}}', bold: true, align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
        { content: 'Ingresos Brutos: XXX', size: 'small', align: 'center' },
        { content: 'Inicio de Actividades: XX/XX/XXXX', size: 'small', align: 'center' },
      ]
    },

    { type: 'divider-solid' },

    {
      type: 'text',
      content: '<div style="text-align: center; font-size: 24px; font-weight: bold; border: 3px solid #000; padding: 5px; margin: 5px 0;">A</div>',
    },

    // INFO FACTURA
    {
      type: 'info',
      items: [
        { content: 'FACTURA', bold: true, align: 'center', size: 'large' },
        { content: 'Punto de Venta: XXXX - Comp. Nº: XXXXXXXX', bold: true, align: 'center' },
        { content: 'Fecha: {{sale.date}}', align: 'center' },
      ]
    },

    { type: 'divider' },

    // INFO CLIENTE
    {
      type: 'info',
      items: [
        { content: 'DATOS DEL CLIENTE', bold: true },
        { content: 'Razón Social: {{sale.customer}}' },
        { content: 'CUIT: XXX' },
        { content: 'Condición IVA: Responsable Inscripto' },
      ]
    },

    { type: 'divider' },

    // ITEMS
    {
      type: 'table',
      columns: [
        { header: 'Descripción', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },

    // TOTALES CON IVA DISCRIMINADO
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'Subtotal:', value: '{{sale.subtotal}}', align: 'right' },
        { label: 'IVA 21%:', value: '{{sale.taxAmount}}', align: 'right' },
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right', size: 'large' },
        { type: 'divider' },
      ]
    },

    // FOOTER AFIP
    {
      type: 'footer',
      items: [
        { content: 'CAE: XXXXXXXXXXXXXX', align: 'center', size: 'small' },
        { content: 'Vto. CAE: XX/XX/XXXX', align: 'center', size: 'small' },
        { content: 'Comprobante Autorizado', align: 'center', bold: true },
      ]
    }
  ]
}

/**
 * Template para Ticket de Compra (80mm)
 */
export const TICKET_COMPRA_80MM: TicketTemplate = {
  name: 'Ticket de Compra 80mm',
  description: 'Comprobante de compra a proveedores',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    // HEADER
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
      ]
    },

    { type: 'divider-solid' },

    // INFO
    {
      type: 'info',
      items: [
        { content: 'COMPROBANTE DE COMPRA', bold: true, align: 'center' },
        { content: 'Nº: {{purchase.number}}', bold: true },
        { content: 'Fecha: {{purchase.date}} {{purchase.time}}' },
        { content: 'Proveedor: {{purchase.supplier}}' },
      ]
    },

    { type: 'divider' },

    // ITEMS
    {
      type: 'table',
      columns: [
        { header: 'Producto', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },

    // TOTALES
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{purchase.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },

    // FOOTER
    {
      type: 'footer',
      items: [
        { content: 'Comprobante interno', align: 'center', size: 'small' },
      ]
    }
  ]
}

/**
 * Template para Factura B (80mm)
 */
export const FACTURA_B_80MM: TicketTemplate = {
  name: 'Factura B 80mm',
  description: 'Factura B con IVA incluido',
  paperWidth: 80,
  fontSize: 11,
  sections: [
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: 'CUIT: {{business.cuit}}', bold: true, align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
      ]
    },
    { type: 'divider-solid' },
    {
      type: 'text',
      content: '<div style="text-align: center; font-size: 24px; font-weight: bold; border: 3px solid #000; padding: 5px; margin: 5px 0;">B</div>',
    },
    {
      type: 'info',
      items: [
        { content: 'FACTURA', bold: true, align: 'center', size: 'large' },
        { content: 'Punto de Venta: XXXX - Comp. Nº: XXXXXXXX', bold: true, align: 'center' },
        { content: 'Fecha: {{sale.date}}', align: 'center' },
      ]
    },
    { type: 'divider' },
    {
      type: 'info',
      items: [
        { content: 'Cliente: {{sale.customer}}' },
      ]
    },
    { type: 'divider' },
    {
      type: 'table',
      columns: [
        { header: 'Descripción', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right', size: 'large' },
        { type: 'divider' },
      ]
    },
    {
      type: 'footer',
      items: [
        { content: 'CAE: XXXXXXXXXXXXXX', align: 'center', size: 'small' },
        { content: 'Vto. CAE: XX/XX/XXXX', align: 'center', size: 'small' },
        { content: 'Comprobante Autorizado', align: 'center', bold: true },
      ]
    }
  ]
}

/**
 * Template para Nota de Crédito (80mm)
 */
export const NOTA_CREDITO_80MM: TicketTemplate = {
  name: 'Nota de Crédito 80mm',
  description: 'Nota de crédito estándar',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: 'CUIT: {{business.cuit}}', bold: true, align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
      ]
    },
    { type: 'divider-solid' },
    {
      type: 'info',
      items: [
        { content: 'NOTA DE CRÉDITO', bold: true, align: 'center', size: 'large' },
        { content: 'Nº: {{sale.number}}', bold: true },
        { content: 'Fecha: {{sale.date}} {{sale.time}}' },
        { content: 'Cliente: {{sale.customer}}' },
      ]
    },
    { type: 'divider' },
    {
      type: 'table',
      columns: [
        { header: 'Producto', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'Subtotal:', value: '{{sale.subtotal}}', align: 'right' },
        { label: 'IVA:', value: '{{sale.taxAmount}}', align: 'right' },
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },
    {
      type: 'footer',
      items: [
        { content: 'Documento que anula o reduce venta', align: 'center', size: 'small' },
      ]
    }
  ]
}

/**
 * Template para Nota de Débito (80mm)
 */
export const NOTA_DEBITO_80MM: TicketTemplate = {
  name: 'Nota de Débito 80mm',
  description: 'Nota de débito estándar',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: 'CUIT: {{business.cuit}}', bold: true, align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
      ]
    },
    { type: 'divider-solid' },
    {
      type: 'info',
      items: [
        { content: 'NOTA DE DÉBITO', bold: true, align: 'center', size: 'large' },
        { content: 'Nº: {{sale.number}}', bold: true },
        { content: 'Fecha: {{sale.date}} {{sale.time}}' },
        { content: 'Cliente: {{sale.customer}}' },
      ]
    },
    { type: 'divider' },
    {
      type: 'table',
      columns: [
        { header: 'Producto', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'Subtotal:', value: '{{sale.subtotal}}', align: 'right' },
        { label: 'IVA:', value: '{{sale.taxAmount}}', align: 'right' },
        { type: 'divider' },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },
    {
      type: 'footer',
      items: [
        { content: 'Documento que incrementa deuda', align: 'center', size: 'small' },
      ]
    }
  ]
}

/**
 * Template para Presupuesto (80mm)
 */
export const PRESUPUESTO_80MM: TicketTemplate = {
  name: 'Presupuesto 80mm',
  description: 'Presupuesto o cotización',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    {
      type: 'header',
      items: [
        { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
        { content: '{{business.address}}', size: 'small', align: 'center' },
        { content: 'Tel: {{business.phone}}', size: 'small', align: 'center' },
      ]
    },
    { type: 'divider-solid' },
    {
      type: 'info',
      items: [
        { content: 'PRESUPUESTO', bold: true, align: 'center', size: 'large' },
        { content: 'Nº: {{sale.number}}', bold: true },
        { content: 'Fecha: {{sale.date}}' },
        { content: 'Cliente: {{sale.customer}}' },
        { content: 'Validez: 15 días', size: 'small' },
      ]
    },
    { type: 'divider' },
    {
      type: 'table',
      columns: [
        { header: 'Producto', field: 'productName', align: 'left' },
        { header: 'Cant.', field: 'quantity', align: 'right', decimals: 2 },
        { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
        { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
      ]
    },
    {
      type: 'totals',
      items: [
        { type: 'divider' },
        { label: 'Subtotal:', value: '{{sale.subtotal}}', align: 'right' },
        { label: 'IVA 21%:', value: '{{sale.taxAmount}}', align: 'right' },
        { type: 'divider' },
        { label: 'TOTAL ESTIMADO:', value: '{{sale.totalAmount}}', bold: true, align: 'right' },
        { type: 'divider' },
      ]
    },
    {
      type: 'footer',
      items: [
        { content: 'Este presupuesto no constituye factura', align: 'center', size: 'small' },
        { content: 'Gracias por su consulta', align: 'center' },
      ]
    }
  ]
}

// ==================== CONFIGURACIÓN POR DEFECTO ====================

/**
 * Template que se usa por defecto si no se especifica otro
 */
export const DEFAULT_TEMPLATE = TICKET_VENTA_80MM

/**
 * Mapeo de tipos de documento a templates
 */
export const TEMPLATE_MAP: Record<string, TicketTemplate> = {
  'ticket-venta-80mm': TICKET_VENTA_80MM,
  'ticket-venta-58mm': TICKET_VENTA_58MM,
  'factura-a-80mm': FACTURA_A_80MM,
  'factura-b-80mm': FACTURA_B_80MM,
  'nota-credito-80mm': NOTA_CREDITO_80MM,
  'nota-debito-80mm': NOTA_DEBITO_80MM,
  'presupuesto-80mm': PRESUPUESTO_80MM,
  'ticket-compra-80mm': TICKET_COMPRA_80MM,
}

/**
 * Obtiene un template por su ID
 */
export function getTemplate(templateId: string): TicketTemplate {
  return TEMPLATE_MAP[templateId] || DEFAULT_TEMPLATE
}

/**
 * Lista todos los templates disponibles
 */
export function getAvailableTemplates(): { id: string; name: string; description?: string }[] {
  return Object.entries(TEMPLATE_MAP).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description
  }))
}
