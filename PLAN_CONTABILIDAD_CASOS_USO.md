# Casos de Uso - Módulo Contable

## Casos de Uso Detallados

### Caso 1: Configuración Inicial del Módulo Contable

#### Contexto
Una empresa nueva comienza a usar el ERP y necesita configurar el sistema contable desde cero.

#### Pasos

**1. Crear Plan de Cuentas**

```typescript
// Usuario: Contador (Admin)

// Crear estructura básica
await accountsApi.createBatch([
  // ACTIVO
  { code: '1', name: 'ACTIVO', type: 'ASSET', nature: 'DEBIT', isImputable: false, level: 0 },
  { code: '1.1', name: 'Activo Corriente', parentCode: '1', type: 'ASSET', nature: 'DEBIT', isImputable: false, level: 1 },
  { code: '1.1.01', name: 'Caja y Bancos', parentCode: '1.1', type: 'ASSET', nature: 'DEBIT', isImputable: false, level: 2 },
  { code: '1.1.01.001', name: 'Caja', parentCode: '1.1.01', type: 'ASSET', nature: 'DEBIT', isImputable: true, level: 3 },
  { code: '1.1.01.002', name: 'Banco Nación CC', parentCode: '1.1.01', type: 'ASSET', nature: 'DEBIT', isImputable: true, level: 3 },

  // PASIVO
  { code: '2', name: 'PASIVO', type: 'LIABILITY', nature: 'CREDIT', isImputable: false, level: 0 },
  { code: '2.1', name: 'Pasivo Corriente', parentCode: '2', type: 'LIABILITY', nature: 'CREDIT', isImputable: false, level: 1 },
  { code: '2.1.01', name: 'Proveedores', parentCode: '2.1', type: 'LIABILITY', nature: 'CREDIT', isImputable: true, level: 2 },

  // PATRIMONIO
  { code: '3', name: 'PATRIMONIO NETO', type: 'EQUITY', nature: 'CREDIT', isImputable: false, level: 0 },
  { code: '3.1', name: 'Capital', parentCode: '3', type: 'EQUITY', nature: 'CREDIT', isImputable: true, level: 1 },

  // INGRESOS
  { code: '4', name: 'INGRESOS', type: 'INCOME', nature: 'CREDIT', isImputable: false, level: 0 },
  { code: '4.1', name: 'Ingresos Ordinarios', parentCode: '4', type: 'INCOME', nature: 'CREDIT', isImputable: false, level: 1 },
  { code: '4.1.01', name: 'Ventas', parentCode: '4.1', type: 'INCOME', nature: 'CREDIT', isImputable: true, level: 2 },

  // GASTOS
  { code: '5', name: 'GASTOS', type: 'EXPENSE', nature: 'DEBIT', isImputable: false, level: 0 },
  { code: '5.1', name: 'Gastos de Administración', parentCode: '5', type: 'EXPENSE', nature: 'DEBIT', isImputable: false, level: 1 },
  { code: '5.1.01', name: 'Sueldos y Jornales', parentCode: '5.1', type: 'EXPENSE', nature: 'DEBIT', isImputable: true, level: 2 }
])
```

**2. Crear Dimensiones**

```typescript
// Crear dimensión Centro de Costos
const ccDimension = await dimensionsApi.create({
  code: 'CC',
  name: 'Centro de Costos',
  description: 'Clasificación por área de la empresa',
  isRequired: false
})

// Crear valores
await dimensionValuesApi.createBatch(ccDimension.id, [
  { code: 'ADM', name: 'Administración' },
  { code: 'VTA', name: 'Ventas' },
  { code: 'PROD', name: 'Producción' },
  { code: 'LOG', name: 'Logística' }
])

// Crear dimensión Proyectos
const projDimension = await dimensionsApi.create({
  code: 'PROYECTO',
  name: 'Proyecto',
  description: 'Obras y proyectos en curso'
})

await dimensionValuesApi.create(projDimension.id, {
  code: 'OBRA_001',
  name: 'Edificio Centro'
})
```

