# Sistema de Plantillas de Impresión

Sistema completo de plantillas para impresión de comprobantes fiscales y no fiscales en formato PDF (A4) y térmico (80mm).

> 📖 **Ver también:** [CONFIGURACION_PLANTILLAS.md](CONFIGURACION_PLANTILLAS.md) para guía de configuración completa.

## 📋 Plantillas Disponibles

### PDFs (A4)

#### 1. Factura Legal (`legal`)
Diseño estándar de AFIP con todos los datos fiscales requeridos:
- ✅ Header con datos del negocio (razón social, CUIT, dirección, teléfono, email, localidad)
- ✅ Recuadro con letra del comprobante (A, B, C, etc.)
- ✅ Datos del receptor (cliente) con CUIT y condición IVA
- ✅ Tabla de items con descuentos e IVA
- ✅ Totales con discriminación de IVA (si corresponde)
- ✅ Formas de pago
- ✅ Datos de validación AFIP (CAE + vencimiento)
- ✅ Código QR de AFIP para verificación online

#### 2. Presupuesto (`quote`)
Diseño limpio y moderno sin datos fiscales:
- ✅ Header con datos del negocio (dirección, teléfono, email, localidad)
- ✅ Título "PRESUPUESTO" destacado
- ✅ Datos del cliente (nombre, dirección, teléfono)
- ✅ Tabla de items con diseño alternado
- ✅ Totales destacados en recuadro azul
- ✅ Formas de pago
- ✅ Notas personalizadas
- ❌ Sin CUIT, CAE ni datos fiscales

### Tickets Térmicos (80mm)

#### 1. Ticket Legal (`legal`)
Ticket fiscal completo con todos los datos AFIP:
- ✅ Header con datos del negocio (razón social, CUIT, dirección, teléfono, email, localidad)
- ✅ Ingresos Brutos
- ✅ Tipo de comprobante y letra (ej: FACTURA A)
- ✅ Código AFIP del comprobante
- ✅ Datos del receptor (cliente, CUIT, condición IVA, domicilio)
- ✅ Tabla de items con IVA discriminado (si corresponde)
- ✅ Totales con IVA
- ✅ Formas de pago con referencias
- ✅ CAE y vencimiento
- ✅ URL del QR de AFIP (nota: imagen QR requiere implementación adicional en impresora)

#### 2. Ticket Simple (`simple`)
Ticket informal para presupuestos:
- ✅ Header con datos del negocio (dirección, teléfono, email, localidad)
- ✅ Título "PRESUPUESTO"
- ✅ Datos básicos del cliente
- ✅ Tabla de items
- ✅ Totales
- ✅ Formas de pago
- ✅ Validez del presupuesto (30 días)
- ❌ Sin CUIT, CAE ni datos fiscales

## 🔧 Uso en el Backend

### Generar PDF

```typescript
import { PDFService } from './services/pdfService'
import { SalesService } from './services/salesService'

const salesService = new SalesService(prisma, tenantId, userId)
const sale = await salesService.getSaleById(saleId)

const pdfService = new PDFService()

// Factura legal
const legalPDF = await pdfService.generateInvoicePDF(sale, 'legal')

// Presupuesto
const quotePDF = await pdfService.generateInvoicePDF(sale, 'quote')
```

### Imprimir en Térmica

```typescript
// Preparar datos
const printData = {
  business: {
    name: tenant.businessName || tenant.name,
    cuit: tenant.cuit,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email
  },
  sale: {
    number: sale.fullVoucherNumber || sale.saleNumber,
    date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
    voucherName: 'FACTURA',
    voucherLetter: 'A',
    afipCode: 1,
    discriminatesVat: true,
    salesPointNumber: 1,
    customer: 'Cliente Demo',
    customerCuit: '20123456789',
    customerVatCondition: 'RI',
    customerAddress: 'Calle 123, Ciudad',
    items: [...],
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 210,
    totalAmount: 1210,
    payments: [...],
    caeNumber: '71234567890123',
    caeExpiration: '15/01/2024',
    notes: 'Observaciones...'
  },
  template: 'legal' // o 'simple'
}

// Enviar a Print Manager
await axios.post('http://localhost:9100/print', { data: printData })
```

## 🌐 API Endpoints

### PDF

#### Descargar PDF
```
GET /api/:tenantSlug/sales/:id/pdf?template=legal|simple
```

Query params:
- `template`: (opcional) `legal` o `simple`
- Si no se especifica, usa el `printTemplate` configurado en el comprobante
- Si no hay configuración, usa `legal` por defecto

Response: Archivo PDF para descarga

