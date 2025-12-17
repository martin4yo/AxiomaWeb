# Plan de Implementación: Percepciones, Retenciones y Factura de Crédito

## Contexto - Impuestos en Argentina

En Argentina, además del IVA, existen otros conceptos impositivos que afectan las transacciones comerciales:

### 1. **Percepciones** (se cobran al cliente)
- **Percepción de Ingresos Brutos**: Impuesto provincial que se cobra al cliente y se deposita a la provincia
- **Percepción de IVA**: Se cobra a clientes que no son contribuyentes habitualmente inscriptos
- **Otras percepciones**: SUSS, fondos especiales, etc.

### 2. **Retenciones** (te descuentan del pago)
- **Retención de Ingresos Brutos**: Cuando tu proveedor te paga, te retiene un porcentaje
- **Retención de IVA**: Agentes de retención descuentan un porcentaje del IVA
- **Retención de Ganancias**: Retención del impuesto a las ganancias

### 3. **Factura de Crédito Electrónica (FCE)**
- Comprobante especial para PyMEs que permite acceder a mejores condiciones de financiamiento
- Permite al proveedor cobrar la factura anticipadamente con descuento
- Requiere aceptación del comprador
- Tiene flujo especial en AFIP

---

## Problema a Resolver

### Ejemplo de Factura con Percepciones:

```
Factura A N° 0001-00000123
Cliente: Constructora XYZ S.A.
CUIT: 30-12345678-9

Items:
  Cemento x 100 bolsas    $500 c/u     $50,000.00
  Hierro 8mm x 50 barras  $300 c/u     $15,000.00
                                       ----------
Subtotal                               $65,000.00
IVA 21%                                $13,650.00
                                       ----------
Subtotal con IVA                       $78,650.00

Percepciones:
  Percepción IIBB CABA 3%               $1,950.00
  Percepción IVA RG 3337 3%             $2,359.50
                                       ----------
TOTAL A PAGAR                          $82,959.50
```

### Ejemplo de Orden de Pago con Retenciones:

```
Orden de Pago N° OP-00001
Proveedor: Ferretería ABC S.R.L.
CUIT: 30-98765432-1

Facturas a Pagar:
  FC A 0001-00000456                   $50,000.00
  FC A 0001-00000457                   $30,000.00
                                       ----------
Total Facturas                         $80,000.00

Retenciones:
  Retención IIBB CABA 3%                -$2,400.00
  Retención Ganancias 2%                -$1,600.00
                                       ----------
TOTAL A PAGAR                          $76,000.00

Formas de Pago:
  Transferencia Bancaria                $76,000.00
```

---

## Arquitectura Propuesta

### 1. Tabla de Conceptos de Percepción/Retención

```prisma
model TaxConcept {
  id                String          @id @default(cuid())
  tenantId          String
  tenant            Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Identificación
  code              String          // Ej: "IIBB_CABA", "IVA_3337", "GANANCIAS"
  name              String          // Ej: "Percepción IIBB CABA"
  description       String?         @db.Text

  // Tipo
  conceptType       TaxConceptType  // PERCEPTION (percepción) o RETENTION (retención)

  // Ámbito
  jurisdiction      String?         // Jurisdicción (CABA, Buenos Aires, etc.)
  taxType           String          // IVA, IIBB, GANANCIAS, SUSS, etc.

  // Cálculo
  calculationMethod CalculationMethod // PERCENTAGE, FIXED_AMOUNT, SCALE
  percentage        Decimal?        @db.Decimal(5, 2) // Ej: 3.00 para 3%
  fixedAmount       Decimal?        @db.Decimal(15, 2)
  minimumAmount     Decimal?        @db.Decimal(15, 2) // Monto mínimo para aplicar
  minimumTaxable    Decimal?        @db.Decimal(15, 2) // Base mínima imponible

  // Base de cálculo
  appliesTo         String          // SUBTOTAL, TOTAL, IVA, NETO, etc.

  // Configuración
  isActive          Boolean         @default(true)
  requiresCertificate Boolean       @default(false) // Si requiere certificado de exención
  afipCode          String?         // Código en AFIP si aplica

  // Aplicación automática
  autoApply         Boolean         @default(false)
  applyWhen         Json?           // Condiciones: { customerProvince: "CABA", vatCondition: "RI" }

  // Metadata
  legalReference    String?         @db.Text // Ej: "RG AGIP 123/2024"
  validFrom         DateTime?
  validUntil        DateTime?

  // Relaciones
  perceptions       SalePerception[]
  retentions        PaymentRetention[]

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId, conceptType, isActive])
  @@map("tax_concepts")
}

enum TaxConceptType {
  PERCEPTION   // Percepción (se cobra al cliente en la factura)
  RETENTION    // Retención (te descuentan en el pago)
}

enum CalculationMethod {
  PERCENTAGE      // Porcentaje sobre base
  FIXED_AMOUNT    // Monto fijo
  SCALE          // Escala progresiva (por rangos)
}
```

