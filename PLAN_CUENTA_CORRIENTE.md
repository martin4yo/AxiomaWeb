# Plan: Cuenta Corriente Unificada

## 📊 Objetivo
Implementar un sistema de cuenta corriente que permita llevar el control de saldos de **clientes** y **proveedores** de forma unificada.

## 🎯 Alcance

### Funcionalidades
1. **Registro automático de movimientos** al crear ventas/compras
2. **Registro manual de pagos** (cobros de clientes / pagos a proveedores)
3. **Cálculo de saldos** en tiempo real
4. **Historial completo** de movimientos y pagos
5. **Estado de cuenta** por entidad con filtros por fechas
6. **Exportación a PDF** del estado de cuenta
7. **Alertas de deuda** para clientes/proveedores

### Tipos de Movimiento
| Tipo | Afecta | Descripción |
|------|--------|-------------|
| `SALE` | Débito (+) | Venta a crédito |
| `SALE_PAYMENT` | Crédito (-) | Cobro de venta |
| `PURCHASE` | Crédito (-) | Compra a crédito |
| `PURCHASE_PAYMENT` | Débito (+) | Pago de compra |
| `CREDIT_NOTE` | Crédito (-) | Nota de crédito |
| `DEBIT_NOTE` | Débito (+) | Nota de débito |
| `ADJUSTMENT` | Débito/Crédito | Ajuste manual |
| `INITIAL_BALANCE` | Débito/Crédito | Saldo inicial |

## 🗄️ Schema de Base de Datos

### EntityMovement
```prisma
model EntityMovement {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  entityId    String   @map("entity_id")

  // Tipo y naturaleza del movimiento
  type        String   // SALE, SALE_PAYMENT, PURCHASE, PURCHASE_PAYMENT, CREDIT_NOTE, DEBIT_NOTE, ADJUSTMENT, INITIAL_BALANCE
  nature      String   // DEBIT (aumenta saldo) o CREDIT (disminuye saldo)

  // Monto
  amount      Decimal  @db.Decimal(15, 2)

  // Balance acumulado DESPUÉS de este movimiento
  balance     Decimal  @db.Decimal(15, 2)

  // Referencia al documento que generó el movimiento (opcional)
  saleId      String?  @map("sale_id")
  purchaseId  String?  @map("purchase_id")
  paymentId   String?  @map("payment_id")

  // Detalles
  description String?
  notes       String?

  // Fechas
  date        DateTime @db.Date // Fecha del movimiento (fecha de venta/compra/pago)
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  tenant      Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  entity      Entity         @relation(fields: [entityId], references: [id], onDelete: Cascade)
  sale        Sale?          @relation(fields: [saleId], references: [id])
  purchase    Purchase?      @relation(fields: [purchaseId], references: [id])
  payment     EntityPayment? @relation(fields: [paymentId], references: [id])

  @@index([tenantId, entityId, date])
  @@index([tenantId, entityId, type])
  @@map("entity_movements")
}
```

### EntityPayment
```prisma
model EntityPayment {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  entityId          String   @map("entity_id")

  // Tipo de pago
  type              String   // CUSTOMER_PAYMENT (cobro) o SUPPLIER_PAYMENT (pago)

  // Monto total del pago
  amount            Decimal  @db.Decimal(15, 2)

  // Forma de pago
  paymentMethodId   String   @map("payment_method_id")
  paymentMethodName String   @map("payment_method_name")

  // Referencias (cheque, transferencia, etc.)
  reference         String?
  referenceDate     DateTime? @map("reference_date") @db.Date

  // Detalles
  notes             String?

  // Fechas
  date              DateTime @db.Date // Fecha del pago
  createdAt         DateTime @default(now()) @map("created_at")
  createdBy         String   @map("created_by")

  // Relations
  tenant            Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  entity            Entity           @relation(fields: [entityId], references: [id], onDelete: Cascade)
  paymentMethod     PaymentMethod    @relation(fields: [paymentMethodId], references: [id])
  createdByUser     User             @relation("EntityPaymentCreatedBy", fields: [createdBy], references: [id])
  movements         EntityMovement[] // Un pago genera 1+ movimientos

  @@index([tenantId, entityId, date])
  @@map("entity_payments")
}
```

