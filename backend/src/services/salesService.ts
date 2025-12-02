import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateSaleItem,
  calculateSaleTotals,
  validatePayments,
  calculatePaymentStatus,
  SaleItemResult
} from '../utils/calculationService.js'
import { AppError } from '../middleware/errorHandler.js'
import { VoucherService } from './voucher.service.js'
import { AfipWSFEService } from './afip-wsfe.service.js'
import { prisma as globalPrisma } from '../server.js'
import { cashMovementService } from './cashMovementService.js'

interface CreateSaleItemInput {
  productId: string
  quantity: number
  unitPrice?: number  // Opcional, se toma del producto si no se proporciona
  discountPercent?: number
  taxRate?: number  // Opcional, se usa tasa por defecto si no se proporciona
  description?: string  // Descripción personalizada (sobrescribe la del producto)
}

interface CreateSalePaymentInput {
  paymentMethodId: string
  amount: number
  reference?: string
  referenceDate?: string
}

interface CreateSaleInput {
  customerId?: string
  branchId?: string
  warehouseId: string
  saleDate?: string  // Fecha de la venta (ISO string), por defecto fecha actual
  items: CreateSaleItemInput[]
  payments: CreateSalePaymentInput[]
  notes?: string
  shouldInvoice?: boolean
  discountPercent?: number
  documentClass?: 'invoice' | 'credit_note' | 'debit_note' | 'quote'
  forceWithoutCAE?: boolean  // Permitir guardar sin CAE cuando hay desincronización
}

export class SalesService {
  private voucherService: VoucherService
  private afipService: AfipWSFEService

  constructor(private prisma: PrismaClient, private tenantId: string, private userId: string) {
    this.voucherService = new VoucherService(globalPrisma)
    this.afipService = new AfipWSFEService(globalPrisma)
  }