### 2. Percepciones en Facturas

```prisma
model Sale {
  id                String   @id @default(cuid())
  // ... campos existentes ...

  // Subtotales
  subtotal          Decimal  @db.Decimal(15, 2)
  discountAmount    Decimal  @db.Decimal(15, 2)
  taxAmount         Decimal  @db.Decimal(15, 2) // IVA

  // NUEVO: Percepciones
  perceptionAmount  Decimal  @default(0) @db.Decimal(15, 2) // Total de percepciones
  perceptions       SalePerception[]

  // Total
  totalAmount       Decimal  @db.Decimal(15, 2) // subtotal + tax + perceptions - discounts
}

model SalePerception {
  id                String      @id @default(cuid())
  saleId            String
  sale              Sale        @relation(fields: [saleId], references: [id], onDelete: Cascade)

  // Concepto
  taxConceptId      String
  taxConcept        TaxConcept  @relation(fields: [taxConceptId], references: [id])

  // Cálculo
  taxableBase       Decimal     @db.Decimal(15, 2) // Base sobre la que se calcula
  percentage        Decimal     @db.Decimal(5, 2)  // Porcentaje aplicado
  amount            Decimal     @db.Decimal(15, 2) // Monto calculado

  // Certificados de exención
  exemptionCertificate String?  // Número de certificado si está exento
  isExempt          Boolean     @default(false)

  // Metadata
  description       String?
  afipCode          String?     // Código AFIP del concepto
  jurisdiction      String?     // CABA, Buenos Aires, etc.

  @@index([saleId])
  @@map("sale_perceptions")
}
```

### 3. Retenciones en Órdenes de Pago

