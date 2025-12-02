# Decisiones de Arquitectura - Sistema de Impresión

## Contexto

Se necesitaba implementar un sistema de impresión de tickets y facturas que fuera:
- Flexible para diferentes formatos
- Compatible con impresoras térmicas
- Sin dependencias de servicios externos
- Fácil de configurar y mantener

## Decisiones Clave

### 1. Templates en JSON vs HTML Estático

**Decisión:** Usar definición de templates en TypeScript/JSON

**Alternativas consideradas:**
- HTML templates estáticos
- JSX/React components
- Motor de templates (Handlebars, Mustache)

**Razones:**
- ✅ Type-safety con TypeScript
- ✅ Fácil de mantener y versionar
- ✅ No requiere compilación adicional
- ✅ Permite validación en tiempo de desarrollo
- ✅ Autocompletado en IDE
- ❌ Motor de templates sería más flexible pero agrega dependencia

**Código:**
```typescript
interface TicketTemplate {
  id: string
  name: string
  paperWidth: number
  fontSize: number
  sections: TemplateSection[]
}
```

### 2. Renderizado con HTML+CSS vs ESC/POS

**Decisión:** Renderizar usando HTML/CSS y `window.print()`

**Alternativas consideradas:**
- Comandos ESC/POS directos
- PDF generation
- Imagen rasterizada

**Razones:**
- ✅ Compatible con cualquier impresora del SO
- ✅ No requiere drivers especiales
- ✅ Preview visual antes de imprimir
- ✅ Más fácil de debuggear
- ✅ Funciona en web sin instalación
- ❌ ESC/POS sería más rápido pero requiere servicio nativo

**Trade-off aceptado:**
Velocidad de impresión ligeramente menor a cambio de compatibilidad universal.

### 3. window.open() vs iframe

**Decisión:** Usar iframe oculto en lugar de `window.open()`

**Problema original:**
```typescript
// Esto era bloqueado por navegadores
const printWindow = window.open('', '_blank')
```

**Razones:**
- ✅ No es bloqueado por popup blockers
- ✅ No interrumpe flujo del usuario
- ✅ Más confiable en navegadores modernos
- ✅ No requiere permisos especiales

**Implementación:**
```typescript
const iframe = document.createElement('iframe')
iframe.style.position = 'absolute'
iframe.style.width = '0'
iframe.style.height = '0'
document.body.appendChild(iframe)
iframe.contentWindow?.print()
```

### 4. Timeout de API: 10s vs 60s

**Decisión:** Aumentar de 10 segundos a 60 segundos

**Problema:**
```
Error: timeout of 10000ms exceeded
```

**Razones:**
- ✅ Operaciones con AFIP pueden tardar 20-40 segundos
- ✅ Mejor experiencia de usuario (no fallar prematuramente)
- ✅ Permite procesos de background en server
- ❌ Aumenta tiempo de espera en caso de falla real

**Mitigación:**
- Mostrar modal de progreso al usuario
- Indicadores visuales de que está procesando
- Estados intermedios (verificando AFIP, guardando venta, etc.)

### 5. Configuración de Template: Global vs Por Comprobante

**Decisión:** Asignar template a nivel de VoucherConfiguration

**Alternativas consideradas:**
- Template global para todos los comprobantes
- Template por tenant
- Template por usuario

**Razones:**
- ✅ Máxima flexibilidad
- ✅ Factura A puede tener formato diferente a Factura B
- ✅ Notas de crédito pueden tener layout específico
- ✅ Permite A/B testing de formatos

**Modelo de datos:**
```prisma
model VoucherConfiguration {
  id              String
  voucherTypeId   String
  printTemplateId String?  // Opcional, usa default si no está
}
```

### 6. Datos de Negocio: Settings vs Tenant

**Decisión:** Guardar en modelo Tenant

**Problema original:**
Usuario corrigió: "los datos del negocio tienen que ser campos del tenant, no puede ser datos generales"

**Razones:**
- ✅ Multi-tenant: cada tenant tiene sus propios datos
- ✅ No requiere tabla adicional
- ✅ Acceso directo desde currentTenant en frontend
- ✅ Se incluye automáticamente en context del tenant

**Campos agregados:**
```prisma
model Tenant {
  businessName  String?
  cuit          String?
  address       String?
  phone         String?
  email         String?
}
```

