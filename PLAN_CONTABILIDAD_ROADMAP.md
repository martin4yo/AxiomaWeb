# Roadmap de Implementación - Módulo Contable

## Fases de Implementación

### FASE 1: Fundamentos (2-3 semanas)

#### Objetivo
Establecer la infraestructura básica del módulo contable.

#### Tareas

**1.1 Base de Datos**
- [ ] Crear migración Prisma con todas las tablas
  - `accounts` (Plan de cuentas)
  - `journal_entries` (Asientos contables)
  - `journal_entry_lines` (Líneas de asiento)
  - `dimensions` (Dimensiones analíticas)
  - `dimension_values` (Valores de dimensiones)
  - `line_dimensions` (Asignación dimensional)
  - `auto_accounting_rules` (Reglas automáticas)
- [ ] Ejecutar migración en desarrollo
- [ ] Crear seeders con plan de cuentas básico
- [ ] Validar integridad referencial

**1.2 Backend - Modelos y Servicios Básicos**
- [ ] Implementar `AccountsService`
  - CRUD de cuentas
  - Búsqueda jerárquica
  - Validaciones (código único, cuentas imputables, etc.)
- [ ] Implementar `DimensionsService`
  - CRUD de dimensiones y valores
  - Validaciones
- [ ] Implementar `JournalEntriesService` (v1 - básico)
  - Crear asiento manual (sin dimensiones aún)
  - Validar balance
  - Obtener siguiente número
  - Listar asientos

**1.3 Backend - API REST**
- [ ] `POST /api/accounting/accounts` - Crear cuenta
- [ ] `GET /api/accounting/accounts` - Listar cuentas (con query params para filtrar)
- [ ] `GET /api/accounting/accounts/:id` - Obtener cuenta
- [ ] `PUT /api/accounting/accounts/:id` - Actualizar cuenta
- [ ] `DELETE /api/accounting/accounts/:id` - Desactivar cuenta
- [ ] `POST /api/accounting/journal-entries` - Crear asiento
- [ ] `GET /api/accounting/journal-entries` - Listar asientos
- [ ] `GET /api/accounting/journal-entries/:id` - Obtener asiento con líneas
- [ ] Middleware de autenticación y autorización
- [ ] Validación de tenant_id en todas las consultas

**1.4 Frontend - Componentes Básicos**
- [ ] `AccountsList` - Lista de cuentas con búsqueda
- [ ] `AccountForm` - Formulario crear/editar cuenta
- [ ] `AccountTree` - Visualización jerárquica del plan de cuentas
- [ ] `JournalEntryForm` - Formulario crear asiento manual (sin dimensiones)
- [ ] `JournalEntriesList` - Lista de asientos con filtros
- [ ] `JournalEntryDetail` - Ver detalle de asiento

**1.5 Testing**
- [ ] Tests unitarios AccountsService
- [ ] Tests unitarios JournalEntriesService
- [ ] Tests de integración API
- [ ] Tests E2E: Crear cuenta, crear asiento

#### Entregables
- ✅ Plan de cuentas funcional
- ✅ CRUD completo de cuentas
- ✅ Asientos manuales básicos (sin dimensiones)
- ✅ Validación de balance

---

### FASE 2: Dimensiones Analíticas (1-2 semanas)

#### Objetivo
Agregar soporte completo para contabilidad analítica multidimensional.

#### Tareas

**2.1 Backend - Extensión de Servicios**
- [ ] Extender `JournalEntriesService` para soportar dimensiones en líneas
- [ ] Validar que dimensiones requeridas estén presentes
- [ ] Validar porcentajes de distribución sumen 100%
- [ ] Permitir múltiples dimensiones por línea

**2.2 Backend - API**
- [ ] `POST /api/accounting/dimensions` - Crear dimensión
- [ ] `GET /api/accounting/dimensions` - Listar dimensiones
- [ ] `POST /api/accounting/dimensions/:id/values` - Crear valor
- [ ] `GET /api/accounting/dimensions/:id/values` - Listar valores
- [ ] Actualizar endpoint de crear asiento para incluir dimensiones