```prisma
model Payment {
  id                String            @id @default(cuid())
  tenantId          String
  tenant            Tenant            @relation(fields: [tenantId], references: [id])

  paymentNumber     String            // OP-00001
  paymentDate       DateTime          @default(now())
  paymentType       PaymentType       // SUPPLIER (a proveedor), EMPLOYEE (sueldo), TAX (impuesto), OTHER

  // Beneficiario (proveedor/empleado)
  entityId          String?
  entity            Entity?           @relation(fields: [entityId], references: [id])
  entityName        String            // Denormalizado

  // Documentos que se están pagando (facturas de compra)
  documents         PaymentDocument[] // Facturas/comprobantes que se pagan

  // Importes
  documentsTotal    Decimal           @db.Decimal(15, 2) // Total de documentos
  retentionAmount   Decimal           @default(0) @db.Decimal(15, 2) // Total de retenciones
  retentions        PaymentRetention[] // Detalle de retenciones

  netAmount         Decimal           @db.Decimal(15, 2) // Neto a pagar (documents - retentions)

  // Formas de pago efectivas
  paymentMethods    PaymentMethodDetail[]

  // Estado
  status            PaymentStatus     @default(PENDING)

  // Notas
  notes             String?           @db.Text

  // Auditoría
  createdBy         String
  creator           User              @relation(fields: [createdBy], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@unique([tenantId, paymentNumber])
  @@index([tenantId, paymentDate])
  @@index([entityId])
  @@map("payments")
}

enum PaymentType {
  SUPPLIER    // Pago a proveedor
  EMPLOYEE    // Pago de sueldo
  TAX         // Pago de impuesto
  OTHER       // Otros pagos
}

enum PaymentStatus {
  PENDING     // Pendiente
  APPROVED    // Aprobado
  PAID        // Pagado
  CANCELLED   // Cancelado
}

model PaymentDocument {
  id                String   @id @default(cuid())
  paymentId         String
  payment           Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  // Documento que se paga (factura de compra)
  purchaseId        String?
  purchase          Purchase? @relation(fields: [purchaseId], references: [id])

  // Datos del documento
  documentType      String   // INVOICE, DEBIT_NOTE, CREDIT_NOTE
  documentNumber    String
  documentDate      DateTime
  documentAmount    Decimal  @db.Decimal(15, 2)

  // Aplicación
  appliedAmount     Decimal  @db.Decimal(15, 2) // Cuánto se paga de este documento

  @@index([paymentId])
  @@map("payment_documents")
}

model PaymentRetention {
  id                String      @id @default(cuid())
  paymentId         String
  payment           Payment     @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  // Concepto
  taxConceptId      String
  taxConcept        TaxConcept  @relation(fields: [taxConceptId], references: [id])

  // Cálculo
  taxableBase       Decimal     @db.Decimal(15, 2) // Base sobre la que se calcula
  percentage        Decimal     @db.Decimal(5, 2)  // Porcentaje aplicado
  amount            Decimal     @db.Decimal(15, 2) // Monto retenido

  // Certificado
  certificateNumber String?     // Número del certificado de retención emitido
  certificateDate   DateTime?   // Fecha del certificado

  // Metadata
  description       String?
  afipCode          String?     // Código AFIP del concepto
  jurisdiction      String?     // CABA, Buenos Aires, etc.

  @@index([paymentId])
  @@map("payment_retentions")
}

model PaymentMethodDetail {
  id                String        @id @default(cuid())
  paymentId         String
  payment           Payment       @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  // Método de pago
  paymentMethodId   String
  paymentMethod     PaymentMethod @relation(fields: [paymentMethodId], references: [id])

  // Detalles
  amount            Decimal       @db.Decimal(15, 2)
  reference         String?       // Número de cheque, transferencia, etc.
  referenceDate     DateTime?     // Fecha del cheque diferido

  // Cuenta bancaria si aplica
  bankAccountId     String?
  bankAccount       BankAccount?  @relation(fields: [bankAccountId], references: [id])

  @@index([paymentId])
  @@map("payment_method_details")
}
```

### 4. Factura de Crédito Electrónica (FCE)

```prisma
model Sale {
  // ... campos existentes ...

  // NUEVO: FCE
  isFCE             Boolean       @default(false) // Si es Factura de Crédito Electrónica
  fceData           FCEData?      // Datos específicos de FCE
}

model FCEData {
  id                String        @id @default(cuid())
  saleId            String        @unique
  sale              Sale          @relation(fields: [saleId], references: [id], onDelete: Cascade)

  // Datos del comprador (quien debe aceptar)
  buyerCUIT         String
  buyerName         String
  buyerAccepted     Boolean       @default(false)
  buyerAcceptedAt   DateTime?

  // Plazos de pago
  paymentDueDays    Int           // Días hasta vencimiento
  paymentDueDate    DateTime      // Fecha de vencimiento calculada

  // Estado del título de crédito
  status            FCEStatus     @default(PENDING_ACCEPTANCE)

  // Cesión (si se negocia anticipadamente)
  cessionDate       DateTime?     // Fecha de cesión
  cessionEntity     String?       // A quién se cedió (banco, financiera)
  cessionAmount     Decimal?      @db.Decimal(15, 2) // Monto cobrado (con descuento)
  cessionDiscount   Decimal?      @db.Decimal(5, 2)  // % de descuento aplicado

  // AFIP
  afipStatus        String?       // Estado en AFIP
  afipResponse      Json?         // Respuesta completa de AFIP

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@map("fce_data")
}

enum FCEStatus {
  PENDING_ACCEPTANCE  // Pendiente de aceptación del comprador
  ACCEPTED           // Aceptada por el comprador
  REJECTED           // Rechazada por el comprador
  ASSIGNED           // Cedida a tercero (banco/financiera)
  PAID              // Pagada
  CANCELLED         // Anulada
}
```