## 🔄 Flujo de Datos

### 1. Al crear una Venta a Crédito
```typescript
// Backend: SalesService.createSale()
if (sale.paymentStatus === 'PENDING' || sale.paymentStatus === 'PARTIAL') {
  await entityAccountService.createMovement({
    entityId: sale.customerId,
    type: 'SALE',
    nature: 'DEBIT',
    amount: sale.totalAmount,
    saleId: sale.id,
    date: sale.saleDate,
    description: `Venta ${sale.fullVoucherNumber}`
  });
}
```

### 2. Al registrar un Cobro
```typescript
// Backend: EntityAccountService.registerCustomerPayment()
const payment = await prisma.entityPayment.create({
  data: {
    tenantId,
    entityId: customerId,
    type: 'CUSTOMER_PAYMENT',
    amount: paymentAmount,
    paymentMethodId,
    date: paymentDate,
    createdBy: userId
  }
});

// Crear movimiento de crédito
await createMovement({
  entityId: customerId,
  type: 'SALE_PAYMENT',
  nature: 'CREDIT',
  amount: paymentAmount,
  paymentId: payment.id,
  date: paymentDate,
  description: `Cobro - ${paymentMethod.name}`
});
```

### 3. Cálculo de Saldo
```typescript
// El saldo se calcula acumulando los movimientos
// DEBIT aumenta el saldo (lo que nos deben)
// CREDIT disminuye el saldo (lo que pagaron)

balance = ∑(DEBITS) - ∑(CREDITS)

// Para clientes: saldo positivo = nos deben
// Para proveedores: saldo positivo = les debemos
```

## 🎨 Frontend

### Página: Estado de Cuenta de Entidad
**Ruta:** `/entities/:id/account`

**Secciones:**
1. **Header**
   - Nombre de la entidad
   - Saldo actual (destacado)
   - Rango de fechas
   - Botón "Registrar Pago"
   - Botón "Exportar PDF"

2. **Tabla de Movimientos**
   | Fecha | Tipo | Descripción | Débito | Crédito | Saldo |
   |-------|------|-------------|--------|---------|-------|
   | 15/12 | Venta | FC 0001-0000123 | $10,000 | - | $10,000 |
   | 16/12 | Pago | Efectivo | - | $5,000 | $5,000 |

3. **Modal: Registrar Pago**
   - Monto
   - Forma de pago
   - Referencia (opcional)
   - Fecha
   - Notas (opcional)

## 📅 Estimación de Tiempo

| Tarea | Duración | Estado |
|-------|----------|--------|
| 1. Schema Prisma + Migración | 1-2 horas | ⏳ |
| 2. EntityAccountService | 3-4 horas | ⏳ |
| 3. Endpoints REST | 2-3 horas | ⏳ |
| 4. EntityAccountPage (Frontend) | 4-5 horas | ⏳ |
| 5. Exportación PDF | 2 horas | ⏳ |
| 6. Testing e integración | 2-3 horas | ⏳ |
| **TOTAL** | **14-19 horas (~2-3 días)** | |

## ✅ Criterios de Aceptación

1. ✅ Al crear una venta a crédito, se crea automáticamente un movimiento DEBIT
2. ✅ Al registrar un pago, se crea automáticamente un movimiento CREDIT
3. ✅ El saldo se calcula correctamente (suma de débitos - suma de créditos)
4. ✅ Se puede ver el estado de cuenta de cualquier entidad (cliente/proveedor)
5. ✅ Se puede registrar pagos manualmente
6. ✅ Se puede filtrar movimientos por rango de fechas
7. ✅ Se puede exportar el estado de cuenta a PDF
8. ✅ La interfaz muestra claramente el saldo actual

---

**Fecha de creación:** 15/12/2025
**Autor:** Claude Code
