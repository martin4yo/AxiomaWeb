import { Decimal } from '@prisma/client/runtime/library'

export interface SaleItemCalculation {
  quantity: Decimal
  unitPrice: Decimal
  discountPercent: Decimal
  taxRate: Decimal
  discriminateVAT: boolean
  unitCost?: Decimal
}

export interface SaleItemResult {
  subtotal: Decimal        // Cantidad × Precio unitario
  discountAmount: Decimal  // Descuento en pesos
  netAmount: Decimal       // Subtotal - Descuento (antes de IVA si discrimina)
  taxAmount: Decimal       // Impuesto en pesos
  lineTotal: Decimal       // Total de la línea
  totalCost?: Decimal      // Costo total (cantidad × costo unitario)

  // Para mostrar en factura
  displayNetPrice?: Decimal   // Precio sin IVA (solo si discrimina)
  displayTaxAmount?: Decimal  // IVA discriminado (solo si discrimina)
}

/**
 * Calcula los montos de un item de venta
 *
 * IMPORTANTE: Asumimos que el precio (salePrice) SIEMPRE incluye IVA
 *
 * Si discriminateVAT = true (Factura A):
 *   - Se calcula el precio neto sin IVA
 *   - Se separa el IVA
 *   - Se muestra desglosado
 *
 * Si discriminateVAT = false (Factura B/C):
 *   - El precio es el precio final
 *   - IVA incluido (no se discrimina)
 */
export function calculateSaleItem(data: SaleItemCalculation): SaleItemResult {
  const { quantity, unitPrice, discountPercent, taxRate, discriminateVAT, unitCost } = data

  // 1. Subtotal bruto (antes de descuento)
  const subtotal = new Decimal(quantity).mul(new Decimal(unitPrice))

  // 2. Descuento en pesos
  const discountAmount = subtotal.mul(new Decimal(discountPercent)).div(100)

  // 3. Subtotal después de descuento
  const subtotalAfterDiscount = subtotal.sub(discountAmount)

  // 4. Calcular costo total si se proporciona costo unitario
  const totalCost = unitCost ? new Decimal(quantity).mul(new Decimal(unitCost)) : undefined

  if (discriminateVAT) {
    // FACTURA A: Precio incluye IVA, hay que discriminarlo

    // Calcular el divisor (1 + tasa IVA)
    // Ej: Si IVA = 21%, divisor = 1.21
    const divisor = new Decimal(1).add(new Decimal(taxRate).div(100))

    // Calcular precio neto (sin IVA)
    const netAmount = subtotalAfterDiscount.div(divisor)

    // Calcular IVA
    const taxAmount = subtotalAfterDiscount.sub(netAmount)

    // El total es el mismo que subtotalAfterDiscount
    const lineTotal = subtotalAfterDiscount

    return {
      subtotal: new Decimal(subtotal).toDecimalPlaces(2),
      discountAmount: new Decimal(discountAmount).toDecimalPlaces(2),
      netAmount: new Decimal(netAmount).toDecimalPlaces(2),      // Neto sin IVA
      taxAmount: new Decimal(taxAmount).toDecimalPlaces(2),      // IVA discriminado
      lineTotal: new Decimal(lineTotal).toDecimalPlaces(2),      // Total = neto + IVA
      totalCost,
      displayNetPrice: new Decimal(netAmount).toDecimalPlaces(2),
      displayTaxAmount: new Decimal(taxAmount).toDecimalPlaces(2)
    }
  } else {
    // FACTURA B/C: Precio final, IVA incluido (no se discrimina)
    return {
      subtotal: new Decimal(subtotal).toDecimalPlaces(2),
      discountAmount: new Decimal(discountAmount).toDecimalPlaces(2),
      netAmount: new Decimal(subtotalAfterDiscount).toDecimalPlaces(2),
      taxAmount: new Decimal(0),  // IVA = 0 en la base de datos (está incluido pero no se discrimina)
      lineTotal: new Decimal(subtotalAfterDiscount).toDecimalPlaces(2),
      totalCost,
      displayNetPrice: undefined,
      displayTaxAmount: undefined
    }
  }
}

/**
 * Calcula los totales de toda la venta sumando items
 */
export function calculateSaleTotals(items: SaleItemResult[]) {
  const subtotal = items.reduce((acc, item) => acc.add(item.netAmount), new Decimal(0))
  const taxAmount = items.reduce((acc, item) => acc.add(item.taxAmount), new Decimal(0))
  const discountAmount = items.reduce((acc, item) => acc.add(item.discountAmount), new Decimal(0))
  const totalAmount = items.reduce((acc, item) => acc.add(item.lineTotal), new Decimal(0))

  return {
    subtotal: new Decimal(subtotal).toDecimalPlaces(2),
    discountAmount: new Decimal(discountAmount).toDecimalPlaces(2),
    taxAmount: new Decimal(taxAmount).toDecimalPlaces(2),
    totalAmount: new Decimal(totalAmount).toDecimalPlaces(2)
  }
}