**2.3 Frontend - Componentes de Dimensiones**
- [ ] `DimensionsList` - Lista de dimensiones configuradas
- [ ] `DimensionForm` - Crear/editar dimensión
- [ ] `DimensionValuesManager` - Gestionar valores de una dimensión
- [ ] `DimensionsModal` - Modal para asignar dimensiones a una línea de asiento
- [ ] `DimensionDistribution` - Componente para distribuir % entre valores
- [ ] Actualizar `JournalEntryForm` para incluir dimensiones

**2.4 Testing**
- [ ] Tests de validación de porcentajes
- [ ] Tests de dimensiones requeridas
- [ ] Tests E2E: Crear asiento con múltiples dimensiones

#### Entregables
- ✅ Sistema de dimensiones completamente funcional
- ✅ Asientos con clasificación dimensional
- ✅ Distribución porcentual de líneas

---

### FASE 3: Contabilización Automática (2 semanas)

#### Objetivo
Integrar el módulo contable con el resto del ERP mediante generación automática de asientos.

#### Tareas

**3.1 Motor de Contabilización**
- [ ] Implementar `AutoAccountingEngine`
  - Parser de templates de reglas
  - Resolución de campos dinámicos (ej: `{invoiceNumber}`)
  - Resolución de dimensiones automáticas
  - Validación de balance
- [ ] Implementar `AutoAccountingRulesService`
  - CRUD de reglas
  - Búsqueda de regla aplicable por tipo y condiciones
  - Priorización de reglas

**3.2 Hooks de Integración**
- [ ] Hook en `SalesService.createSale()` → generar asiento
- [ ] Hook en `PurchasesService.createPurchase()` → generar asiento
- [ ] Hook en `PaymentsService.createPayment()` → generar asiento
- [ ] Hook en `InventoryService.adjustStock()` → generar asiento
- [ ] Sistema de notificaciones cuando falla contabilización automática

**3.3 Reglas Predefinidas**
- [ ] Regla: Venta al contado
- [ ] Regla: Venta a crédito
- [ ] Regla: Compra al contado
- [ ] Regla: Compra a crédito
- [ ] Regla: Pago a proveedor
- [ ] Regla: Cobro de cliente
- [ ] Regla: Ajuste de inventario (pérdida)
- [ ] Regla: Ajuste de inventario (ganancia)

**3.4 Backend - API**
- [ ] `POST /api/accounting/rules` - Crear regla
- [ ] `GET /api/accounting/rules` - Listar reglas
- [ ] `PUT /api/accounting/rules/:id` - Actualizar regla
- [ ] `DELETE /api/accounting/rules/:id` - Desactivar regla
- [ ] `POST /api/accounting/rules/:id/test` - Probar regla con datos de ejemplo

**3.5 Frontend - Configuración de Reglas**
- [ ] `RulesList` - Lista de reglas configuradas
- [ ] `RuleForm` - Formulario crear/editar regla
  - Constructor visual de templates
  - Preview de asiento generado
- [ ] `RuleTester` - Componente para probar reglas

**3.6 Frontend - Visualización de Asientos Automáticos**
- [ ] Badge en ventas/compras indicando "Contabilizado automáticamente"
- [ ] Link desde documento origen a asiento contable
- [ ] Link desde asiento a documento origen
- [ ] Filtro en lista de asientos por origen (SALE, PURCHASE, etc.)

**3.7 Testing**
- [ ] Tests unitarios del motor de contabilización
- [ ] Tests de resolución de campos dinámicos
- [ ] Tests de cada hook de integración
- [ ] Tests E2E: Crear venta → verificar asiento generado

#### Entregables
- ✅ Ventas, compras, pagos generan asientos automáticamente
- ✅ Sistema de reglas configurables
- ✅ Trazabilidad documento ↔ asiento

---

### FASE 4: Reportes Contables (2 semanas)

#### Objetivo
Implementar todos los reportes contables obligatorios.