---

## Servicio de Percepciones

**Archivo:** `backend/src/services/perceptionService.ts`

```typescript
import { PrismaClient, TaxConceptType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export class PerceptionService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string
  ) {}

  /**
   * Calcular percepciones aplicables a una venta
   */
  async calculatePerceptions(saleData: {
    customerId: string
    subtotal: Decimal
    taxAmount: Decimal // IVA
    totalAmount: Decimal
    items: any[]
  }) {
    const perceptions = []

    // Obtener cliente para validar condiciones
    const customer = await this.prisma.entity.findUnique({
      where: { id: saleData.customerId },
      include: {
        entityVatCondition: true
      }
    })

    if (!customer) {
      return []
    }

    // Obtener conceptos de percepción activos
    const concepts = await this.prisma.taxConcept.findMany({
      where: {
        tenantId: this.tenantId,
        conceptType: 'PERCEPTION',
        isActive: true
      }
    })

    for (const concept of concepts) {
      // Validar si aplica según condiciones
      if (concept.autoApply) {
        const applies = this.evaluateConditions(
          concept.applyWhen as any,
          customer,
          saleData
        )

        if (!applies) continue
      }

      // Validar mínimo
      if (concept.minimumTaxable && saleData.subtotal.lt(concept.minimumTaxable)) {
        continue
      }

      // Calcular base imponible
      const taxableBase = this.calculateTaxableBase(concept.appliesTo, saleData)

      // Calcular monto de percepción
      let amount = new Decimal(0)

      if (concept.calculationMethod === 'PERCENTAGE') {
        amount = taxableBase.mul(concept.percentage!).div(100)
      } else if (concept.calculationMethod === 'FIXED_AMOUNT') {
        amount = concept.fixedAmount!
      }

      // Validar mínimo de percepción
      if (concept.minimumAmount && amount.lt(concept.minimumAmount)) {
        continue
      }

      perceptions.push({
        taxConceptId: concept.id,
        taxableBase,
        percentage: concept.percentage || new Decimal(0),
        amount,
        description: concept.name,
        afipCode: concept.afipCode,
        jurisdiction: concept.jurisdiction,
        isExempt: false
      })
    }

    return perceptions
  }

  /**
   * Evaluar condiciones de aplicación
   */
  private evaluateConditions(
    conditions: any,
    customer: any,
    saleData: any
  ): boolean {
    if (!conditions) return true

    // Evaluar provincia del cliente
    if (conditions.customerProvince) {
      if (customer.state !== conditions.customerProvince) {
        return false
      }
    }

    // Evaluar condición de IVA
    if (conditions.vatCondition) {
      if (customer.entityVatCondition?.code !== conditions.vatCondition) {
        return false
      }
    }

    // Evaluar monto mínimo
    if (conditions.minimumAmount) {
      if (saleData.subtotal.lt(new Decimal(conditions.minimumAmount))) {
        return false
      }
    }

    return true
  }

  /**
   * Calcular base imponible según tipo
   */
  private calculateTaxableBase(appliesTo: string, saleData: any): Decimal {
    switch (appliesTo) {
      case 'SUBTOTAL':
        return saleData.subtotal

      case 'TOTAL':
        return saleData.totalAmount

      case 'IVA':
        return saleData.taxAmount

      case 'NETO':
        return saleData.subtotal.sub(saleData.taxAmount)

      default:
        return saleData.subtotal
    }
  }

  /**
   * Aplicar exención por certificado
   */
  async applyExemption(
    saleId: string,
    taxConceptId: string,
    certificateNumber: string
  ) {
    await this.prisma.salePerception.updateMany({
      where: {
        saleId,
        taxConceptId
      },
      data: {
        isExempt: true,
        exemptionCertificate: certificateNumber,
        amount: new Decimal(0)
      }
    })

    // Recalcular total de la venta
    await this.recalculateSaleTotal(saleId)
  }

  /**
   * Recalcular total de venta
   */
  private async recalculateSaleTotal(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { perceptions: true }
    })

    if (!sale) return

    const perceptionAmount = sale.perceptions
      .filter(p => !p.isExempt)
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))

    const totalAmount = sale.subtotal
      .add(sale.taxAmount)
      .add(perceptionAmount)
      .sub(sale.discountAmount)

    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        perceptionAmount,
        totalAmount
      }
    })
  }
}
```