#### Vista previa PDF
```
GET /api/:tenantSlug/sales/:id/pdf/preview?template=legal|simple
```

Query params:
- `template`: (opcional) `legal` o `simple`
- Si no se especifica, usa la configuración del comprobante

Response: PDF inline en navegador

### Impresión Térmica

```
POST /api/:tenantSlug/sales/:id/print/thermal
```

Body:
```json
{
  "template": "legal" // (opcional) "legal" o "simple"
}
```

Si no se especifica `template`, usa el configurado en el comprobante.

Response:
```json
{
  "success": true,
  "message": "Ticket enviado a impresora térmica"
}
```

---

## ⚙️ Configuración en VoucherConfiguration

Cada tipo de comprobante tiene 2 campos de configuración:

```typescript
{
  printFormat: "THERMAL" | "PDF" | "NONE",  // Método de impresión
  printTemplate: "LEGAL" | "SIMPLE"          // Diseño/plantilla
}
```

**Ejemplos:**
- Factura A: `printFormat: "PDF"`, `printTemplate: "LEGAL"`
- Presupuesto: `printFormat: "PDF"`, `printTemplate: "SIMPLE"`
- Ticket fiscal: `printFormat: "THERMAL"`, `printTemplate: "LEGAL"`
- Ticket informal: `printFormat: "THERMAL"`, `printTemplate: "SIMPLE"`

Ver [CONFIGURACION_PLANTILLAS.md](CONFIGURACION_PLANTILLAS.md) para más detalles.

## 📱 Uso desde el Frontend

### Descargar PDF

```typescript
import { salesApi } from './api/sales'

// Factura legal
await salesApi.downloadPDF(saleId, 'legal')

// Presupuesto
await salesApi.downloadPDF(saleId, 'quote')
```

### Imprimir Ticket

```typescript
// Ticket legal
await salesApi.printThermal(saleId, 'legal')

// Ticket simple
await salesApi.printThermal(saleId, 'simple')
```

## 🎨 Personalización

### Modificar Plantillas PDF

Las plantillas PDF se encuentran en:
```
backend/src/services/pdfTemplateService.ts
```

Métodos disponibles:
- `renderLegalInvoice()`: Factura legal
- `renderQuoteInvoice()`: Presupuesto

### Modificar Plantillas Térmicas

Las plantillas térmicas se encuentran en:
```
print-manager/thermal-templates.js
```

Funciones disponibles:
- `renderLegalThermalTicket()`: Ticket legal
- `renderSimpleThermalTicket()`: Ticket simple

## 🔐 Código QR de AFIP

El QR de AFIP se genera automáticamente cuando hay:
- ✅ CAE autorizado
- ✅ CUIT del emisor
- ✅ CUIT/DNI del receptor

### Formato del QR

El QR codifica un **JSON en base64** con la URL de validación de AFIP:

```
https://www.afip.gob.ar/fe/qr/?p={base64_encoded_json}
```

### Estructura del JSON

```json
{
  "ver": 1,
  "fecha": "2025-01-15",
  "cuit": 20123456789,
  "ptoVta": 1,
  "tipoCmp": 1,
  "nroCmp": 123,
  "importe": 150050,
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 80,
  "nroDocRec": 20987654321,
  "tipoCodAut": "E",
  "codAut": 71234567890123
}
```

### Campos

- **ver**: Versión del formato (siempre 1)
- **fecha**: Fecha del comprobante YYYY-MM-DD
- **cuit**: CUIT del emisor (número sin guiones)
- **ptoVta**: Punto de venta (número)
- **tipoCmp**: Tipo de comprobante (1=FA, 6=FB, 11=FC)
- **nroCmp**: Número de comprobante
- **importe**: **Importe * 100 sin decimales** ⚠️
  - Ejemplo: $1500.50 -> 150050
- **moneda**: Código de moneda (PES, DOL, etc.)
- **ctz**: Cotización (1 para pesos)
- **tipoDocRec**: Tipo doc receptor (80=CUIT, 96=DNI, 99=Sin ID)
- **nroDocRec**: Número doc receptor (número sin guiones)
- **tipoCodAut**: Tipo de código autorización (E = CAE)
- **codAut**: CAE (número)

### ⚠️ IMPORTANTE: Multiplicación del Importe

El importe debe multiplicarse por 100 y enviarse sin decimales:
- ✅ $1500.50 -> `150050`
- ✅ $10.00 -> `1000`
- ✅ $0.50 -> `50`
- ❌ NO enviar: `1500.50` (incorrecto)

### Ejemplo Real

Para una venta de **$1500.50**:

