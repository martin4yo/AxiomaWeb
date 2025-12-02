# Ejemplos de Código - Sistema de Impresión

Esta guía contiene ejemplos prácticos para desarrolladores que necesitan entender, mantener o extender el sistema de impresión.

## Tabla de Contenidos
1. [Crear un Template Personalizado](#crear-un-template-personalizado)
2. [Modificar Template Existente](#modificar-template-existente)
3. [Agregar Nueva Sección](#agregar-nueva-sección)
4. [Imprimir Programáticamente](#imprimir-programáticamente)
5. [Personalizar Estilos](#personalizar-estilos)
6. [Debugging](#debugging)

---

## Crear un Template Personalizado

### Ejemplo: Template para Remito

**Archivo:** `frontend/src/services/printTemplates.ts`

```typescript
export const REMITO_80MM: TicketTemplate = {
  id: 'remito-80mm',
  name: 'Remito 80mm',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    // Header
    {
      type: 'header',
      items: [
        {
          content: '{{business.name}}',
          bold: true,
          size: 'large',
          align: 'center'
        },
        {
          content: 'CUIT: {{business.cuit}}',
          size: 'small',
          align: 'center'
        }
      ]
    },

    // Divider
    { type: 'divider-solid' },

    // Título
    {
      type: 'info',
      items: [
        {
          content: 'REMITO',
          bold: true,
          size: 'large',
          align: 'center'
        }
      ]
    },

    { type: 'divider' },

    // Info del remito
    {
      type: 'info',
      items: [
        { content: 'Número: {{sale.number}}', bold: true },
        { content: 'Fecha: {{sale.date}}' },
        { content: 'Cliente: {{sale.customer}}' },
        { content: 'Dirección: (completar manualmente)' }
      ]
    },

    { type: 'divider' },

    // Tabla de productos (sin precios)
    {
      type: 'table',
      columns: [
        {
          header: 'Producto',
          field: 'productName',
          align: 'left'
        },
        {
          header: 'Cantidad',
          field: 'quantity',
          align: 'right',
          decimals: 2
        }
      ]
    },

    { type: 'divider-solid' },

    // Footer
    {
      type: 'footer',
      items: [
        { content: 'Firma: _________________', align: 'left' },
        { content: 'Aclaración: _________________', align: 'left' }
      ]
    }
  ]
}

// Agregar al mapa de templates
const TEMPLATE_MAP: Record<string, TicketTemplate> = {
  // ... templates existentes
  'remito-80mm': REMITO_80MM,
}

// Agregar a lista de disponibles
export function getAvailableTemplates(): TemplateInfo[] {
  return [
    // ... templates existentes
    { id: 'remito-80mm', name: 'Remito 80mm' },
  ]
}
```

---

## Modificar Template Existente

### Ejemplo: Agregar Logo al Header

**Antes:**
```typescript
{
  type: 'header',
  items: [
    { content: '{{business.name}}', bold: true, size: 'large', align: 'center' }
  ]
}
```

**Después:**
```typescript
{
  type: 'header',
  items: [
    // Logo (si está disponible)
    {
      content: '<img src="{{business.logoUrl}}" style="max-width: 100px; margin: 0 auto; display: block;" />',
      align: 'center'
    },
    // Nombre del negocio
    {
      content: '{{business.name}}',
      bold: true,
      size: 'large',
      align: 'center'
    }
  ]
}
```

**Nota:** Necesitarías agregar `logoUrl` al modelo Tenant y actualizar la interface TicketData.

### Ejemplo: Cambiar Formato de Fecha

**Modificar:** `frontend/src/pages/sales/NewSalePage.tsx`

```typescript
// Antes
const ticketData: TicketData = {
  sale: {
    date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
    // ...
  }
}

// Después - formato personalizado
const ticketData: TicketData = {
  sale: {
    date: new Date(sale.saleDate).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }), // Output: "02/01/2025"
    // ...
  }
}
```

---

## Agregar Nueva Sección

### Ejemplo: Sección de Observaciones

**1. Agregar tipo a TemplateSection:**

```typescript
// frontend/src/services/printTemplates.ts
export interface TemplateSection {
  type: 'header' | 'info' | 'table' | 'totals' | 'footer' |
        'divider' | 'divider-solid' | 'text' | 'payments' |
        'qrcode' | 'observations'  // ← Nuevo tipo
  // ...
}
```

**2. Implementar renderizado:**

```typescript
// frontend/src/services/printService.ts
private async renderSection(section: any, data: TicketData): Promise<string> {
  // ...
  switch (section.type) {
    // ... casos existentes
    case 'observations':
      html += this.renderObservations(section, data)
      break
  }
  // ...
}

private renderObservations(section: any, data: TicketData): string {
  const observations = data.sale?.notes || ''

  if (!observations) {
    return '' // No renderizar si no hay observaciones
  }

  let html = '<div class="observations">'
  html += '<div class="divider"></div>'
  html += '<div class="bold">Observaciones:</div>'
  html += `<div style="margin-top: 5px; white-space: pre-wrap;">${observations}</div>`
  html += '</div>'

  return html
}
```

**3. Usar en template:**

```typescript
export const FACTURA_B_80MM: TicketTemplate = {
  sections: [
    // ... secciones existentes

    // Nueva sección de observaciones
    { type: 'observations' },

    // ... resto de secciones
  ]
}
```

---

## Imprimir Programáticamente

### Ejemplo: Imprimir desde cualquier componente

```typescript
import { printService } from '@/services/printService'
import { getTemplate, TicketData } from '@/services/printTemplates'

async function imprimirVenta(sale: any, tenant: any) {
  // Preparar datos
  const ticketData: TicketData = {
    business: {
      name: tenant.businessName || tenant.name,
      cuit: tenant.cuit,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email
    },
    sale: {
      number: sale.saleNumber,
      date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
      time: new Date(sale.saleDate).toLocaleTimeString('es-AR'),
      customer: sale.customerName || 'Consumidor Final',
      items: sale.items.map((item: any) => ({
        productName: item.productName,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        lineTotal: parseFloat(item.lineTotal)
      })),
      subtotal: parseFloat(sale.subtotal),
      discountAmount: sale.discountAmount ? parseFloat(sale.discountAmount) : undefined,
      taxAmount: parseFloat(sale.taxAmount),
      totalAmount: parseFloat(sale.totalAmount),
      payments: sale.payments?.map((p: any) => ({
        name: p.paymentMethodName,
        amount: parseFloat(p.amount),
        reference: p.reference
      })),
      notes: sale.notes,
      caeNumber: sale.cae,
      caeExpiration: sale.caeExpiration
        ? new Date(sale.caeExpiration).toLocaleDateString('es-AR')
        : undefined,
      qrData: sale.qrData
    }
  }

  // Obtener template
  const templateId = sale.voucherConfiguration?.printTemplateId || 'ticket-venta-80mm'
  const template = getTemplate(templateId)

  // Imprimir
  try {
    const success = await printService.printTicket(template, ticketData)
    if (success) {
      console.log('Impresión exitosa')
    }
  } catch (error) {
    console.error('Error al imprimir:', error)
  }
}
```

### Ejemplo: Imprimir múltiples tickets en batch

```typescript
async function imprimirBatch(sales: any[], tenant: any) {
  for (const sale of sales) {
    await imprimirVenta(sale, tenant)

    // Esperar 1 segundo entre impresiones
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
```

---

## Personalizar Estilos

### Ejemplo: Cambiar Fuente

**Modificar:** `frontend/src/services/printService.ts`

```typescript
private generateCSS(template: TicketTemplate): string {
  return `
    body {
      /* Cambiar fuente */
      font-family: 'Arial', sans-serif;  /* Antes: 'Courier New' */
      font-size: ${fontSize}px;
      /* ... resto de estilos */
    }
  `
}
```

### Ejemplo: Agregar Estilos Personalizados

```typescript
private generateCSS(template: TicketTemplate): string {
  const baseCSS = `/* ... CSS existente ... */`

  // Estilos personalizados
  const customCSS = `
    /* Estilo para productos destacados */
    .product-highlight {
      background-color: #f0f0f0;
      padding: 2px;
      border-left: 3px solid #000;
    }

    /* Estilo para totales */
    .total-row {
      font-size: ${fontSize + 2}px;
      font-weight: bold;
      background-color: #e0e0e0;
      padding: 5px;
    }

    /* Estilo para observaciones */
    .observations {
      border: 1px dashed #999;
      padding: 5px;
      margin-top: 5px;
    }
  `

  return baseCSS + customCSS
}
```

### Ejemplo: Estilos Condicionales según Template

```typescript
private generateCSS(template: TicketTemplate): string {
  let css = `/* ... CSS base ... */`

  // Estilos específicos para Factura A
  if (template.id === 'factura-a-80mm') {
    css += `
      .tax-detail {
        font-size: 10px;
        color: #666;
      }
    `
  }

  // Estilos específicos para tickets compactos
  if (template.paperWidth === 58) {
    css += `
      body {
        font-size: 10px; /* Fuente más pequeña */
      }
      table td, table th {
        padding: 1px; /* Menos padding */
      }
    `
  }

  return css
}
```

---

## Debugging

### Ejemplo: Ver HTML Generado

```typescript
// frontend/src/services/printService.ts
async printTicket(template: TicketTemplate, data: TicketData): Promise<boolean> {
  const html = await this.renderTemplate(template, data)

  // DEBUG: Ver HTML en consola
  console.log('HTML generado:', html)

  // DEBUG: Abrir en ventana para inspeccionar
  if (import.meta.env.DEV) {
    const debugWindow = window.open('', '_blank')
    debugWindow?.document.write(html)
    debugWindow?.document.close()
  }

  return this.printFallback(template, data)
}
```

### Ejemplo: Log de Variables Interpoladas

```typescript
private interpolate(template: string | undefined, data: TicketData): string {
  if (!template) return ''

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = this.getNestedValue(data, path.trim())

    // DEBUG: Ver qué valores se están interpolando
    console.log(`Variable ${path} = ${value}`)

    return value !== undefined ? String(value) : match
  })
}
```

### Ejemplo: Validar Datos antes de Imprimir

```typescript
function validateTicketData(data: TicketData): string[] {
  const errors: string[] = []

  if (!data.business.name) {
    errors.push('Falta nombre del negocio')
  }

  if (!data.sale?.number) {
    errors.push('Falta número de venta')
  }

  if (!data.sale?.items || data.sale.items.length === 0) {
    errors.push('Venta sin items')
  }

  if (!data.sale?.totalAmount) {
    errors.push('Falta monto total')
  }

  return errors
}

// Usar antes de imprimir
async function imprimirConValidacion(template: TicketTemplate, data: TicketData) {
  const errors = validateTicketData(data)

  if (errors.length > 0) {
    console.error('Errores en datos del ticket:', errors)
    alert(`No se puede imprimir:\n${errors.join('\n')}`)
    return false
  }

  return await printService.printTicket(template, data)
}
```

---

## Ejemplos Avanzados

### Ejemplo: Template Condicional (Mostrar IVA solo si discrimina)

```typescript
// En el template, agregar flag
export const TEMPLATE_CONDICIONAL: TicketTemplate = {
  id: 'template-condicional',
  sections: [
    // ... otras secciones
    {
      type: 'totals',
      items: [
        { label: 'Subtotal:', value: '{{sale.subtotal}}' },
        // Este item solo se mostrará si showTax es true
        {
          label: 'IVA:',
          value: '{{sale.taxAmount}}',
          condition: 'showTax'  // ← Nueva propiedad
        },
        { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true }
      ]
    }
  ]
}

// Modificar renderer para soportar condiciones
private renderTotals(section: any, data: TicketData): string {
  // ...
  for (const item of section.items) {
    // Verificar condición si existe
    if (item.condition && !data.sale?.[item.condition]) {
      continue // Saltar este item
    }

    // Renderizar item normal
    // ...
  }
}

// Al preparar datos, incluir flag
const ticketData: TicketData = {
  sale: {
    // ...
    showTax: voucherType.code.includes('A'), // true para FA, false para FB
  }
}
```

### Ejemplo: Generar PDF en lugar de Imprimir

```typescript
import html2pdf from 'html2pdf.js'

async function generarPDF(template: TicketTemplate, data: TicketData): Promise<Blob> {
  const printService = new PrintService()
  const html = await printService.renderTemplate(template, data)

  // Opciones para PDF
  const options = {
    margin: 5,
    filename: `venta-${data.sale?.number}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
  }

  // Generar PDF
  const pdfBlob = await html2pdf().set(options).from(html).output('blob')
  return pdfBlob
}

// Descargar PDF
async function descargarPDF(sale: any, tenant: any) {
  const ticketData = prepararDatos(sale, tenant)
  const template = getTemplate('ticket-venta-80mm')

  const pdfBlob = await generarPDF(template, ticketData)

  // Crear link de descarga
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `venta-${sale.saleNumber}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
```

### Ejemplo: Enviar Ticket por Email

```typescript
async function enviarTicketPorEmail(sale: any, tenant: any, email: string) {
  // Generar HTML del ticket
  const ticketData = prepararDatos(sale, tenant)
  const template = getTemplate('ticket-venta-80mm')
  const html = await printService.renderTemplate(template, ticketData)

  // Enviar al backend
  await api.post('/send-email', {
    to: email,
    subject: `Comprobante de Venta ${sale.saleNumber}`,
    html: html,
    attachments: [] // Opcionalmente agregar PDF
  })
}
```

---

## Testing

### Ejemplo: Test Unitario de Renderizado

```typescript
import { describe, it, expect } from 'vitest'
import { printService } from '@/services/printService'
import { TICKET_VENTA_80MM } from '@/services/printTemplates'

describe('PrintService', () => {
  it('should render template with business data', async () => {
    const data: TicketData = {
      business: {
        name: 'Test Business',
        cuit: '20-12345678-9'
      },
      sale: {
        number: '00001-00000001',
        date: '01/01/2025',
        items: [],
        totalAmount: 100
      }
    }

    const html = await printService.renderTemplate(TICKET_VENTA_80MM, data)

    expect(html).toContain('Test Business')
    expect(html).toContain('20-12345678-9')
    expect(html).toContain('00001-00000001')
  })

  it('should interpolate variables correctly', async () => {
    const html = await printService.renderTemplate(TICKET_VENTA_80MM, testData)

    // No debe haber variables sin interpolar
    expect(html).not.toContain('{{')
    expect(html).not.toContain('}}')
  })
})
```

---

## Recursos Adicionales

- **MDN Web Docs - Printing:** https://developer.mozilla.org/en-US/docs/Web/Guide/Printing
- **CSS @page:** https://developer.mozilla.org/en-US/docs/Web/CSS/@page
- **qrcode npm:** https://www.npmjs.com/package/qrcode

---

**Última actualización:** 2025-01-02