---

## Servicio de Retenciones

**Archivo:** `backend/src/services/retentionService.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export class RetentionService {
  constructor(
    private prisma: PrismaClient,
    private tenantId: string
  ) {}

  /**
   * Calcular retenciones aplicables a un pago
   */
  async calculateRetentions(paymentData: {
    entityId: string
    documentsTotal: Decimal
    documents: Array<{
      documentType: string
      documentAmount: Decimal
    }>
  }) {
    const retentions = []

    // Obtener proveedor
    const entity = await this.prisma.entity.findUnique({
      where: { id: paymentData.entityId },
      include: {
        entityVatCondition: true
      }
    })

    if (!entity) {
      return []
    }

    // Obtener conceptos de retención activos
    const concepts = await this.prisma.taxConcept.findMany({
      where: {
        tenantId: this.tenantId,
        conceptType: 'RETENTION',
        isActive: true
      }
    })

    for (const concept of concepts) {
      // Validar mínimo
      if (concept.minimumTaxable && paymentData.documentsTotal.lt(concept.minimumTaxable)) {
        continue
      }

      // Calcular base imponible (total de documentos)
      const taxableBase = paymentData.documentsTotal

      // Calcular monto de retención
      let amount = new Decimal(0)

      if (concept.calculationMethod === 'PERCENTAGE') {
        amount = taxableBase.mul(concept.percentage!).div(100)
      } else if (concept.calculationMethod === 'FIXED_AMOUNT') {
        amount = concept.fixedAmount!
      }

      // Validar mínimo de retención
      if (concept.minimumAmount && amount.lt(concept.minimumAmount)) {
        continue
      }

      retentions.push({
        taxConceptId: concept.id,
        taxableBase,
        percentage: concept.percentage || new Decimal(0),
        amount,
        description: concept.name,
        afipCode: concept.afipCode,
        jurisdiction: concept.jurisdiction
      })
    }

    return retentions
  }

  /**
   * Generar certificado de retención
   */
  async generateCertificate(retentionId: string) {
    const retention = await this.prisma.paymentRetention.findUnique({
      where: { id: retentionId },
      include: {
        payment: {
          include: {
            entity: true,
            documents: true
          }
        },
        taxConcept: true
      }
    })

    if (!retention) {
      throw new Error('Retención no encontrada')
    }

    // Generar número de certificado
    const certificateNumber = await this.generateCertificateNumber(
      retention.taxConcept.jurisdiction || 'NACIONAL'
    )

    // Actualizar retención
    await this.prisma.paymentRetention.update({
      where: { id: retentionId },
      data: {
        certificateNumber,
        certificateDate: new Date()
      }
    })

    return {
      certificateNumber,
      retention,
      payment: retention.payment
    }
  }

  /**
   * Generar número de certificado
   */
  private async generateCertificateNumber(jurisdiction: string): Promise<string> {
    const lastCertificate = await this.prisma.paymentRetention.findFirst({
      where: {
        payment: {
          tenantId: this.tenantId
        },
        jurisdiction,
        certificateNumber: {
          not: null
        }
      },
      orderBy: {
        certificateDate: 'desc'
      }
    })

    if (!lastCertificate?.certificateNumber) {
      return `${jurisdiction}-00000001`
    }

    const lastNumber = parseInt(lastCertificate.certificateNumber.split('-')[1])
    return `${jurisdiction}-${(lastNumber + 1).toString().padStart(8, '0')}`
  }
}
```

