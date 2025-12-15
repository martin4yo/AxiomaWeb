import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const globalPrisma = new PrismaClient();

// Tipos de movimiento
export type MovementType =
  | 'SALE'
  | 'SALE_PAYMENT'
  | 'PURCHASE'
  | 'PURCHASE_PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'ADJUSTMENT'
  | 'INITIAL_BALANCE';

// Naturaleza del movimiento
export type MovementNature = 'DEBIT' | 'CREDIT';

// Tipo de pago
export type PaymentType = 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT';

interface CreateMovementInput {
  tenantId: string;
  entityId: string;
  type: MovementType;
  nature: MovementNature;
  amount: number | Decimal;
  date: Date;
  description?: string;
  notes?: string;
  saleId?: string;
  purchaseId?: string;
  paymentId?: string;
}

interface RegisterPaymentInput {
  tenantId: string;
  entityId: string;
  type: PaymentType;
  amount: number | Decimal;
  paymentMethodId: string;
  paymentMethodName: string;
  date: Date;
  reference?: string;
  referenceDate?: Date;
  notes?: string;
  createdBy: string;
}

interface EntityBalance {
  entityId: string;
  entityName: string;
  entityCode: string | null;
  currentBalance: number;
  totalDebits: number;
  totalCredits: number;
  movementCount: number;
  lastMovementDate: Date | null;
}

interface EntityMovementDetail {
  id: string;
  date: Date;
  type: string;
  nature: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  documentNumber?: string;
  reference?: string;
  paymentMethod?: string;
  notes?: string;
}