**3. Configurar Reglas de Contabilización Automática**

```typescript
// Regla para ventas
await autoAccountingRulesApi.create({
  name: 'Venta al Contado',
  documentType: 'INVOICE',
  conditions: {
    paymentMethod: 'CASH'
  },
  template: {
    lines: [
      {
        accountCode: '1.1.01.001',
        type: 'DEBIT',
        amountField: 'total',
        description: 'Cobro factura {invoiceNumber}'
      },
      {
        accountCode: '4.1.01',
        type: 'CREDIT',
        amountField: 'subtotal',
        description: 'Venta productos'
      },
      {
        accountCode: '2.1.05',
        type: 'CREDIT',
        amountField: 'tax',
        description: 'IVA débito fiscal'
      }
    ]
  },
  priority: 10,
  isActive: true
})
```

**4. Asiento de Apertura**

```typescript
// Registrar asiento de apertura con saldos iniciales
const openingEntry = await journalEntriesApi.create({
  date: new Date('2025-01-01'),
  description: 'Asiento de Apertura - Ejercicio 2025',
  entryType: 'OPENING',
  lines: [
    // Activos
    { accountId: cashAccount.id, debit: 50000, credit: 0, description: 'Saldo inicial caja' },
    { accountId: bankAccount.id, debit: 200000, credit: 0, description: 'Saldo inicial banco' },

    // Pasivos
    { accountId: suppliersAccount.id, debit: 0, credit: 80000, description: 'Deuda proveedores' },

    // Patrimonio (balance)
    { accountId: capitalAccount.id, debit: 0, credit: 170000, description: 'Capital inicial' }
  ]
})

// Contabilizar
await journalEntriesApi.post(openingEntry.id)
```

---

### Caso 2: Flujo Completo de una Venta

#### Contexto
Se registra una venta en el módulo de ventas y automáticamente se genera el asiento contable.

#### Pasos

**1. Usuario registra venta** (Frontend - Ventas)

```typescript
const sale = await salesApi.create({
  date: new Date(),
  entityId: 'customer_123',
  documentClass: 'INVOICE',
  invoiceNumber: 'A-0001-00000123',
  paymentMethod: 'CASH',
  items: [
    { productId: 'prod_1', quantity: 10, unitPrice: 1000, tax: 210 }
  ],
  subtotal: 10000,
  tax: 2100,
  total: 12100
})
```

**2. Sistema detecta creación de venta** (Backend - Hook)

```typescript
// En salesService.ts
async createSale(data) {
  const sale = await prisma.sale.create({ data })

  // Trigger contabilidad
  await this.accountingHook(sale)

  return sale
}

private async accountingHook(sale: Sale) {
  const engine = new AutoAccountingEngine()

  try {
    const entry = await engine.generateEntry({
      documentType: sale.documentClass,
      documentId: sale.id,
      tenantId: sale.tenantId,
      date: sale.date,
      data: {
        invoiceNumber: sale.invoiceNumber,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        paymentMethod: sale.paymentMethod,
        customer: await prisma.entity.findUnique({ where: { id: sale.entityId } })
      }
    })

    console.log(`Asiento generado automáticamente: #${entry.number}`)
  } catch (error) {
    console.error('Error en contabilización automática:', error)
    // Enviar notificación al contador
    await notificationsService.send({
      to: 'contador@empresa.com',
      subject: 'Error en contabilización automática',
      body: `Venta ${sale.invoiceNumber} no pudo contabilizarse automáticamente`
    })
  }
}
```

**3. Motor de contabilización genera asiento**

```typescript
// AutoAccountingEngine encuentra y aplica regla

// Asiento generado:
JournalEntry #152
Fecha: 17/12/2025
Origen: SALE
Referencia: Sale ID abc123

Líneas:
1. Caja (1.1.01.001)                    DEBE: $12,100.00
2. Ventas (4.1.01)                               HABER: $10,000.00
3. IVA Débito Fiscal (2.1.05)                    HABER: $2,100.00