---

## Configuración Inicial de Conceptos

**Seed para Argentina:**

```typescript
const defaultTaxConcepts = [
  // Percepciones
  {
    code: 'PERC_IIBB_CABA',
    name: 'Percepción IIBB CABA',
    conceptType: 'PERCEPTION',
    jurisdiction: 'CABA',
    taxType: 'IIBB',
    calculationMethod: 'PERCENTAGE',
    percentage: 3.00,
    appliesTo: 'SUBTOTAL',
    minimumTaxable: 1000,
    legalReference: 'Resolución 123/2024 AGIP',
    autoApply: true,
    applyWhen: {
      customerProvince: 'CABA'
    }
  },
  {
    code: 'PERC_IVA_RG3337',
    name: 'Percepción IVA RG 3337',
    conceptType: 'PERCEPTION',
    jurisdiction: 'NACIONAL',
    taxType: 'IVA',
    calculationMethod: 'PERCENTAGE',
    percentage: 3.00,
    appliesTo: 'TOTAL',
    minimumTaxable: 5000,
    legalReference: 'RG AFIP 3337',
    autoApply: false
  },

  // Retenciones
  {
    code: 'RET_IIBB_CABA',
    name: 'Retención IIBB CABA',
    conceptType: 'RETENTION',
    jurisdiction: 'CABA',
    taxType: 'IIBB',
    calculationMethod: 'PERCENTAGE',
    percentage: 3.00,
    appliesTo: 'TOTAL',
    minimumTaxable: 2400,
    legalReference: 'Resolución AGIP',
    autoApply: true
  },
  {
    code: 'RET_GANANCIAS',
    name: 'Retención Ganancias',
    conceptType: 'RETENTION',
    jurisdiction: 'NACIONAL',
    taxType: 'GANANCIAS',
    calculationMethod: 'PERCENTAGE',
    percentage: 2.00,
    appliesTo: 'TOTAL',
    minimumTaxable: 1000,
    legalReference: 'RG AFIP 830',
    autoApply: true
  },
  {
    code: 'RET_IVA',
    name: 'Retención IVA',
    conceptType: 'RETENTION',
    jurisdiction: 'NACIONAL',
    taxType: 'IVA',
    calculationMethod: 'PERCENTAGE',
    percentage: 10.00,
    appliesTo: 'IVA',
    minimumTaxable: 1000,
    legalReference: 'RG AFIP 2854',
    autoApply: false // Solo para agentes de retención
  }
]
```

---

## UI/UX - Experiencia de Usuario

### 1. En Formulario de Nueva Factura