#### Tareas

**4.1 Backend - Servicios de Reportes**
- [ ] Implementar `AccountingReportsService`
  - `getGeneralLedger()` - Libro Mayor
  - `getJournalBook()` - Libro Diario
  - `getTrialBalance()` - Balance de Comprobación
  - `getBalanceSheet()` - Balance General
  - `getIncomeStatement()` - Estado de Resultados
- [ ] Implementar `CashFlowReportsService`
  - `getCashFlow()` - Estado de Flujo de Efectivo

**4.2 Backend - API**
- [ ] `GET /api/accounting/reports/general-ledger` - Libro Mayor
- [ ] `GET /api/accounting/reports/journal-book` - Libro Diario
- [ ] `GET /api/accounting/reports/trial-balance` - Balance de Comprobación
- [ ] `GET /api/accounting/reports/balance-sheet` - Balance General
- [ ] `GET /api/accounting/reports/income-statement` - Estado de Resultados
- [ ] `GET /api/accounting/reports/cash-flow` - Flujo de Efectivo

**4.3 Frontend - Reportes**
- [ ] `GeneralLedgerReport` - Libro Mayor con filtros
- [ ] `JournalBookReport` - Libro Diario
- [ ] `TrialBalanceReport` - Balance de Comprobación
- [ ] `BalanceSheetReport` - Balance General con gráficos
- [ ] `IncomeStatementReport` - Estado de Resultados con gráficos
- [ ] `CashFlowReport` - Flujo de Efectivo

**4.4 Exportación**
- [ ] Implementar `PDFExportService`
  - Exportar Balance General
  - Exportar Estado de Resultados
  - Exportar Libro Mayor
- [ ] Implementar `ExcelExportService`
  - Exportar cualquier reporte a Excel
  - Formato con colores y totales

**4.5 Testing**
- [ ] Tests de cálculo de saldos
- [ ] Tests de balance (activo = pasivo + patrimonio)
- [ ] Tests de cuadre de débitos y créditos
- [ ] Tests E2E de cada reporte

#### Entregables
- ✅ 6 reportes contables principales
- ✅ Exportación a PDF y Excel
- ✅ Validación de cuadre automática

---

### FASE 5: Reportes Analíticos (1-2 semanas)

#### Objetivo
Implementar reportes de gestión basados en dimensiones.

#### Tareas

**5.1 Backend - Servicios Analíticos**
- [ ] Implementar `AnalyticalReportsService`
  - `getCostCenterReport()` - Análisis por Centro de Costos
  - `getProjectProfitability()` - Rentabilidad de Proyectos
  - `getMultiDimensionalAnalysis()` - Análisis cruzado de dimensiones
  - `getDimensionalLedger()` - Mayor por dimensión

**5.2 Backend - API**
- [ ] `GET /api/accounting/analytical/cost-centers` - Reporte CC
- [ ] `GET /api/accounting/analytical/projects/:id` - Rentabilidad proyecto
- [ ] `POST /api/accounting/analytical/multi-dimensional` - Análisis multi-dim

**5.3 Frontend - Reportes Analíticos**
- [ ] `CostCenterAnalysisReport` con gráficos
- [ ] `ProjectProfitabilityReport` con timeline
- [ ] `MultiDimensionalAnalysisReport` con matriz/heatmap
- [ ] `DimensionalDashboard` - Dashboard configurable

**5.4 Visualizaciones**
- [ ] Gráficos de barras para comparación CC
- [ ] Gráficos de pastel para distribución
- [ ] Gráficos de línea para evolución temporal
- [ ] Heatmap para análisis cruzado

**5.5 Testing**
- [ ] Tests de cálculo de distribuciones porcentuales
- [ ] Tests de análisis multi-dimensional
- [ ] Tests E2E de cada reporte analítico

#### Entregables
- ✅ Reportes de gestión por dimensiones
- ✅ Análisis de rentabilidad
- ✅ Visualizaciones interactivas

---

### FASE 6: Funcionalidades Avanzadas (2 semanas)

