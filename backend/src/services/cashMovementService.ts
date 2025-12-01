import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class CashMovementService {
  /**
   * Registrar un ingreso de efectivo
   */
  async registerIncome(params: {
    tenantId: string;
    cashAccountId?: string; // Si no se especifica, usa la cuenta por defecto
    amount: number;
    category: string; // sale, payment, deposit, etc.
    description: string;
    reference?: string;
    saleId?: string;
    purchaseId?: string;
    salePaymentId?: string;
    purchasePaymentId?: string;
    paymentMethodId?: string;
    movementDate?: Date;
    notes?: string;
    userId: string;
  }) {
    const {
      tenantId,
      cashAccountId,
      amount,
      category,
      description,
      reference,
      saleId,
      purchaseId,
      salePaymentId,
      purchasePaymentId,
      paymentMethodId,
      movementDate = new Date(),
      notes,
      userId,
    } = params;

    // Si no se especifica cuenta, usar la por defecto
    let accountId = cashAccountId;
    if (!accountId) {
      const defaultAccount = await prisma.cashAccount.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
      });

      if (!defaultAccount) {
        throw new Error('No se encontró una cuenta de caja activa');
      }

      accountId = defaultAccount.id;
    }

    // Crear movimiento
    const movement = await prisma.cashMovement.create({
      data: {
        tenantId,
        cashAccountId: accountId,
        movementType: 'income',
        category,
        amount: new Decimal(amount),
        description,
        reference,
        saleId,
        purchaseId,
        salePaymentId,
        purchasePaymentId,
        paymentMethodId,
        movementDate,
        notes,
        createdBy: userId,
      },
      include: {
        cashAccount: true,
        paymentMethod: true,
        sale: true,
        purchase: true,
      },
    });

    return movement;
  }

  /**
   * Registrar un egreso de efectivo
   */
  async registerExpense(params: {
    tenantId: string;
    cashAccountId?: string;
    amount: number;
    category: string; // purchase, payment, withdrawal, etc.
    description: string;
    reference?: string;
    saleId?: string;
    purchaseId?: string;
    salePaymentId?: string;
    purchasePaymentId?: string;
    paymentMethodId?: string;
    movementDate?: Date;
    notes?: string;
    userId: string;
  }) {
    const {
      tenantId,
      cashAccountId,
      amount,
      category,
      description,
      reference,
      saleId,
      purchaseId,
      salePaymentId,
      purchasePaymentId,
      paymentMethodId,
      movementDate = new Date(),
      notes,
      userId,
    } = params;

    // Si no se especifica cuenta, usar la por defecto
    let accountId = cashAccountId;
    if (!accountId) {
      const defaultAccount = await prisma.cashAccount.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
      });

      if (!defaultAccount) {
        throw new Error('No se encontró una cuenta de caja activa');
      }

      accountId = defaultAccount.id;
    }

    // Crear movimiento
    const movement = await prisma.cashMovement.create({
      data: {
        tenantId,
        cashAccountId: accountId,
        movementType: 'expense',
        category,
        amount: new Decimal(amount),
        description,
        reference,
        saleId,
        purchaseId,
        salePaymentId,
        purchasePaymentId,
        paymentMethodId,
        movementDate,
        notes,
        createdBy: userId,
      },
      include: {
        cashAccount: true,
        paymentMethod: true,
        sale: true,
        purchase: true,
      },
    });

    return movement;
  }

  /**
   * Obtener balance de una cuenta
   */
  async getAccountBalance(tenantId: string, cashAccountId: string) {
    const account = await prisma.cashAccount.findFirst({
      where: { id: cashAccountId, tenantId },
    });

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    // Sumar ingresos
    const incomeResult = await prisma.cashMovement.aggregate({
      where: {
        tenantId,
        cashAccountId,
        movementType: 'income',
      },
      _sum: {
        amount: true,
      },
    });

    // Sumar egresos
    const expenseResult = await prisma.cashMovement.aggregate({
      where: {
        tenantId,
        cashAccountId,
        movementType: 'expense',
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncome = incomeResult._sum.amount || new Decimal(0);
    const totalExpense = expenseResult._sum.amount || new Decimal(0);
    const balance = new Decimal(account.initialBalance).plus(totalIncome).minus(totalExpense);

    return {
      account,
      initialBalance: account.initialBalance,
      totalIncome: totalIncome.toNumber(),
      totalExpense: totalExpense.toNumber(),
      balance: balance.toNumber(),
    };
  }

  /**
   * Listar movimientos de una cuenta
   */
  async listMovements(params: {
    tenantId: string;
    cashAccountId?: string;
    dateFrom?: string;
    dateTo?: string;
    movementType?: 'income' | 'expense';
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      tenantId,
      cashAccountId,
      dateFrom,
      dateTo,
      movementType,
      category,
      page = 1,
      limit = 50,
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (cashAccountId) {
      where.cashAccountId = cashAccountId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (category) {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.movementDate = {};
      if (dateFrom) {
        where.movementDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.movementDate.lte = new Date(dateTo);
      }
    }

    const [movements, total] = await Promise.all([
      prisma.cashMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { movementDate: 'desc' },
        include: {
          cashAccount: true,
          paymentMethod: true,
          sale: true,
          purchase: true,
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.cashMovement.count({ where }),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener resumen de todas las cuentas
   */
  async getAccountsSummary(tenantId: string) {
    const accounts = await prisma.cashAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.getAccountBalance(tenantId, account.id);
        return {
          ...account,
          ...balance,
        };
      })
    );

    return accountsWithBalance;
  }
}

export const cashMovementService = new CashMovementService();
