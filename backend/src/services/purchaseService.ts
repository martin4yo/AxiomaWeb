import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { cashMovementService } from './cashMovementService';

const globalPrisma = new PrismaClient();

interface PurchaseItemInput {
  productId: string;
  productSku?: string;
  productName: string;
  description?: string;
  expirationDate?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
}

interface PurchasePaymentInput {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  referenceDate?: string;
  notes?: string;
}

interface CreatePurchaseInput {
  tenantId: string;
  supplierId: string;
  warehouseId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items: PurchaseItemInput[];
  payments?: PurchasePaymentInput[];
  discountPercent?: number;
  notes?: string;
  userId: string;
}

interface UpdatePaymentStatusInput {
  tenantId: string;
  purchaseId: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
}

interface AddPaymentInput {
  tenantId: string;
  purchaseId: string;
  paymentMethodId: string;
  amount: number;
  reference?: string;
  referenceDate?: string;
  notes?: string;
  userId: string;
}

export class PurchaseService {
  /**
   * Genera el próximo número de compra para el tenant
   */
  private async generatePurchaseNumber(tenantId: string): Promise<string> {
    const lastPurchase = await globalPrisma.purchase.findFirst({
      where: { tenantId },
      orderBy: { purchaseNumber: 'desc' },
    });

    if (!lastPurchase) {
      return 'COMPRA-0001';
    }

    const lastNumber = parseInt(lastPurchase.purchaseNumber.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `COMPRA-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Calcula los totales de un item de compra
   */
  private calculateItemTotals(item: PurchaseItemInput) {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const discountPercent = new Decimal(item.discountPercent || 0);
    const taxRate = new Decimal(item.taxRate || 0);

    // Subtotal sin descuento
    const subtotalWithoutDiscount = quantity.mul(unitPrice);

    // Descuento
    const discountAmount = subtotalWithoutDiscount.mul(discountPercent).div(100);

    // Subtotal con descuento
    const subtotal = subtotalWithoutDiscount.minus(discountAmount);

    // Impuestos
    const taxAmount = subtotal.mul(taxRate).div(100);

    // Total de la línea
    const lineTotal = subtotal.plus(taxAmount);

    return {
      quantity: quantity.toNumber(),
      unitPrice: unitPrice.toNumber(),
      discountPercent: discountPercent.toNumber(),
      discountAmount: discountAmount.toNumber(),
      subtotal: subtotal.toNumber(),
      taxRate: taxRate.toNumber(),
      taxAmount: taxAmount.toNumber(),
      lineTotal: lineTotal.toNumber(),
    };
  }

  /**
   * Calcula los totales de la compra
   */
  private calculatePurchaseTotals(
    items: ReturnType<typeof this.calculateItemTotals>[],
    discountPercent: number = 0
  ) {
    const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

    // Descuento a nivel compra
    const discountAmount = (itemsSubtotal * discountPercent) / 100;
    const subtotal = itemsSubtotal - discountAmount;

    // Total
    const totalAmount = subtotal + itemsTaxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount: itemsTaxAmount,
      totalAmount,
    };
  }

  /**
   * Actualiza el stock del almacén al registrar una compra
   */
  private async updateWarehouseStock(
    tenantId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    userId: string,
    purchaseNumber: string
  ) {
    // Buscar el registro de stock existente
    const warehouseStock = await globalPrisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
    });

    const quantityDecimal = new Decimal(quantity);

    if (warehouseStock) {
      // Actualizar stock existente
      const newQuantity = new Decimal(warehouseStock.quantity).plus(quantityDecimal);
      const newAvailable = new Decimal(warehouseStock.availableQty).plus(quantityDecimal);

      await globalPrisma.warehouseStock.update({
        where: { id: warehouseStock.id },
        data: {
          quantity: newQuantity.toNumber(),
          availableQty: newAvailable.toNumber(),
          lastMovement: new Date(),
        },
      });
    } else {
      // Crear nuevo registro de stock
      await globalPrisma.warehouseStock.create({
        data: {
          tenantId,
          warehouseId,
          productId,
          quantity: quantityDecimal.toNumber(),
          reservedQty: 0,
          availableQty: quantityDecimal.toNumber(),
          lastMovement: new Date(),
        },
      });
    }

    // Crear movimiento de stock
    await globalPrisma.stockMovement.create({
      data: {
        tenantId,
        warehouseId,
        productId,
        movementType: 'IN',
        quantity: quantityDecimal.toNumber(),
        unitCost: unitPrice,
        totalCost: quantityDecimal.mul(unitPrice).toNumber(),
        documentType: 'PURCHASE',
        referenceNumber: purchaseNumber,
        notes: `Ingreso por compra ${purchaseNumber}`,
        userId,
      },
    });

    // Actualizar el stock total del producto
    const product = await globalPrisma.product.findUnique({
      where: { id: productId },
    });

    if (product) {
      const newTotalStock = new Decimal(product.currentStock).plus(quantityDecimal);
      await globalPrisma.product.update({
        where: { id: productId },
        data: {
          currentStock: newTotalStock.toNumber(),
          costPrice: unitPrice, // Actualizar precio de costo con el último precio de compra
        },
      });
    }
  }

  /**
   * Crear una nueva compra
   */
  async createPurchase(input: CreatePurchaseInput) {
    const {
      tenantId,
      supplierId,
      warehouseId,
      invoiceNumber,
      invoiceDate,
      items,
      payments = [],
      discountPercent = 0,
      notes,
      userId,
    } = input;

    // Validar que exista el proveedor
    const supplier = await globalPrisma.entity.findFirst({
      where: {
        id: supplierId,
        tenantId,
        isSupplier: true,
      },
    });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    // Validar que exista el almacén
    const warehouse = await globalPrisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        tenantId,
      },
    });

    if (!warehouse) {
      throw new Error('Almacén no encontrado');
    }

    // Validar que haya items
    if (!items || items.length === 0) {
      throw new Error('Debe incluir al menos un item en la compra');
    }

    // Calcular totales de cada item
    const calculatedItems = items.map((item, index) => ({
      ...item,
      lineNumber: index + 1,
      ...this.calculateItemTotals(item),
    }));

    // Calcular totales de la compra
    const totals = this.calculatePurchaseTotals(calculatedItems, discountPercent);

    // Validar pagos
    let paidAmount = 0;
    const paymentMethodIds = new Set<string>();

    for (const payment of payments) {
      paidAmount += payment.amount;
      paymentMethodIds.add(payment.paymentMethodId);
    }

    // Validar que no se pague más del total
    if (paidAmount > totals.totalAmount) {
      throw new Error('El monto total de los pagos no puede ser mayor al total de la compra');
    }

    // Obtener nombres de métodos de pago
    const paymentMethods = await globalPrisma.paymentMethod.findMany({
      where: {
        id: { in: Array.from(paymentMethodIds) },
        tenantId,
      },
    });

    const paymentMethodMap = new Map(paymentMethods.map((pm) => [pm.id, pm.name]));

    // Determinar estado de pago
    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (paidAmount === totals.totalAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    const balanceAmount = totals.totalAmount - paidAmount;

    // Generar número de compra
    const purchaseNumber = await this.generatePurchaseNumber(tenantId);

    // Crear la compra con todos sus items y pagos en una transacción
    const purchase = await globalPrisma.$transaction(async (tx) => {
      // Crear la compra
      const newPurchase = await tx.purchase.create({
        data: {
          tenantId,
          purchaseNumber,
          purchaseDate: new Date(),
          supplierId,
          supplierName: supplier.name,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
          warehouseId,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paidAmount,
          balanceAmount,
          paymentStatus,
          discountPercent,
          notes,
          status: 'completed',
          createdBy: userId,
        },
      });

      // Crear los items
      for (const item of calculatedItems) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: newPurchase.id,
            lineNumber: item.lineNumber,
            productId: item.productId,
            productSku: item.productSku,
            productName: item.productName,
            description: item.description,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            subtotal: item.subtotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          },
        });

        // Actualizar stock del producto en el almacén
        if (item.productId) {
          await this.updateWarehouseStock(
            tenantId,
            warehouseId,
            item.productId,
            item.quantity,
            item.unitPrice,
            userId,
            purchaseNumber
          );
        }
      }

      // Crear los pagos
      const createdPayments = [];
      for (const payment of payments) {
        const purchasePayment = await tx.purchasePayment.create({
          data: {
            purchaseId: newPurchase.id,
            paymentMethodId: payment.paymentMethodId,
            paymentMethodName: paymentMethodMap.get(payment.paymentMethodId) || 'Desconocido',
            amount: payment.amount,
            reference: payment.reference,
            referenceDate: payment.referenceDate ? new Date(payment.referenceDate) : null,
            paymentDate: new Date(),
            status: 'completed',
            notes: payment.notes,
            createdBy: userId,
          },
        });
        createdPayments.push(purchasePayment);
      }

      return { purchase: newPurchase, payments: createdPayments };
    });

    // Registrar egresos en caja (fuera de la transacción)
    for (const payment of purchase.payments) {
      try {
        // Obtener el método de pago con su cuenta de caja asociada
        const paymentMethod = await tenantPrisma.paymentMethod.findUnique({
          where: { id: payment.paymentMethodId },
          select: { cashAccountId: true },
        });

        await cashMovementService.registerExpense({
          tenantId,
          cashAccountId: paymentMethod?.cashAccountId || undefined,
          amount: payment.amount.toNumber(),
          category: 'purchase',
          description: `Pago de compra ${purchaseNumber} - ${supplier.name}`,
          reference: invoiceNumber || purchaseNumber,
          purchaseId: purchase.purchase.id,
          purchasePaymentId: payment.id,
          paymentMethodId: payment.paymentMethodId,
          movementDate: payment.paymentDate || new Date(),
          notes: payment.notes || undefined,
          userId,
        });
      } catch (error) {
        console.error('Error registering cash movement for purchase payment:', error);
        // No fallar la compra si falla el registro del movimiento
      }
    }

    // Retornar la compra completa con sus relaciones
    return this.getPurchaseById(tenantId, purchase.purchase.id);
  }

  /**
   * Obtener compra por ID
   */
  async getPurchaseById(tenantId: string, purchaseId: string) {
    const purchase = await globalPrisma.purchase.findFirst({
      where: {
        id: purchaseId,
        tenantId,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
          orderBy: {
            lineNumber: 'asc',
          },
        },
        payments: {
          include: {
            paymentMethod: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    return purchase;
  }

  /**
   * Listar compras con filtros
   */
  async listPurchases(
    tenantId: string,
    filters: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      supplierId?: string;
      paymentStatus?: string;
      search?: string;
    }
  ) {
    const { page = 1, limit = 20, dateFrom, dateTo, supplierId, paymentStatus, search } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      tenantId,
      AND: [],
    };

    if (dateFrom) {
      (where.AND as any[]).push({
        purchaseDate: { gte: new Date(dateFrom) },
      });
    }

    if (dateTo) {
      (where.AND as any[]).push({
        purchaseDate: { lte: new Date(dateTo) },
      });
    }

    if (supplierId) {
      (where.AND as any[]).push({
        supplierId,
      });
    }

    if (paymentStatus) {
      (where.AND as any[]).push({
        paymentStatus,
      });
    }

    if (search) {
      (where.AND as any[]).push({
        OR: [
          { purchaseNumber: { contains: search, mode: 'insensitive' } },
          { supplierName: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if ((where.AND as any[]).length === 0) {
      delete where.AND;
    }

    const [purchases, total] = await Promise.all([
      globalPrisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          _count: {
            select: {
              items: true,
              payments: true,
            },
          },
        },
        orderBy: {
          purchaseDate: 'desc',
        },
        skip,
        take: limit,
      }),
      globalPrisma.purchase.count({ where }),
    ]);

    return {
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Agregar un pago a una compra existente
   */
  async addPayment(input: AddPaymentInput) {
    const { tenantId, purchaseId, paymentMethodId, amount, reference, referenceDate, notes, userId } = input;

    // Obtener la compra
    const purchase = await globalPrisma.purchase.findFirst({
      where: {
        id: purchaseId,
        tenantId,
      },
    });

    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    if (purchase.status === 'cancelled') {
      throw new Error('No se puede agregar un pago a una compra cancelada');
    }

    // Validar que el monto no exceda el saldo pendiente
    const newPaidAmount = new Decimal(purchase.paidAmount).plus(amount);
    if (newPaidAmount.greaterThan(purchase.totalAmount)) {
      throw new Error('El monto del pago excede el saldo pendiente de la compra');
    }

    // Obtener método de pago
    const paymentMethod = await globalPrisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        tenantId,
      },
    });

    if (!paymentMethod) {
      throw new Error('Método de pago no encontrado');
    }

    // Calcular nuevo saldo
    const newBalanceAmount = new Decimal(purchase.totalAmount).minus(newPaidAmount);
    let newPaymentStatus: 'pending' | 'partial' | 'paid' = 'partial';

    if (newBalanceAmount.equals(0)) {
      newPaymentStatus = 'paid';
    }

    // Crear el pago y actualizar la compra en una transacción
    const result = await globalPrisma.$transaction(async (tx) => {
      // Crear el pago
      const payment = await tx.purchasePayment.create({
        data: {
          purchaseId,
          paymentMethodId,
          paymentMethodName: paymentMethod.name,
          amount,
          reference,
          referenceDate: referenceDate ? new Date(referenceDate) : null,
          paymentDate: new Date(),
          status: 'completed',
          notes,
          createdBy: userId,
        },
      });

      // Actualizar la compra
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          balanceAmount: newBalanceAmount.toNumber(),
          paymentStatus: newPaymentStatus,
        },
      });

      return { payment, purchase: updatedPurchase };
    });

    // Registrar egreso en caja
    try {
      // Obtener el método de pago con su cuenta de caja asociada
      const paymentMethod = await tenantPrisma.paymentMethod.findUnique({
        where: { id: paymentMethodId },
        select: { cashAccountId: true },
      });

      await cashMovementService.registerExpense({
        tenantId,
        cashAccountId: paymentMethod?.cashAccountId || undefined,
        amount: result.payment.amount.toNumber(),
        category: 'purchase_payment',
        description: `Pago adicional de compra ${purchase.purchaseNumber} - ${purchase.supplierName}`,
        reference: reference || purchase.purchaseNumber,
        purchaseId: purchase.id,
        purchasePaymentId: result.payment.id,
        paymentMethodId,
        movementDate: result.payment.paymentDate || new Date(),
        notes: notes || undefined,
        userId,
      });
    } catch (error) {
      console.error('Error registering cash movement for additional purchase payment:', error);
      // No fallar el pago si falla el registro del movimiento
    }

    return result;
  }

  /**
   * Cancelar una compra
   */
  async cancelPurchase(tenantId: string, purchaseId: string, userId: string) {
    const purchase = await globalPrisma.purchase.findFirst({
      where: {
        id: purchaseId,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    if (purchase.status === 'cancelled') {
      throw new Error('La compra ya está cancelada');
    }

    // Cancelar la compra y revertir el stock en una transacción
    await globalPrisma.$transaction(async (tx) => {
      // Actualizar estado de la compra
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'cancelled',
        },
      });

      // Revertir el stock de cada item
      for (const item of purchase.items) {
        if (item.productId) {
          // Buscar el stock en el almacén
          const warehouseStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: purchase.warehouseId,
                productId: item.productId,
              },
            },
          });

          if (warehouseStock) {
            const quantity = new Decimal(item.quantity);
            const newQuantity = new Decimal(warehouseStock.quantity).minus(quantity);
            const newAvailable = new Decimal(warehouseStock.availableQty).minus(quantity);

            await tx.warehouseStock.update({
              where: { id: warehouseStock.id },
              data: {
                quantity: newQuantity.toNumber(),
                availableQty: newAvailable.toNumber(),
                lastMovement: new Date(),
              },
            });
          }

          // Crear movimiento de salida (reversión)
          await tx.stockMovement.create({
            data: {
              tenantId,
              warehouseId: purchase.warehouseId,
              productId: item.productId,
              movementType: 'OUT',
              quantity: item.quantity,
              documentType: 'PURCHASE_CANCELLATION',
              referenceNumber: purchase.purchaseNumber,
              notes: `Reversión de compra cancelada ${purchase.purchaseNumber}`,
              userId,
            },
          });

          // Actualizar stock total del producto
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const newTotalStock = new Decimal(product.currentStock).minus(item.quantity);
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: newTotalStock.toNumber(),
              },
            });
          }
        }
      }
    });

    return this.getPurchaseById(tenantId, purchaseId);
  }
}

export const purchaseService = new PurchaseService();