```
┌─────────────────────────────────────────────────────────────┐
│ Nueva Factura                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Items:                                                      │
│ • Cemento x 100 bolsas         $50,000.00                  │
│ • Hierro 8mm x 50 barras       $15,000.00                  │
│                                ─────────────                │
│ Subtotal:                      $65,000.00                  │
│ IVA 21%:                       $13,650.00                  │
│                                ─────────────                │
│ Subtotal con IVA:              $78,650.00                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ➕ Percepciones                                      │   │
│ │                                                      │   │
│ │ ☑ Percepción IIBB CABA 3%         $1,950.00        │   │
│ │   Base: $65,000.00                                  │   │
│ │   [🗑️ Eximir con certificado]                       │   │
│ │                                                      │   │
│ │ ☐ Percepción IVA RG 3337 3%                         │   │
│ │   [Agregar]                                         │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ TOTAL A COBRAR:                $80,600.00                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. En Orden de Pago

```
┌─────────────────────────────────────────────────────────────┐
│ Nueva Orden de Pago                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Proveedor: Ferretería ABC S.R.L.                           │
│ CUIT: 30-98765432-1                                        │
│                                                             │
│ Facturas a Pagar:                                          │
│ ☑ FC A 0001-00000456    $50,000.00    [Pagar: $50,000.00] │
│ ☑ FC A 0001-00000457    $30,000.00    [Pagar: $30,000.00] │
│                         ─────────────                       │
│ Total Facturas:         $80,000.00                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ➖ Retenciones (se descuentan del pago)             │   │
│ │                                                      │   │
│ │ ☑ Retención IIBB CABA 3%          -$2,400.00       │   │
│ │   Base: $80,000.00                                  │   │
│ │   Certificado: [Se generará automáticamente]       │   │
│ │                                                      │   │
│ │ ☑ Retención Ganancias 2%          -$1,600.00       │   │
│ │   Base: $80,000.00                                  │   │
│ │   Certificado: [Se generará automáticamente]       │   │
│ │                                                      │   │
│ │ [+ Agregar otra retención]                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ NETO A PAGAR:           $76,000.00                         │
│                                                             │
│ Forma de Pago:                                             │
│ 💳 Transferencia Bancaria    $76,000.00                   │
│                                                             │
│         [Cancelar]  [Guardar y Generar Certificados]      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Configuración de Conceptos

```
┌─────────────────────────────────────────────────────────────┐
│ Configuración de Percepciones y Retenciones                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Percepciones] [Retenciones]                               │
│                                                             │
│ Percepción IIBB CABA                          [✏️ Editar]  │
│ • Tipo: Porcentual (3%)                                    │
│ • Aplica sobre: Subtotal                                   │
│ • Mínimo: $1,000                                           │
│ • Aplicación automática: ✅ Si cliente es de CABA          │
│ • Estado: 🟢 Activo                                        │
│                                                             │
│ Percepción IVA RG 3337                        [✏️ Editar]  │
│ • Tipo: Porcentual (3%)                                    │
│ • Aplica sobre: Total                                      │
│ • Mínimo: $5,000                                           │
│ • Aplicación automática: ❌ Manual                         │
│ • Estado: 🟢 Activo                                        │
│                                                             │
│                              [+ Nuevo Concepto]            │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

```typescript
// Calcular percepciones para una venta
POST /api/:tenant/perceptions/calculate
Body: {
  customerId: 'xxx',
  subtotal: 65000,
  taxAmount: 13650,
  totalAmount: 78650,
  items: [...]
}
Response: [
  {
    taxConceptId: 'yyy',
    description: 'Percepción IIBB CABA 3%',
    taxableBase: 65000,
    percentage: 3.00,
    amount: 1950,
    jurisdiction: 'CABA'
  }
]

// Aplicar exención a una percepción
POST /api/:tenant/sales/:id/perceptions/:perceptionId/exempt
Body: {
  certificateNumber: 'CERT-123456'
}

// Calcular retenciones para un pago
POST /api/:tenant/retentions/calculate
Body: {
  entityId: 'xxx',
  documentsTotal: 80000,
  documents: [...]
}
Response: [...]

// Generar certificado de retención
POST /api/:tenant/payments/:id/retentions/:retentionId/certificate
Response: {
  certificateNumber: 'CABA-00000123',
  pdfUrl: '/downloads/certificates/CABA-00000123.pdf'
}