#### Objetivo
Agregar funcionalidades adicionales para mejorar la experiencia.

#### Tareas

**6.1 Reversión y Corrección**
- [ ] Implementar `journalEntriesService.reverse()`
- [ ] UI para revertir asiento con modal de confirmación
- [ ] Historial de reversiones en detalle de asiento
- [ ] Tests de reversión

**6.2 Asientos Recurrentes**
- [ ] Modelo `RecurringJournalEntry`
- [ ] Servicio para generar asientos recurrentes (cron job)
- [ ] UI para configurar asientos recurrentes
- [ ] Tests de generación automática

**6.3 Períodos Fiscales**
- [ ] Modelo `FiscalPeriod`
- [ ] Bloqueo de períodos cerrados
- [ ] Asientos de apertura/cierre automáticos
- [ ] UI de gestión de períodos
- [ ] Tests de bloqueo

**6.4 Presupuestos**
- [ ] Modelo `Budget`
- [ ] Comparación Presupuesto vs Real
- [ ] Alertas de desvíos
- [ ] UI de gestión de presupuestos
- [ ] Reporte de ejecución presupuestaria

**6.5 Conciliación Bancaria**
- [ ] Modelo `BankReconciliation`
- [ ] Match automático de movimientos
- [ ] UI de conciliación
- [ ] Tests de matching

**6.6 Auditoría**
- [ ] Log completo de cambios en asientos
- [ ] Quién creó, quién modificó, cuándo
- [ ] Historial de cambios de estado
- [ ] Reporte de auditoría

#### Entregables
- ✅ Reversión de asientos
- ✅ Asientos recurrentes
- ✅ Gestión de períodos fiscales
- ✅ Presupuestos
- ✅ Conciliación bancaria
- ✅ Auditoría completa

---

### FASE 7: Dashboard y UX (1 semana)

#### Objetivo
Crear interfaces intuitivas y dashboard ejecutivo.

#### Tareas

**7.1 Dashboard Ejecutivo**
- [ ] KPIs principales (ingresos, gastos, margen)
- [ ] Gráfico de evolución mensual
- [ ] Balance snapshot
- [ ] Top gastos
- [ ] Rentabilidad por CC
- [ ] Alertas y notificaciones

**7.2 Asistente de Configuración Inicial**
- [ ] Wizard para configurar módulo por primera vez
- [ ] Selección de plan de cuentas predefinido
- [ ] Configuración de dimensiones básicas
- [ ] Importación de saldos iniciales
- [ ] Configuración de reglas básicas

**7.3 Mejoras de UX**
- [ ] Keyboard shortcuts en formularios
- [ ] Auto-save en borradores
- [ ] Sugerencias de cuentas al escribir
- [ ] Copiar asiento existente
- [ ] Templates de asientos frecuentes
- [ ] Dark mode

**7.4 Ayuda Contextual**
- [ ] Tooltips explicativos
- [ ] Documentación inline
- [ ] Videos tutoriales integrados
- [ ] Guías interactivas (tours)

#### Entregables
- ✅ Dashboard ejecutivo completo
- ✅ Wizard de configuración
- ✅ UX pulida y profesional
- ✅ Documentación integrada

---

### FASE 8: Testing y Optimización (1 semana)

#### Objetivo
Asegurar calidad, performance y estabilidad.

#### Tareas

**8.1 Testing Integral**
- [ ] Coverage > 80% en backend
- [ ] Tests E2E de flujos completos
- [ ] Tests de performance en consultas pesadas
- [ ] Tests de concurrencia
- [ ] Tests de migración de datos

**8.2 Optimización de Performance**
- [ ] Índices en base de datos
- [ ] Paginación en reportes largos
- [ ] Cache de reportes frecuentes
- [ ] Lazy loading en árbol de cuentas
- [ ] Optimización de queries N+1

**8.3 Seguridad**
- [ ] Audit de seguridad
- [ ] Validación de permisos por rol
- [ ] Prevención de inyección SQL
- [ ] Rate limiting en API
- [ ] Tests de penetración

