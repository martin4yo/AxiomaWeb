# Reportes Adicionales - Módulo Contable

## Catálogo Completo de Reportes

### 1. Libro Diario (Journal Book)

Listado cronológico de todos los asientos contables.

**Filtros**:
- Rango de fechas
- Tipo de asiento
- Estado (posted, draft, etc.)
- Número de asiento

**Columnas**:
- Número de asiento
- Fecha
- Descripción
- Cuenta
- Debe
- Haber
- Dimensiones

### 2. Libro Mayor (General Ledger)

Movimientos de una cuenta específica con saldo acumulado.

**Frontend Component**:

```typescript
function GeneralLedgerReport() {
  const [filters, setFilters] = useState({
    accountId: '',
    dateFrom: startOfMonth(new Date()),
    dateTo: endOfMonth(new Date())
  })

  const { data: ledger } = useQuery({
    queryKey: ['general-ledger', filters],
    queryFn: () => reportsApi.getGeneralLedger(filters),
    enabled: !!filters.accountId
  })

  return (
    <div>
      <div className="filters">
        <AccountSelector
          label="Cuenta"
          value={filters.accountId}
          onChange={accountId => setFilters({ ...filters, accountId })}
          filter={{ isImputable: true }}
        />

        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => setFilters({ ...filters, dateFrom: from, dateTo: to })}
        />
      </div>

      {ledger && (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asiento</th>
              <th>Descripción</th>
              <th>Debe</th>
              <th>Haber</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((line, index) => (
              <tr key={line.id}>
                <td>{format(line.journalEntry.date, 'dd/MM/yyyy')}</td>
                <td>#{line.journalEntry.number}</td>
                <td>{line.description || line.journalEntry.description}</td>
                <td className="text-right">
                  {line.debit > 0 ? formatCurrency(line.debit) : ''}
                </td>
                <td className="text-right">
                  {line.credit > 0 ? formatCurrency(line.credit) : ''}
                </td>
                <td className="text-right font-bold">
                  {formatCurrency(line.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

### 3. Balance de Comprobación (Trial Balance)

Resumen de saldos de todas las cuentas en un período.

```typescript
function TrialBalanceReport() {
  const [period, setPeriod] = useState({
    fiscalYear: new Date().getFullYear(),
    fiscalMonth: new Date().getMonth() + 1
  })

  const { data: trial } = useQuery({
    queryKey: ['trial-balance', period],
    queryFn: () => reportsApi.getTrialBalance(period)
  })

  return (
    <div>
      <div className="filters">
        <Select
          label="Año"
          value={period.fiscalYear}
          onChange={year => setPeriod({ ...period, fiscalYear: year })}
          options={generateYearOptions()}
        />

        <Select
          label="Mes"
          value={period.fiscalMonth}
          onChange={month => setPeriod({ ...period, fiscalMonth: month })}
          options={MONTHS}
        />
      </div>

      {trial && (
        <>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cuenta</th>
                <th>Debe (Movimientos)</th>
                <th>Haber (Movimientos)</th>
                <th>Saldo Deudor</th>
                <th>Saldo Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {trial.accounts.map(acc => (
                <tr key={acc.code}>
                  <td>{acc.code}</td>
                  <td>{acc.name}</td>
                  <td className="text-right">{formatCurrency(acc.totalDebit)}</td>
                  <td className="text-right">{formatCurrency(acc.totalCredit)}</td>
                  <td className="text-right">
                    {acc.debitBalance > 0 ? formatCurrency(acc.debitBalance) : ''}
                  </td>
                  <td className="text-right">
                    {acc.creditBalance > 0 ? formatCurrency(acc.creditBalance) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={2}>TOTALES</td>
                <td className="text-right">{formatCurrency(trial.totals.totalDebits)}</td>
                <td className="text-right">{formatCurrency(trial.totals.totalCredits)}</td>
                <td className="text-right">{formatCurrency(trial.totals.totalDebitBalances)}</td>
                <td className="text-right">{formatCurrency(trial.totals.totalCreditBalances)}</td>
              </tr>
            </tfoot>
          </table>

          {trial.isBalanced ? (
            <Alert variant="success">✓ Balance verificado correctamente</Alert>
          ) : (
            <Alert variant="error">⚠ El balance no cuadra</Alert>
          )}
        </>
      )}
    </div>
  )
}
```

### 4. Estado de Situación Patrimonial (Balance Sheet)

```typescript
function BalanceSheetReport() {
  const [date, setDate] = useState(new Date())

  const { data: balance } = useQuery({
    queryKey: ['balance-sheet', date],
    queryFn: () => reportsApi.getBalanceSheet(date)
  })

  return (
    <div className="balance-sheet">
      <div className="filters">
        <DatePicker
          label="Al"
          value={date}
          onChange={setDate}
        />

        <button onClick={() => exportToPDF(balance)}>
          Exportar PDF
        </button>
      </div>

      {balance && (
        <div className="balance-container">
          {/* ACTIVO */}
          <div className="section">
            <h3>ACTIVO</h3>
            <table>
              <tbody>
                {balance.assets.accounts.map(acc => (
                  <tr key={acc.code}>
                    <td>{acc.code}</td>
                    <td>{acc.name}</td>
                    <td className="text-right">{formatCurrency(acc.balance)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2}>TOTAL ACTIVO</td>
                  <td className="text-right">{formatCurrency(balance.assets.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PASIVO */}
          <div className="section">
            <h3>PASIVO</h3>
            <table>
              <tbody>
                {balance.liabilities.accounts.map(acc => (
                  <tr key={acc.code}>
                    <td>{acc.code}</td>
                    <td>{acc.name}</td>
                    <td className="text-right">{formatCurrency(acc.balance)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2}>TOTAL PASIVO</td>
                  <td className="text-right">{formatCurrency(balance.liabilities.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PATRIMONIO NETO */}
          <div className="section">
            <h3>PATRIMONIO NETO</h3>
            <table>
              <tbody>
                {balance.equity.accounts.map(acc => (
                  <tr key={acc.code}>
                    <td>{acc.code}</td>
                    <td>{acc.name}</td>
                    <td className="text-right">{formatCurrency(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td></td>
                  <td>Resultado del Ejercicio</td>
                  <td className="text-right">{formatCurrency(balance.equity.netIncome)}</td>
                </tr>
                <tr className="total-row">
                  <td colSpan={2}>TOTAL PATRIMONIO NETO</td>
                  <td className="text-right">
                    {formatCurrency(balance.equity.total + balance.equity.netIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verificación */}
          <div className="verification">
            <table>
              <tbody>
                <tr className="font-bold">
                  <td>TOTAL ACTIVO</td>
                  <td className="text-right">{formatCurrency(balance.totalAssets)}</td>
                </tr>
                <tr className="font-bold">
                  <td>TOTAL PASIVO + PATRIMONIO NETO</td>
                  <td className="text-right">
                    {formatCurrency(balance.totalLiabilitiesAndEquity)}
                  </td>
                </tr>
              </tbody>
            </table>

            {balance.isBalanced ? (
              <Alert variant="success">✓ Balance equilibrado</Alert>
            ) : (
              <Alert variant="error">⚠ Diferencia detectada</Alert>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 5. Estado de Resultados (Income Statement / P&L)

```typescript
function IncomeStatementReport() {
  const [period, setPeriod] = useState({
    from: startOfYear(new Date()),
    to: endOfYear(new Date())
  })

  const { data: income } = useQuery({
    queryKey: ['income-statement', period],
    queryFn: () => reportsApi.getIncomeStatement(period)
  })

  return (
    <div className="income-statement">
      <div className="filters">
        <DateRangePicker
          from={period.from}
          to={period.to}
          onChange={(from, to) => setPeriod({ from, to })}
        />

        <button onClick={() => exportToExcel(income)}>
          Exportar Excel
        </button>
      </div>

      {income && (
        <table className="styled-table">
          <tbody>
            {/* INGRESOS */}
            <tr className="section-header">
              <td colSpan={2}>INGRESOS</td>
              <td></td>
            </tr>
            {income.income.accounts.map(acc => (
              <tr key={acc.code}>
                <td className="indent">{acc.code}</td>
                <td>{acc.name}</td>
                <td className="text-right">{formatCurrency(acc.balance)}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td colSpan={2}>Total Ingresos</td>
              <td className="text-right">{formatCurrency(income.income.total)}</td>
            </tr>

            {/* COSTO DE VENTAS */}
            <tr className="section-header">
              <td colSpan={2}>COSTO DE VENTAS</td>
              <td></td>
            </tr>
            {income.costOfSales.accounts.map(acc => (
              <tr key={acc.code}>
                <td className="indent">{acc.code}</td>
                <td>{acc.name}</td>
                <td className="text-right">({formatCurrency(acc.balance)})</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td colSpan={2}>Total Costo de Ventas</td>
              <td className="text-right">({formatCurrency(income.costOfSales.total)})</td>
            </tr>

            {/* GANANCIA BRUTA */}
            <tr className="total-highlight">
              <td colSpan={2}><strong>GANANCIA BRUTA</strong></td>
              <td className="text-right">
                <strong>{formatCurrency(income.grossProfit)}</strong>
              </td>
            </tr>

            {/* GASTOS */}
            <tr className="section-header">
              <td colSpan={2}>GASTOS OPERATIVOS</td>
              <td></td>
            </tr>
            {income.expenses.accounts.map(acc => (
              <tr key={acc.code}>
                <td className="indent">{acc.code}</td>
                <td>{acc.name}</td>
                <td className="text-right">({formatCurrency(acc.balance)})</td>
              </tr>
            ))}
            <tr className="subtotal">
              <td colSpan={2}>Total Gastos</td>
              <td className="text-right">({formatCurrency(income.expenses.total)})</td>
            </tr>

            {/* RESULTADO OPERATIVO */}
            <tr className="total-highlight">
              <td colSpan={2}><strong>RESULTADO OPERATIVO</strong></td>
              <td className="text-right">
                <strong>{formatCurrency(income.operatingProfit)}</strong>
              </td>
            </tr>

            {/* RESULTADO NETO */}
            <tr className="final-total">
              <td colSpan={2}><strong>RESULTADO NETO</strong></td>
              <td className="text-right">
                <strong className={income.netProfit >= 0 ? 'text-green' : 'text-red'}>
                  {formatCurrency(income.netProfit)}
                </strong>
              </td>
            </tr>

            {/* MÁRGENES */}
            <tr className="margin-info">
              <td colSpan={2}>Margen Bruto</td>
              <td className="text-right">
                {((income.grossProfit / income.income.total) * 100).toFixed(2)}%
              </td>
            </tr>
            <tr className="margin-info">
              <td colSpan={2}>Margen Neto</td>
              <td className="text-right">
                {((income.netProfit / income.income.total) * 100).toFixed(2)}%
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
```

### 6. Análisis por Centro de Costos

```typescript
function CostCenterAnalysisReport() {
  const [period, setPeriod] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })

  const { data: report } = useQuery({
    queryKey: ['cost-center-report', period],
    queryFn: () => analyticalReportsApi.getCostCenterReport(period)
  })

  return (
    <div>
      <h2>Análisis por Centro de Costos</h2>

      <DateRangePicker
        from={period.from}
        to={period.to}
        onChange={(from, to) => setPeriod({ from, to })}
      />

      {report && (
        <>
          {/* Tabla */}
          <table className="cost-center-table">
            <thead>
              <tr>
                <th>Centro de Costos</th>
                <th>Ingresos</th>
                <th>Costo Ventas</th>
                <th>Ganancia Bruta</th>
                <th>Gastos</th>
                <th>Ganancia Neta</th>
                <th>Margen %</th>
              </tr>
            </thead>
            <tbody>
              {report.costCenters.map(cc => (
                <tr key={cc.costCenter.code}>
                  <td>{cc.costCenter.name}</td>
                  <td className="text-right">{formatCurrency(cc.income)}</td>
                  <td className="text-right">({formatCurrency(cc.costOfSales)})</td>
                  <td className="text-right">{formatCurrency(cc.grossProfit)}</td>
                  <td className="text-right">({formatCurrency(cc.expenses)})</td>
                  <td className={`text-right ${cc.netProfit >= 0 ? 'text-green' : 'text-red'}`}>
                    {formatCurrency(cc.netProfit)}
                  </td>
                  <td className="text-right">{cc.margin.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td>TOTALES</td>
                <td className="text-right">{formatCurrency(report.totals.income)}</td>
                <td className="text-right">({formatCurrency(report.totals.costOfSales)})</td>
                <td className="text-right">
                  {formatCurrency(report.totals.income - report.totals.costOfSales)}
                </td>
                <td className="text-right">({formatCurrency(report.totals.expenses)})</td>
                <td className="text-right">{formatCurrency(report.totals.netProfit)}</td>
                <td className="text-right">
                  {((report.totals.netProfit / report.totals.income) * 100).toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Gráfico de barras */}
          <div className="chart-container">
            <BarChart
              data={report.costCenters.map(cc => ({
                name: cc.costCenter.name,
                Ingresos: cc.income,
                Gastos: cc.expenses,
                'Ganancia Neta': cc.netProfit
              }))}
              xAxis="name"
              bars={['Ingresos', 'Gastos', 'Ganancia Neta']}
            />
          </div>

          {/* Gráfico de pastel - participación en ganancia */}
          <div className="chart-container">
            <PieChart
              data={report.costCenters
                .filter(cc => cc.netProfit > 0)
                .map(cc => ({
                  name: cc.costCenter.name,
                  value: cc.netProfit
                }))}
              title="Contribución a Ganancia Neta"
            />
          </div>
        </>
      )}
    </div>
  )
}
```

### 7. Seguimiento de Proyectos / Obras en Curso

```typescript
function ProjectProfitabilityReport() {
  const [selectedProject, setSelectedProject] = useState<string>('')

  const { data: projects } = useQuery({
    queryKey: ['project-dimensions'],
    queryFn: () => dimensionsApi.getValues('PROYECTO')
  })

  const { data: profitability } = useQuery({
    queryKey: ['project-profitability', selectedProject],
    queryFn: () => analyticalReportsApi.getProjectProfitability(selectedProject),
    enabled: !!selectedProject
  })

  return (
    <div>
      <h2>Rentabilidad por Proyecto</h2>

      <Select
        label="Proyecto"
        value={selectedProject}
        onChange={setSelectedProject}
        options={projects?.map(p => ({ value: p.id, label: p.name }))}
      />

      {profitability && (
        <>
          {/* Header */}
          <div className="project-header">
            <h3>{profitability.project.name}</h3>
            <div className="metrics">
              <MetricCard
                label="Ingresos Totales"
                value={formatCurrency(profitability.totals.income)}
                variant="blue"
              />
              <MetricCard
                label="Costos Totales"
                value={formatCurrency(profitability.totals.costs)}
                variant="orange"
              />
              <MetricCard
                label="Gastos Totales"
                value={formatCurrency(profitability.totals.expenses)}
                variant="red"
              />
              <MetricCard
                label="Ganancia Neta"
                value={formatCurrency(profitability.totals.netProfit)}
                variant={profitability.totals.netProfit >= 0 ? 'green' : 'red'}
              />
              <MetricCard
                label="Margen"
                value={`${profitability.overallMargin.toFixed(2)}%`}
                variant="purple"
              />
            </div>
          </div>

          {/* Timeline mensual */}
          <div className="timeline">
            <h4>Evolución Mensual</h4>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ingresos</th>
                  <th>Costos</th>
                  <th>Gastos</th>
                  <th>Ganancia Bruta</th>
                  <th>Ganancia Neta</th>
                  <th>Margen %</th>
                </tr>
              </thead>
              <tbody>
                {profitability.timeline.map(month => (
                  <tr key={month.month}>
                    <td>{month.month}</td>
                    <td className="text-right">{formatCurrency(month.income)}</td>
                    <td className="text-right">({formatCurrency(month.costs)})</td>
                    <td className="text-right">({formatCurrency(month.expenses)})</td>
                    <td className="text-right">{formatCurrency(month.grossProfit)}</td>
                    <td className={`text-right ${month.netProfit >= 0 ? 'text-green' : 'text-red'}`}>
                      {formatCurrency(month.netProfit)}
                    </td>
                    <td className="text-right">{month.margin.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráfico de evolución */}
          <div className="chart-container">
            <LineChart
              data={profitability.timeline}
              xAxis="month"
              lines={[
                { key: 'income', name: 'Ingresos', color: '#4CAF50' },
                { key: 'costs', name: 'Costos', color: '#FF9800' },
                { key: 'netProfit', name: 'Ganancia Neta', color: '#2196F3' }
              ]}
            />
          </div>

          {/* Gráfico de margen */}
          <div className="chart-container">
            <AreaChart
              data={profitability.timeline}
              xAxis="month"
              areas={[
                { key: 'margin', name: 'Margen %', color: '#9C27B0' }
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}
```

### 8. Flujo de Efectivo (Cash Flow)

```typescript
interface CashFlowReportService {
  async getCashFlowReport(tenantId: string, period: { from: Date; to: Date }) {
    // Obtener cuentas de efectivo
    const cashAccounts = await prisma.account.findMany({
      where: {
        tenantId,
        code: { startsWith: '1.1.01' }, // Caja y Bancos
        isActive: true
      }
    })

    const cashAccountIds = cashAccounts.map(acc => acc.id)

    // Obtener movimientos
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId: { in: cashAccountIds },
        journalEntry: {
          status: 'POSTED',
          date: { gte: period.from, lte: period.to }
        }
      },
      include: {
        account: true,
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        }
      },
      orderBy: {
        journalEntry: { date: 'asc' }
      }
    })

    // Clasificar por tipo de flujo
    const flows = {
      operating: { inflows: 0, outflows: 0 },
      investing: { inflows: 0, outflows: 0 },
      financing: { inflows: 0, outflows: 0 }
    }

    lines.forEach(line => {
      const amount = Number(line.debit) || Number(line.credit)
      const isInflow = Number(line.debit) > 0

      // Clasificar según contrapartida
      const otherLine = line.journalEntry.lines.find(l => l.id !== line.id)
      const otherAccount = otherLine?.account

      let category: 'operating' | 'investing' | 'financing' = 'operating'

      if (otherAccount) {
        // Inversiones: compra/venta de activos fijos
        if (otherAccount.code.startsWith('1.2')) {
          category = 'investing'
        }
        // Financiamiento: préstamos, aportes de capital
        else if (otherAccount.code.startsWith('2.2') || otherAccount.code.startsWith('3.')) {
          category = 'financing'
        }
        // Operativo: resto (ventas, compras, gastos, etc.)
        else {
          category = 'operating'
        }
      }

      if (isInflow) {
        flows[category].inflows += amount
      } else {
        flows[category].outflows += amount
      }
    })

    // Calcular saldo inicial y final
    const initialBalance = await this.getAccountsBalance(
      cashAccountIds,
      new Date(period.from.getTime() - 1)
    )

    const finalBalance = await this.getAccountsBalance(cashAccountIds, period.to)

    return {
      period,
      initialBalance,
      finalBalance,
      netChange: finalBalance - initialBalance,
      operating: {
        ...flows.operating,
        net: flows.operating.inflows - flows.operating.outflows
      },
      investing: {
        ...flows.investing,
        net: flows.investing.inflows - flows.investing.outflows
      },
      financing: {
        ...flows.financing,
        net: flows.financing.inflows - flows.financing.outflows
      }
    }
  }

  private async getAccountsBalance(accountIds: string[], date: Date): Promise<number> {
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        accountId: { in: accountIds },
        journalEntry: {
          status: 'POSTED',
          date: { lte: date }
        }
      }
    })

    return lines.reduce((sum, line) => {
      return sum + Number(line.debit) - Number(line.credit)
    }, 0)
  }
}

// Frontend
function CashFlowReport() {
  const [period, setPeriod] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })

  const { data: cashFlow } = useQuery({
    queryKey: ['cash-flow', period],
    queryFn: () => reportsApi.getCashFlow(period)
  })

  return (
    <div className="cash-flow-report">
      <h2>Estado de Flujo de Efectivo</h2>

      <DateRangePicker
        from={period.from}
        to={period.to}
        onChange={(from, to) => setPeriod({ from, to })}
      />

      {cashFlow && (
        <table className="cash-flow-table">
          <tbody>
            <tr className="balance-row">
              <td>Saldo Inicial de Efectivo</td>
              <td className="text-right">{formatCurrency(cashFlow.initialBalance)}</td>
            </tr>

            {/* Actividades Operativas */}
            <tr className="section-header">
              <td colSpan={2}><strong>ACTIVIDADES OPERATIVAS</strong></td>
            </tr>
            <tr>
              <td className="indent">Cobros de clientes</td>
              <td className="text-right text-green">
                +{formatCurrency(cashFlow.operating.inflows)}
              </td>
            </tr>
            <tr>
              <td className="indent">Pagos a proveedores y empleados</td>
              <td className="text-right text-red">
                -{formatCurrency(cashFlow.operating.outflows)}
              </td>
            </tr>
            <tr className="subtotal">
              <td>Efectivo neto de actividades operativas</td>
              <td className={`text-right ${cashFlow.operating.net >= 0 ? 'text-green' : 'text-red'}`}>
                {formatCurrency(cashFlow.operating.net)}
              </td>
            </tr>

            {/* Actividades de Inversión */}
            <tr className="section-header">
              <td colSpan={2}><strong>ACTIVIDADES DE INVERSIÓN</strong></td>
            </tr>
            <tr>
              <td className="indent">Ventas de activos</td>
              <td className="text-right text-green">
                +{formatCurrency(cashFlow.investing.inflows)}
              </td>
            </tr>
            <tr>
              <td className="indent">Compras de activos</td>
              <td className="text-right text-red">
                -{formatCurrency(cashFlow.investing.outflows)}
              </td>
            </tr>
            <tr className="subtotal">
              <td>Efectivo neto de actividades de inversión</td>
              <td className={`text-right ${cashFlow.investing.net >= 0 ? 'text-green' : 'text-red'}`}>
                {formatCurrency(cashFlow.investing.net)}
              </td>
            </tr>

            {/* Actividades de Financiamiento */}
            <tr className="section-header">
              <td colSpan={2}><strong>ACTIVIDADES DE FINANCIAMIENTO</strong></td>
            </tr>
            <tr>
              <td className="indent">Préstamos recibidos / Aportes de capital</td>
              <td className="text-right text-green">
                +{formatCurrency(cashFlow.financing.inflows)}
              </td>
            </tr>
            <tr>
              <td className="indent">Pago de préstamos / Dividendos</td>
              <td className="text-right text-red">
                -{formatCurrency(cashFlow.financing.outflows)}
              </td>
            </tr>
            <tr className="subtotal">
              <td>Efectivo neto de actividades de financiamiento</td>
              <td className={`text-right ${cashFlow.financing.net >= 0 ? 'text-green' : 'text-red'}`}>
                {formatCurrency(cashFlow.financing.net)}
              </td>
            </tr>

            {/* Variación neta */}
            <tr className="total-highlight">
              <td><strong>VARIACIÓN NETA DE EFECTIVO</strong></td>
              <td className={`text-right ${cashFlow.netChange >= 0 ? 'text-green' : 'text-red'}`}>
                <strong>{formatCurrency(cashFlow.netChange)}</strong>
              </td>
            </tr>

            {/* Saldo final */}
            <tr className="balance-row">
              <td><strong>Saldo Final de Efectivo</strong></td>
              <td className="text-right">
                <strong>{formatCurrency(cashFlow.finalBalance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
```

### 9. Análisis Multi-dimensional

```typescript
function MultiDimensionalAnalysisReport() {
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
  const [period, setPeriod] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })

  const { data: availableDimensions } = useQuery({
    queryKey: ['dimensions'],
    queryFn: () => dimensionsApi.getAll()
  })

  const { data: analysis } = useQuery({
    queryKey: ['multi-dimensional-analysis', selectedDimensions, period],
    queryFn: () => analyticalReportsApi.getMultiDimensionalAnalysis(
      selectedDimensions,
      period
    ),
    enabled: selectedDimensions.length >= 2
  })

  return (
    <div>
      <h2>Análisis Multi-dimensional</h2>

      <MultiSelect
        label="Seleccionar Dimensiones (mínimo 2)"
        options={availableDimensions?.map(d => ({ value: d.code, label: d.name }))}
        value={selectedDimensions}
        onChange={setSelectedDimensions}
      />

      <DateRangePicker
        from={period.from}
        to={period.to}
        onChange={(from, to) => setPeriod({ from, to })}
      />

      {analysis && (
        <div>
          <div className="dimensions-info">
            <p>Analizando: {analysis.dimensions.map(d => d.name).join(' × ')}</p>
          </div>

          {/* Tabla de resultados */}
          <table className="multi-dim-table">
            <thead>
              <tr>
                {analysis.dimensions.map(dim => (
                  <th key={dim.code}>{dim.name}</th>
                ))}
                <th>Ingresos</th>
                <th>Costos</th>
                <th>Gastos</th>
                <th>Ganancia Neta</th>
              </tr>
            </thead>
            <tbody>
              {analysis.results.map((result, index) => (
                <tr key={index}>
                  {result.dimensions.map((dim, dimIndex) => (
                    <td key={dimIndex}>{dim.value}</td>
                  ))}
                  <td className="text-right">{formatCurrency(result.metrics.income)}</td>
                  <td className="text-right">({formatCurrency(result.metrics.costs)})</td>
                  <td className="text-right">({formatCurrency(result.metrics.expenses)})</td>
                  <td className={`text-right ${
                    result.metrics.netProfit >= 0 ? 'text-green' : 'text-red'
                  }`}>
                    {formatCurrency(result.metrics.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Visualización en matriz (para 2 dimensiones) */}
          {selectedDimensions.length === 2 && (
            <HeatMap
              data={analysis.results}
              xDimension={analysis.dimensions[0].name}
              yDimension={analysis.dimensions[1].name}
              metric="netProfit"
            />
          )}
        </div>
      )}
    </div>
  )
}
```

### 10. Dashboard Ejecutivo

```typescript
function AccountingDashboard() {
  const [period, setPeriod] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })

  const { data: summary } = useQuery({
    queryKey: ['accounting-summary', period],
    queryFn: () => reportsApi.getExecutiveSummary(period)
  })

  return (
    <div className="accounting-dashboard">
      <h1>Dashboard Contable</h1>

      <DateRangePicker
        from={period.from}
        to={period.to}
        onChange={(from, to) => setPeriod({ from, to })}
        presets={[
          { label: 'Este Mes', value: 'current-month' },
          { label: 'Mes Anterior', value: 'last-month' },
          { label: 'Este Trimestre', value: 'current-quarter' },
          { label: 'Este Año', value: 'current-year' }
        ]}
      />

      {summary && (
        <div className="dashboard-grid">
          {/* KPIs principales */}
          <div className="kpi-section">
            <KPICard
              title="Ingresos del Período"
              value={formatCurrency(summary.income)}
              change={summary.incomeChange}
              trend={summary.incomeTrend}
            />
            <KPICard
              title="Gastos del Período"
              value={formatCurrency(summary.expenses)}
              change={summary.expensesChange}
              trend={summary.expensesTrend}
            />
            <KPICard
              title="Ganancia Neta"
              value={formatCurrency(summary.netProfit)}
              change={summary.profitChange}
              trend={summary.profitTrend}
              variant={summary.netProfit >= 0 ? 'success' : 'danger'}
            />
            <KPICard
              title="Margen Neto"
              value={`${summary.netMargin.toFixed(2)}%`}
              change={summary.marginChange}
            />
          </div>

          {/* Gráfico de evolución */}
          <div className="chart-section">
            <h3>Evolución Mensual</h3>
            <LineChart
              data={summary.monthlyEvolution}
              xAxis="month"
              lines={[
                { key: 'income', name: 'Ingresos', color: '#4CAF50' },
                { key: 'expenses', name: 'Gastos', color: '#F44336' },
                { key: 'profit', name: 'Ganancia', color: '#2196F3' }
              ]}
            />
          </div>

          {/* Balance resumido */}
          <div className="balance-snapshot">
            <h3>Balance al {format(period.to, 'dd/MM/yyyy')}</h3>
            <div className="balance-cards">
              <BalanceCard
                title="Activos"
                value={summary.totalAssets}
                items={summary.topAssets}
              />
              <BalanceCard
                title="Pasivos"
                value={summary.totalLiabilities}
                items={summary.topLiabilities}
              />
              <BalanceCard
                title="Patrimonio"
                value={summary.totalEquity}
                variant="primary"
              />
            </div>
          </div>

          {/* Top cuentas */}
          <div className="top-accounts">
            <h3>Top 5 Gastos</h3>
            <BarChart
              data={summary.topExpenses}
              xAxis="account"
              bars={['amount']}
              horizontal
            />
          </div>

          {/* Centros de costo */}
          <div className="cost-centers">
            <h3>Rentabilidad por Centro de Costos</h3>
            <PieChart
              data={summary.costCentersProfitability}
              nameKey="name"
              valueKey="profit"
            />
          </div>

          {/* Alertas */}
          <div className="alerts-section">
            <h3>Alertas y Notificaciones</h3>
            {summary.alerts.map(alert => (
              <Alert key={alert.id} variant={alert.severity}>
                {alert.message}
              </Alert>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Exportación de Reportes

### PDF Export

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

class PDFExportService {
  exportBalanceSheet(balance: BalanceSheet, tenantName: string) {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.text(tenantName, 14, 15)
    doc.setFontSize(12)
    doc.text('Estado de Situación Patrimonial', 14, 22)
    doc.setFontSize(10)
    doc.text(`Al ${format(balance.date, 'dd/MM/yyyy')}`, 14, 28)

    let yPos = 35

    // ACTIVO
    doc.setFontSize(11)
    doc.text('ACTIVO', 14, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Cuenta', 'Importe']],
      body: balance.assets.accounts.map(acc => [
        acc.code,
        acc.name,
        formatCurrency(acc.balance)
      ]),
      foot: [['', 'TOTAL ACTIVO', formatCurrency(balance.assets.total)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
      footStyles: { fontStyle: 'bold' }
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // PASIVO
    doc.text('PASIVO', 14, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Cuenta', 'Importe']],
      body: balance.liabilities.accounts.map(acc => [
        acc.code,
        acc.name,
        formatCurrency(acc.balance)
      ]),
      foot: [['', 'TOTAL PASIVO', formatCurrency(balance.liabilities.total)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [217, 83, 79] }
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // PATRIMONIO NETO
    doc.text('PATRIMONIO NETO', 14, yPos)
    yPos += 5

    const equityRows = [
      ...balance.equity.accounts.map(acc => [acc.code, acc.name, formatCurrency(acc.balance)]),
      ['', 'Resultado del Ejercicio', formatCurrency(balance.equity.netIncome)]
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Cuenta', 'Importe']],
      body: equityRows,
      foot: [['', 'TOTAL PATRIMONIO NETO', formatCurrency(balance.equity.total + balance.equity.netIncome)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [92, 184, 92] }
    })

    // Save
    doc.save(`Balance_${format(balance.date, 'yyyy-MM-dd')}.pdf`)
  }

  exportIncomeStatement(income: IncomeStatement, tenantName: string) {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(tenantName, 14, 15)
    doc.setFontSize(12)
    doc.text('Estado de Resultados', 14, 22)
    doc.setFontSize(10)
    doc.text(
      `Del ${format(income.period.from, 'dd/MM/yyyy')} al ${format(income.period.to, 'dd/MM/yyyy')}`,
      14,
      28
    )

    const tableData = [
      // Ingresos
      [{ content: 'INGRESOS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
      ...income.income.accounts.map(acc => [acc.name, formatCurrency(acc.balance)]),
      [{ content: 'Total Ingresos', styles: { fontStyle: 'bold' } }, { content: formatCurrency(income.income.total), styles: { fontStyle: 'bold' } }],

      // Costo de Ventas
      [{ content: 'COSTO DE VENTAS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
      ...income.costOfSales.accounts.map(acc => [acc.name, `(${formatCurrency(acc.balance)})`]),
      [{ content: 'Total Costo de Ventas', styles: { fontStyle: 'bold' } }, { content: `(${formatCurrency(income.costOfSales.total)})`, styles: { fontStyle: 'bold' } }],

      // Ganancia Bruta
      [
        { content: 'GANANCIA BRUTA', styles: { fontStyle: 'bold', fillColor: [217, 237, 247] } },
        { content: formatCurrency(income.grossProfit), styles: { fontStyle: 'bold', fillColor: [217, 237, 247] } }
      ],

      // Gastos
      [{ content: 'GASTOS OPERATIVOS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
      ...income.expenses.accounts.map(acc => [acc.name, `(${formatCurrency(acc.balance)})`]),
      [{ content: 'Total Gastos', styles: { fontStyle: 'bold' } }, { content: `(${formatCurrency(income.expenses.total)})`, styles: { fontStyle: 'bold' } }],

      // Resultado Final
      [
        { content: 'RESULTADO NETO', styles: { fontStyle: 'bold', fillColor: [92, 184, 92], textColor: [255, 255, 255] } },
        { content: formatCurrency(income.netProfit), styles: { fontStyle: 'bold', fillColor: [92, 184, 92], textColor: [255, 255, 255] } }
      ]
    ]

    autoTable(doc, {
      startY: 35,
      head: [['Concepto', 'Importe']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: 'right' }
      }
    })

    doc.save(`Estado_Resultados_${format(income.period.to, 'yyyy-MM-dd')}.pdf`)
  }
}
```

### Excel Export

```typescript
import * as XLSX from 'xlsx'

class ExcelExportService {
  exportGeneralLedger(ledger: GeneralLedgerLine[], accountName: string) {
    const data = ledger.map(line => ({
      'Fecha': format(line.journalEntry.date, 'dd/MM/yyyy'),
      'Asiento': line.journalEntry.number,
      'Descripción': line.description || line.journalEntry.description,
      'Debe': line.debit > 0 ? Number(line.debit) : '',
      'Haber': line.credit > 0 ? Number(line.credit) : '',
      'Saldo': Number(line.balance)
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mayor')

    // Formato de moneda
    const range = XLSX.utils.decode_range(ws['!ref']!)
    for (let row = 1; row <= range.e.r; row++) {
      ['D', 'E', 'F'].forEach(col => {
        const cellAddress = `${col}${row + 1}`
        if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '#,##0.00'
        }
      })
    }

    XLSX.writeFile(wb, `Mayor_${accountName.replace(/\s+/g, '_')}.xlsx`)
  }

  exportTrialBalance(trial: TrialBalance) {
    const data = trial.accounts.map(acc => ({
      'Código': acc.code,
      'Cuenta': acc.name,
      'Debe (Movimientos)': Number(acc.totalDebit),
      'Haber (Movimientos)': Number(acc.totalCredit),
      'Saldo Deudor': acc.debitBalance > 0 ? Number(acc.debitBalance) : '',
      'Saldo Acreedor': acc.creditBalance > 0 ? Number(acc.creditBalance) : ''
    }))

    // Agregar totales
    data.push({
      'Código': '',
      'Cuenta': 'TOTALES',
      'Debe (Movimientos)': Number(trial.totals.totalDebits),
      'Haber (Movimientos)': Number(trial.totals.totalCredits),
      'Saldo Deudor': Number(trial.totals.totalDebitBalances),
      'Saldo Acreedor': Number(trial.totals.totalCreditBalances)
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Balance de Comprobación')

    XLSX.writeFile(wb, 'Balance_Comprobacion.xlsx')
  }
}
```

---

## Resumen de Reportes Disponibles

| # | Reporte | Descripción | Filtros | Exportación |
|---|---------|-------------|---------|-------------|
| 1 | Libro Diario | Listado cronológico de asientos | Fecha, Tipo, Estado | PDF, Excel |
| 2 | Libro Mayor | Movimientos por cuenta | Cuenta, Fecha | PDF, Excel |
| 3 | Balance de Comprobación | Saldos de todas las cuentas | Período, Año Fiscal | PDF, Excel |
| 4 | Balance General | Estado de Situación Patrimonial | Fecha | PDF |
| 5 | Estado de Resultados | Ganancia/Pérdida del período | Período | PDF, Excel |
| 6 | Flujo de Efectivo | Movimientos de caja | Período | PDF, Excel |
| 7 | Análisis por Centro de Costos | Rentabilidad por CC | Período | PDF, Excel |
| 8 | Rentabilidad de Proyectos | Seguimiento de obras/proyectos | Proyecto | PDF, Excel |
| 9 | Análisis Multi-dimensional | Cruce de dimensiones | Dimensiones, Período | Excel |
| 10 | Dashboard Ejecutivo | Resumen visual con KPIs | Período | PDF |
| 11 | Mayor Analítico | Mayor con dimensiones | Cuenta, Dimensión, Fecha | Excel |
| 12 | Comparativo Períodos | Comparar 2+ períodos | Períodos | Excel |
| 13 | Evolución de Cuentas | Timeline de cuenta específica | Cuenta, Rango | Gráfico, Excel |
| 14 | Cuentas por Pagar | Pasivos pendientes | Vencimiento | Excel |
| 15 | Cuentas por Cobrar | Activos pendientes | Vencimiento | Excel |

---

Documento completado con todos los reportes contables y de gestión implementados.