export class EntityAccountService {
  /**
   * Crear un movimiento en la cuenta corriente
   * Calcula el balance automáticamente basándose en movimientos anteriores
   */
  async createMovement(input: CreateMovementInput, prisma: PrismaClient = globalPrisma) {
    const { tenantId, entityId, type, nature, amount, date, description, notes, saleId, purchaseId, paymentId } =
      input;

    // Verificar que la entidad existe
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, tenantId },
    });

    if (!entity) {
      throw new Error('Entidad no encontrada');
    }

    // Obtener el último balance de la entidad
    const lastMovement = await prisma.entityMovement.findFirst({
      where: { tenantId, entityId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { balance: true },
    });

    const previousBalance = lastMovement ? Number(lastMovement.balance) : 0;

    // Calcular nuevo balance
    // DEBIT aumenta el saldo (lo que nos deben / lo que les debemos)
    // CREDIT disminuye el saldo (lo que pagaron / lo que pagamos)
    const amountNum = typeof amount === 'number' ? amount : Number(amount);
    const newBalance = nature === 'DEBIT' ? previousBalance + amountNum : previousBalance - amountNum;

    // Crear el movimiento
    const movement = await prisma.entityMovement.create({
      data: {
        tenantId,
        entityId,
        type,
        nature,
        amount: new Decimal(amountNum),
        balance: new Decimal(newBalance),
        date,
        description,
        notes,
        saleId,
        purchaseId,
        paymentId,
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      ...movement,
      amount: Number(movement.amount),
      balance: Number(movement.balance),
      previousBalance,
    };
  }

  /**
   * Registrar un cobro de cliente (CUSTOMER_PAYMENT)
   */
  async registerCustomerPayment(input: RegisterPaymentInput, prisma: PrismaClient = globalPrisma) {
    return await this.registerPayment({ ...input, type: 'CUSTOMER_PAYMENT' }, prisma);
  }

  /**
   * Registrar un pago a proveedor (SUPPLIER_PAYMENT)
   */
  async registerSupplierPayment(input: RegisterPaymentInput, prisma: PrismaClient = globalPrisma) {
    return await this.registerPayment({ ...input, type: 'SUPPLIER_PAYMENT' }, prisma);
  }

  /**
   * Registrar un pago (genérico)
   * Crea un EntityPayment y su correspondiente EntityMovement
   */
  private async registerPayment(input: RegisterPaymentInput, prisma: PrismaClient = globalPrisma) {
    const {
      tenantId,
      entityId,
      type,
      amount,
      paymentMethodId,
      paymentMethodName,
      date,
      reference,
      referenceDate,
      notes,
      createdBy,
    } = input;

    // Verificar que la entidad existe
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, tenantId },
    });

    if (!entity) {
      throw new Error('Entidad no encontrada');
    }

    // Verificar que el método de pago existe
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, tenantId },
    });

    if (!paymentMethod) {
      throw new Error('Método de pago no encontrado');
    }

    // Crear el pago y el movimiento en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el registro de pago
      const payment = await tx.entityPayment.create({
        data: {
          tenantId,
          entityId,
          type,
          amount: new Decimal(amount),
          paymentMethodId,
          paymentMethodName,
          date,
          reference,
          referenceDate,
          notes,
          createdBy,
        },
      });

      // Crear el movimiento correspondiente
      // CUSTOMER_PAYMENT: recibimos dinero, disminuye lo que nos deben (CREDIT)
      // SUPPLIER_PAYMENT: pagamos dinero, disminuye lo que les debemos (CREDIT)
      const movement = await this.createMovement(
        {
          tenantId,
          entityId,
          type: type === 'CUSTOMER_PAYMENT' ? 'SALE_PAYMENT' : 'PURCHASE_PAYMENT',
          nature: 'CREDIT',
          amount,
          date,
          description:
            type === 'CUSTOMER_PAYMENT'
              ? `Cobro - ${paymentMethodName}`
              : `Pago a proveedor - ${paymentMethodName}`,
          notes: reference ? `Ref: ${reference}` : undefined,
          paymentId: payment.id,
        },
        tx as any
      );

      return { payment, movement };
    });

    return {
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount),
      },
      movement: result.movement,
    };
  }

  /**
   * Obtener saldo actual de una entidad
   */
  async getEntityBalance(tenantId: string, entityId: string): Promise<EntityBalance> {
    // Verificar que la entidad existe
    const entity = await globalPrisma.entity.findFirst({
      where: { id: entityId, tenantId },
    });

    if (!entity) {
      throw new Error('Entidad no encontrada');
    }

    // Obtener estadísticas de movimientos
    const stats = await globalPrisma.entityMovement.aggregate({
      where: { tenantId, entityId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Obtener el último movimiento para el balance actual
    const lastMovement = await globalPrisma.entityMovement.findFirst({
      where: { tenantId, entityId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { balance: true, date: true },
    });

    // Calcular débitos y créditos por separado
    const debits = await globalPrisma.entityMovement.aggregate({
      where: { tenantId, entityId, nature: 'DEBIT' },
      _sum: { amount: true },
    });

    const credits = await globalPrisma.entityMovement.aggregate({
      where: { tenantId, entityId, nature: 'CREDIT' },
      _sum: { amount: true },
    });

    return {
      entityId: entity.id,
      entityName: entity.name,
      entityCode: entity.code,
      currentBalance: lastMovement ? Number(lastMovement.balance) : 0,
      totalDebits: Number(debits._sum.amount || 0),
      totalCredits: Number(credits._sum.amount || 0),
      movementCount: stats._count.id,
      lastMovementDate: lastMovement?.date || null,
    };
  }

  /**
   * Obtener movimientos de cuenta corriente de una entidad
   */
  async getEntityMovements(
    tenantId: string,
    entityId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      type?: MovementType;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    movements: EntityMovementDetail[];
    summary: {
      openingBalance: number;
      totalDebits: number;
      totalCredits: number;
      closingBalance: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { dateFrom, dateTo, type, page = 1, limit = 50 } = filters || {};

    // Verificar que la entidad existe
    const entity = await globalPrisma.entity.findFirst({
      where: { id: entityId, tenantId },
    });

    if (!entity) {
      throw new Error('Entidad no encontrada');
    }

    // Construir filtros
    const where: Prisma.EntityMovementWhereInput = {
      tenantId,
      entityId,
    };

    if (dateFrom && dateTo) {
      where.date = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    } else if (dateFrom) {
      where.date = { gte: new Date(dateFrom) };
    } else if (dateTo) {
      where.date = { lte: new Date(dateTo) };
    }

    if (type) {
      where.type = type;
    }

    // Calcular saldo de apertura (movimientos antes de la fecha inicial)
    let openingBalance = 0;
    if (dateFrom) {
      const lastMovementBefore = await globalPrisma.entityMovement.findFirst({
        where: {
          tenantId,
          entityId,
          date: { lt: new Date(dateFrom) },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      });

      openingBalance = lastMovementBefore ? Number(lastMovementBefore.balance) : 0;
    }

    // Obtener total de movimientos (para paginación)
    const total = await globalPrisma.entityMovement.count({ where });

    // Obtener movimientos con paginación
    const skip = (page - 1) * limit;
    const movements = await globalPrisma.entityMovement.findMany({
      where,
      include: {
        sale: {
          select: { fullVoucherNumber: true, saleNumber: true },
        },
        purchase: {
          select: { purchaseNumber: true, invoiceNumber: true },
        },
        payment: {
          select: {
            reference: true,
            paymentMethodName: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: limit,
    });

    // Transformar a formato de salida
    const movementDetails: EntityMovementDetail[] = movements.map((mov) => {
      let documentNumber: string | undefined;
      if (mov.sale) {
        documentNumber = mov.sale.fullVoucherNumber || mov.sale.saleNumber;
      } else if (mov.purchase) {
        documentNumber = mov.purchase.invoiceNumber || mov.purchase.purchaseNumber;
      }

      return {
        id: mov.id,
        date: mov.date,
        type: mov.type,
        nature: mov.nature,
        description: mov.description || '',
        debit: mov.nature === 'DEBIT' ? Number(mov.amount) : 0,
        credit: mov.nature === 'CREDIT' ? Number(mov.amount) : 0,
        balance: Number(mov.balance),
        documentNumber,
        reference: mov.payment?.reference || undefined,
        paymentMethod: mov.payment?.paymentMethodName || undefined,
        notes: mov.notes || undefined,
      };
    });

    // Calcular totales del período filtrado
    const totalDebits = movementDetails.reduce((sum, mov) => sum + mov.debit, 0);
    const totalCredits = movementDetails.reduce((sum, mov) => sum + mov.credit, 0);
    const closingBalance = openingBalance + totalDebits - totalCredits;

    return {
      movements: movementDetails,
      summary: {
        openingBalance,
        totalDebits,
        totalCredits,
        closingBalance,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener estado de cuenta completo (sin paginación, para exportar)
   */
  async getEntityStatement(
    tenantId: string,
    entityId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    // Reutilizamos getEntityMovements pero sin límite
    const result = await this.getEntityMovements(tenantId, entityId, {
      ...filters,
      page: 1,
      limit: 999999, // Sin límite práctico
    });

    return {
      entity: await globalPrisma.entity.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          addressLine1: true,
          city: true,
          isCustomer: true,
          isSupplier: true,
        },
      }),
      movements: result.movements,
      summary: result.summary,
    };
  }

  /**
   * Obtener todas las entidades con saldo
   */
  async getEntitiesWithBalance(
    tenantId: string,
    filters?: {
      isCustomer?: boolean;
      isSupplier?: boolean;
      hasBalance?: boolean;
      search?: string;
    }
  ): Promise<EntityBalance[]> {
    const { isCustomer, isSupplier, hasBalance, search } = filters || {};

    // Construir el WHERE para entidades
    const entityWhere: Prisma.EntityWhereInput = { tenantId };

    if (isCustomer !== undefined) {
      entityWhere.isCustomer = isCustomer;
    }

    if (isSupplier !== undefined) {
      entityWhere.isSupplier = isSupplier;
    }

    if (search) {
      entityWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Obtener todas las entidades
    const entities = await globalPrisma.entity.findMany({
      where: entityWhere,
      select: { id: true, code: true, name: true },
    });

    // Obtener balances de cada entidad
    const balances: EntityBalance[] = [];

    for (const entity of entities) {
      const balance = await this.getEntityBalance(tenantId, entity.id);

      // Filtrar por balance si se especifica
      if (hasBalance && balance.currentBalance === 0) {
        continue;
      }

      balances.push(balance);
    }

    // Ordenar por balance descendente
    balances.sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));

    return balances;
  }
}

export const entityAccountService = new EntityAccountService();