**8.4 Documentación**
- [ ] README técnico completo
- [ ] Documentación de API (Swagger/OpenAPI)
- [ ] Guía de usuario
- [ ] Manual de configuración
- [ ] Troubleshooting guide

#### Entregables
- ✅ Coverage > 80%
- ✅ Performance optimizada
- ✅ Seguridad auditada
- ✅ Documentación completa

---

## Plan de Cuentas Predefinido (Argentina)

### Estructura Básica

```typescript
const PLAN_CUENTAS_BASICO_AR = [
  // ========================================
  // 1. ACTIVO
  // ========================================
  { code: '1', name: 'ACTIVO', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 0 },

  // 1.1 ACTIVO CORRIENTE
  { code: '1.1', name: 'ACTIVO CORRIENTE', parent: '1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 1 },

  // 1.1.01 Caja y Bancos
  { code: '1.1.01', name: 'Caja y Bancos', parent: '1.1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.1.01.001', name: 'Caja', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.01.002', name: 'Caja Chica', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.01.003', name: 'Banco Nación Cta. Cte.', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.01.004', name: 'Banco Galicia Cta. Cte.', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.01.005', name: 'Banco Santander Cta. Cte.', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.01.006', name: 'Mercado Pago', parent: '1.1.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },

  // 1.1.02 Inversiones Corrientes
  { code: '1.1.02', name: 'Inversiones Corrientes', parent: '1.1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.1.02.001', name: 'Plazo Fijo', parent: '1.1.02', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.02.002', name: 'Fondos Comunes de Inversión', parent: '1.1.02', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },

  // 1.1.03 Créditos por Ventas
  { code: '1.1.03', name: 'Créditos por Ventas', parent: '1.1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.1.03.001', name: 'Deudores por Ventas', parent: '1.1.03', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.03.002', name: 'Documentos a Cobrar', parent: '1.1.03', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.03.003', name: 'Cheques a Depositar', parent: '1.1.03', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.03.004', name: 'Tarjetas de Crédito a Cobrar', parent: '1.1.03', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.03.005', name: 'Previsión para Deudores Incobrables', parent: '1.1.03', type: 'ASSET', nature: 'CREDIT', imputable: true, level: 3 },

  // 1.1.04 Otros Créditos
  { code: '1.1.04', name: 'Otros Créditos', parent: '1.1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.1.04.001', name: 'IVA Crédito Fiscal', parent: '1.1.04', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.04.002', name: 'IVA Saldo a Favor', parent: '1.1.04', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.04.003', name: 'Retenciones y Percepciones Impositivas', parent: '1.1.04', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.04.004', name: 'Anticipos a Proveedores', parent: '1.1.04', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.04.005', name: 'Anticipos al Personal', parent: '1.1.04', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },

  // 1.1.05 Bienes de Cambio
  { code: '1.1.05', name: 'Bienes de Cambio', parent: '1.1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.1.05.001', name: 'Mercaderías', parent: '1.1.05', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.05.002', name: 'Productos Terminados', parent: '1.1.05', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.05.003', name: 'Productos en Proceso', parent: '1.1.05', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.1.05.004', name: 'Materias Primas', parent: '1.1.05', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },

  // 1.2 ACTIVO NO CORRIENTE
  { code: '1.2', name: 'ACTIVO NO CORRIENTE', parent: '1', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 1 },

  // 1.2.01 Bienes de Uso
  { code: '1.2.01', name: 'Bienes de Uso', parent: '1.2', type: 'ASSET', nature: 'DEBIT', imputable: false, level: 2 },
  { code: '1.2.01.001', name: 'Inmuebles', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.002', name: 'Rodados', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.003', name: 'Muebles y Útiles', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.004', name: 'Maquinarias', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.005', name: 'Equipos de Computación', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.006', name: 'Instalaciones', parent: '1.2.01', type: 'ASSET', nature: 'DEBIT', imputable: true, level: 3 },
  { code: '1.2.01.007', name: 'Amortización Acumulada Inmuebles', parent: '1.2.01', type: 'ASSET', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '1.2.01.008', name: 'Amortización Acumulada Rodados', parent: '1.2.01', type: 'ASSET', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '1.2.01.009', name: 'Amortización Acumulada Muebles', parent: '1.2.01', type: 'ASSET', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '1.2.01.010', name: 'Amortización Acumulada Maquinarias', parent: '1.2.01', type: 'ASSET', nature: 'CREDIT', imputable: true, level: 3 },

  // ========================================
  // 2. PASIVO
  // ========================================
  { code: '2', name: 'PASIVO', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 0 },

  // 2.1 PASIVO CORRIENTE
  { code: '2.1', name: 'PASIVO CORRIENTE', parent: '2', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 1 },

  // 2.1.01 Deudas Comerciales
  { code: '2.1.01', name: 'Deudas Comerciales', parent: '2.1', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 2 },
  { code: '2.1.01.001', name: 'Proveedores', parent: '2.1.01', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.01.002', name: 'Documentos a Pagar', parent: '2.1.01', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.01.003', name: 'Cheques Diferidos a Pagar', parent: '2.1.01', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },

  // 2.1.02 Deudas Bancarias y Financieras
  { code: '2.1.02', name: 'Deudas Bancarias y Financieras', parent: '2.1', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 2 },
  { code: '2.1.02.001', name: 'Préstamos Bancarios', parent: '2.1.02', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.02.002', name: 'Descubierto Bancario', parent: '2.1.02', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },

  // 2.1.03 Deudas Fiscales
  { code: '2.1.03', name: 'Deudas Fiscales', parent: '2.1', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 2 },
  { code: '2.1.03.001', name: 'IVA Débito Fiscal', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.03.002', name: 'IVA a Pagar', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.03.003', name: 'Retenciones SUSS a Pagar', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.03.004', name: 'Retenciones Impuesto a las Ganancias', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.03.005', name: 'Impuesto a las Ganancias a Pagar', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.03.006', name: 'Ingresos Brutos a Pagar', parent: '2.1.03', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },

  // 2.1.04 Deudas Sociales
  { code: '2.1.04', name: 'Deudas Sociales', parent: '2.1', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 2 },
  { code: '2.1.04.001', name: 'Sueldos a Pagar', parent: '2.1.04', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.04.002', name: 'Cargas Sociales a Pagar', parent: '2.1.04', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.04.003', name: 'Provisión SAC', parent: '2.1.04', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },
  { code: '2.1.04.004', name: 'Provisión Vacaciones', parent: '2.1.04', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 3 },

  // 2.2 PASIVO NO CORRIENTE
  { code: '2.2', name: 'PASIVO NO CORRIENTE', parent: '2', type: 'LIABILITY', nature: 'CREDIT', imputable: false, level: 1 },
  { code: '2.2.01', name: 'Préstamos a Largo Plazo', parent: '2.2', type: 'LIABILITY', nature: 'CREDIT', imputable: true, level: 2 },

  // ========================================
  // 3. PATRIMONIO NETO
  // ========================================
  { code: '3', name: 'PATRIMONIO NETO', type: 'EQUITY', nature: 'CREDIT', imputable: false, level: 0 },
  { code: '3.1', name: 'Capital Social', parent: '3', type: 'EQUITY', nature: 'CREDIT', imputable: true, level: 1 },
  { code: '3.2', name: 'Aportes de los Socios', parent: '3', type: 'EQUITY', nature: 'CREDIT', imputable: true, level: 1 },
  { code: '3.3', name: 'Resultados Acumulados', parent: '3', type: 'EQUITY', nature: 'CREDIT', imputable: true, level: 1 },
  { code: '3.4', name: 'Resultado del Ejercicio', parent: '3', type: 'EQUITY', nature: 'CREDIT', imputable: true, level: 1 },

  // ========================================
  // 4. INGRESOS
  // ========================================
  { code: '4', name: 'INGRESOS', type: 'INCOME', nature: 'CREDIT', imputable: false, level: 0 },

  // 4.1 Ingresos por Ventas
  { code: '4.1', name: 'Ingresos por Ventas', parent: '4', type: 'INCOME', nature: 'CREDIT', imputable: false, level: 1 },
  { code: '4.1.01', name: 'Ventas', parent: '4.1', type: 'INCOME', nature: 'CREDIT', imputable: true, level: 2 },
  { code: '4.1.02', name: 'Ventas de Exportación', parent: '4.1', type: 'INCOME', nature: 'CREDIT', imputable: true, level: 2 },
  { code: '4.1.03', name: 'Devoluciones sobre Ventas', parent: '4.1', type: 'INCOME', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '4.1.04', name: 'Descuentos sobre Ventas', parent: '4.1', type: 'INCOME', nature: 'DEBIT', imputable: true, level: 2 },

  // 4.2 Otros Ingresos
  { code: '4.2', name: 'Otros Ingresos', parent: '4', type: 'INCOME', nature: 'CREDIT', imputable: false, level: 1 },
  { code: '4.2.01', name: 'Intereses Ganados', parent: '4.2', type: 'INCOME', nature: 'CREDIT', imputable: true, level: 2 },
  { code: '4.2.02', name: 'Diferencias de Cambio Positivas', parent: '4.2', type: 'INCOME', nature: 'CREDIT', imputable: true, level: 2 },
  { code: '4.2.03', name: 'Recupero de Deudores Incobrables', parent: '4.2', type: 'INCOME', nature: 'CREDIT', imputable: true, level: 2 },

  // ========================================
  // 5. COSTOS
  // ========================================
  { code: '5', name: 'COSTO DE VENTAS', type: 'COST_OF_SALES', nature: 'DEBIT', imputable: false, level: 0 },
  { code: '5.1', name: 'Costo de Mercaderías Vendidas', parent: '5', type: 'COST_OF_SALES', nature: 'DEBIT', imputable: true, level: 1 },

  // ========================================
  // 6. GASTOS
  // ========================================
  { code: '6', name: 'GASTOS', type: 'EXPENSE', nature: 'DEBIT', imputable: false, level: 0 },

  // 6.1 Gastos de Administración
  { code: '6.1', name: 'Gastos de Administración', parent: '6', type: 'EXPENSE', nature: 'DEBIT', imputable: false, level: 1 },
  { code: '6.1.01', name: 'Sueldos y Jornales', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.02', name: 'Cargas Sociales', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.03', name: 'Honorarios Profesionales', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.04', name: 'Servicios Públicos', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.05', name: 'Alquileres', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.06', name: 'Papelería y Útiles', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.07', name: 'Amortizaciones', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.08', name: 'Seguros', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.1.09', name: 'Gastos de Mantenimiento y Reparación', parent: '6.1', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },

  // 6.2 Gastos de Comercialización
  { code: '6.2', name: 'Gastos de Comercialización', parent: '6', type: 'EXPENSE', nature: 'DEBIT', imputable: false, level: 1 },
  { code: '6.2.01', name: 'Sueldos Vendedores', parent: '6.2', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.2.02', name: 'Comisiones', parent: '6.2', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.2.03', name: 'Publicidad y Propaganda', parent: '6.2', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.2.04', name: 'Gastos de Envío', parent: '6.2', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },

  // 6.3 Gastos Bancarios y Financieros
  { code: '6.3', name: 'Gastos Bancarios y Financieros', parent: '6', type: 'EXPENSE', nature: 'DEBIT', imputable: false, level: 1 },
  { code: '6.3.01', name: 'Intereses Bancarios', parent: '6.3', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.3.02', name: 'Comisiones Bancarias', parent: '6.3', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.3.03', name: 'Gastos Bancarios', parent: '6.3', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.3.04', name: 'Diferencias de Cambio Negativas', parent: '6.3', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },

  // 6.4 Impuestos
  { code: '6.4', name: 'Impuestos', parent: '6', type: 'EXPENSE', nature: 'DEBIT', imputable: false, level: 1 },
  { code: '6.4.01', name: 'Ingresos Brutos', parent: '6.4', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.4.02', name: 'Tasas Municipales', parent: '6.4', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 },
  { code: '6.4.03', name: 'Impuesto a los Débitos y Créditos Bancarios', parent: '6.4', type: 'EXPENSE', nature: 'DEBIT', imputable: true, level: 2 }
]
```

