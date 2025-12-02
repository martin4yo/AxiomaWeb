# Sistema de Impresión de Tickets y Facturas

## Descripción General

Sistema flexible de impresión de tickets y facturas para impresoras térmicas y convencionales, con soporte para múltiples formatos, códigos QR, datos de CAE de AFIP y configuración por tipo de comprobante.

## Características

- ✅ Templates configurables en JSON (sin modificar código)
- ✅ Impresión automática al crear venta
- ✅ Reimpresión desde listado de ventas
- ✅ Soporte para impresoras térmicas (80mm, 58mm)
- ✅ Códigos QR para facturas electrónicas
- ✅ Datos de CAE y vencimiento de AFIP
- ✅ Múltiples templates: Factura A/B, Nota Crédito/Débito, Presupuesto
- ✅ Datos de negocio configurables por tenant
- ✅ Asignación de template por tipo de comprobante
- ✅ Sin dependencia de servicios externos
- ✅ Compatible con cualquier impresora configurada en el SO

## Arquitectura

### Componentes Principales

```
frontend/src/services/
├── printService.ts        # Motor de impresión y renderizado
└── printTemplates.ts      # Definición de templates

frontend/src/pages/sales/
├── NewSalePage.tsx        # Impresión automática al crear venta
└── SalesPage.tsx          # Botón de reimpresión

frontend/src/pages/settings/
├── NewVoucherConfigurationPage.tsx   # Selector de template
└── EditVoucherConfigurationPage.tsx  # Edición de template

backend/src/services/
├── salesService.ts        # Guardado de voucherConfigurationId
└── voucher.service.ts     # Determinación de tipo de comprobante

backend/prisma/schema.prisma
├── Tenant                 # businessName, cuit, address, phone, email
└── VoucherConfiguration   # printTemplateId
```

### Flujo de Impresión

```
1. Usuario crea venta → salesService.createSale()
2. Se determina tipo de comprobante → voucherService.determineVoucherType()
3. Se guarda voucherConfigurationId en Sale
4. Se retorna Sale con voucherConfiguration incluida
5. Frontend recibe response → handlePrintTicket()
6. Se obtiene printTemplateId de voucherConfiguration
7. Se carga template → getTemplate(templateId)
8. Se prepara TicketData con datos de negocio y venta
9. Se renderiza HTML → printService.renderTemplate()
10. Se imprime en iframe oculto → printService.printFallback()
```

## Configuración

### 1. Configurar Datos del Negocio

**Ubicación:** Configuración > Tenants > Editar Tenant > Pestaña "Datos del Negocio"

Campos disponibles:
- **Nombre del Negocio** (businessName): Aparece en el header del ticket
- **CUIT**: Número de identificación fiscal
- **Dirección**: Dirección del local/empresa
- **Teléfono**: Teléfono de contacto
- **Email**: Email de contacto (opcional)

### 2. Asignar Template a Tipo de Comprobante

**Ubicación:** Configuración > Configuración de Comprobantes > Editar Configuración

**Campo:** "Formato de Impresión"

**Opciones disponibles:**
- Ticket Venta 80mm (por defecto)
- Ticket Venta 58mm (compacto)
- Factura A 80mm (discrimina IVA)
- Factura B 80mm (IVA incluido)
- Nota de Crédito 80mm
- Nota de Débito 80mm
- Presupuesto 80mm
- Ticket Compra 80mm

**Ejemplo de configuración:**
```
Tipo de Comprobante: Factura B (FB)
Formato de Impresión: Factura B 80mm
```

### 3. Configurar Impresora en el Sistema Operativo

El sistema usa la impresora predeterminada del navegador. Para configurar:

**Windows:**
1. Panel de Control > Dispositivos e Impresoras
2. Click derecho en impresora térmica
3. "Establecer como impresora predeterminada"

**Linux:**
1. Configuración del Sistema > Impresoras
2. Seleccionar impresora térmica
3. Marcar como predeterminada

**macOS:**
1. Preferencias del Sistema > Impresoras y Escáneres
2. Seleccionar impresora
3. "Impresora por Omisión"

## Uso

### Impresión Automática

Al completar una venta, el sistema:
1. Determina el tipo de comprobante según cliente y configuración
2. Busca el template asignado en la configuración del comprobante
3. Renderiza el ticket con los datos de la venta
4. Abre automáticamente el diálogo de impresión

**No requiere acción del usuario** - es completamente automático.

### Reimpresión Manual

Desde el listado de ventas:
1. Buscar la venta a reimprimir
2. Click en el botón de impresora (icono 🖨️)
3. Se abre el diálogo de impresión con el ticket

## Templates Disponibles