// Configuración de conceptos
GET /api/:tenant/tax-concepts
POST /api/:tenant/tax-concepts
PUT /api/:tenant/tax-concepts/:id
DELETE /api/:tenant/tax-concepts/:id
```

---

## Integración con AFIP

### Percepciones en Comprobantes Electrónicos

```typescript
// Al solicitar CAE, incluir percepciones
const caeRequest = {
  // ... datos normales de factura
  Tributos: [
    {
      Id: 7,              // Código AFIP (7 = Percepción IIBB)
      Desc: 'Percepción IIBB CABA',
      BaseImp: 65000.00,
      Alic: 3.00,
      Importe: 1950.00
    },
    {
      Id: 6,              // 6 = Percepción IVA
      Desc: 'Percepción IVA RG 3337',
      BaseImp: 78650.00,
      Alic: 3.00,
      Importe: 2359.50
    }
  ]
}
```

### Factura de Crédito Electrónica (FCE)

```typescript
// Solicitar CAE para FCE
const fceRequest = {
  CbteTipo: 201,  // FCE A (o 206 para FCE B, 211 para FCE C)
  // ... resto de datos de factura

  // Datos específicos de FCE
  FchServDesde: '20251201',
  FchServHasta: '20251231',
  FchVtoPago: '20260115',  // Fecha de vencimiento del pago

  Comprador: {
    DocTipo: 80,
    DocNro: 30123456789,
    Porcentaje: 100,  // % del monto total del comprobante
  }
}

// Consultar aceptación del comprador
const acceptanceStatus = await afipService.consultFCEAcceptance(cae)
```

---

## Reportes

### 1. Libro de Percepciones

```sql
-- Percepciones cobradas por período
SELECT
  tp.jurisdiction,
  tp.name,
  COUNT(sp.id) AS cantidad,
  SUM(sp.taxable_base) AS base_total,
  SUM(sp.amount) AS monto_total
FROM sale_perceptions sp
JOIN tax_concepts tp ON tp.id = sp.tax_concept_id
JOIN sales s ON s.id = sp.sale_id
WHERE s.sale_date BETWEEN '2025-01-01' AND '2025-01-31'
  AND sp.is_exempt = false
GROUP BY tp.jurisdiction, tp.name
ORDER BY tp.jurisdiction, tp.name;
```

### 2. Libro de Retenciones

```sql
-- Retenciones practicadas por período
SELECT
  e.name AS proveedor,
  tc.name AS concepto,
  pr.certificate_number AS certificado,
  pr.certificate_date AS fecha,
  pr.taxable_base AS base,
  pr.percentage AS alicuota,
  pr.amount AS monto
FROM payment_retentions pr
JOIN tax_concepts tc ON tc.id = pr.tax_concept_id
JOIN payments p ON p.id = pr.payment_id
JOIN entities e ON e.id = p.entity_id
WHERE p.payment_date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY p.payment_date, e.name;
```

---

## Checklist de Implementación

### Fase 1: Percepciones (Semanas 1-2)
- [ ] Crear tabla `tax_concepts` y seed de conceptos
- [ ] Crear tabla `sale_perceptions`
- [ ] Crear `PerceptionService`
- [ ] Modificar `SalesService` para incluir percepciones
- [ ] UI: Selector de percepciones en nueva factura
- [ ] Integrar con AFIP (tributos en CAE)

### Fase 2: Retenciones (Semanas 3-4)
- [ ] Crear tablas `payments`, `payment_retentions`, `payment_documents`
- [ ] Crear `RetentionService`
- [ ] Crear `PaymentService` (órdenes de pago)
- [ ] UI: Formulario de nueva orden de pago
- [ ] UI: Generación de certificados de retención
- [ ] PDF de certificado de retención

### Fase 3: FCE (Semanas 5-6)
- [ ] Crear tabla `fce_data`
- [ ] Modificar `SalesService` para FCE
- [ ] Integrar con AFIP (solicitud de CAE FCE)
- [ ] UI: Checkbox "Es FCE" en nueva factura
- [ ] UI: Seguimiento de aceptación del comprador
- [ ] UI: Gestión de cesión de FCE

### Fase 4: Reportes (Semana 7)
- [ ] Libro de Percepciones
- [ ] Libro de Retenciones
- [ ] Exportación a Excel/PDF
- [ ] Dashboard de impuestos

---

## Estimación Total

**Desarrollo completo:** 7-8 semanas (con 1 desarrollador)

**MVP (solo Fases 1-2):** 4 semanas

---

**Última actualización:** 2025-12-16
**Estado:** Borrador para revisión
