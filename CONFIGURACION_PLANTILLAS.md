# Configuración de Plantillas de Impresión

Guía completa para configurar las plantillas de impresión de comprobantes.

## 📋 Opciones Disponibles

En la configuración de cada tipo de comprobante tenés **3 campos** relacionados con la impresión:

### 1. **Formato de Impresión** (`printFormat`)
Define el **método** de impresión por defecto:
- **NONE**: No imprimir automáticamente
- **THERMAL**: Impresora térmica (ticket 80mm)
- **PDF**: Documento PDF A4

### 2. **Plantilla** (`printTemplate`)
Define el **diseño** del comprobante:
- **LEGAL**: Con todos los datos fiscales, CAE y QR de AFIP
- **SIMPLE**: Sin datos fiscales (presupuesto/ticket informal)

### 3. **ID de Plantilla Personalizada** (`printTemplateId`)
*(Opcional)* Para plantillas custom futuras

---

## 🎯 Combinaciones Disponibles

### Opción 1: **Factura Fiscal Térmica**
```
printFormat: "THERMAL"
printTemplate: "LEGAL"
```
**Resultado:** Ticket térmico 80mm con:
- ✅ CUIT del negocio
- ✅ Ingresos Brutos
- ✅ Datos del receptor (CUIT + Condición IVA)
- ✅ IVA discriminado
- ✅ CAE y vencimiento
- ✅ QR de AFIP

### Opción 2: **Ticket Simple Térmico**
```
printFormat: "THERMAL"
printTemplate: "SIMPLE"
```
**Resultado:** Ticket térmico 80mm sin datos fiscales:
- ✅ Nombre del negocio
- ✅ Datos básicos del cliente
- ✅ Items y totales
- ❌ Sin CUIT, CAE ni QR

### Opción 3: **Factura Fiscal PDF A4**
```
printFormat: "PDF"
printTemplate: "LEGAL"
```
**Resultado:** PDF A4 con diseño de AFIP:
- ✅ Recuadro con letra del comprobante
- ✅ CUIT emisor y receptor
- ✅ Tabla con IVA discriminado
- ✅ CAE y vencimiento
- ✅ QR de AFIP

### Opción 4: **Presupuesto PDF A4**
```
printFormat: "PDF"
printTemplate: "SIMPLE"
```
**Resultado:** PDF A4 estilo presupuesto:
- ✅ Diseño moderno y limpio
- ✅ Datos de contacto
- ✅ Items y totales
- ❌ Sin CUIT, CAE ni QR

---

## ⚙️ Configuración desde la Base de Datos

### Crear/Actualizar configuración

```sql
INSERT INTO voucher_configurations (
  tenant_id,
  voucher_type_id,
  print_format,
  print_template,
  sales_point_id,
  afip_connection_id
) VALUES (
  'tenant_xxx',
  'voucher_type_xxx',
  'THERMAL',           -- O 'PDF' o 'NONE'
  'LEGAL',             -- O 'SIMPLE'
  'sales_point_xxx',
  'afip_connection_xxx'
);
```

### Actualizar plantilla existente

```sql
UPDATE voucher_configurations
SET
  print_format = 'PDF',
  print_template = 'LEGAL'
WHERE
  tenant_id = 'tenant_xxx'
  AND voucher_type_id = 'voucher_type_xxx';
```

---

## 🔄 Lógica de Selección de Plantilla

Cuando se imprime un comprobante, el sistema sigue esta cascada:

### 1. **Template Explícito** (prioridad máxima)
Si el usuario especifica un template en la llamada a la API:
```typescript
// PDF
GET /api/:tenant/sales/:id/pdf?template=legal

// Térmico
POST /api/:tenant/sales/:id/print/thermal
Body: { template: "simple" }
```

### 2. **Configuración del Comprobante**
Si no se especifica, usa el `printTemplate` de la configuración:
```typescript
sale.voucherConfiguration.printTemplate // "LEGAL" o "SIMPLE"
```

### 3. **Default: LEGAL**
Si no hay configuración, usa `LEGAL` por defecto.