### Ticket Venta 80mm
**ID:** `ticket-venta-80mm`
**Uso:** Ventas generales sin discriminación de IVA
**Ancho:** 80mm
**Contenido:**
- Header con datos del negocio
- Información de venta (número, fecha, cliente)
- Tabla de productos
- Totales (subtotal, descuentos, IVA, total)
- Formas de pago
- Footer con agradecimiento

### Ticket Venta 58mm
**ID:** `ticket-venta-58mm`
**Uso:** Versión compacta para papel de 58mm
**Ancho:** 58mm
**Contenido:** Similar a 80mm pero más compacto

### Factura A 80mm
**ID:** `factura-a-80mm`
**Uso:** Facturas A para responsables inscriptos
**Ancho:** 80mm
**Contenido:**
- Header con "FACTURA A" destacado
- Datos fiscales completos
- Discriminación de IVA por ítem
- Datos de CAE de AFIP
- Fecha de vencimiento del CAE
- Código QR para validación AFIP

### Factura B 80mm
**ID:** `factura-b-80mm`
**Uso:** Facturas B para consumidores finales
**Ancho:** 80mm
**Contenido:**
- Header con "FACTURA B" destacado
- IVA incluido en precios
- Datos de CAE de AFIP
- Código QR para validación AFIP

### Nota de Crédito 80mm
**ID:** `nota-credito-80mm`
**Uso:** Notas de crédito por devoluciones
**Ancho:** 80mm
**Contenido:**
- Header con "NOTA DE CRÉDITO" destacado
- Referencia a comprobante original
- Datos de CAE si corresponde

### Nota de Débito 80mm
**ID:** `nota-debito-80mm`
**Uso:** Notas de débito por ajustes
**Ancho:** 80mm
**Contenido:**
- Header con "NOTA DE DÉBITO" destacado
- Referencia a comprobante original
- Datos de CAE si corresponde

### Presupuesto 80mm
**ID:** `presupuesto-80mm`
**Uso:** Presupuestos y cotizaciones
**Ancho:** 80mm
**Contenido:**
- Header con "PRESUPUESTO"
- Datos de productos y totales
- Validez del presupuesto
- Sin datos de CAE

### Ticket Compra 80mm
**ID:** `ticket-compra-80mm`
**Uso:** Comprobantes de compra a proveedores
**Ancho:** 80mm
**Contenido:**
- Datos del proveedor
- Items comprados
- Totales

## Personalización de Templates

### Estructura de un Template

```typescript
export const MI_TEMPLATE: TicketTemplate = {
  id: 'mi-template-id',
  name: 'Mi Template Personalizado',
  paperWidth: 80, // mm
  fontSize: 12,   // px
  sections: [
    // Secciones del template
  ]
}
```

### Tipos de Secciones

#### 1. Header (Datos de la Empresa)
```typescript
{
  type: 'header',
  items: [
    { content: '{{business.name}}', bold: true, size: 'large', align: 'center' },
    { content: 'CUIT: {{business.cuit}}', size: 'small', align: 'center' },
    { content: '{{business.address}}', size: 'small', align: 'center' },
    { content: 'Tel: {{business.phone}}', size: 'small', align: 'center' }
  ]
}
```

#### 2. Info (Información del Documento)
```typescript
{
  type: 'info',
  items: [
    { content: 'Comprobante: {{sale.number}}', bold: true },
    { content: 'Fecha: {{sale.date}} {{sale.time}}' },
    { content: 'Cliente: {{sale.customer}}' }
  ]
}
```

#### 3. Table (Tabla de Items)
```typescript
{
  type: 'table',
  columns: [
    { header: 'Producto', field: 'productName', align: 'left' },
    { header: 'Cant', field: 'quantity', align: 'right', decimals: 2 },
    { header: 'P.Unit', field: 'unitPrice', align: 'right', decimals: 2 },
    { header: 'Total', field: 'lineTotal', align: 'right', decimals: 2 }
  ]
}
```

#### 4. Totals (Totales)
```typescript
{
  type: 'totals',
  items: [
    { label: 'Subtotal:', value: '{{sale.subtotal}}' },
    { label: 'IVA:', value: '{{sale.taxAmount}}' },
    { type: 'divider' },
    { label: 'TOTAL:', value: '{{sale.totalAmount}}', bold: true }
  ]
}
```

#### 5. Payments (Formas de Pago)
```typescript
{
  type: 'payments',
  items: [
    { content: 'FORMAS DE PAGO:', bold: true }
  ]
}
```

#### 6. QR Code (Código QR)
```typescript
{
  type: 'qrcode',
  data: '{{sale.qrData}}',
  align: 'center'
}
```

#### 7. Footer (Pie de Página)
```typescript
{
  type: 'footer',
  items: [
    { content: '¡Gracias por su compra!', align: 'center' },
    { content: 'CAE: {{sale.caeNumber}}', size: 'small', align: 'center' },
    { content: 'Vto. CAE: {{sale.caeExpiration}}', size: 'small', align: 'center' }
  ]
}
```