  /**
   * Crea una nueva venta con todos sus items y pagos
   * - Valida stock disponible
   * - Calcula totales e impuestos
   * - Descuenta stock del almacén
   * - Crea movimientos de stock
   * - Valida que suma de pagos = total
   */
  async createSale(data: CreateSaleInput) {
    const requestId = Math.random().toString(36).substring(7)
    console.log(`[Sales:${requestId}] createSale iniciado`)

    const {
      customerId,
      warehouseId,
      saleDate,
      items: itemsInput,
      payments: paymentsInput,
      notes,
      discountPercent = 0,
      documentClass = 'invoice',
      forceWithoutCAE = false
    } = data

    let shouldInvoice = data.shouldInvoice || false

    // 1. Validar que el almacén existe y está activo
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        tenantId: this.tenantId,
        isActive: true
      }
    })

    if (!warehouse) {
      throw new AppError('Almacén no encontrado o inactivo', 404)
    }

    // 2. Obtener configuración del tenant (condición IVA)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantId },
      include: {
        tenantVatCondition: true
      }
    })

    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404)
    }

    // 3. Validar que se proporcionó un cliente
    if (!customerId) {
      throw new AppError('Debe seleccionar un cliente', 400)
    }

    const finalCustomerId = customerId

    // 4. Obtener datos del cliente
    let customer = null
    let customerVatCondition = null
    let customerVatConditionAfipCode: number | null = null
    let customerDocType = 99 // Consumidor Final por defecto
    let customerName = 'Consumidor Final'
    let customerType = 'final'

    if (finalCustomerId) {
      customer = await this.prisma.entity.findFirst({
        where: {
          id: finalCustomerId,
          tenantId: this.tenantId,
          isActive: true,
          isCustomer: true
        }
      })

      if (!customer) {
        throw new AppError('Cliente no encontrado', 404)
      }

      customerName = customer.name
      customerVatCondition = customer.ivaCondition
      customerType = customer.name === 'Consumidor Final' ? 'final' : 'registered'

      // Obtener código AFIP de la condición IVA y tipo de documento
      if (customerVatCondition) {
        const vatCondition = await this.prisma.vatCondition.findFirst({
          where: {
            tenantId: this.tenantId,
            code: customerVatCondition,
            isActive: true
          }
        })

        if (vatCondition) {
          if (vatCondition.afipCode) {
            customerVatConditionAfipCode = vatCondition.afipCode
          }
          if (vatCondition.afipDocumentType) {
            customerDocType = vatCondition.afipDocumentType
          }
        }
      }

      // Default: Consumidor Final (código 5)
      if (!customerVatConditionAfipCode) {
        customerVatConditionAfipCode = 5
      }
    }

    // 5. Determinar tipo de comprobante usando VoucherService
    // Esto nos da el tipo correcto (FA, FB, FC) y si discrimina IVA
    let voucherInfo: any = null
    let discriminateVAT = false
    let finalVoucherType = 'FC' // Default: Factura C

    // Determinar tipo de comprobante
    voucherInfo = await this.voucherService.determineVoucherType(
      this.tenantId,
      finalCustomerId,
      documentClass,
      data.branchId // Pass branchId to find branch-specific or global configuration
    )
    finalVoucherType = voucherInfo.voucherType.code
    // Determinar si discrimina IVA según la letra del comprobante
    discriminateVAT = finalVoucherType.includes('A') // FA, NCA, NDA discriminan IVA

    // 6. Obtener tasa de IVA por defecto (21% para Argentina)
    const defaultTaxRate = tenant.tenantVatCondition?.taxRate || new Decimal(21)

    // 7. Procesar items y validar stock
    const processedItems: Array<{
      product: any
      input: CreateSaleItemInput
      calculation: SaleItemResult
      warehouseStock: any
    }> = []

    for (const itemInput of itemsInput) {
      // Obtener producto
      const product = await this.prisma.product.findFirst({
        where: {
          id: itemInput.productId,
          tenantId: this.tenantId,
          isActive: true
        }
      })

      if (!product) {
        throw new AppError(`Producto ${itemInput.productId} no encontrado`, 404)
      }

      // Verificar stock disponible
      if (product.trackStock) {
        const warehouseStock = await this.prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: product.id
            }
          }
        })

        const availableQty = warehouseStock?.availableQty || new Decimal(0)
        const requestedQty = new Decimal(itemInput.quantity)

        if (availableQty.lessThan(requestedQty)) {
          throw new AppError(
            `Stock insuficiente para ${product.name}. Disponible: ${availableQty}, Solicitado: ${requestedQty}`,
            400
          )
        }

        processedItems.push({
          product,
          input: itemInput,
          calculation: null as any, // Se calcula después
          warehouseStock
        })
      } else {
        processedItems.push({
          product,
          input: itemInput,
          calculation: null as any,
          warehouseStock: null
        })
      }
    }

    // 7. Calcular montos de cada item
    const itemCalculations: SaleItemResult[] = []

    for (const item of processedItems) {
      const unitPrice = item.input.unitPrice !== undefined
        ? new Decimal(item.input.unitPrice)
        : item.product.salePrice

      const taxRate = item.input.taxRate !== undefined
        ? new Decimal(item.input.taxRate)
        : defaultTaxRate

      const calculation = calculateSaleItem({
        quantity: new Decimal(item.input.quantity),
        unitPrice,
        discountPercent: new Decimal(item.input.discountPercent || 0),
        taxRate,
        discriminateVAT,
        unitCost: item.product.costPrice
      })

      item.calculation = calculation
      itemCalculations.push(calculation)
    }

    // 8. Calcular totales de la venta
    const totals = calculateSaleTotals(itemCalculations)

    // 9. Validar que suma de pagos = total
    if (!validatePayments(totals.totalAmount, paymentsInput.map(p => ({ amount: new Decimal(p.amount) })))) {
      throw new AppError(
        `La suma de pagos (${paymentsInput.reduce((acc, p) => acc + p.amount, 0)}) debe ser igual al total (${totals.totalAmount})`,
        400
      )
    }

    // 10. Determinar si se usa numeración AFIP o local
    let caeData: any = null
    let caeError: any = null
    let finalVoucherNumber: string = '' // Se inicializa vacío, se asigna dentro de la transacción

    // Si debe facturar Y hay voucherInfo con configuración AFIP, usar numeración AFIP
    let useLocalNumbering = true
    if (shouldInvoice && voucherInfo && voucherInfo.configuration) {
      useLocalNumbering = false // Usar número de AFIP
      finalVoucherNumber = voucherInfo.nextNumber
    }
    // Si no hay facturación AFIP o no hay configuración, usar numeración local
    // El número se generará DENTRO de la transacción para evitar race conditions

    // 11. Calcular estado de pago
    const totalPaid = paymentsInput.reduce((acc, p) => acc + p.amount, 0)
    const paymentStatus = calculatePaymentStatus(totals.totalAmount, new Decimal(totalPaid))

    // 11.5. Si hay facturación AFIP, verificar sincronización con AFIP antes de crear
    let afipSyncStatus: 'ok' | 'out_of_sync' | 'error' = 'ok'
    let lastAfipNumber: number | null = null

    if (!useLocalNumbering && voucherInfo && voucherInfo.requiresCae && voucherInfo.afipConnection) {
      try {
        console.log('[Sales] Consultando último número autorizado en AFIP...')
        lastAfipNumber = await this.afipService.getLastAuthorizedNumber(
          voucherInfo.afipConnection.id,
          voucherInfo.salesPoint?.number || 1,
          voucherInfo.voucherType.afipCode!
        )

        console.log(`[Sales] Último número AFIP: ${lastAfipNumber}, Número local: ${voucherInfo.nextNumberRaw}`)

        // Si AFIP tiene un número mayor, hay ventas sin sincronizar
        if (lastAfipNumber >= voucherInfo.nextNumberRaw) {
          afipSyncStatus = 'out_of_sync'
          console.warn(`[Sales] DESINCRONIZACIÓN: AFIP tiene ${lastAfipNumber}, local tiene ${voucherInfo.nextNumberRaw}`)

          // Si el usuario NO forzó guardar sin CAE, lanzar error
          if (!forceWithoutCAE) {
            throw new AppError(
              `El último número autorizado en AFIP (${lastAfipNumber}) es mayor o igual al número local (${voucherInfo.nextNumberRaw}). ` +
              `Esto indica que hay comprobantes sin sincronizar. ¿Desea guardar esta venta sin CAE y resincronizar después?`,
              409, // Conflict
              {
                code: 'AFIP_OUT_OF_SYNC',
                lastAfipNumber,
                localNumber: voucherInfo.nextNumberRaw,
                canContinueWithoutCAE: true
              }
            )
          } else {
            console.log('[Sales] Usuario confirmó guardar sin CAE por desincronización')
            // Continuar con la venta pero sin solicitar CAE
            shouldInvoice = false // Forzar a que no pida CAE
          }
        }
      } catch (error: any) {
        if (error instanceof AppError && error.statusCode === 409) {
          // Es el error de desincronización que lanzamos nosotros, re-lanzarlo
          throw error
        }

        // Otro error consultando AFIP - permitir continuar sin validación
        console.error('[Sales] Error consultando AFIP:', error.message)
        afipSyncStatus = 'error'
      }
    }

    // 12. Crear venta en transacción
    const createdSale = await this.prisma.$transaction(async (tx) => {
      // Obtener fecha local sin hora (usar saleDate si está presente, sino fecha actual)
      let localDate: Date
      if (saleDate) {
        const inputDate = new Date(saleDate)
        localDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate())
      } else {
        const now = new Date()
        localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }

      // Generar número local DENTRO de la transacción para evitar race conditions
      if (useLocalNumbering) {
        // Para numeración local, usar punto de venta 1 por defecto (sin AFIP)
        const salesPointNumber = 1
        finalVoucherNumber = await this.generateSaleNumberInTransaction(tx as any, salesPointNumber)
        console.log(`[Sales:${requestId}] Número generado (local): ${finalVoucherNumber}`)
      } else if (voucherInfo) {
        // Si es numeración AFIP, incrementar y obtener el número DENTRO de la transacción
        // Esto previene race conditions cuando se crean múltiples ventas simultáneas
        console.log(`[Sales:${requestId}] Incrementando nextVoucherNumber para config ${voucherInfo.configuration.id}`)

        const updatedConfig = await tx.voucherConfiguration.update({
          where: { id: voucherInfo.configuration.id },
          data: {
            nextVoucherNumber: { increment: 1 }
          }
        })

        // El número a usar es el anterior al incremento
        const numberToUse = updatedConfig.nextVoucherNumber - 1
        finalVoucherNumber = `${voucherInfo.salesPoint?.number.toString().padStart(5, '0') || '00000'}-${numberToUse.toString().padStart(8, '0')}`

        console.log(`[Sales:${requestId}] Número generado (AFIP): ${finalVoucherNumber} (nextVoucherNumber después de incremento: ${updatedConfig.nextVoucherNumber})`)

        // Actualizar también el nextNumberRaw para usar después
        if (voucherInfo.nextNumberRaw) {
          voucherInfo.nextNumberRaw = numberToUse
        }
      }

      // Crear venta
      console.log(`[Sales:${requestId}] Intentando crear venta con tenantId=${this.tenantId}, saleNumber=${finalVoucherNumber}`)

      const newSale = await tx.sale.create({
        data: {
          tenantId: this.tenantId,
          saleNumber: finalVoucherNumber,
          saleDate: localDate,
          customerId: finalCustomerId || null,
          customerName,
          customerType,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paidAmount: new Decimal(totalPaid),
          balanceAmount: totals.totalAmount.sub(new Decimal(totalPaid)),
          paymentStatus,
          voucherType: finalVoucherType,
          voucherConfigurationId: voucherInfo?.configuration?.id || null,
          warehouseId,
          notes: notes || null,
          status: 'completed',
          createdBy: this.userId,
          discountPercent: new Decimal(discountPercent),
          afipStatus: shouldInvoice && voucherInfo ? 'pending' : 'not_sent'
        }
      })

      // Crear items
      let lineNumber = 1
      for (const item of processedItems) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            lineNumber: lineNumber++,
            productId: item.product.id,
            productSku: item.product.sku,
            productName: item.product.name,
            description: item.input.description || item.product.description,
            quantity: new Decimal(item.input.quantity),
            unitPrice: item.input.unitPrice !== undefined
              ? new Decimal(item.input.unitPrice)
              : item.product.salePrice,
            discountPercent: new Decimal(item.input.discountPercent || 0),
            discountAmount: item.calculation.discountAmount,
            taxRate: item.input.taxRate !== undefined
              ? new Decimal(item.input.taxRate)
              : defaultTaxRate,
            taxAmount: item.calculation.taxAmount,
            subtotal: item.calculation.subtotal,
            lineTotal: item.calculation.lineTotal,
            unitCost: item.product.costPrice,
            totalCost: item.calculation.totalCost || null,
            priceIncludesTax: true
          }
        })

        // Descontar stock si aplica
        if (item.product.trackStock && item.warehouseStock) {
          const newQuantity = item.warehouseStock.quantity.sub(new Decimal(item.input.quantity))
          const newAvailable = item.warehouseStock.availableQty.sub(new Decimal(item.input.quantity))

          await tx.warehouseStock.update({
            where: {
              id: item.warehouseStock.id
            },
            data: {
              quantity: newQuantity,
              availableQty: newAvailable,
              lastMovement: new Date()
            }
          })

          // Crear movimiento de stock
          await tx.stockMovement.create({
            data: {
              tenantId: this.tenantId,
              warehouseId,
              productId: item.product.id,
              movementType: 'OUT',
              quantity: new Decimal(item.input.quantity),
              unitCost: item.product.costPrice,
              totalCost: new Decimal(item.input.quantity).mul(item.product.costPrice),
              documentType: 'SALE',
              documentId: newSale.id,
              referenceNumber: newSale.saleNumber,
              notes: `Venta ${newSale.saleNumber}`,
              userId: this.userId
            }
          })
        }
      }

      // Crear pagos
      const createdPayments = []
      for (const paymentInput of paymentsInput) {
        const paymentMethod = await tx.paymentMethod.findFirst({
          where: {
            id: paymentInput.paymentMethodId,
            tenantId: this.tenantId,
            isActive: true
          }
        })

        if (!paymentMethod) {
          throw new AppError(`Forma de pago ${paymentInput.paymentMethodId} no encontrada`, 404)
        }

        const salePayment = await tx.salePayment.create({
          data: {
            saleId: newSale.id,
            paymentMethodId: paymentMethod.id,
            paymentMethodName: paymentMethod.name,
            amount: new Decimal(paymentInput.amount),
            reference: paymentInput.reference || null,
            referenceDate: paymentInput.referenceDate ? new Date(paymentInput.referenceDate) : null,
            status: 'completed',
            collectionDate: new Date()
          }
        })
        createdPayments.push(salePayment)
      }

      return { sale: newSale, payments: createdPayments }
    })

    // Registrar ingresos en caja (fuera de la transacción)
    for (const payment of createdSale.payments) {
      try {
        // Obtener el método de pago con su cuenta de caja asociada
        const paymentMethod = await this.prisma.paymentMethod.findUnique({
          where: { id: payment.paymentMethodId },
          select: { cashAccountId: true },
        })

        await cashMovementService.registerIncome({
          tenantId: this.tenantId,
          cashAccountId: paymentMethod?.cashAccountId || undefined,
          amount: payment.amount.toNumber(),
          category: 'sale',
          description: `Cobro de venta ${createdSale.sale.saleNumber} - ${customer?.name || 'Cliente Final'}`,
          reference: createdSale.sale.fullVoucherNumber || createdSale.sale.saleNumber,
          saleId: createdSale.sale.id,
          salePaymentId: payment.id,
          paymentMethodId: payment.paymentMethodId,
          movementDate: payment.collectionDate || new Date(),
          userId: this.userId,
        })
      } catch (error) {
        console.error('Error registering cash movement for sale payment:', error)
        // No fallar la venta si falla el registro del movimiento
      }
    }

    // 13. Solicitar CAE a AFIP si corresponde
    console.log(`[Sales:${requestId}] Evaluando si solicitar CAE:`, {
      shouldInvoice,
      hasVoucherInfo: !!voucherInfo,
      requiresCae: voucherInfo?.requiresCae,
      hasAfipConnection: !!voucherInfo?.afipConnection,
      hasCustomer: !!customer
    })

    if (shouldInvoice && voucherInfo && voucherInfo.requiresCae && voucherInfo.afipConnection && customer) {
      try {
        console.log(`[Sales:${requestId}] Solicitando CAE a AFIP...`)

        // Preparar número de documento del cliente
        let customerDocNumber = '0'

        if (customer.cuit) {
          customerDocNumber = customer.cuit.replace(/[^0-9]/g, '')
        } else if (customer.taxId) {
          customerDocNumber = customer.taxId.replace(/[^0-9]/g, '')
        }

        // Preparar items para AFIP
        const afipItems = processedItems.map(item => {
          const unitPrice = item.input.unitPrice !== undefined
            ? new Decimal(item.input.unitPrice)
            : item.product.salePrice
          const taxRate = item.input.taxRate !== undefined
            ? new Decimal(item.input.taxRate)
            : defaultTaxRate

          return {
            description: item.product.name,
            quantity: parseFloat(item.input.quantity.toString()),
            unitPrice: parseFloat(unitPrice.toString()),
            subtotal: parseFloat(item.calculation.subtotal.toString()),
            ivaRate: parseFloat(taxRate.toString()),
            ivaAmount: parseFloat(item.calculation.taxAmount.toString())
          }
        })

        // Solicitar CAE
        caeData = await this.afipService.requestCAE(
          voucherInfo.afipConnection.id,
          {
            salesPointNumber: voucherInfo.salesPoint?.number || 1,
            voucherTypeCode: voucherInfo.voucherType.afipCode!,
            voucherNumber: voucherInfo.nextNumberRaw,
            documentDate: createdSale.sale.saleDate,
            customerDocType,
            customerDocNumber,
            customerVatConditionAfipCode, // RG 5616 - Condición IVA del receptor (código AFIP)
            subtotal: parseFloat(totals.subtotal.toString()),
            iva: parseFloat(totals.taxAmount.toString()),
            total: parseFloat(totals.totalAmount.toString()),
            items: afipItems
          }
        )

        console.log('[Sales] CAE obtenido:', caeData.cae)

        // Actualizar venta con CAE
        await this.prisma.sale.update({
          where: { id: createdSale.sale.id },
          data: {
            afipStatus: 'authorized',
            afipCae: caeData.cae,
            caeExpiration: caeData.caeExpiration
          }
        })

        // NOTA: Ya no incrementamos nextVoucherNumber aquí porque se hizo dentro de la transacción
        // para evitar race conditions
      } catch (error: any) {
        console.error('[Sales] Error solicitando CAE:', error.message)

        // Actualizar estado a error
        await this.prisma.sale.update({
          where: { id: createdSale.sale.id },
          data: {
            afipStatus: 'error'
            // TODO: agregar campo afipErrorMessage al schema
          }
        })

        // Guardar información del error para retornar al frontend
        // La venta se guarda igual pero con estado 'error'
        caeError = {
          message: error.message,
          detail: error.data?.detail || null,
          code: error.data?.code || null
        }
      }
    }
    // NOTA: Ya no incrementamos nextVoucherNumber aquí porque se hace dentro de la transacción
    // para ambos casos (con CAE y sin CAE), evitando race conditions

    // 14. Retornar venta con todos sus datos
    const finalSale = await this.getSaleById(createdSale.sale.id)

    return {
      ...finalSale,
      caeInfo: caeData ? {
        cae: caeData.cae,
        caeExpiration: caeData.caeExpiration
      } : null,
      caeError: caeError
    }
  }

  /**
   * Genera número secuencial de venta para el tenant en formato: 00000-00000000
   * Donde el primer número es el código de sucursal y el segundo es el número correlativo
   *
   * NOTA: Esta función es llamada FUERA de la transacción y puede tener race conditions.
   * Usar generateSaleNumberInTransaction cuando se crea la venta.
   */
  private async generateSaleNumber(warehouseCode: string): Promise<string> {
    // Formatear código de warehouse a 5 dígitos
    const branchCode = warehouseCode.padStart(5, '0')

    // Obtener el último número de venta para este tenant y warehouse
    const lastSale = await this.prisma.sale.findFirst({
      where: {
        tenantId: this.tenantId,
        saleNumber: {
          startsWith: `${branchCode}-`
        }
      },
      orderBy: { saleNumber: 'desc' }
    })

    if (!lastSale) {
      return `${branchCode}-00000001`
    }

    // Extraer número correlativo y sumar 1
    // El formato es: XXXXX-00000001 donde XXXXX puede contener letras y números
    const match = lastSale.saleNumber.match(/^.+?-(\d{8})$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      return `${branchCode}-${num.toString().padStart(8, '0')}`
    }

    return `${branchCode}-00000001`
  }

  /**
   * Genera un número de venta local DENTRO de una transacción
   * Esto evita race conditions cuando se crean ventas simultáneamente
   */
  private async generateSaleNumberInTransaction(tx: PrismaClient, salesPointNumber: number): Promise<string> {
    // Formatear punto de venta a 5 dígitos
    const branchCode = salesPointNumber.toString().padStart(5, '0')

    // Crear un hash único para este tenant+warehouse para usar como lock ID
    // Usamos un hash simple basado en tenant ID y warehouse code
    const lockKey = `${this.tenantId}-${branchCode}`.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0) & 0x7FFFFFFF // Mantener como entero positivo de 32 bits

    console.log(`[Sales] Intentando adquirir lock ${lockKey} para ${this.tenantId}-${branchCode}`)

    // Adquirir un bloqueo advisory para este tenant+warehouse
    // Esto previene que dos transacciones generen el mismo número simultáneamente
    await (tx as any).$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`

    console.log(`[Sales] Lock ${lockKey} adquirido`)

    // Obtener el último número de venta para este tenant y warehouse
    const lastSale = await tx.sale.findFirst({
      where: {
        tenantId: this.tenantId,
        saleNumber: {
          startsWith: `${branchCode}-`
        }
      },
      orderBy: { saleNumber: 'desc' }
    })

    console.log(`[Sales] Última venta encontrada:`, lastSale ? `${lastSale.saleNumber} (ID: ${lastSale.id})` : 'ninguna')

    if (!lastSale) {
      return `${branchCode}-00000001`
    }

    // Extraer número correlativo y sumar 1
    // El formato es: XXXXX-00000001 donde XXXXX puede contener letras y números
    const match = lastSale.saleNumber.match(/^.+?-(\d{8})$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      console.log(`[Sales] Incrementando número: ${match[1]} -> ${num}`)
      return `${branchCode}-${num.toString().padStart(8, '0')}`
    }

    console.log(`[Sales] No se pudo extraer número de ${lastSale.saleNumber}, retornando 00000001`)
    return `${branchCode}-00000001`
  }

  /**
   * Obtiene una venta por ID con todos sus datos
   */
  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        tenantId: this.tenantId
      },
      include: {
        customer: true,
        warehouse: true,
        voucherTypeRelation: true,
        voucherConfiguration: true,
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: true
          },
          orderBy: {
            lineNumber: 'asc'
          }
        },
        payments: {
          include: {
            paymentMethod: true
          }
        },
        invoice: true
      }
    })

    if (!sale) {
      throw new AppError('Venta no encontrada', 404)
    }

    return sale
  }

  /**
   * Lista ventas con filtros y paginación
   */
  async listSales(filters: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
    customerId?: string
    paymentStatus?: string
    afipStatus?: string
    search?: string
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    const {
      page = 1,
      limit = 50,
      dateFrom,
      dateTo,
      customerId,
      paymentStatus,
      afipStatus,
      search,
      orderBy = 'saleDate',
      orderDirection = 'desc'
    } = filters

    const skip = (page - 1) * limit
    const take = limit

    const where: Prisma.SaleWhereInput = {
      tenantId: this.tenantId
    }

    if (dateFrom || dateTo) {
      where.saleDate = {}
      if (dateFrom) {
        where.saleDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.saleDate.lte = new Date(dateTo)
      }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (afipStatus) {
      where.afipStatus = afipStatus
    }

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Construir orderBy dinámico
    const orderByClause: any = {}
    orderByClause[orderBy] = orderDirection

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          customer: true,
          warehouse: true,
          voucherTypeRelation: true,
          voucherConfiguration: {
            include: {
              afipConnection: true
            }
          },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true
            }
          },
          payments: {
            select: {
              id: true,
              paymentMethodName: true,
              amount: true,
              status: true
            }
          }
        }
      }),
      this.prisma.sale.count({ where })
    ])

    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Cancela una venta y revierte el stock
   */
  async cancelSale(id: string) {
    const sale = await this.getSaleById(id)

    if (sale.status === 'cancelled') {
      throw new AppError('La venta ya está cancelada', 400)
    }

    if (sale.afipStatus === 'authorized') {
      throw new AppError('No se puede cancelar una venta con factura AFIP autorizada', 400)
    }

    // Cancelar en transacción
    return await this.prisma.$transaction(async (tx) => {
      // Actualizar estado de venta
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      })

      // Revertir stock de cada item
      for (const item of sale.items) {
        if (item.product && item.product.trackStock) {
          const warehouseStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: sale.warehouseId!,
                productId: item.productId!
              }
            }
          })

          if (warehouseStock) {
            await tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: {
                quantity: warehouseStock.quantity.add(item.quantity),
                availableQty: warehouseStock.availableQty.add(item.quantity),
                lastMovement: new Date()
              }
            })

            // Crear movimiento de reversión
            await tx.stockMovement.create({
              data: {
                tenantId: this.tenantId,
                warehouseId: sale.warehouseId!,
                productId: item.productId!,
                movementType: 'IN',
                quantity: item.quantity,
                unitCost: item.unitCost || new Decimal(0),
                totalCost: item.totalCost || new Decimal(0),
                documentType: 'SALE_CANCELLATION',
                documentId: sale.id,
                referenceNumber: sale.saleNumber,
                notes: `Cancelación de venta ${sale.saleNumber}`,
                userId: this.userId
              }
            })
          }
        }
      }

      // Cancelar pagos
      await tx.salePayment.updateMany({
        where: { saleId: id },
        data: { status: 'cancelled' }
      })

      return updatedSale
    })
  }

  /**
   * Reintenta solicitar CAE para una venta específica
   */
  async retryCaeForSale(saleId: string) {
    // Obtener la venta completa
    const sale = await this.getSaleById(saleId)

    // Validar que la venta existe y pertenece al tenant
    if (!sale) {
      throw new AppError('Venta no encontrada', 404)
    }

    // Validar que la venta necesita CAE
    if (sale.afipStatus === 'authorized') {
      throw new AppError('Esta venta ya tiene un CAE autorizado', 400)
    }

    if (!sale.voucherType) {
      throw new AppError('Esta venta no tiene información de comprobante', 400)
    }

    // Buscar el tipo de comprobante por código
    const voucherType = await this.prisma.voucherType.findFirst({
      where: {
        code: sale.voucherType,
        isActive: true
      }
    })

    if (!voucherType || !voucherType.afipCode) {
      throw new AppError('Tipo de comprobante no encontrado o sin código AFIP', 400)
    }

    // Obtener configuración de facturación
    const voucherConfig = await this.prisma.voucherConfiguration.findFirst({
      where: {
        tenantId: this.tenantId,
        voucherTypeId: voucherType.id,
        isActive: true
      },
      include: {
        voucherType: true,
        salesPoint: true,
        afipConnection: true
      }
    })

    if (!voucherConfig || !voucherConfig.afipConnection) {
      throw new AppError('No hay configuración AFIP para este tipo de comprobante', 400)
    }

    // Obtener código AFIP de condición IVA del cliente y tipo de documento
    let customerVatConditionAfipCode: number | null = null
    let customerDocType = 99 // Consumidor Final por defecto

    if (sale.customer?.ivaCondition) {
      const vatCondition = await this.prisma.vatCondition.findFirst({
        where: {
          tenantId: this.tenantId,
          code: sale.customer.ivaCondition,
          isActive: true
        }
      })

      if (vatCondition) {
        if (vatCondition.afipCode) {
          customerVatConditionAfipCode = vatCondition.afipCode
        }
        if (vatCondition.afipDocumentType) {
          customerDocType = vatCondition.afipDocumentType
        }
      }
    }

    // Default: Consumidor Final (código 5)
    if (!customerVatConditionAfipCode) {
      customerVatConditionAfipCode = 5
    }

    // Preparar número de documento del cliente
    let customerDocNumber = '0'

    if (sale.customer?.cuit) {
      customerDocNumber = sale.customer.cuit.replace(/[^0-9]/g, '')
    } else if (sale.customer?.taxId) {
      customerDocNumber = sale.customer.taxId.replace(/[^0-9]/g, '')
    }

    // Preparar items para AFIP
    const afipItems = sale.items.map(item => ({
      description: item.productName,
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unitPrice.toString()),
      subtotal: parseFloat(item.subtotal.toString()),
      ivaRate: parseFloat(item.taxRate.toString()),
      ivaAmount: parseFloat(item.taxAmount.toString())
    }))

    let caeData: any = null
    let caeError: any = null

    try {
      // Extraer número de comprobante del saleNumber (formato: 00001-00000040)
      const voucherNumberMatch = sale.saleNumber.match(/-(\d+)$/)
      const voucherNumberRaw = voucherNumberMatch ? parseInt(voucherNumberMatch[1]) : 0

      if (voucherNumberRaw === 0) {
        throw new AppError('No se pudo extraer el número de comprobante', 400)
      }

      // Solicitar CAE
      caeData = await this.afipService.requestCAE(
        voucherConfig.afipConnection.id,
        {
          salesPointNumber: voucherConfig.salesPoint?.number || 1,
          voucherTypeCode: voucherType.afipCode!,
          voucherNumber: voucherNumberRaw,
          documentDate: sale.saleDate,
          customerDocType,
          customerDocNumber,
          customerVatConditionAfipCode,
          subtotal: parseFloat(sale.subtotal.toString()),
          iva: parseFloat(sale.taxAmount.toString()),
          total: parseFloat(sale.totalAmount.toString()),
          items: afipItems
        }
      )

      // Actualizar venta con CAE
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: {
          afipStatus: 'authorized',
          afipCae: caeData.cae,
          caeExpiration: caeData.caeExpiration
        }
      })

      console.log(`[Sales] CAE obtenido para venta ${sale.saleNumber}: ${caeData.cae}`)
    } catch (error: any) {
      console.error('[Sales] Error solicitando CAE:', error.message)

      // Actualizar estado a error
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: {
          afipStatus: 'error'
        }
      })

      // Guardar información del error para retornar al frontend
      caeError = {
        message: error.message,
        detail: error.data?.detail || null,
        code: error.data?.code || null
      }
    }

    // Obtener venta actualizada
    const updatedSale = await this.getSaleById(sale.id)

    return {
      ...updatedSale,
      caeInfo: caeData ? {
        cae: caeData.cae,
        caeExpiration: caeData.caeExpiration
      } : null,
      caeError: caeError
    }
  }

  /**
   * Resincroniza ventas pendientes de CAE con AFIP
   * Busca ventas con afipStatus='pending' y solicita el CAE
   */
  async resyncPendingCAE(limit: number = 50) {
    // Buscar ventas pendientes de CAE
    const pendingSales = await this.prisma.sale.findMany({
      where: {
        tenantId: this.tenantId,
        afipStatus: 'pending',
        status: { not: 'cancelled' }
      },
      include: {
        customer: true,
        items: true
      },
      take: limit,
      orderBy: { createdAt: 'asc' }
    })

    const results = []

    for (const sale of pendingSales) {
      try {
        // Obtener configuración del comprobante
        // TODO: Necesitamos guardar voucherTypeId y otros datos en la venta
        // Por ahora, saltear ventas sin la información necesaria

        if (!sale.customer) {
          results.push({
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            success: false,
            error: 'Venta sin cliente'
          })
          continue
        }

        results.push({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          success: false,
          error: 'Funcionalidad en desarrollo - necesita más información en la venta'
        })
      } catch (error: any) {
        results.push({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          success: false,
          error: error.message
        })
      }
    }

    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  }
}