### 7. Impresión Automática vs Manual

**Decisión:** Automática por defecto, con opción de reimpresión

**Razones:**
- ✅ Reduce pasos del usuario
- ✅ Workflow más fluido
- ✅ Esperado en sistemas POS
- ✅ No bloquea si usuario cancela impresión

**Implementación:**
```typescript
onSuccess: (response) => {
  // Auto-print no bloquea el flujo
  handlePrintTicket(response).catch(console.error)

  // Usuario puede continuar trabajando
  navigate('/sales')
}
```

### 8. QR Code: Generación en Backend vs Frontend

**Decisión:** Generar QR en frontend

**Alternativas consideradas:**
- Backend genera QR como imagen y lo envía
- Backend genera data URL del QR
- Frontend genera QR on-demand

**Razones:**
- ✅ Reduce carga del servidor
- ✅ Más rápido (no espera respuesta del server)
- ✅ Menor tamaño de response (solo datos, no imagen)
- ✅ Librería `qrcode` es liviana (50KB)

**Trade-off:**
```typescript
// Backend solo envía data string
sale.qrData = "https://www.afip.gob.ar/..."

// Frontend genera imagen
const qrImage = await QRCode.toDataURL(sale.qrData)
```

### 9. Versionado de Templates

**Decisión:** Templates en código versionado (Git)

**Alternativas consideradas:**
- Templates en base de datos
- Templates en archivos JSON externos
- Editor de templates en UI

**Razones:**
- ✅ Control de versiones con Git
- ✅ Rollback fácil si algo falla
- ✅ Revisión de cambios (PR/commits)
- ✅ Testing antes de deploy
- ❌ No permite cambios sin redeploy

**Futuro:**
Agregar editor visual que genere el JSON y lo guarde en DB, pero mantener templates default en código.

### 10. Relación Sale-VoucherConfiguration

**Decisión:** Guardar `voucherConfigurationId` en Sale

**Problema detectado:**
```typescript
// Antes: solo guardaba voucherType (string)
voucherType: 'FB'

// Después: guarda referencia a configuración
voucherConfigurationId: 'config-123'
```

**Razones:**
- ✅ Preserva template usado en el momento de la venta
- ✅ Permite reimprimir con formato original
- ✅ Si cambias template, ventas viejas no se afectan
- ✅ Acceso a printTemplateId en reimpresión

**Implementación:**
```typescript
// salesService.ts
const newSale = await tx.sale.create({
  data: {
    voucherConfigurationId: voucherInfo?.configuration?.id
  }
})

// Al leer
const sale = await prisma.sale.findUnique({
  include: {
    voucherConfiguration: true  // Trae printTemplateId
  }
})
```

## Patrones de Diseño Utilizados

### 1. Template Method Pattern

Los templates definen la estructura, el renderer ejecuta:

```typescript
// Template define QUÉ mostrar
const template = {
  sections: [
    { type: 'header', items: [...] },
    { type: 'table', columns: [...] },
  ]
}

// Renderer define CÓMO mostrarlo
class PrintService {
  renderSection(section: TemplateSection) {
    switch(section.type) {
      case 'header': return this.renderHeader(section)
      case 'table': return this.renderTable(section)
    }
  }
}
```

### 2. Strategy Pattern

Templates intercambiables para diferentes tipos de comprobantes:

```typescript
// Estrategia seleccionada dinámicamente
const templateId = voucherConfig.printTemplateId || 'default'
const template = getTemplate(templateId)
```

### 3. Builder Pattern

Construcción incremental del HTML:

```typescript
let html = '<html>'
for (const section of template.sections) {
  html += await this.renderSection(section)
}
html += '</html>'
```

### 4. Singleton Pattern

Un solo servicio de impresión para toda la app:

```typescript
export const printService = new PrintService()
```

## Consideraciones de Performance

### 1. Lazy Loading de QR Code

```typescript
// QR solo se genera si el template lo requiere
if (section.type === 'qrcode' && section.data) {
  const qrImage = await QRCode.toDataURL(section.data)
}
```

### 2. Renderizado Asíncrono

```typescript
async renderTemplate(): Promise<string> {
  // Permite await en generación de QR sin bloquear
}
```

### 3. Cleanup de iframe

```typescript
setTimeout(() => {
  document.body.removeChild(iframe)
}, 1000)
```

