# Integración con AFIP - Facturación Electrónica

## Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Configuración Inicial](#configuración-inicial)
4. [URLs de AFIP](#urls-de-afip)
5. [Certificados Digitales](#certificados-digitales)
6. [Flujo de Facturación](#flujo-de-facturación)
7. [Troubleshooting](#troubleshooting)

---

## Introducción

Este sistema implementa la integración completa con AFIP para facturación electrónica mediante los web services:
- **WSAA** (Web Services Authentication and Authorization): Autenticación
- **WSFE v1** (Web Services Facturación Electrónica): Emisión de comprobantes

### Características Principales
- ✅ Autenticación con certificados digitales
- ✅ Emisión de facturas A, B, C
- ✅ Notas de crédito y débito
- ✅ Gestión de puntos de venta
- ✅ Sincronización automática de numeración
- ✅ Soporte multitenant
- ✅ Ticket de Acceso (TA) persistente con reutilización
- ✅ Timeout configurable por conexión

---

## Arquitectura

### Componentes del Sistema

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (Node + TS)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ WSAA │  │ WSFE │
└──┬───┘  └───┬──┘
   │          │
   └────┬─────┘
        ▼
    ┌──────┐
    │ AFIP │
    └──────┘
```

### Servicios Backend

#### 1. AfipWSAAService
**Ubicación**: `/backend/src/services/afip-wsaa.service.ts`

**Responsabilidades**:
- Generar TRA (Ticket de Requerimiento de Acceso)
- Firmar TRA con certificado digital (PKCS#7)
- Solicitar TA (Ticket de Acceso) a AFIP
- Gestionar cache de TA en base de datos
- Manejo de timeouts configurables

**Proceso de Autenticación**:
```
1. Generar TRA (XML con metadata de solicitud)
2. Firmar TRA con certificado + clave privada → CMS
3. Enviar CMS a WSAA
4. WSAA valida y devuelve TA (token + sign + expiración)
5. Guardar TA en base de datos
6. Reutilizar TA mientras esté vigente
```

#### 2. AfipWSFEService
**Ubicación**: `/backend/src/services/afip-wsfe.service.ts`

**Responsabilidades**:
- Solicitar CAE (Código de Autorización Electrónico)
- Consultar último número autorizado
- Consultar comprobante emitido
- Validar datos antes de enviar a AFIP

#### 3. AfipService
**Ubicación**: `/backend/src/services/afip.service.ts`

**Responsabilidades**:
- Orquestar WSAA y WSFE
- Probar conectividad completa
- Gestionar estados de prueba

#### 4. VoucherService
**Ubicación**: `/backend/src/services/voucher.service.ts`

**Responsabilidades**:
- Determinar tipo de comprobante según cliente
- Resolver configuración de numeración
- Validar combinaciones cliente-comprobante

---

## Configuración Inicial

### 1. Crear Conexión AFIP

**Ruta**: Settings → Conexiones AFIP → Nueva Conexión

**Campos requeridos**:
- **Nombre**: Identificador de la conexión (ej: "AFIP Homologación")
- **CUIT**: CUIT de la empresa
- **Ambiente**: Testing (homologación) o Production
- **Certificado**: Certificado digital en formato PEM
- **Clave Privada**: Clave privada del certificado en formato PEM
- **Timeout** (opcional): Tiempo máximo de espera en milisegundos (default: 30000)

**URLs** (se configuran automáticamente según ambiente):
- WSAA URL: Se configura automáticamente
- WSFE URL: Se configura automáticamente

### 2. Crear Punto de Venta

**Ruta**: Settings → Puntos de Venta → Nuevo Punto de Venta

**Campos requeridos**:
- **Número**: Número de punto de venta AFIP (ej: 1, 2, 3...)
- **Nombre**: Descripción del punto de venta
- **Conexión AFIP**: Conexión creada en el paso anterior
- **Sucursal** (opcional): Asociar a una sucursal específica

### 3. Configurar Comprobantes

**Ruta**: Settings → Configuración de Comprobantes → Nueva Configuración

**Campos requeridos**:
- **Tipo de Comprobante**: Factura A, B, C, Nota de Crédito, etc.
- **Sucursal**: Sucursal que emitirá este tipo de comprobante
- **Conexión AFIP**: Conexión AFIP a utilizar
- **Punto de Venta**: Punto de venta AFIP
- **Próximo Número**: Número inicial de numeración (default: 1)

**Funcionalidades**:
- **Consultar en AFIP**: Botón para verificar último número autorizado
- **Sincronización Automática**: Si el número local es menor al de AFIP, se actualiza automáticamente

---

## URLs de AFIP

### Ambiente de Homologación (Testing)

| Servicio | URL |
|----------|-----|
| WSAA | `https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL` |
| WSFE v1 | `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL` |

### Ambiente de Producción

| Servicio | URL |
|----------|-----|
| WSAA | `https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL` |
| WSFE v1 | `https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL` |

**Nota**: Estas URLs se configuran automáticamente según el ambiente seleccionado. No es necesario ingresarlas manualmente.

### Configuración en el Código

Las URLs se definen en `/backend/src/services/afip.service.ts`:

```typescript
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
```

Las URLs también se pueden personalizar en la configuración de cada conexión AFIP si es necesario usar endpoints específicos.

---

## Certificados Digitales

### Obtención del Certificado

1. **Ingresar a AFIP**
   - URL: https://www.afip.gob.ar
   - Ingresar con CUIT y Clave Fiscal

2. **Administrar Certificados Digitales**
   - Sistema → Administración de Certificados Digitales
   - Nuevo Certificado

3. **Generar CSR**
   - Tipo: Certificado para Web Services
   - Generar archivo .csr

4. **Subir CSR a AFIP**
   - AFIP genera y firma el certificado
   - Descargar certificado (.crt)

5. **Convertir a PEM**
   ```bash
   # Certificado
   openssl x509 -inform DER -in certificado.crt -out certificado.pem

   # Clave privada (si está en otro formato)
   openssl rsa -in privada.key -out privada.pem
   ```

### Formato del Certificado PEM

El certificado debe tener este formato:

```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKJ3nZ8Z...
(líneas de certificado en Base64)
...nZ8Z3nZ8Z3nZ8Z3nZ8Z3nZ8Z
-----END CERTIFICATE-----
```

### Formato de la Clave Privada PEM

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEF...
(líneas de clave privada en Base64)
...w0BAQEFAAOCAg8AMIICCgKCA
-----END PRIVATE KEY-----
```

### Validación del Certificado

El sistema valida:
- ✅ Formato PEM correcto
- ✅ Correspondencia entre certificado y clave privada
- ✅ Vigencia del certificado
- ✅ CUIT en el certificado coincide con el configurado

---

## Flujo de Facturación

### 1. Creación de Venta

**Endpoint**: `POST /api/:tenantSlug/sales`

```json
{
  "customerId": "...",
  "branchId": "...",
  "warehouseId": "...",
  "shouldInvoice": true,
  "documentClass": "invoice",
  "items": [...],
  "payments": [...]
}
```

### 2. Determinación de Comprobante

El sistema automáticamente:
1. Consulta condición IVA del cliente
2. Consulta condición IVA de la empresa (tenant)
3. Determina tipo de comprobante (A, B, C)
4. Busca configuración de comprobante activa

**Reglas de Determinación**:

| Cliente | Empresa | Comprobante |
|---------|---------|-------------|
| Responsable Inscripto | Responsable Inscripto | Factura A |
| Monotributista | Responsable Inscripto | Factura B |
| Consumidor Final | Responsable Inscripto | Factura B |
| Responsable Inscripto | Monotributista | Factura C |
| Consumidor Final | Monotributista | Factura C |

### 3. Obtención de TA

1. **Verificar TA en Base de Datos**
   - Si existe y no está vencido (con margen de 5 min) → usar
   - Si no existe o está vencido → solicitar nuevo

2. **Solicitar Nuevo TA**
   - Generar TRA con timestamp actual
   - Firmar con certificado
   - Enviar a WSAA
   - Guardar en base de datos

### 4. Solicitud de CAE

**Endpoint WSFE**: `FECAESolicitar`

```xml
<soap:Envelope>
  <soap:Body>
    <FECAESolicitar>
      <Auth>
        <Token>...</Token>
        <Sign>...</Sign>
        <Cuit>...</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>1</PtoVta>
          <CbteTipo>1</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>1</Concepto>
            <DocTipo>99</DocTipo>
            <DocNro>0</DocNro>
            <CbteDesde>1</CbteDesde>
            <CbteHasta>1</CbteHasta>
            <CbteFch>20251125</CbteFch>
            <ImpTotal>1000.00</ImpTotal>
            <ImpTotConc>0.00</ImpTotConc>
            <ImpNeto>826.45</ImpNeto>
            <ImpOpEx>0.00</ImpOpEx>
            <ImpIVA>173.55</ImpIVA>
            <ImpTrib>0.00</ImpTrib>
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            <Iva>
              <AlicIva>
                <Id>5</Id>
                <BaseImp>826.45</BaseImp>
                <Importe>173.55</Importe>
              </AlicIva>
            </Iva>
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </FECAESolicitar>
  </soap:Body>
</soap:Envelope>
```

### 5. Respuesta de AFIP

**Exitosa**:
```json
{
  "CAE": "71234567890123",
  "CAEFchVto": "20251205",
  "Resultado": "A",
  "CbteFch": "20251125",
  "Observaciones": []
}
```

**Con Error**:
```json
{
  "Resultado": "R",
  "Errors": {
    "Err": {
      "Code": 10016,
      "Msg": "Número de comprobante ya utilizado"
    }
  }
}
```

### 6. Actualización de Venta

Si el CAE es exitoso:
```typescript
await tenantDb.sale.update({
  where: { id: saleId },
  data: {
    cae: caeData.cae,
    caeExpirationDate: caeData.caeExpiration,
    invoiceDate: caeData.invoiceDate
  }
})
```

### 7. Incrementar Numeración

```typescript
await globalPrisma.voucherConfiguration.update({
  where: { id: configId },
  data: {
    nextVoucherNumber: { increment: 1 }
  }
})
```

---

## Troubleshooting

### Error: Certificado Expirado

**Síntoma**: `ns1:cms.cert.expired: Certificado expirado`

**Solución**:
1. Generar nuevo certificado en AFIP
2. Actualizar certificado en la conexión AFIP
3. Probar conexión nuevamente

### Error: generationTime Inválido

**Síntoma**: `ns1:xml.generationTime.invalid: generationTime posee formato o dato inválido`

**Solución**:
1. Verificar que la hora del servidor esté sincronizada
2. El servidor debe estar en zona horaria de Argentina (UTC-3)
3. Ejecutar: `timedatectl set-timezone America/Argentina/Buenos_Aires`

### Error: Timeout

**Síntoma**: `timeout of 30000ms exceeded`

**Solución**:
1. Aumentar timeout en la configuración de conexión AFIP
2. Recomendado: 60000ms (1 minuto) para homologación
3. Verificar conectividad a internet
4. Verificar firewall no bloquee conexiones a afip.gov.ar

### Error: CUIT No Autorizado

**Síntoma**: `ns1:coe.cuit.invalid: CUIT inválido o no autorizado`

**Solución**:
1. Verificar CUIT en AFIP → Administrador de Relaciones
2. Habilitar Web Services en el sistema AFIP
3. Verificar certificado corresponde al CUIT correcto

### Error: Ya Existe TA Válido

**Síntoma**: `ns1:coe.alreadyAuthenticated: El CEE ya posee un TA valido`

**Solución**:
- Este error se maneja automáticamente
- El sistema guarda el TA en base de datos y lo reutiliza
- Si persiste, esperar 5-10 minutos antes de reintentar

### Error: Número de Comprobante Duplicado

**Síntoma**: `Error 10016: Número de comprobante ya utilizado`

**Solución**:
1. Ir a Configuración de Comprobantes
2. Hacer clic en botón "Consultar AFIP" (icono ↻)
3. El sistema sincronizará automáticamente el número si es menor
4. Si el número local es mayor, verificar que no haya CAEs pendientes

### Logs de Debug

Verificar logs en:
```bash
# Backend logs
tail -f /var/log/axioma-backend.log

# Búsqueda de errores AFIP
grep "WSAA\|WSFE" /var/log/axioma-backend.log
```

Los logs incluyen:
- `[WSAA]` - Operaciones de autenticación
- `[WSFE]` - Operaciones de facturación
- Timestamps y detalles de cada request/response

---

## Base de Datos

### Tablas Principales

#### afip_connections
```sql
CREATE TABLE afip_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cuit TEXT NOT NULL,
  environment TEXT DEFAULT 'testing',
  certificate TEXT,
  private_key TEXT,
  wsaa_url TEXT,
  wsfe_url TEXT,
  timeout INTEGER DEFAULT 30000,
  -- Ticket de Acceso
  ta_token TEXT,
  ta_sign TEXT,
  ta_expires_at TIMESTAMP(3),
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  last_test TIMESTAMP(3),
  last_test_status TEXT,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3)
);
```

#### sales_points
```sql
CREATE TABLE sales_points (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  afip_connection_id TEXT,
  branch_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3)
);
```

#### voucher_configurations
```sql
CREATE TABLE voucher_configurations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  voucher_type_id TEXT NOT NULL,
  branch_id TEXT,
  afip_connection_id TEXT,
  sales_point_id TEXT,
  next_voucher_number INTEGER DEFAULT 1,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3)
);
```

---

## Códigos AFIP

### Tipos de Comprobante (CbteTipo)

| Código | Descripción |
|--------|-------------|
| 1 | Factura A |
| 2 | Nota de Débito A |
| 3 | Nota de Crédito A |
| 6 | Factura B |
| 7 | Nota de Débito B |
| 8 | Nota de Crédito B |
| 11 | Factura C |
| 12 | Nota de Débito C |
| 13 | Nota de Crédito C |

### Tipos de Documento (DocTipo)

| Código | Descripción |
|--------|-------------|
| 80 | CUIT |
| 86 | CUIL |
| 87 | CDI |
| 96 | DNI |
| 99 | Consumidor Final |

### Tipos de IVA (Id)

| Código | Alícuota |
|--------|----------|
| 3 | 0% |
| 4 | 10.5% |
| 5 | 21% |
| 6 | 27% |
| 8 | 5% |
| 9 | 2.5% |

### Monedas (MonId)

| Código | Descripción |
|--------|-------------|
| PES | Pesos Argentinos |
| DOL | Dólares Estadounidenses |
| EUR | Euros |

---

## Testing

### Probar Conexión AFIP

1. Ir a Settings → Conexiones AFIP
2. Seleccionar conexión
3. Hacer clic en "Probar Conexión"
4. Verificar los 3 pasos:
   - ✅ Validación de certificado
   - ✅ Autenticación WSAA (obtener TA)
   - ✅ Conectividad WSFE (FEDummy)

### Datos de Prueba para Homologación

**CUIT de prueba**: 20123456789 (usar el CUIT de tu empresa de prueba)

**Certificado**: Generar en https://www.afip.gob.ar (ambiente homologación)

**Cliente de prueba**:
- Tipo de Documento: 99 (Consumidor Final)
- Número: 0

**Monto de prueba**: $100.00

---

## Referencias

- [AFIP - Web Services](https://www.afip.gob.ar/ws/)
- [Manual WSFE v1](http://www.afip.gob.ar/fe/documentos/manual_desarrollador_COMPG_v2_10.pdf)
- [Especificación WSAA](http://www.afip.gob.ar/ws/WSAA/Especificacion_Tecnica_WSAA_1.2.pdf)
- [Tipos de Comprobantes](http://www.afip.gob.ar/fe/documentos/TABLA_TIPOS_COMPROBANTE.xls)

---

## Changelog

### v1.0.0 (2025-11-25)
- ✅ Implementación completa de WSAA y WSFE
- ✅ Gestión de certificados digitales
- ✅ Puntos de venta AFIP
- ✅ Configuración de comprobantes
- ✅ Determinación automática de tipo de comprobante
- ✅ Ticket de Acceso persistente con reutilización
- ✅ Timeout configurable por conexión
- ✅ Sincronización de numeración con AFIP