---

## Cronograma Estimado

| Fase | Duración | Inicio | Fin |
|------|----------|--------|-----|
| Fase 1: Fundamentos | 3 semanas | Sem 1 | Sem 3 |
| Fase 2: Dimensiones | 2 semanas | Sem 4 | Sem 5 |
| Fase 3: Automático | 2 semanas | Sem 6 | Sem 7 |
| Fase 4: Reportes Contables | 2 semanas | Sem 8 | Sem 9 |
| Fase 5: Reportes Analíticos | 2 semanas | Sem 10 | Sem 11 |
| Fase 6: Avanzadas | 2 semanas | Sem 12 | Sem 13 |
| Fase 7: Dashboard y UX | 1 semana | Sem 14 | Sem 14 |
| Fase 8: Testing y Optimización | 1 semana | Sem 15 | Sem 15 |
| **TOTAL** | **15 semanas** | **~3.5 meses** | |

---

## Recursos Necesarios

### Equipo Recomendado
- 1 Backend Developer (TypeScript/Node.js/Prisma)
- 1 Frontend Developer (React/TypeScript)
- 1 QA/Tester
- 1 DevOps (opcional, para CI/CD)
- 1 Contador/Consultor (para validación funcional)

### Tecnologías
- **Backend**: Node.js, TypeScript, Express, Prisma
- **Database**: PostgreSQL
- **Frontend**: React, TypeScript, TailwindCSS
- **Gráficos**: Recharts / Chart.js
- **Export**: jsPDF, xlsx
- **Testing**: Jest, Supertest, Playwright
- **CI/CD**: GitHub Actions / GitLab CI