Evita memory leaks removiendo iframes después de imprimir.

### 4. Caching de Templates

```typescript
const TEMPLATE_MAP: Record<string, TicketTemplate> = {
  // Templates se cargan una vez al inicio
}
```

No se re-crean templates en cada impresión.

## Consideraciones de Seguridad

### 1. Sanitización de Datos

**Problema potencial:** XSS si datos contienen HTML

**Mitigación:**
```typescript
// Los datos se escapan automáticamente en interpolación
private interpolate(template: string, data: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = this.getNestedValue(data, path)
    return String(value) // Convertido a string, no insertado como HTML
  })
}
```

### 2. Validación de Templates

```typescript
interface TicketTemplate {
  id: string        // Requerido
  name: string      // Requerido
  sections: []      // No puede estar vacío
}
```

TypeScript valida estructura en compile-time.

### 3. CORS y Same-Origin

iframe usa same-origin (creado desde mismo dominio), no hay problemas de CORS.

## Testing

### Unit Tests (Futuro)

```typescript
describe('PrintService', () => {
  it('should render template with data', async () => {
    const html = await printService.renderTemplate(template, data)
    expect(html).toContain('FACTURA B')
  })

  it('should generate QR code', async () => {
    const section = { type: 'qrcode', data: 'test' }
    const html = await printService.renderSection(section, {})
    expect(html).toContain('<img src="data:image')
  })
})
```

### Integration Tests (Futuro)

```typescript
describe('Print Flow', () => {
  it('should print after creating sale', async () => {
    const sale = await createSale(saleData)
    expect(printService.printTicket).toHaveBeenCalled()
  })
})
```

## Lecciones Aprendidas

### 1. Popup Blockers Son Estrictos

**Aprendizaje:** Los navegadores modernos bloquean `window.open()` si no es trigger directo de un click del usuario.

**Solución:** Usar iframe evita este problema completamente.

### 2. AFIP Es Lento

**Aprendizaje:** Operaciones con AFIP pueden tardar 30+ segundos.

**Solución:**
- Timeout generoso (60s)
- Modal de progreso con estados
- No bloquear UI mientras espera

### 3. Multi-tenant Requiere Datos por Tenant

**Aprendizaje:** Cada tenant necesita sus propios datos de negocio.

**Solución:** Campos en modelo Tenant, no en Settings globales.

### 4. Templates Necesitan Flexibilidad

**Aprendizaje:** Diferentes comprobantes requieren diferentes formatos.

**Solución:** Template por tipo de comprobante, no global.

### 5. TypeScript Previene Errores

**Aprendizaje:** Sin types, fácil olvidar campos requeridos.

**Solución:** Interfaces estrictas para templates y datos.

## Mejoras Futuras Consideradas

### 1. Service Worker para Impresión Offline

```typescript
// Cachear templates y renderizar sin conexión
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/print')) {
    event.respondWith(caches.match(event.request))
  }
})
```

### 2. Web Workers para Renderizado

```typescript
// Mover renderizado pesado a worker
const worker = new Worker('print-worker.js')
worker.postMessage({ template, data })
worker.onmessage = (e) => printHTML(e.data)
```

### 3. Compresión de QR

```typescript
// QR más pequeño con compresión
const compressedUrl = await shortenUrl(fullAfipUrl)
const qr = QRCode.toDataURL(compressedUrl)
```

### 4. Batch Printing

```typescript
// Imprimir múltiples tickets a la vez
async printBatch(sales: Sale[]) {
  for (const sale of sales) {
    await this.printTicket(template, saleToTicketData(sale))
  }
}
```

## Referencias a Código

### Frontend
- `frontend/src/services/printService.ts:43-94` - Renderizado con iframe
- `frontend/src/services/printTemplates.ts:1-670` - Definición de templates
- `frontend/src/pages/sales/NewSalePage.tsx:827-880` - Auto-print

### Backend
- `backend/src/services/salesService.ts:410` - Guardado de voucherConfigurationId
- `backend/src/services/salesService.ts:758` - Include de voucherConfiguration
- `backend/src/services/voucher.service.ts:216-224` - Return de configuration

### Migrations
- `20251201211803_add_business_info_to_tenant.sql`
- `20251201222729_add_print_template_to_voucher_configuration.sql`

---

**Fecha:** 2025-01-02
**Versión:** 1.0.0