---

## 🎨 Mapeo Automático

El sistema mapea automáticamente las plantillas según el formato:

| printTemplate | PDF → Usa | Térmico → Usa |
|---------------|-----------|---------------|
| `LEGAL` | Factura Legal | Ticket Legal |
| `SIMPLE` | Presupuesto | Ticket Simple |

---

## 📱 Ejemplos de Uso desde el Frontend

### 1. Imprimir según configuración del comprobante

```typescript
// PDF (usa la configuración)
await salesApi.downloadPDF(saleId)

// Térmico (usa la configuración)
await salesApi.printThermal(saleId)
```

### 2. Forzar una plantilla específica

```typescript
// Forzar factura legal en PDF
await salesApi.downloadPDF(saleId, 'legal')

// Forzar presupuesto en PDF
await salesApi.downloadPDF(saleId, 'quote') // o 'simple'

// Forzar ticket legal
await salesApi.printThermal(saleId, 'legal')

// Forzar ticket simple
await salesApi.printThermal(saleId, 'simple')
```

---

## 🔐 QR de AFIP

El QR de AFIP se genera **automáticamente** en plantillas `LEGAL` cuando:
1. ✅ El comprobante tiene CAE
2. ✅ Hay CUIT del emisor
3. ✅ Hay CUIT/DNI del receptor

**Formato del QR:**
- JSON en base64
- URL: `https://www.afip.gob.ar/fe/qr/?p={base64}`
- Importe multiplicado por 100
- Tipo de documento detectado automáticamente (CUIT/DNI)

---

## 📊 Tabla de Referencia Rápida

| Caso de Uso | printFormat | printTemplate | Incluye QR | Datos Fiscales |
|-------------|-------------|---------------|-----------|----------------|
| Factura A/B fiscal | THERMAL o PDF | LEGAL | ✅ | ✅ |
| Factura C informal | THERMAL o PDF | SIMPLE | ❌ | ❌ |
| Presupuesto | PDF | SIMPLE | ❌ | ❌ |
| Remito | THERMAL | SIMPLE | ❌ | ❌ |
| Nota Crédito fiscal | PDF | LEGAL | ✅ | ✅ |

---

## 🎯 Recomendaciones

### Para Facturas A y B
```
printFormat: "PDF"
printTemplate: "LEGAL"
```
Porque requieren CAE y discriminar IVA.

### Para Facturas C
```
printFormat: "THERMAL"
printTemplate: "LEGAL"
```
Ticket con CAE pero sin discriminar IVA.

### Para Presupuestos
```
printFormat: "PDF"
printTemplate: "SIMPLE"
```
Diseño limpio sin datos fiscales.

### Para Tickets Informales
```
printFormat: "THERMAL"
printTemplate: "SIMPLE"
```
Ticket rápido sin CAE.

---

## 🚀 Migración de Configuraciones Existentes

Si ya tenés configuraciones con `printFormat` pero sin `printTemplate`, el sistema usa `LEGAL` por defecto.

Para actualizar masivamente:

```sql
-- Poner LEGAL en todos los comprobantes fiscales
UPDATE voucher_configurations
SET print_template = 'LEGAL'
WHERE print_format IN ('THERMAL', 'PDF')
  AND voucher_type_id IN (
    SELECT id FROM voucher_types WHERE requires_cae = true
  );

-- Poner SIMPLE en presupuestos
UPDATE voucher_configurations
SET print_template = 'SIMPLE'
WHERE voucher_type_id IN (
    SELECT id FROM voucher_types WHERE document_class = 'QUOTE'
  );
```

---

## 💡 Notas Importantes

1. **El campo `printFormat` define el MÉTODO** (PDF/Térmico/Nada)
2. **El campo `printTemplate` define el DISEÑO** (Legal/Simple)
3. **Ambos campos son independientes** - podés tener cualquier combinación
4. **El QR solo se incluye en plantillas LEGAL** con CAE
5. **La plantilla se puede sobrescribir** en cada impresión