```json
{
  "ver": 1,
  "fecha": "2025-01-15",
  "cuit": 20123456789,
  "ptoVta": 1,
  "tipoCmp": 1,
  "nroCmp": 123,
  "importe": 150050,    // <- 1500.50 * 100
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 80,
  "nroDocRec": 20987654321,
  "tipoCodAut": "E",
  "codAut": 71234567890123
}
```

Base64: `eyJ2ZXIiOjEsImZlY2hhIjoiMjAyNS0wMS0xNSIsImN1aXQiOjIw...`

URL final: `https://www.afip.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoiMjAyNS0wMS0xNSIsImN1aXQiOjIw...`

### Validación Automática

Cuando el usuario escanea el QR con su celular:
1. 📱 Abre automáticamente el navegador
2. 🌐 Va directo a la página de AFIP
3. 🔓 AFIP decodifica el base64
4. ✅ Valida el comprobante automáticamente
5. 📋 Muestra toda la información fiscal

### Servicio de Generación

El servicio está en:
```
backend/src/services/afipQRService.ts
```

Uso:
```typescript
import { AfipQRService } from './services/afipQRService'

const qrUrl = AfipQRService.generateQRData({
  cuit: '20-12345678-9',              // CUIT del emisor
  voucherTypeCode: 1,                 // 1=FA, 6=FB, 11=FC
  salesPointNumber: 1,                // Punto de venta
  voucherNumber: 123,                 // Número del comprobante
  amount: 1500.50,                    // Se multiplicará x100 automáticamente
  documentDate: new Date(),           // Fecha
  customerDocType: 80,                // 80=CUIT, 96=DNI, 99=Sin ID
  customerDocNumber: '20-98765432-1', // CUIT/DNI del cliente
  cae: '71234567890123'               // CAE de AFIP
})
```

El servicio se encarga automáticamente de:
- ✅ Limpiar guiones del CUIT
- ✅ Multiplicar el importe por 100
- ✅ Convertir todo a números
- ✅ Codificar el JSON en base64
- ✅ Generar la URL completa

## 📦 Datos Requeridos por Plantilla

### Factura Legal / Ticket Legal

**Obligatorios:**
- Datos del negocio: `name`, `cuit`, `address`, `phone`, `email`
- Datos del comprobante: `voucherName`, `voucherLetter`, `afipCode`, `number`, `date`
- Cliente: `customer`, `customerCuit`, `customerVatCondition`
- Items: array con `name`, `quantity`, `unitPrice`, `total`
- Totales: `subtotal`, `taxAmount`, `totalAmount`
- Pagos: array con `name`, `amount`

**Para CAE:**
- `caeNumber`: Número de CAE
- `caeExpiration`: Vencimiento del CAE
- `salesPointNumber`: Punto de venta
- `discriminatesVat`: Si discrimina IVA

### Presupuesto / Ticket Simple

**Obligatorios:**
- Datos del negocio: `name`, `address`, `phone`, `email`
- Comprobante: `number`, `date`
- Cliente: `customer`
- Items: array con `name`, `quantity`, `unitPrice`, `total`
- Totales: `totalAmount`
- Pagos: array con `name`, `amount`

**Opcionales:**
- `customerAddress`, `customerPhone`
- `notes`
- `discountAmount`

## 🚀 Próximos Pasos

- [ ] Implementar impresión de imagen QR en tickets térmicos
- [ ] Agregar configuración de logo del negocio en PDFs
- [ ] Plantilla de nota de crédito
- [ ] Plantilla de nota de débito
- [ ] Remito sin precios
- [ ] Ticket de cocina para restaurantes

## 💡 Notas Técnicas

### PDFKit
Los PDFs se generan usando PDFKit con renderizado manual de cada elemento. Esto permite control total sobre el diseño y compatibilidad con impresoras PDF.

### ESC/POS
Los tickets térmicos usan comandos ESC/POS estándar compatibles con impresoras de 80mm. El módulo `usb` se comunica directamente con la impresora USB.

### Print Manager
El Print Manager es una aplicación Electron que corre en background y expone un servidor HTTP en el puerto 9100 para recibir comandos de impresión desde el frontend.

### Localización
Las fechas se formatean en formato argentino (DD/MM/YYYY) y los montos con separador decimal de punto.

## 📄 Archivos del Sistema

```
backend/
├── src/
│   └── services/
│       ├── afipQRService.ts          # Generación de QR de AFIP
│       ├── pdfTemplateService.ts     # Plantillas PDF
│       └── pdfService.ts             # Servicio principal PDF
│
print-manager/
├── thermal-templates.js              # Plantillas térmicas
├── printer.js                        # Comunicación USB
└── main.js                           # Servidor Electron
```