/**
 * Determina el tipo de factura y si se discrimina IVA
 * basándose en las condiciones IVA del tenant y del cliente
 */
export interface VoucherTypeRule {
  tenantVatCondition: string
  customerVatCondition: string | null
  voucherType: string
  discriminateVAT: boolean
}

const VOUCHER_TYPE_RULES: VoucherTypeRule[] = [
  // EMPRESA RESPONSABLE INSCRIPTO
  {
    tenantVatCondition: 'RESPONSABLE_INSCRIPTO',
    customerVatCondition: 'RESPONSABLE_INSCRIPTO',
    voucherType: 'FC_A',
    discriminateVAT: true
  },
  {
    tenantVatCondition: 'RESPONSABLE_INSCRIPTO',
    customerVatCondition: 'MONOTRIBUTO',
    voucherType: 'FC_A',
    discriminateVAT: true
  },
  {
    tenantVatCondition: 'RESPONSABLE_INSCRIPTO',
    customerVatCondition: 'CONSUMIDOR_FINAL',
    voucherType: 'FC_B',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'RESPONSABLE_INSCRIPTO',
    customerVatCondition: 'EXENTO',
    voucherType: 'FC_B',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'RESPONSABLE_INSCRIPTO',
    customerVatCondition: null, // Sin cliente (venta mostrador)
    voucherType: 'FC_B',
    discriminateVAT: false
  },

  // EMPRESA MONOTRIBUTO (todos los casos)
  {
    tenantVatCondition: 'MONOTRIBUTO',
    customerVatCondition: 'RESPONSABLE_INSCRIPTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'MONOTRIBUTO',
    customerVatCondition: 'MONOTRIBUTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'MONOTRIBUTO',
    customerVatCondition: 'CONSUMIDOR_FINAL',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'MONOTRIBUTO',
    customerVatCondition: 'EXENTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'MONOTRIBUTO',
    customerVatCondition: null,
    voucherType: 'FC_C',
    discriminateVAT: false
  },

  // EMPRESA EXENTA (todos los casos)
  {
    tenantVatCondition: 'EXENTO',
    customerVatCondition: 'RESPONSABLE_INSCRIPTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'EXENTO',
    customerVatCondition: 'MONOTRIBUTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'EXENTO',
    customerVatCondition: 'CONSUMIDOR_FINAL',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'EXENTO',
    customerVatCondition: 'EXENTO',
    voucherType: 'FC_C',
    discriminateVAT: false
  },
  {
    tenantVatCondition: 'EXENTO',
    customerVatCondition: null,
    voucherType: 'FC_C',
    discriminateVAT: false
  }
]

export function determineVoucherType(
  tenantVatCondition: string | null,
  customerVatCondition?: string | null
): { voucherType: string; discriminateVAT: boolean } {

  // Si no hay condición de IVA del tenant, asumir Responsable Inscripto
  const effectiveTenantCondition = tenantVatCondition || 'RESPONSABLE_INSCRIPTO'

  // Si no hay cliente, es null
  const effectiveCustomerCondition = customerVatCondition || null

  const rule = VOUCHER_TYPE_RULES.find(r => {
    return (
      r.tenantVatCondition === effectiveTenantCondition &&
      r.customerVatCondition === effectiveCustomerCondition
    )
  })

  if (!rule) {
    // Default: Factura B sin discriminar IVA
    console.warn(`No se encontró regla para tenant: ${effectiveTenantCondition}, customer: ${effectiveCustomerCondition}. Usando default: FC_B`)
    return { voucherType: 'FC_B', discriminateVAT: false }
  }

  return {
    voucherType: rule.voucherType,
    discriminateVAT: rule.discriminateVAT
  }
}

/**
 * Valida que la suma de pagos sea igual al total de la venta
 */
export function validatePayments(totalAmount: Decimal, payments: { amount: Decimal }[]): boolean {
  const totalPaid = payments.reduce((acc, p) => acc.add(new Decimal(p.amount)), new Decimal(0))
  return totalPaid.equals(totalAmount)
}

/**
 * Calcula el estado de pago de la venta
 */
export function calculatePaymentStatus(totalAmount: Decimal, paidAmount: Decimal): string {
  if (paidAmount.isZero()) {
    return 'pending'
  } else if (paidAmount.lessThan(totalAmount)) {
    return 'partial'
  } else {
    return 'paid'
  }
}