---

## Indicadores de Éxito

### Fase 1-2
- ✅ Plan de cuentas con 100+ cuentas funcionando
- ✅ Asientos manuales balanceados automáticamente
- ✅ Dimensiones con distribución porcentual

### Fase 3
- ✅ 100% de ventas generan asiento automático
- ✅ 100% de compras generan asiento automático
- ✅ 100% de pagos/cobros generan asiento automático

### Fase 4-5
- ✅ 6 reportes contables principales funcionando
- ✅ Exportación PDF/Excel sin errores
- ✅ Reportes analíticos por dimensiones

### Fase 6-8
- ✅ Todas las funcionalidades avanzadas implementadas
- ✅ Coverage de tests > 80%
- ✅ Performance: reportes < 2 segundos
- ✅ Documentación completa

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de cálculos contables | Media | Alto | Validar con contador, tests exhaustivos |
| Performance en reportes grandes | Alta | Medio | Índices DB, paginación, cache |
| Integración con módulos existentes | Media | Alto | Tests de integración, validación incremental |
| Cambios en requerimientos | Alta | Medio | Desarrollo iterativo, feedback continuo |
| Bugs en contabilización automática | Media | Crítico | Tests E2E, validación manual inicial, rollback |

---

## Resumen Ejecutivo

El módulo contable requiere **aproximadamente 15 semanas (3.5 meses)** de desarrollo con un equipo de 2 desarrolladores.

**Prioridades**:
1. **Fase 1-2**: Base sólida (plan de cuentas, asientos, dimensiones)
2. **Fase 3**: Contabilización automática (integración crítica)
3. **Fase 4**: Reportes obligatorios
4. **Fase 5-8**: Funcionalidades avanzadas y pulido

**MVP**: Fases 1-4 (9 semanas) entregan un módulo contable funcional y usable.

**Versión Completa**: Todas las fases (15 semanas) entregan un sistema de nivel empresarial.

---

Documento completado. Roadmap completo para implementación del módulo contable.