#### 8. Dividers (Separadores)
```typescript
{ type: 'divider' }        // Línea punteada
{ type: 'divider-solid' }  // Línea sólida
```

### Variables Disponibles

#### Datos del Negocio (`business`)
- `{{business.name}}` - Nombre del negocio
- `{{business.cuit}}` - CUIT
- `{{business.address}}` - Dirección
- `{{business.phone}}` - Teléfono
- `{{business.email}}` - Email

#### Datos de Venta (`sale`)
- `{{sale.number}}` - Número de venta
- `{{sale.date}}` - Fecha
- `{{sale.time}}` - Hora
- `{{sale.customer}}` - Nombre del cliente
- `{{sale.subtotal}}` - Subtotal
- `{{sale.discountAmount}}` - Monto de descuento
- `{{sale.taxAmount}}` - Monto de IVA
- `{{sale.totalAmount}}` - Total
- `{{sale.caeNumber}}` - Número de CAE AFIP
- `{{sale.caeExpiration}}` - Fecha de vencimiento CAE
- `{{sale.qrData}}` - Datos para código QR
- `{{sale.notes}}` - Notas de la venta

#### Items de Venta (`sale.items[]`)
- `productName` - Nombre del producto
- `description` - Descripción
- `quantity` - Cantidad
- `unitPrice` - Precio unitario
- `lineTotal` - Total de línea

#### Formas de Pago (`sale.payments[]`)
- `name` - Nombre del método de pago
- `amount` - Monto
- `reference` - Referencia (opcional)

### Crear un Template Personalizado

1. **Editar archivo:** `frontend/src/services/printTemplates.ts`

2. **Definir el template:**
```typescript
export const MI_TEMPLATE_CUSTOM: TicketTemplate = {
  id: 'mi-template-custom',
  name: 'Mi Template Personalizado',
  paperWidth: 80,
  fontSize: 12,
  sections: [
    // ... tus secciones personalizadas
  ]
}
```

3. **Registrar en el mapa:**
```typescript
const TEMPLATE_MAP: Record<string, TicketTemplate> = {
  'ticket-venta-80mm': TICKET_VENTA_80MM,
  'mi-template-custom': MI_TEMPLATE_CUSTOM, // Agregar aquí
  // ... otros templates
}
```

4. **Usar desde configuración:**
   - Ir a Configuración > Configuración de Comprobantes
   - Seleccionar "Mi Template Personalizado"
   - Guardar

## Detalles Técnicos

### Renderizado

El sistema utiliza HTML + CSS para renderizar los tickets:

1. **Generación de HTML:** Se convierte el template JSON a HTML
2. **Aplicación de estilos:** CSS con media queries para impresión
3. **Renderizado en iframe:** Se crea un iframe oculto con el contenido
4. **Impresión:** Se invoca `window.print()` del iframe

### Tamaños de Papel

```css
@page {
  size: 80mm auto;  /* Ancho fijo, alto automático */
  margin: 0;
}
```

**Anchos soportados:**
- 80mm: Estándar para impresoras térmicas
- 58mm: Compacto para impresoras portátiles

### Fuentes

```css
font-family: 'Courier New', Courier, monospace;
```

Se usa fuente monoespaciada para mejor alineación en impresoras térmicas.

### Códigos QR

**Librería:** `qrcode` (npm)

**Generación:**
```typescript
const qrDataURL = await QRCode.toDataURL(qrData, {
  width: 200,
  margin: 1,
  errorCorrectionLevel: 'M'
})
```

**Formato de datos AFIP:**
El QR contiene la URL de validación del comprobante en el formato especificado por AFIP.

### Timeout de API

**Configuración:** `frontend/src/services/api.ts`

```typescript
timeout: 60000  // 60 segundos
```

**Razón:** Las operaciones con AFIP pueden tardar hasta 30-40 segundos, especialmente en ambientes con alta carga o conexión lenta.

### Prevención de Popup Blocker

**Problema:** `window.open()` es bloqueado por navegadores modernos

**Solución:** Uso de iframe oculto
```typescript
const iframe = document.createElement('iframe')
iframe.style.position = 'absolute'
iframe.style.width = '0'
iframe.style.height = '0'
iframe.style.border = 'none'
document.body.appendChild(iframe)
```

## Base de Datos

### Modelo Tenant

```prisma
model Tenant {
  // ... campos existentes ...
  businessName  String?  @map("business_name")
  cuit          String?
  address       String?
  phone         String?
  email         String?
}
```

**Migración:** `20251201211803_add_business_info_to_tenant`

### Modelo VoucherConfiguration

```prisma
model VoucherConfiguration {
  // ... campos existentes ...
  printTemplateId  String?  @map("print_template_id")
}
```