Estado: POSTED (contabilizado automáticamente)
```

**4. Contador puede verificar el asiento**

```typescript
// Frontend - ver asiento desde la venta
<SaleDetail saleId="abc123">
  <AccountingSection>
    {sale.hasAccountingEntry && (
      <Link to={`/accounting/entries/${sale.journalEntryId}`}>
        Ver Asiento Contable #{sale.journalEntry.number}
      </Link>
    )}
  </AccountingSection>
</SaleDetail>

// O desde el módulo contable
<JournalEntriesList>
  <Filter>
    <Input
      label="Buscar por documento origen"
      value="A-0001-00000123"
      onChange={search}
    />
  </Filter>
</JournalEntriesList>
```

---

### Caso 3: Asiento Manual con Dimensiones

#### Contexto
El contador necesita registrar un pago de sueldo de un empleado que trabaja 70% en Producción y 30% en Administración.

#### Pasos

**1. Crear asiento manual**

```typescript
const entry = await journalEntriesApi.create({
  date: new Date(),
  description: 'Pago sueldo Juan Pérez - Diciembre 2025',
  entryType: 'REGULAR',
  notes: 'Empleado trabaja en dos áreas',
  lines: [
    // Línea 1: Gasto de sueldo con distribución dimensional
    {
      accountId: accountSalaries.id, // 5.1.01 - Sueldos y Jornales
      debit: 100000,
      credit: 0,
      description: 'Sueldo Juan Pérez',
      dimensions: [
        {
          dimensionId: ccDimension.id,
          dimensionValueId: prodCostCenter.id,
          percentage: 70 // 70% a Producción
        },
        {
          dimensionId: ccDimension.id,
          dimensionValueId: admCostCenter.id,
          percentage: 30 // 30% a Administración
        }
      ]
    },

    // Línea 2: Salida de caja
    {
      accountId: cashAccount.id, // 1.1.01.001 - Caja
      debit: 0,
      credit: 100000,
      description: 'Pago en efectivo'
    }
  ]
})

// Verificar que está balanceado
console.log('Balanceado:', entry.isBalanced) // true

// Contabilizar
await journalEntriesApi.post(entry.id)
```

**2. Sistema valida y procesa**

```typescript
// En journalEntriesService.ts

