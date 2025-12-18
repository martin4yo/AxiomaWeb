# Plan de Implementación - Módulo Contable

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Esquema de Base de Datos](#esquema-de-base-de-datos)
4. [Sistema de Dimensiones](#sistema-de-dimensiones)
5. [Generación Automática de Asientos](#generación-automática-de-asientos)
6. [Módulo de Contabilidad Manual](#módulo-de-contabilidad-manual)
7. [Reportes Contables](#reportes-contables)
8. [Reportes de Gestión](#reportes-de-gestión)
9. [Implementación Backend](#implementación-backend)
10. [Implementación Frontend](#implementación-frontend)
11. [Casos de Uso](#casos-de-uso)
12. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Resumen Ejecutivo

### Objetivo
Implementar un sistema contable completo e integrado que:
- Genere asientos contables automáticamente desde cualquier transacción del ERP
- Permita registro manual de asientos contables
- Soporte contabilidad analítica multidimensional
- Provea reportes contables y de gestión completos

### Características Principales

#### 1. Generación Automática de Asientos
- **Ventas**: Invoice, Credit Note, Debit Note
- **Compras**: Purchase, Purchase Return
- **Pagos/Cobros**: Payments, Collections
- **Inventario**: Stock Adjustments, Transfers
- **Nómina**: Payroll (futuro)
- **Activos Fijos**: Depreciation (futuro)

#### 2. Plan de Cuentas Flexible
- Estructura jerárquica multinivel
- Cuentas de activo, pasivo, patrimonio, ingresos, egresos
- Cuentas de mayor y cuentas imputables
- Activación/desactivación sin eliminar
- Compatibilidad con estándares contables (NIIF, local)

#### 3. Sistema de Dimensiones Analíticas
- **Dimensiones configurables**: Centro de Costos, Obra en Curso, Proyecto, Departamento, Producto, Cliente, Región, etc.
- **Multi-dimensional**: Cada línea de asiento puede tener múltiples dimensiones
- **Reportes dimensionales**: Análisis cruzado por cualquier combinación de dimensiones

#### 4. Reportes Completos
**Contables**:
- Balance General
- Estado de Resultados
- Balance de Sumas y Saldos
- Libro Mayor
- Libro Diario
- Mayor Analítico (por dimensión)

**Gestión**:
- Análisis por Centro de Costos
- Seguimiento de Obras en Curso
- Flujo de Efectivo
- Análisis de Rentabilidad
- Proyecciones y Presupuestos

---

## Arquitectura General

### Decisión de Arquitectura

**Opción Elegida**: Tablas dedicadas para contabilidad con hooks de integración

#### Ventajas
- Separación de responsabilidades (SOLID)
- Performance optimizada para consultas contables
- Auditabilidad completa
- Flexibilidad para asientos manuales
- No impacta tablas transaccionales

#### Estructura
```
Transacciones ERP → Hooks/Events → Generador de Asientos → Contabilidad
                                                          ↓
                                              Dimensiones Analíticas
```

---

## Esquema de Base de Datos

### Modelo Prisma Completo

```prisma
// ============================================================================
// PLAN DE CUENTAS (CHART OF ACCOUNTS)
// ============================================================================

model Account {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")

  // Identificación
  code        String   // Ej: "1.1.01.001" o "1101001"
  name        String   // "Caja"
  description String?

  // Jerarquía
  parentId    String?  @map("parent_id")
  parent      Account? @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    Account[] @relation("AccountHierarchy")
  level       Int      // 0=root, 1=group, 2=subgroup, etc.

  // Tipo y Naturaleza
  accountType AccountType @map("account_type")
  // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE, COST_OF_SALES

  nature      AccountNature // DEBIT, CREDIT

  // Configuración
  isImputable Boolean  @default(true) @map("is_imputable")
  // true = cuenta de detalle (acepta movimientos)
  // false = cuenta de grupo (solo suma hijos)

  isActive    Boolean  @default(true) @map("is_active")

  // Control de uso
  requiresDimension Boolean @default(false) @map("requires_dimension")
  allowedDimensions String[] @map("allowed_dimensions") // IDs de dimensiones permitidas

  // Integración
  autoAccountingRules AutoAccountingRule[]

  // Movimientos
  debitLines  JournalEntryLine[] @relation("DebitAccount")
  creditLines JournalEntryLine[] @relation("CreditAccount")

  // Metadata
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, code])
  @@index([tenantId, accountType])
  @@index([tenantId, parentId])
  @@map("accounts")
}

enum AccountType {
  ASSET              // Activo
  LIABILITY          // Pasivo
  EQUITY             // Patrimonio
  INCOME             // Ingresos
  EXPENSE            // Gastos
  COST_OF_SALES      // Costo de Ventas
}

enum AccountNature {
  DEBIT   // Naturaleza deudora
  CREDIT  // Naturaleza acreedora
}

// ============================================================================
// ASIENTOS CONTABLES (JOURNAL ENTRIES)
// ============================================================================

model JournalEntry {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")

  // Identificación
  number      Int      // Número de asiento (auto-incrementable por tenant)
  date        DateTime // Fecha del asiento
  description String   // Descripción general

  // Tipo y Origen
  entryType   EntryType @map("entry_type")
  // OPENING, REGULAR, ADJUSTMENT, CLOSING, AUTOMATIC, MANUAL

  origin      EntryOrigin @map("origin")
  // SALE, PURCHASE, PAYMENT, COLLECTION, INVENTORY, PAYROLL, MANUAL, OTHER

  // Referencia a documento origen (si es automático)
  sourceType  String?   @map("source_type") // "Sale", "Purchase", "Payment"
  sourceId    String?   @map("source_id")

  // Estado
  status      EntryStatus @default(DRAFT)
  // DRAFT, POSTED, REVERSED, CANCELLED

  // Control
  isBalanced  Boolean   @default(false) @map("is_balanced")
  // true cuando suma débitos = suma créditos

  totalDebit  Decimal   @default(0) @map("total_debit") @db.Decimal(15, 2)
  totalCredit Decimal   @default(0) @map("total_credit") @db.Decimal(15, 2)

  // Reversión
  reversedById String?  @map("reversed_by_id")
  reversedBy   JournalEntry? @relation("ReversedEntry", fields: [reversedById], references: [id])
  reversals    JournalEntry[] @relation("ReversedEntry")
  reversedAt   DateTime? @map("reversed_at")

  // Líneas del asiento
  lines       JournalEntryLine[]

  // Período contable
  fiscalYear  Int      @map("fiscal_year")
  fiscalMonth Int      @map("fiscal_month") // 1-12

  // Auditoría
  createdBy   String   @map("created_by")
  postedBy    String?  @map("posted_by")
  postedAt    DateTime? @map("posted_at")

  notes       String?  // Notas adicionales

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, number])
  @@index([tenantId, date])
  @@index([tenantId, status])
  @@index([tenantId, sourceType, sourceId])
  @@index([tenantId, fiscalYear, fiscalMonth])
  @@map("journal_entries")
}

enum EntryType {
  OPENING     // Asiento de apertura
  REGULAR     // Asiento normal
  ADJUSTMENT  // Asiento de ajuste
  CLOSING     // Asiento de cierre
  AUTOMATIC   // Generado automáticamente
  MANUAL      // Registrado manualmente
}

enum EntryOrigin {
  SALE
  PURCHASE
  PAYMENT
  COLLECTION
  INVENTORY
  PAYROLL
  DEPRECIATION
  MANUAL
  OTHER
}

enum EntryStatus {
  DRAFT      // Borrador (editable)
  POSTED     // Contabilizado (no editable)
  REVERSED   // Revertido
  CANCELLED  // Anulado
}

// ============================================================================
// LÍNEAS DE ASIENTO (JOURNAL ENTRY LINES)
// ============================================================================

model JournalEntryLine {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")

  // Relación con asiento
  journalEntryId  String   @map("journal_entry_id")
  journalEntry    JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  lineNumber      Int      @map("line_number") // Orden dentro del asiento

  // Cuenta contable
  accountId       String   @map("account_id")
  account         Account  @relation("DebitAccount", fields: [accountId], references: [id])

  // Débito/Crédito
  debit           Decimal  @default(0) @db.Decimal(15, 2)
  credit          Decimal  @default(0) @db.Decimal(15, 2)

  // Descripción específica de la línea
  description     String?

  // Dimensiones analíticas
  dimensions      LineDimension[]

  // Referencia adicional
  referenceType   String?  @map("reference_type") // "Entity", "Product", etc.
  referenceId     String?  @map("reference_id")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([tenantId, journalEntryId])
  @@index([tenantId, accountId])
  @@map("journal_entry_lines")
}

// ============================================================================
// SISTEMA DE DIMENSIONES
// ============================================================================

model Dimension {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")

  // Identificación
  code        String   // "CC", "OBRA", "PROYECTO"
  name        String   // "Centro de Costos", "Obra en Curso"
  description String?

  // Configuración
  isActive    Boolean  @default(true) @map("is_active")
  isRequired  Boolean  @default(false) @map("is_required")
  // Si es requerida, todas las líneas deben tener un valor

  // Valores permitidos
  values      DimensionValue[]

  // Uso en líneas
  lineAssignments LineDimension[]

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, code])
  @@map("dimensions")
}

model DimensionValue {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")

  // Relación con dimensión
  dimensionId String   @map("dimension_id")
  dimension   Dimension @relation(fields: [dimensionId], references: [id], onDelete: Cascade)

  // Identificación
  code        String   // "CC001", "OBRA_SAN_JUAN"
  name        String   // "Administración", "Obra San Juan"
  description String?

  // Jerarquía (opcional)
  parentId    String?  @map("parent_id")
  parent      DimensionValue? @relation("DimensionValueHierarchy", fields: [parentId], references: [id])
  children    DimensionValue[] @relation("DimensionValueHierarchy")

  // Estado
  isActive    Boolean  @default(true) @map("is_active")

  // Uso
  lineAssignments LineDimension[]

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([dimensionId, code])
  @@index([tenantId, dimensionId])
  @@map("dimension_values")
}

model LineDimension {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")

  // Relación con línea de asiento
  journalEntryLineId String  @map("journal_entry_line_id")
  line              JournalEntryLine @relation(fields: [journalEntryLineId], references: [id], onDelete: Cascade)

  // Dimensión y valor
  dimensionId       String   @map("dimension_id")
  dimension         Dimension @relation(fields: [dimensionId], references: [id])

  dimensionValueId  String   @map("dimension_value_id")
  dimensionValue    DimensionValue @relation(fields: [dimensionValueId], references: [id])

  // Porcentaje de asignación (para distribuciones)
  percentage        Decimal? @default(100) @db.Decimal(5, 2)
  // Permite dividir una línea entre múltiples valores de la misma dimensión

  createdAt         DateTime @default(now()) @map("created_at")

  @@unique([journalEntryLineId, dimensionId, dimensionValueId])
  @@index([tenantId, dimensionId])
  @@index([tenantId, dimensionValueId])
  @@map("line_dimensions")
}

// ============================================================================
// REGLAS DE CONTABILIZACIÓN AUTOMÁTICA
// ============================================================================

model AutoAccountingRule {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")

  // Identificación
  name        String
  description String?

  // Tipo de documento que dispara la regla
  documentType String  @map("document_type")
  // "INVOICE", "CREDIT_NOTE", "PURCHASE", "PAYMENT", etc.

  // Condiciones (JSON)
  conditions  Json?    // Ej: { "paymentMethod": "CASH", "customerType": "VIP" }

  // Template de asiento (JSON)
  template    Json
  /* Ejemplo:
  {
    "lines": [
      {
        "accountCode": "1.1.01.001",
        "type": "DEBIT",
        "amountField": "total",
        "description": "Cobro factura {documentNumber}",
        "dimensions": {
          "CC": "fromCustomer.costCenter",
          "PROYECTO": "fixed:PROYECTO_001"
        }
      },
      {
        "accountCode": "4.1.01.001",
        "type": "CREDIT",
        "amountField": "subtotal"
      },
      {
        "accountCode": "2.1.05.001",
        "type": "CREDIT",
        "amountField": "taxAmount"
      }
    ]
  }
  */

  // Prioridad (para cuando hay múltiples reglas)
  priority    Int      @default(0)

  // Estado
  isActive    Boolean  @default(true) @map("is_active")

  // Cuentas usadas (para referencia)
  accounts    Account[]

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([tenantId, documentType])
  @@map("auto_accounting_rules")
}
```

---

## Sistema de Dimensiones

### Concepto
Las dimensiones analíticas permiten clasificar y analizar los movimientos contables desde múltiples perspectivas simultáneamente.

### Dimensiones Típicas

#### 1. Centro de Costos
```
- Administración
- Ventas
- Producción
- Logística
- I+D
```

#### 2. Obra en Curso / Proyecto
```
- Obra Edificio Central
- Obra Casa Country
- Proyecto Software ERP
- Proyecto Consultoría Cliente X
```

#### 3. Producto / Línea de Negocio
```
- Hardware
- Software
- Servicios
- Capacitación
```

#### 4. Ubicación Geográfica
```
- Sucursal Buenos Aires
- Sucursal Córdoba
- Sucursal Mendoza
```

#### 5. Cliente / Proveedor
Referencia directa a entidades

#### 6. Departamento
```
- RRHH
- IT
- Finanzas
- Operaciones
```

### Uso Multi-dimensional

Una línea de asiento puede tener múltiples dimensiones:

```
Gasto: $10,000
Cuenta: 5.1.02.001 - Sueldos y Jornales
Dimensiones:
  - Centro de Costos: Producción (70%) + Administración (30%)
  - Proyecto: Obra Edificio Central
  - Departamento: Operaciones
```

Esto permite reportes como:
- ¿Cuánto gastó "Producción" en "Obra Edificio Central"?
- ¿Cuál es el costo total del "Departamento de Operaciones"?
- Distribución de costos por Centro de Costos y Proyecto

---

## Generación Automática de Asientos

### Arquitectura del Sistema

```typescript
// ============================================================================
// INTERFAZ DE EVENTO CONTABLE
// ============================================================================

interface AccountingEvent {
  documentType: string  // "INVOICE", "PURCHASE", "PAYMENT"
  documentId: string
  tenantId: string
  date: Date
  data: any  // Datos del documento
}

// ============================================================================
// MOTOR DE GENERACIÓN AUTOMÁTICA
// ============================================================================

class AutoAccountingEngine {

  async generateEntry(event: AccountingEvent): Promise<JournalEntry | null> {
    // 1. Buscar regla aplicable
    const rule = await this.findApplicableRule(event)
    if (!rule) return null

    // 2. Evaluar condiciones
    if (!this.evaluateConditions(rule.conditions, event.data)) {
      return null
    }

    // 3. Generar líneas según template
    const lines = await this.generateLines(rule.template, event.data)

    // 4. Validar balance
    if (!this.isBalanced(lines)) {
      throw new Error('Entry is not balanced')
    }

    // 5. Crear asiento
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: event.tenantId,
        date: event.date,
        entryType: 'AUTOMATIC',
        origin: this.mapOrigin(event.documentType),
        sourceType: event.documentType,
        sourceId: event.documentId,
        status: 'POSTED',  // Auto-posted
        lines: {
          create: lines
        }
      }
    })

    return entry
  }

  private async findApplicableRule(event: AccountingEvent) {
    return await prisma.autoAccountingRule.findFirst({
      where: {
        tenantId: event.tenantId,
        documentType: event.documentType,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    })
  }

  private evaluateConditions(conditions: any, data: any): boolean {
    if (!conditions) return true

    // Evaluar cada condición
    for (const [field, value] of Object.entries(conditions)) {
      if (this.getNestedValue(data, field) !== value) {
        return false
      }
    }

    return true
  }

  private async generateLines(template: any, data: any) {
    const lines = []

    for (let i = 0; i < template.lines.length; i++) {
      const lineTemplate = template.lines[i]

      // Resolver cuenta
      const account = await prisma.account.findFirst({
        where: { code: lineTemplate.accountCode }
      })

      // Resolver monto
      const amount = this.resolveAmount(lineTemplate.amountField, data)

      // Resolver descripción
      const description = this.resolveTemplate(
        lineTemplate.description || '',
        data
      )

      // Crear línea
      const line: any = {
        lineNumber: i + 1,
        accountId: account.id,
        debit: lineTemplate.type === 'DEBIT' ? amount : 0,
        credit: lineTemplate.type === 'CREDIT' ? amount : 0,
        description
      }

      // Resolver dimensiones
      if (lineTemplate.dimensions) {
        line.dimensions = {
          create: await this.resolveDimensions(
            lineTemplate.dimensions,
            data
          )
        }
      }

      lines.push(line)
    }

    return lines
  }

  private async resolveDimensions(dimensionsTemplate: any, data: any) {
    const result = []

    for (const [dimCode, valueSpec] of Object.entries(dimensionsTemplate)) {
      const dimension = await prisma.dimension.findFirst({
        where: { code: dimCode }
      })

      let valueCode: string

      // Resolver valor de dimensión
      if (typeof valueSpec === 'string') {
        if (valueSpec.startsWith('fixed:')) {
          valueCode = valueSpec.replace('fixed:', '')
        } else if (valueSpec.startsWith('from')) {
          valueCode = this.getNestedValue(data, valueSpec.replace('from', ''))
        } else {
          valueCode = valueSpec
        }
      }

      const dimensionValue = await prisma.dimensionValue.findFirst({
        where: {
          dimensionId: dimension.id,
          code: valueCode
        }
      })

      result.push({
        dimensionId: dimension.id,
        dimensionValueId: dimensionValue.id
      })
    }

    return result
  }

  private resolveAmount(field: string, data: any): number {
    return Number(this.getNestedValue(data, field))
  }

  private resolveTemplate(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, field) => {
      return this.getNestedValue(data, field) || match
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private isBalanced(lines: any[]): boolean {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0)
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0)

    return Math.abs(totalDebit - totalCredit) < 0.01
  }
}
```

### Hooks de Integración

```typescript
// ============================================================================
// HOOKS EN SERVICIOS EXISTENTES
// ============================================================================

// En salesService.ts
class SalesService {

  async createSale(data: CreateSaleDto) {
    // ... lógica existente ...

    const sale = await prisma.sale.create({ data })

    // Hook contable
    await this.triggerAccounting(sale)

    return sale
  }

  private async triggerAccounting(sale: Sale) {
    const engine = new AutoAccountingEngine()

    try {
      await engine.generateEntry({
        documentType: sale.documentClass || 'INVOICE',
        documentId: sale.id,
        tenantId: sale.tenantId,
        date: sale.date,
        data: {
          documentNumber: sale.invoiceNumber,
          total: sale.total,
          subtotal: sale.subtotal,
          taxAmount: sale.tax,
          customer: await prisma.entity.findUnique({
            where: { id: sale.entityId }
          }),
          paymentMethod: sale.paymentMethod,
          items: sale.items
        }
      })
    } catch (error) {
      // Log error pero no falla la venta
      console.error('Accounting error:', error)
      // Opcionalmente enviar notificación al contador
    }
  }
}

// Similar para purchasesService, paymentsService, etc.
```

### Ejemplos de Reglas

#### Regla 1: Venta al Contado
```json
{
  "name": "Venta al Contado",
  "documentType": "INVOICE",
  "conditions": {
    "paymentMethod": "CASH"
  },
  "template": {
    "lines": [
      {
        "accountCode": "1.1.01.001",
        "type": "DEBIT",
        "amountField": "total",
        "description": "Cobro factura {documentNumber}"
      },
      {
        "accountCode": "4.1.01.001",
        "type": "CREDIT",
        "amountField": "subtotal",
        "description": "Venta productos"
      },
      {
        "accountCode": "2.1.05.001",
        "type": "CREDIT",
        "amountField": "taxAmount",
        "description": "IVA débito fiscal"
      }
    ]
  }
}
```

#### Regla 2: Compra a Crédito
```json
{
  "name": "Compra a Crédito",
  "documentType": "PURCHASE",
  "template": {
    "lines": [
      {
        "accountCode": "6.1.01.001",
        "type": "DEBIT",
        "amountField": "subtotal",
        "description": "Compra mercadería",
        "dimensions": {
          "CC": "fromSupplier.defaultCostCenter"
        }
      },
      {
        "accountCode": "1.1.04.001",
        "type": "DEBIT",
        "amountField": "taxAmount",
        "description": "IVA crédito fiscal"
      },
      {
        "accountCode": "2.1.01.001",
        "type": "CREDIT",
        "amountField": "total",
        "description": "Proveedor {supplier.name}"
      }
    ]
  }
}
```

---

## Módulo de Contabilidad Manual

### Backend Service

```typescript
// ============================================================================
// JOURNAL ENTRIES SERVICE
// ============================================================================

interface CreateJournalEntryDto {
  date: Date
  description: string
  entryType: EntryType
  lines: Array<{
    accountId: string
    debit?: number
    credit?: number
    description?: string
    dimensions?: Array<{
      dimensionId: string
      dimensionValueId: string
      percentage?: number
    }>
  }>
  notes?: string
}

class JournalEntriesService {

  async createEntry(tenantId: string, userId: string, data: CreateJournalEntryDto) {
    // 1. Validar balance
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new AppError('Entry must be balanced', 400)
    }

    // 2. Obtener siguiente número
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { tenantId },
      orderBy: { number: 'desc' }
    })
    const number = (lastEntry?.number || 0) + 1

    // 3. Validar cuentas imputables
    for (const line of data.lines) {
      const account = await prisma.account.findUnique({
        where: { id: line.accountId }
      })

      if (!account.isImputable) {
        throw new AppError(`Account ${account.name} is not imputable`, 400)
      }

      // Validar dimensiones requeridas
      if (account.requiresDimension && (!line.dimensions || line.dimensions.length === 0)) {
        throw new AppError(`Account ${account.name} requires dimensions`, 400)
      }
    }

    // 4. Crear asiento
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: data.date,
        description: data.description,
        entryType: data.entryType,
        origin: 'MANUAL',
        status: 'DRAFT',
        fiscalYear: data.date.getFullYear(),
        fiscalMonth: data.date.getMonth() + 1,
        totalDebit,
        totalCredit,
        isBalanced: true,
        createdBy: userId,
        notes: data.notes,
        lines: {
          create: data.lines.map((line, index) => ({
            tenantId,
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
            dimensions: line.dimensions ? {
              create: line.dimensions.map(dim => ({
                tenantId,
                dimensionId: dim.dimensionId,
                dimensionValueId: dim.dimensionValueId,
                percentage: dim.percentage || 100
              }))
            } : undefined
          }))
        }
      },
      include: {
        lines: {
          include: {
            account: true,
            dimensions: {
              include: {
                dimension: true,
                dimensionValue: true
              }
            }
          }
        }
      }
    })

    return entry
  }

  async postEntry(entryId: string, userId: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: true }
    })

    if (entry.status !== 'DRAFT') {
      throw new AppError('Only draft entries can be posted', 400)
    }

    if (!entry.isBalanced) {
      throw new AppError('Entry must be balanced', 400)
    }

    return await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'POSTED',
        postedBy: userId,
        postedAt: new Date()
      }
    })
  }

  async reverseEntry(entryId: string, userId: string, date: Date, reason: string) {
    const originalEntry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: { include: { dimensions: true } } }
    })

    if (originalEntry.status !== 'POSTED') {
      throw new AppError('Only posted entries can be reversed', 400)
    }

    // Crear asiento de reversión (invirtiendo débitos y créditos)
    const reversalEntry = await this.createEntry(
      originalEntry.tenantId,
      userId,
      {
        date,
        description: `Reversión: ${originalEntry.description} - ${reason}`,
        entryType: 'ADJUSTMENT',
        lines: originalEntry.lines.map(line => ({
          accountId: line.accountId,
          debit: Number(line.credit),  // Invertir
          credit: Number(line.debit),  // Invertir
          description: `Reversión: ${line.description}`,
          dimensions: line.dimensions.map(dim => ({
            dimensionId: dim.dimensionId,
            dimensionValueId: dim.dimensionValueId,
            percentage: Number(dim.percentage)
          }))
        }))
      }
    )

    // Auto-contabilizar
    await this.postEntry(reversalEntry.id, userId)

    // Marcar original como revertido
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'REVERSED',
        reversedById: reversalEntry.id,
        reversedAt: new Date()
      }
    })

    return reversalEntry
  }

  async getGeneralLedger(tenantId: string, filters: {
    accountId?: string
    dateFrom?: Date
    dateTo?: Date
    fiscalYear?: number
  }) {
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId: filters.accountId,
        journalEntry: {
          status: 'POSTED',
          date: {
            gte: filters.dateFrom,
            lte: filters.dateTo
          },
          fiscalYear: filters.fiscalYear
        }
      },
      include: {
        journalEntry: true,
        account: true,
        dimensions: {
          include: {
            dimension: true,
            dimensionValue: true
          }
        }
      },
      orderBy: [
        { journalEntry: { date: 'asc' } },
        { journalEntry: { number: 'asc' } },
        { lineNumber: 'asc' }
      ]
    })

    // Calcular saldos acumulados
    let balance = 0
    const ledger = lines.map(line => {
      const debit = Number(line.debit)
      const credit = Number(line.credit)
      const account = line.account

      // Naturaleza deudora: +débito, -crédito
      // Naturaleza acreedora: -débito, +crédito
      if (account.nature === 'DEBIT') {
        balance += debit - credit
      } else {
        balance += credit - debit
      }

      return {
        ...line,
        balance
      }
    })

    return ledger
  }
}
```

---

## Reportes Contables

### 1. Balance General (Balance Sheet)

```typescript
class AccountingReportsService {

  async getBalanceSheet(tenantId: string, date: Date) {
    // Obtener todas las cuentas con movimientos hasta la fecha
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }
      },
      include: {
        debitLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: { lte: date }
            }
          }
        },
        creditLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: { lte: date }
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    })

    // Calcular saldos
    const accountsWithBalance = accounts.map(account => {
      const totalDebit = account.debitLines.reduce(
        (sum, line) => sum + Number(line.debit),
        0
      )
      const totalCredit = account.creditLines.reduce(
        (sum, line) => sum + Number(line.credit),
        0
      )

      let balance: number
      if (account.nature === 'DEBIT') {
        balance = totalDebit - totalCredit
      } else {
        balance = totalCredit - totalDebit
      }

      return {
        code: account.code,
        name: account.name,
        type: account.accountType,
        balance
      }
    }).filter(acc => Math.abs(acc.balance) > 0.01) // Solo con saldo

    // Agrupar por tipo
    const assets = accountsWithBalance
      .filter(acc => acc.type === 'ASSET')
      .reduce((sum, acc) => sum + acc.balance, 0)

    const liabilities = accountsWithBalance
      .filter(acc => acc.type === 'LIABILITY')
      .reduce((sum, acc) => sum + acc.balance, 0)

    const equity = accountsWithBalance
      .filter(acc => acc.type === 'EQUITY')
      .reduce((sum, acc) => sum + acc.balance, 0)

    // Calcular resultado del ejercicio
    const income = await this.getIncomeStatement(tenantId, {
      from: new Date(date.getFullYear(), 0, 1),
      to: date
    })

    const netIncome = income.totalIncome - income.totalExpenses - income.totalCostOfSales

    return {
      date,
      assets: {
        accounts: accountsWithBalance.filter(acc => acc.type === 'ASSET'),
        total: assets
      },
      liabilities: {
        accounts: accountsWithBalance.filter(acc => acc.type === 'LIABILITY'),
        total: liabilities
      },
      equity: {
        accounts: accountsWithBalance.filter(acc => acc.type === 'EQUITY'),
        total: equity,
        netIncome
      },
      totalAssets: assets,
      totalLiabilitiesAndEquity: liabilities + equity + netIncome,
      isBalanced: Math.abs(assets - (liabilities + equity + netIncome)) < 0.01
    }
  }

  async getIncomeStatement(tenantId: string, period: { from: Date; to: Date }) {
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        accountType: { in: ['INCOME', 'EXPENSE', 'COST_OF_SALES'] }
      },
      include: {
        debitLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: { gte: period.from, lte: period.to }
            }
          }
        },
        creditLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: { gte: period.from, lte: period.to }
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    })

    const accountsWithBalance = accounts.map(account => {
      const totalDebit = account.debitLines.reduce(
        (sum, line) => sum + Number(line.debit),
        0
      )
      const totalCredit = account.creditLines.reduce(
        (sum, line) => sum + Number(line.credit),
        0
      )

      // Ingresos: naturaleza crédito (crédito - débito)
      // Gastos y CMV: naturaleza débito (débito - crédito)
      let balance: number
      if (account.accountType === 'INCOME') {
        balance = totalCredit - totalDebit
      } else {
        balance = totalDebit - totalCredit
      }

      return {
        code: account.code,
        name: account.name,
        type: account.accountType,
        balance
      }
    }).filter(acc => Math.abs(acc.balance) > 0.01)

    const income = accountsWithBalance.filter(acc => acc.type === 'INCOME')
    const costOfSales = accountsWithBalance.filter(acc => acc.type === 'COST_OF_SALES')
    const expenses = accountsWithBalance.filter(acc => acc.type === 'EXPENSE')

    const totalIncome = income.reduce((sum, acc) => sum + acc.balance, 0)
    const totalCostOfSales = costOfSales.reduce((sum, acc) => sum + acc.balance, 0)
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0)

    const grossProfit = totalIncome - totalCostOfSales
    const operatingProfit = grossProfit - totalExpenses
    const netProfit = operatingProfit // + otros ingresos - otros gastos (futuro)

    return {
      period,
      income: { accounts: income, total: totalIncome },
      costOfSales: { accounts: costOfSales, total: totalCostOfSales },
      grossProfit,
      expenses: { accounts: expenses, total: totalExpenses },
      operatingProfit,
      netProfit
    }
  }

  async getTrialBalance(tenantId: string, filters: {
    dateFrom?: Date
    dateTo?: Date
    fiscalYear?: number
  }) {
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        isImputable: true
      },
      include: {
        debitLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: {
                gte: filters.dateFrom,
                lte: filters.dateTo
              },
              fiscalYear: filters.fiscalYear
            }
          }
        },
        creditLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              date: {
                gte: filters.dateFrom,
                lte: filters.dateTo
              },
              fiscalYear: filters.fiscalYear
            }
          }
        }
      },
      orderBy: { code: 'asc' }
    })

    const trialBalance = accounts.map(account => {
      const totalDebit = account.debitLines.reduce(
        (sum, line) => sum + Number(line.debit),
        0
      )
      const totalCredit = account.creditLines.reduce(
        (sum, line) => sum + Number(line.credit),
        0
      )

      const debitBalance = totalDebit > totalCredit ? totalDebit - totalCredit : 0
      const creditBalance = totalCredit > totalDebit ? totalCredit - totalDebit : 0

      return {
        code: account.code,
        name: account.name,
        type: account.accountType,
        nature: account.nature,
        totalDebit,
        totalCredit,
        debitBalance,
        creditBalance
      }
    }).filter(acc => acc.totalDebit > 0 || acc.totalCredit > 0)

    // Totales
    const totals = {
      totalDebits: trialBalance.reduce((sum, acc) => sum + acc.totalDebit, 0),
      totalCredits: trialBalance.reduce((sum, acc) => sum + acc.totalCredit, 0),
      totalDebitBalances: trialBalance.reduce((sum, acc) => sum + acc.debitBalance, 0),
      totalCreditBalances: trialBalance.reduce((sum, acc) => sum + acc.creditBalance, 0)
    }

    return {
      accounts: trialBalance,
      totals,
      isBalanced: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01
    }
  }
}
```

### 2. Reportes Analíticos por Dimensiones

```typescript
class AnalyticalReportsService {

  async getCostCenterReport(tenantId: string, period: { from: Date; to: Date }) {
    // Obtener dimensión de Centro de Costos
    const ccDimension = await prisma.dimension.findFirst({
      where: { tenantId, code: 'CC' }
    })

    if (!ccDimension) {
      throw new AppError('Cost Center dimension not configured', 404)
    }

    // Obtener todos los centros de costos
    const costCenters = await prisma.dimensionValue.findMany({
      where: {
        dimensionId: ccDimension.id,
        isActive: true
      }
    })

    // Para cada centro, calcular ingresos y gastos
    const report = await Promise.all(
      costCenters.map(async (cc) => {
        const lines = await prisma.lineDimension.findMany({
          where: {
            tenantId,
            dimensionValueId: cc.id,
            line: {
              journalEntry: {
                status: 'POSTED',
                date: { gte: period.from, lte: period.to }
              }
            }
          },
          include: {
            line: {
              include: {
                account: true,
                journalEntry: true
              }
            }
          }
        })

        let income = 0
        let expenses = 0
        let costOfSales = 0

        lines.forEach(lineDim => {
          const line = lineDim.line
          const account = line.account
          const percentage = Number(lineDim.percentage) / 100

          const debit = Number(line.debit) * percentage
          const credit = Number(line.credit) * percentage

          if (account.accountType === 'INCOME') {
            income += credit - debit
          } else if (account.accountType === 'EXPENSE') {
            expenses += debit - credit
          } else if (account.accountType === 'COST_OF_SALES') {
            costOfSales += debit - credit
          }
        })

        const grossProfit = income - costOfSales
        const netProfit = grossProfit - expenses

        return {
          costCenter: {
            code: cc.code,
            name: cc.name
          },
          income,
          costOfSales,
          grossProfit,
          expenses,
          netProfit,
          margin: income > 0 ? (netProfit / income) * 100 : 0
        }
      })
    )

    // Ordenar por ganancia neta
    report.sort((a, b) => b.netProfit - a.netProfit)

    // Totales
    const totals = {
      income: report.reduce((sum, cc) => sum + cc.income, 0),
      costOfSales: report.reduce((sum, cc) => sum + cc.costOfSales, 0),
      expenses: report.reduce((sum, cc) => sum + cc.expenses, 0),
      netProfit: report.reduce((sum, cc) => sum + cc.netProfit, 0)
    }

    return {
      period,
      costCenters: report,
      totals
    }
  }

  async getProjectProfitability(tenantId: string, projectId: string) {
    // Obtener dimensión de Proyecto
    const projectDim = await prisma.dimension.findFirst({
      where: { tenantId, code: 'PROYECTO' }
    })

    const project = await prisma.dimensionValue.findUnique({
      where: { id: projectId }
    })

    // Obtener todas las líneas del proyecto
    const lines = await prisma.lineDimension.findMany({
      where: {
        tenantId,
        dimensionValueId: projectId,
        line: {
          journalEntry: { status: 'POSTED' }
        }
      },
      include: {
        line: {
          include: {
            account: true,
            journalEntry: true
          }
        }
      },
      orderBy: {
        line: {
          journalEntry: { date: 'asc' }
        }
      }
    })

    // Agrupar por mes
    const monthlyData: Record<string, any> = {}

    lines.forEach(lineDim => {
      const line = lineDim.line
      const entry = line.journalEntry
      const account = line.account

      const monthKey = `${entry.fiscalYear}-${String(entry.fiscalMonth).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          income: 0,
          costs: 0,
          expenses: 0
        }
      }

      const percentage = Number(lineDim.percentage) / 100
      const debit = Number(line.debit) * percentage
      const credit = Number(line.credit) * percentage

      if (account.accountType === 'INCOME') {
        monthlyData[monthKey].income += credit - debit
      } else if (account.accountType === 'COST_OF_SALES') {
        monthlyData[monthKey].costs += debit - credit
      } else if (account.accountType === 'EXPENSE') {
        monthlyData[monthKey].expenses += debit - credit
      }
    })

    // Convertir a array y calcular rentabilidad
    const timeline = Object.values(monthlyData).map((month: any) => ({
      ...month,
      grossProfit: month.income - month.costs,
      netProfit: month.income - month.costs - month.expenses,
      margin: month.income > 0 ? ((month.income - month.costs - month.expenses) / month.income) * 100 : 0
    }))

    // Totales
    const totals = timeline.reduce((acc, month) => ({
      income: acc.income + month.income,
      costs: acc.costs + month.costs,
      expenses: acc.expenses + month.expenses,
      netProfit: acc.netProfit + month.netProfit
    }), { income: 0, costs: 0, expenses: 0, netProfit: 0 })

    return {
      project: {
        code: project.code,
        name: project.name
      },
      timeline,
      totals,
      overallMargin: totals.income > 0 ? (totals.netProfit / totals.income) * 100 : 0
    }
  }

  async getMultiDimensionalAnalysis(
    tenantId: string,
    dimensions: string[], // ['CC', 'PROYECTO']
    period: { from: Date; to: Date }
  ) {
    // Análisis cruzado de múltiples dimensiones

    const dimRecords = await Promise.all(
      dimensions.map(code =>
        prisma.dimension.findFirst({
          where: { tenantId, code },
          include: { values: { where: { isActive: true } } }
        })
      )
    )

    // Obtener todas las combinaciones
    const combinations = this.getCombinations(
      dimRecords.map(d => d.values)
    )

    // Para cada combinación, calcular métricas
    const results = await Promise.all(
      combinations.map(async (combo) => {
        const dimensionValueIds = combo.map(v => v.id)

        // Encontrar líneas que tengan TODAS las dimensiones
        const lines = await prisma.journalEntryLine.findMany({
          where: {
            tenantId,
            journalEntry: {
              status: 'POSTED',
              date: { gte: period.from, lte: period.to }
            },
            dimensions: {
              every: {
                dimensionValueId: { in: dimensionValueIds }
              }
            }
          },
          include: {
            account: true,
            dimensions: true
          }
        })

        // Calcular métricas
        let income = 0, expenses = 0, costs = 0

        lines.forEach(line => {
          const debit = Number(line.debit)
          const credit = Number(line.credit)

          if (line.account.accountType === 'INCOME') {
            income += credit - debit
          } else if (line.account.accountType === 'EXPENSE') {
            expenses += debit - credit
          } else if (line.account.accountType === 'COST_OF_SALES') {
            costs += debit - credit
          }
        })

        return {
          dimensions: combo.map((v, i) => ({
            dimension: dimRecords[i].name,
            value: v.name
          })),
          metrics: {
            income,
            costs,
            expenses,
            netProfit: income - costs - expenses
          }
        }
      })
    )

    return {
      period,
      dimensions: dimRecords.map(d => ({ code: d.code, name: d.name })),
      results: results.filter(r => Math.abs(r.metrics.netProfit) > 0.01)
    }
  }

  private getCombinations(arrays: any[][]): any[][] {
    if (arrays.length === 0) return [[]]
    if (arrays.length === 1) return arrays[0].map(item => [item])

    const [first, ...rest] = arrays
    const restCombinations = this.getCombinations(rest)

    return first.flatMap(item =>
      restCombinations.map(combo => [item, ...combo])
    )
  }
}
```

---

## Implementación Frontend

### Componentes Principales

```typescript
// ============================================================================
// PLAN DE CUENTAS - TREE VIEW
// ============================================================================

interface AccountTreeProps {
  tenantId: string
  onSelect?: (account: Account) => void
  selectable?: boolean
}

function AccountTree({ tenantId, onSelect, selectable = false }: AccountTreeProps) {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', tenantId],
    queryFn: () => accountsApi.getAll(tenantId)
  })

  if (isLoading) return <Spinner />

  // Construir árbol
  const tree = buildTree(accounts)

  return (
    <div className="account-tree">
      {tree.map(root => (
        <AccountNode
          key={root.id}
          account={root}
          onSelect={onSelect}
          selectable={selectable}
        />
      ))}
    </div>
  )
}

function AccountNode({ account, onSelect, selectable, level = 0 }: any) {
  const [expanded, setExpanded] = useState(level < 2)

  return (
    <div className="account-node" style={{ marginLeft: level * 20 }}>
      <div className="node-header">
        {account.children?.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '▼' : '▶'}
          </button>
        )}

        <span className="account-code">{account.code}</span>
        <span className="account-name">{account.name}</span>

        {!account.isImputable && (
          <Badge variant="secondary">Grupo</Badge>
        )}

        {selectable && account.isImputable && (
          <button onClick={() => onSelect(account)}>
            Seleccionar
          </button>
        )}
      </div>

      {expanded && account.children?.length > 0 && (
        <div className="node-children">
          {account.children.map((child: any) => (
            <AccountNode
              key={child.id}
              account={child}
              onSelect={onSelect}
              selectable={selectable}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CREAR ASIENTO MANUAL
// ============================================================================

function CreateJournalEntryForm() {
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { accountId: '', debit: 0, credit: 0, description: '', dimensions: [] },
    { accountId: '', debit: 0, credit: 0, description: '', dimensions: [] }
  ])

  const [header, setHeader] = useState({
    date: new Date(),
    description: '',
    entryType: 'REGULAR',
    notes: ''
  })

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const { mutate: createEntry, isPending } = useMutation({
    mutationFn: (data: CreateJournalEntryDto) => journalEntriesApi.create(data),
    onSuccess: () => {
      toast.success('Asiento creado correctamente')
      // Redirect o limpiar form
    }
  })

  const handleSubmit = (status: 'DRAFT' | 'POSTED') => {
    if (!isBalanced) {
      toast.error('El asiento debe estar balanceado')
      return
    }

    createEntry({
      ...header,
      lines,
      status
    })
  }

  return (
    <div className="journal-entry-form">
      {/* Header */}
      <div className="form-header">
        <DatePicker
          label="Fecha"
          value={header.date}
          onChange={date => setHeader({ ...header, date })}
        />

        <Select
          label="Tipo"
          value={header.entryType}
          onChange={type => setHeader({ ...header, entryType: type })}
          options={[
            { value: 'REGULAR', label: 'Regular' },
            { value: 'OPENING', label: 'Apertura' },
            { value: 'ADJUSTMENT', label: 'Ajuste' },
            { value: 'CLOSING', label: 'Cierre' }
          ]}
        />

        <Input
          label="Descripción"
          value={header.description}
          onChange={e => setHeader({ ...header, description: e.target.value })}
        />
      </div>

      {/* Lines */}
      <div className="form-lines">
        <table>
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Descripción</th>
              <th>Debe</th>
              <th>Haber</th>
              <th>Dimensiones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <JournalEntryLineRow
                key={index}
                line={line}
                onChange={updated => {
                  const newLines = [...lines]
                  newLines[index] = updated
                  setLines(newLines)
                }}
                onRemove={() => {
                  setLines(lines.filter((_, i) => i !== index))
                }}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <button onClick={() => setLines([...lines, {
                  accountId: '',
                  debit: 0,
                  credit: 0,
                  description: '',
                  dimensions: []
                }])}>
                  + Agregar línea
                </button>
              </td>
              <td className="font-bold">{totalDebit.toFixed(2)}</td>
              <td className="font-bold">{totalCredit.toFixed(2)}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {!isBalanced && (
          <Alert variant="warning">
            El asiento no está balanceado. Diferencia: {Math.abs(totalDebit - totalCredit).toFixed(2)}
          </Alert>
        )}
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          onClick={() => handleSubmit('DRAFT')}
          disabled={isPending || !isBalanced}
        >
          Guardar como borrador
        </button>

        <button
          onClick={() => handleSubmit('POSTED')}
          disabled={isPending || !isBalanced}
          className="btn-primary"
        >
          Guardar y contabilizar
        </button>
      </div>
    </div>
  )
}

function JournalEntryLineRow({ line, onChange, onRemove }: any) {
  const [showDimensionsModal, setShowDimensionsModal] = useState(false)

  return (
    <tr>
      <td>
        <AccountSelector
          value={line.accountId}
          onChange={accountId => onChange({ ...line, accountId })}
          filter={{ isImputable: true }}
        />
      </td>

      <td>
        <input
          type="text"
          value={line.description}
          onChange={e => onChange({ ...line, description: e.target.value })}
        />
      </td>

      <td>
        <input
          type="number"
          value={line.debit}
          onChange={e => onChange({
            ...line,
            debit: parseFloat(e.target.value) || 0,
            credit: 0 // Auto-clear credit
          })}
        />
      </td>

      <td>
        <input
          type="number"
          value={line.credit}
          onChange={e => onChange({
            ...line,
            credit: parseFloat(e.target.value) || 0,
            debit: 0 // Auto-clear debit
          })}
        />
      </td>

      <td>
        <button onClick={() => setShowDimensionsModal(true)}>
          {line.dimensions?.length > 0
            ? `${line.dimensions.length} dimensiones`
            : 'Agregar dimensiones'}
        </button>

        {showDimensionsModal && (
          <DimensionsModal
            dimensions={line.dimensions}
            onChange={dimensions => {
              onChange({ ...line, dimensions })
              setShowDimensionsModal(false)
            }}
            onClose={() => setShowDimensionsModal(false)}
          />
        )}
      </td>

      <td>
        <button onClick={onRemove}>🗑️</button>
      </td>
    </tr>
  )
}
```

Este documento continúa siendo muy extenso. ¿Deseas que continúe con:

1. **Reportes Frontend** (componentes para visualizar Balance, Estado de Resultados, Mayor, etc.)
2. **Casos de Uso completos** (ejemplos paso a paso)
3. **Roadmap de Implementación** (fases y tareas)
4. **Configuración inicial** (plan de cuentas predeterminado, dimensiones iniciales)

O prefieres que guarde el documento actual y cree archivos adicionales separados para cada sección restante?