**Migración:** `20251201222729_add_print_template_to_voucher_configuration`

### Modelo Sale

```prisma
model Sale {
  // ... campos existentes ...
  voucherConfigurationId  String?  @map("voucher_configuration_id")

  voucherConfiguration VoucherConfiguration? @relation(fields: [voucherConfigurationId], references: [id])
}
```

**Nota:** La relación permite acceder al `printTemplateId` desde la venta.

## API Endpoints

### GET /api/:tenant/voucher-configurations
Obtiene todas las configuraciones de comprobantes (incluye `printTemplateId`)

### POST /api/:tenant/voucher-configurations
Crea nueva configuración con `printTemplateId` opcional

### PUT /api/:tenant/voucher-configurations/:id
Actualiza configuración incluyendo `printTemplateId`

### POST /api/:tenant/sales
Crea venta y guarda `voucherConfigurationId` para preservar el template

### GET /api/:tenant/sales/:id
Obtiene venta incluyendo relación `voucherConfiguration` con su `printTemplateId`

## Troubleshooting

### Problema: No se imprime automáticamente

**Causas posibles:**
1. No hay template asignado al tipo de comprobante
2. El navegador bloqueó el popup
3. No hay impresora configurada

**Solución:**
1. Verificar configuración en Configuración > Configuración de Comprobantes
2. Verificar consola del navegador (F12) para errores
3. Probar reimpresión manual desde listado
4. Verificar que el navegador no esté bloqueando popups

### Problema: Timeout al crear venta

**Causa:** Operación con AFIP tarda más de 60 segundos

**Solución:**
1. Verificar conexión a internet
2. Verificar estado del servicio AFIP
3. Si persiste, aumentar timeout en `api.ts`

### Problema: Formato incorrecto en impresora térmica

**Causas posibles:**
1. Template de 80mm en impresora de 58mm (o viceversa)
2. Configuración de márgenes en driver de impresora

**Solución:**
1. Usar template adecuado al ancho de papel
2. Configurar márgenes en 0 en propiedades de impresora
3. Desactivar "ajustar a página" en diálogo de impresión

### Problema: QR code no se genera

**Causas posibles:**
1. Falta librería `qrcode`
2. Datos de QR vacíos o inválidos
3. Error en renderizado asíncrono

**Solución:**
1. Verificar instalación: `npm install qrcode`
2. Verificar que `sale.qrData` tenga contenido
3. Revisar consola para errores de renderizado

### Problema: Datos del negocio no aparecen

**Causa:** No están configurados en el tenant

**Solución:**
1. Ir a Configuración > Tenants
2. Editar tenant
3. Ir a pestaña "Datos del Negocio"
4. Completar campos
5. Guardar

## Testing

### Prueba Manual de Impresión

1. Crear una venta de prueba
2. Verificar que se abre diálogo de impresión
3. En vista previa, verificar:
   - Datos del negocio correctos
   - Datos de venta correctos
   - Formato apropiado
   - QR code visible (si aplica)

### Prueba de Templates

Para cada template disponible:
1. Crear configuración de comprobante
2. Asignar el template
3. Crear venta de ese tipo
4. Verificar impresión

### Prueba de Reimpresión

1. Ir a listado de ventas
2. Buscar venta existente
3. Click en botón imprimir
4. Verificar que usa el mismo template original

## Roadmap / Mejoras Futuras

### Corto Plazo
- [ ] Preview de impresión antes de enviar a impresora
- [ ] Configuración de márgenes personalizados
- [ ] Selector de impresora (si hay múltiples)

### Mediano Plazo
- [ ] Editor visual de templates
- [ ] Soporte para logos/imágenes
- [ ] Templates para formatos A4
- [ ] Exportación a PDF

### Largo Plazo
- [ ] Servicio de impresión Electron para comandos ESC/POS
- [ ] Integración con impresoras fiscales
- [ ] Cola de impresión para alta concurrencia
- [ ] Plantillas condicionales (mostrar campos solo si existen)

## Referencias

### Documentación AFIP
- [RG 5616 - Factura Electrónica](https://www.afip.gob.ar/)
- Formato de código QR para comprobantes electrónicos

### Librerías Utilizadas
- [qrcode](https://www.npmjs.com/package/qrcode) - Generación de códigos QR
- [axios](https://axios-http.com/) - Cliente HTTP
- [React Query](https://tanstack.com/query) - Gestión de estado asíncrono
- [Zod](https://zod.dev/) - Validación de esquemas

### CSS Print Media Queries
- [MDN - Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/print)
- [CSS @page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades:
- **Issues:** https://github.com/martin4yo/AxiomaWeb/issues
- **Documentación:** Este archivo

---

**Última actualización:** 2025-01-02
**Versión del sistema:** 1.0.0
**Autor:** Claude Code + Martin