async createEntry(tenantId, userId, data) {
  // Validar balance
  const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError('Entry must be balanced', 400)
  }

  // Validar dimensiones
  for (const line of data.lines) {
    if (line.dimensions && line.dimensions.length > 0) {
      // Verificar que los porcentajes sumen 100 por dimensión
      const dimensionGroups = groupBy(line.dimensions, 'dimensionId')

      for (const [dimId, dims] of Object.entries(dimensionGroups)) {
        const totalPercentage = dims.reduce((sum, d) => sum + d.percentage, 0)

        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new AppError(
            `Dimension percentages must sum 100% (found ${totalPercentage}%)`,
            400
          )
        }
      }
    }
  }

  // Crear asiento
  const entry = await prisma.journalEntry.create({
    data: {
      tenantId,
      number: await this.getNextNumber(tenantId),
      ...data,
      createdBy: userId
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
```

**3. Resultados**

```
Asiento #153
Fecha: 17/12/2025
Tipo: REGULAR
Descripción: Pago sueldo Juan Pérez - Diciembre 2025

LÍNEA 1:
  Cuenta: 5.1.01 - Sueldos y Jornales
  Debe: $100,000.00
  Dimensiones:
    - Centro de Costos: Producción (70%)
    - Centro de Costos: Administración (30%)

LÍNEA 2:
  Cuenta: 1.1.01.001 - Caja
  Haber: $100,000.00

Estado: POSTED
```

**4. Impacto en reportes**

```typescript
// Reporte de Centro de Costos mostrará:

Centro de Costos: PRODUCCIÓN
  Gastos de Sueldos: $70,000 (70% de $100,000)

Centro de Costos: ADMINISTRACIÓN
  Gastos de Sueldos: $30,000 (30% de $100,000)
```

---

### Caso 4: Seguimiento de Proyecto con Múltiples Dimensiones

#### Contexto
Una empresa constructora necesita hacer seguimiento de costos e ingresos de un proyecto (Obra Edificio Central) clasificados también por Centro de Costos.

#### Pasos

**1. Registrar venta del proyecto**

```typescript
// Venta: Cuota 1 del proyecto
const sale = await salesApi.create({
  date: new Date(),
  entityId: 'client_builder',
  documentClass: 'INVOICE',
  invoiceNumber: 'B-0001-00000045',
  paymentMethod: 'BANK_TRANSFER',
  total: 500000,
  subtotal: 476190.48,
  tax: 23809.52
})

// Se genera asiento automático, pero necesitamos agregar dimensión de proyecto manualmente
// (o configurar regla que lo haga automáticamente)

const entry = await journalEntriesApi.findBySource('INVOICE', sale.id)

// Agregar dimensión a línea de ingresos
await journalEntriesApi.updateLine(entry.lines[1].id, {
  dimensions: [
    { dimensionId: projectDim.id, dimensionValueId: obra001.id },
    { dimensionId: ccDim.id, dimensionValueId: vtaCostCenter.id }
  ]
})
```

**2. Registrar gastos del proyecto**

```typescript
// Compra de materiales para la obra
const purchase = await purchasesApi.create({
  date: new Date(),
  supplierId: 'supplier_materials',
  total: 200000,
  subtotal: 190476.19,
  tax: 9523.81
})

// Asiento generado automáticamente
// Agregar dimensiones

const purchaseEntry = await journalEntriesApi.findBySource('PURCHASE', purchase.id)

await journalEntriesApi.updateLine(purchaseEntry.lines[0].id, {
  dimensions: [
    { dimensionId: projectDim.id, dimensionValueId: obra001.id },
    { dimensionId: ccDim.id, dimensionValueId: prodCostCenter.id }
  ]
})
```

**3. Pago de sueldos de empleados en la obra**

```typescript
await journalEntriesApi.create({
  date: new Date(),
  description: 'Pago sueldos obreros - Obra Edificio Central',
  entryType: 'REGULAR',
  lines: [
    {
      accountId: salariesAccount.id,
      debit: 150000,
      credit: 0,
      description: 'Sueldos obreros diciembre',
      dimensions: [
        { dimensionId: projectDim.id, dimensionValueId: obra001.id },
        { dimensionId: ccDim.id, dimensionValueId: prodCostCenter.id }
      ]
    },
    {
      accountId: bankAccount.id,
      debit: 0,
      credit: 150000,
      description: 'Transferencia bancaria'
    }
  ]
})
```

**4. Generar reporte de rentabilidad del proyecto**

```typescript
const profitability = await analyticalReportsApi.getProjectProfitability(obra001.id)

// Resultado:
{
  project: {
    code: 'OBRA_001',
    name: 'Edificio Centro'
  },
  totals: {
    income: 500000,      // De la venta
    costs: 200000,       // Materiales
    expenses: 150000,    // Sueldos
    netProfit: 150000    // 500k - 200k - 150k
  },
  overallMargin: 30%,    // 150k / 500k
  timeline: [
    {
      month: '2025-12',
      income: 500000,
      costs: 200000,
      expenses: 150000,
      netProfit: 150000,
      margin: 30
    }
  ]
}
```

**5. Análisis multi-dimensional**

```typescript
// Cruzar Proyecto × Centro de Costos
const analysis = await analyticalReportsApi.getMultiDimensionalAnalysis(
  ['PROYECTO', 'CC'],
  { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
)

// Resultado:
{
  results: [
    {
      dimensions: [
        { dimension: 'Proyecto', value: 'Edificio Centro' },
        { dimension: 'Centro de Costos', value: 'Ventas' }
      ],
      metrics: {
        income: 500000,
        costs: 0,
        expenses: 0,
        netProfit: 500000
      }
    },
    {
      dimensions: [
        { dimension: 'Proyecto', value: 'Edificio Centro' },
        { dimension: 'Centro de Costos', value: 'Producción' }
      ],
      metrics: {
        income: 0,
        costs: 200000,
        expenses: 150000,
        netProfit: -350000
      }
    }
  ]
}

// Interpretación:
// Ventas generó $500k en ingresos para el proyecto
// Producción gastó $350k en costos y gastos para el proyecto
// Ganancia neta del proyecto: $150k
```

---

### Caso 5: Cierre de Mes y Generación de Reportes

#### Contexto
Fin de mes, el contador necesita revisar todo, generar reportes y cerrar el período.

#### Pasos

**1. Verificar balance de comprobación**

```typescript
const trialBalance = await reportsApi.getTrialBalance({
  fiscalYear: 2025,
  fiscalMonth: 12
})

// Revisar que esté balanceado
if (!trialBalance.isBalanced) {
  console.error('⚠ Balance no cuadra! Revisar asientos')
  // Investigar diferencias
}
```

**2. Generar reportes principales**

```typescript
// Balance General
const balance = await reportsApi.getBalanceSheet(new Date('2025-12-31'))

// Exportar a PDF
await pdfExportService.exportBalanceSheet(balance, 'Mi Empresa S.A.')

// Estado de Resultados
const income = await reportsApi.getIncomeStatement({
  from: new Date('2025-12-01'),
  to: new Date('2025-12-31')
})

await pdfExportService.exportIncomeStatement(income, 'Mi Empresa S.A.')

// Flujo de Efectivo
const cashFlow = await reportsApi.getCashFlow({
  from: new Date('2025-12-01'),
  to: new Date('2025-12-31')
})

await pdfExportService.exportCashFlow(cashFlow, 'Mi Empresa S.A.')
```

**3. Análisis de gestión**

```typescript
// Análisis por Centro de Costos
const ccReport = await analyticalReportsApi.getCostCenterReport({
  from: new Date('2025-12-01'),
  to: new Date('2025-12-31')
})

// Identificar centros más/menos rentables
const mostProfitable = ccReport.costCenters.sort((a, b) => b.netProfit - a.netProfit)[0]
const leastProfitable = ccReport.costCenters.sort((a, b) => a.netProfit - b.netProfit)[0]

console.log(`Centro más rentable: ${mostProfitable.costCenter.name} - ${formatCurrency(mostProfitable.netProfit)}`)
console.log(`Centro menos rentable: ${leastProfitable.costCenter.name} - ${formatCurrency(leastProfitable.netProfit)}`)
```

**4. Asiento de cierre (opcional)**

```typescript
// Transferir resultados a patrimonio
const closingEntry = await journalEntriesApi.create({
  date: new Date('2025-12-31'),
  description: 'Cierre de Ejercicio 2025',
  entryType: 'CLOSING',
  lines: [
    // Cerrar ingresos (contrapartida a Resultado del Ejercicio)
    ...incomeAccounts.map(acc => ({
      accountId: acc.id,
      debit: acc.balance,  // Cancelar saldo
      credit: 0,
      description: 'Cierre ingresos'
    })),

    // Cerrar gastos
    ...expenseAccounts.map(acc => ({
      accountId: acc.id,
      debit: 0,
      credit: acc.balance,  // Cancelar saldo
      description: 'Cierre gastos'
    })),

    // Resultado del ejercicio (diferencia)
    {
      accountId: retainedEarningsAccount.id,
      debit: totalExpenses + totalCosts,
      credit: totalIncome,
      description: 'Resultado del ejercicio 2025'
    }
  ]
})
```

---

### Caso 6: Reversión de Asiento Erróneo

#### Contexto
Se detecta un error en un asiento contabilizado. Necesita ser revertido y corregido.

#### Pasos

**1. Identificar asiento erróneo**

```typescript
// Usuario busca en Libro Diario
const entry = await journalEntriesApi.findByNumber(148)

/*
Asiento #148
Fecha: 15/12/2025
Descripción: Pago proveedor ABC

Líneas:
  1. Proveedores (2.1.01)     DEBE: $50,000
  2. Caja (1.1.01.001)                 HABER: $50,000

Estado: POSTED

ERROR: Se pagó con transferencia bancaria, no con efectivo
*/
```

**2. Revertir asiento**

```typescript
const reversalEntry = await journalEntriesApi.reverse(148, {
  date: new Date(),
  reason: 'Corrección: pago fue con transferencia, no efectivo'
})

/*
Se crea automáticamente:

Asiento #167 (Reversión de #148)
Fecha: 17/12/2025
Descripción: Reversión: Pago proveedor ABC - Corrección: pago fue con transferencia, no efectivo

Líneas:
  1. Caja (1.1.01.001)        DEBE: $50,000   (invertido)
  2. Proveedores (2.1.01)              HABER: $50,000   (invertido)

Estado: POSTED
*/

// El asiento original queda marcado como REVERSED
```

**3. Crear asiento correcto**

```typescript
const correctEntry = await journalEntriesApi.create({
  date: new Date('2025-12-15'), // Misma fecha que el original
  description: 'Pago proveedor ABC - CORREGIDO',
  entryType: 'REGULAR',
  lines: [
    {
      accountId: suppliersAccount.id,
      debit: 50000,
      credit: 0,
      description: 'Pago proveedor ABC'
    },
    {
      accountId: bankAccount.id,  // ✅ CORRECTO: Banco en vez de Caja
      debit: 0,
      credit: 50000,
      description: 'Transferencia bancaria'
    }
  ]
})

await journalEntriesApi.post(correctEntry.id)
```

**4. Resultado**

```
Libro Mayor - Caja:
  ... saldo anterior ...
  15/12 - #148: -$50,000 (ERROR)
  17/12 - #167: +$50,000 (REVERSIÓN)
  Efecto neto: $0 ✅

Libro Mayor - Banco:
  ... saldo anterior ...
  15/12 - #168: -$50,000 ✅ (CORRECTO)

Libro Mayor - Proveedores:
  ... saldo anterior ...
  15/12 - #148: -$50,000 (ERROR)
  17/12 - #167: +$50,000 (REVERSIÓN)
  15/12 - #168: -$50,000 ✅ (CORRECTO)
  Efecto neto: -$50,000 ✅
```

---

### Caso 7: Integración con Otros Módulos

#### Contexto
Todas las operaciones del ERP generan asientos contables automáticamente.

#### Módulos Integrados

**A. Ventas → Contabilidad**

```typescript
// VENTA AL CONTADO
Sale → JournalEntry
  Caja          DEBE    (total)
  Ventas                HABER (subtotal)
  IVA DF                HABER (tax)

// VENTA A CRÉDITO
Sale → JournalEntry
  Deudores      DEBE    (total)
  Ventas                HABER (subtotal)
  IVA DF                HABER (tax)
```

**B. Compras → Contabilidad**

```typescript
// COMPRA A CRÉDITO
Purchase → JournalEntry
  Compras       DEBE    (subtotal)
  IVA CF        DEBE    (tax)
  Proveedores           HABER (total)

// COMPRA AL CONTADO
Purchase → JournalEntry
  Compras       DEBE    (subtotal)
  IVA CF        DEBE    (tax)
  Caja/Banco            HABER (total)
```

**C. Pagos → Contabilidad**

```typescript
// PAGO A PROVEEDOR
Payment → JournalEntry
  Proveedores   DEBE    (amount)
  Banco                 HABER (amount)

// COBRO DE CLIENTE
Payment → JournalEntry
  Banco         DEBE    (amount)
  Deudores              HABER (amount)
```

**D. Inventario → Contabilidad**

```typescript
// AJUSTE DE INVENTARIO (Pérdida)
StockAdjustment → JournalEntry
  Pérdidas Inv. DEBE    (cost)
  Inventario            HABER (cost)

// AJUSTE DE INVENTARIO (Ganancia/Descubrimiento)
StockAdjustment → JournalEntry
  Inventario    DEBE    (cost)
  Ganancias Inv.        HABER (cost)

// TRANSFERENCIA ENTRE DEPÓSITOS
Transfer → JournalEntry (opcional - depende de configuración)
  Inventario Dep B  DEBE    (cost)
  Inventario Dep A          HABER (cost)
```

**E. Nómina → Contabilidad** (Futuro)

```typescript
// PAGO DE SUELDOS
Payroll → JournalEntry
  Sueldos           DEBE    (gross)
  Cargas Sociales   DEBE    (employer_taxes)
  Retenciones               HABER (employee_taxes)
  Banco                     HABER (net_pay)
  Cargas a Pagar            HABER (employer_taxes)
```

---

### Caso 8: Migración de Datos Históricos

#### Contexto
Una empresa migra de otro sistema y necesita importar saldos iniciales.

#### Pasos

**1. Preparar archivo de importación**

```csv
Código,Nombre,Debe,Haber
1.1.01.001,Caja,50000,0
1.1.01.002,Banco Nación,200000,0
1.1.02.001,Deudores por Ventas,150000,0
1.1.03.001,Inventario Productos,300000,0
2.1.01.001,Proveedores,0,80000
2.1.02.001,Préstamos Bancarios,0,250000
3.1.00.001,Capital Social,0,370000
```

**2. Importar mediante script**

```typescript
async function importOpeningBalances(filePath: string, date: Date) {
  const rows = await parseCSV(filePath)

  const lines = []

  for (const row of rows) {
    const account = await prisma.account.findFirst({
      where: { code: row.Código }
    })

    if (!account) {
      console.warn(`Cuenta ${row.Código} no encontrada, saltando...`)
      continue
    }

    const debit = parseFloat(row.Debe) || 0
    const credit = parseFloat(row.Haber) || 0

    if (debit > 0 || credit > 0) {
      lines.push({
        accountId: account.id,
        debit,
        credit,
        description: `Saldo inicial ${account.name}`
      })
    }
  }

  // Crear asiento de apertura
  const entry = await journalEntriesApi.create({
    date,
    description: 'Asiento de Apertura - Migración de Sistema',
    entryType: 'OPENING',
    lines
  })

  // Verificar balance
  if (!entry.isBalanced) {
    throw new Error('Los saldos iniciales no están balanceados')
  }

  // Contabilizar
  await journalEntriesApi.post(entry.id)

  console.log(`✅ Asiento de apertura creado: #${entry.number}`)
  console.log(`Total Debe: ${formatCurrency(entry.totalDebit)}`)
  console.log(`Total Haber: ${formatCurrency(entry.totalCredit)}`)
}

// Ejecutar
await importOpeningBalances('./opening_balances.csv', new Date('2025-01-01'))
```

---

## Resumen de Casos de Uso

| # | Caso de Uso | Actor Principal | Módulos Involucrados |
|---|-------------|-----------------|----------------------|
| 1 | Configuración inicial | Contador/Admin | Accounts, Dimensions, Rules |
| 2 | Venta con contabilización automática | Vendedor + Sistema | Sales, Accounting |
| 3 | Asiento manual con dimensiones | Contador | Accounting, Dimensions |
| 4 | Seguimiento de proyecto | Contador/PM | Accounting, Dimensions, Analytics |
| 5 | Cierre de mes | Contador | Accounting, Reports |
| 6 | Reversión de asiento | Contador | Accounting |
| 7 | Integración multi-módulo | Sistema | All modules |
| 8 | Migración de datos | Admin/Contador | Accounting, Import |

Todos los casos de uso documentados y listos para implementación.
