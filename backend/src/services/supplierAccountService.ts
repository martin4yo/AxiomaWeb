import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const globalPrisma = new PrismaClient();

interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  supplierCode: string | null;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number;
  purchaseCount: number;
}

interface SupplierMovement {
  id: string;
  date: Date;
  type: 'PURCHASE' | 'PAYMENT';
  description: string;
  documentNumber: string | null;
  debit: number; // Aumenta la deuda (compras)
  credit: number; // Disminuye la deuda (pagos)
  balance: number;
  reference?: string | null;
  paymentMethod?: string | null;
}

export class SupplierAccountService {
  /**
   * Obtener saldo de todos los proveedores
   */
  async getAllSuppliersBalance(
    tenantId: string,
    filters?: {
      search?: string;
      hasDebt?: boolean;
    }
  ): Promise<SupplierBalance[]> {
    const { search, hasDebt } = filters || {};

    // Construir el WHERE para entidades
    const entityWhere: Prisma.EntityWhereInput = {
      tenantId,
      isSupplier: true,
    };

    if (search) {
      entityWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Obtener todos los proveedores
    const suppliers = await globalPrisma.entity.findMany({
      where: entityWhere,
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    // Obtener estadísticas de compras por proveedor
    const purchaseStats = await globalPrisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        tenantId,
        status: { not: 'cancelled' },
        supplierId: { in: suppliers.map((s) => s.id) },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Mapear estadísticas
    const statsMap = new Map(
      purchaseStats.map((stat) => [
        stat.supplierId,
        {
          totalPurchases: stat._sum.totalAmount || 0,
          totalPaid: stat._sum.paidAmount || 0,
          totalDebt: stat._sum.balanceAmount || 0,
          purchaseCount: stat._count.id,
        },
      ])
    );

    // Combinar datos
    let balances: SupplierBalance[] = suppliers.map((supplier) => {
      const stats = statsMap.get(supplier.id) || {
        totalPurchases: 0,
        totalPaid: 0,
        totalDebt: 0,
        purchaseCount: 0,
      };

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCode: supplier.code,
        totalPurchases: Number(stats.totalPurchases),
        totalPaid: Number(stats.totalPaid),
        totalDebt: Number(stats.totalDebt),
        purchaseCount: stats.purchaseCount,
      };
    });

    // Filtrar por deuda si se especifica
    if (hasDebt) {
      balances = balances.filter((b) => b.totalDebt > 0);
    }

    // Ordenar por deuda descendente
    balances.sort((a, b) => b.totalDebt - a.totalDebt);

    return balances;
  }

  /**
   * Obtener saldo de un proveedor específico
   */
  async getSupplierBalance(tenantId: string, supplierId: string): Promise<SupplierBalance> {
    // Verificar que el proveedor existe
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

    // Obtener estadísticas de compras
    const stats = await globalPrisma.purchase.aggregate({
      where: {
        tenantId,
        supplierId,
        status: { not: 'cancelled' },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCode: supplier.code,
      totalPurchases: Number(stats._sum.totalAmount || 0),
      totalPaid: Number(stats._sum.paidAmount || 0),
      totalDebt: Number(stats._sum.balanceAmount || 0),
      purchaseCount: stats._count.id,
    };
  }

  /**
   * Obtener movimientos de cuenta corriente de un proveedor
   */
  async getSupplierMovements(
    tenantId: string,
    supplierId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    movements: SupplierMovement[];
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
    const { dateFrom, dateTo, page = 1, limit = 50 } = filters || {};

    // Verificar que el proveedor existe
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

    // Construir filtros de fecha
    const purchaseWhere: Prisma.PurchaseWhereInput = {
      tenantId,
      supplierId,
      status: { not: 'cancelled' },
    };

    const paymentWhere: Prisma.PurchasePaymentWhereInput = {
      purchase: {
        tenantId,
        supplierId,
        status: { not: 'cancelled' },
      },
      status: 'completed',
    };

    if (dateFrom && dateTo) {
      purchaseWhere.purchaseDate = { gte: new Date(dateFrom), lte: new Date(dateTo) };
      paymentWhere.paymentDate = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    } else if (dateFrom) {
      purchaseWhere.purchaseDate = { gte: new Date(dateFrom) };
      paymentWhere.paymentDate = { gte: new Date(dateFrom) };
    } else if (dateTo) {
      purchaseWhere.purchaseDate = { lte: new Date(dateTo) };
      paymentWhere.paymentDate = { lte: new Date(dateTo) };
    }

    // Calcular saldo de apertura (compras y pagos antes de la fecha inicial)
    let openingBalance = 0;
    if (dateFrom) {
      const purchasesBeforeSum = await globalPrisma.purchase.aggregate({
        where: {
          tenantId,
          supplierId,
          status: { not: 'cancelled' },
          purchaseDate: { lt: new Date(dateFrom) },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      });

      openingBalance =
        Number(purchasesBeforeSum._sum.totalAmount || 0) - Number(purchasesBeforeSum._sum.paidAmount || 0);
    }

    // Obtener compras
    const purchases = await globalPrisma.purchase.findMany({
      where: purchaseWhere,
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        totalAmount: true,
        invoiceNumber: true,
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });

    // Obtener pagos
    const payments = await globalPrisma.purchasePayment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        reference: true,
        paymentMethodName: true,
        purchase: {
          select: {
            purchaseNumber: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });

    // Combinar y ordenar movimientos
    const allMovements: SupplierMovement[] = [
      ...purchases.map((p) => ({
        id: p.id,
        date: p.purchaseDate,
        type: 'PURCHASE' as const,
        description: `Compra ${p.purchaseNumber}`,
        documentNumber: p.invoiceNumber,
        debit: Number(p.totalAmount),
        credit: 0,
        balance: 0, // Se calculará después
      })),
      ...payments.map((p) => ({
        id: p.id,
        date: p.paymentDate || new Date(),
        type: 'PAYMENT' as const,
        description: `Pago de ${p.purchase.purchaseNumber}`,
        documentNumber: null,
        debit: 0,
        credit: Number(p.amount),
        balance: 0, // Se calculará después
        reference: p.reference,
        paymentMethod: p.paymentMethodName,
      })),
    ];

    // Ordenar por fecha
    allMovements.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calcular balances acumulados
    let runningBalance = openingBalance;
    allMovements.forEach((mov) => {
      runningBalance += mov.debit - mov.credit;
      mov.balance = runningBalance;
    });

    // Calcular totales
    const totalDebits = allMovements.reduce((sum, mov) => sum + mov.debit, 0);
    const totalCredits = allMovements.reduce((sum, mov) => sum + mov.credit, 0);
    const closingBalance = openingBalance + totalDebits - totalCredits;

    // Paginar
    const total = allMovements.length;
    const skip = (page - 1) * limit;
    const paginatedMovements = allMovements.slice(skip, skip + limit);

    return {
      movements: paginatedMovements,
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
   * Obtener compras pendientes de pago de un proveedor
   */
  async getPendingPurchases(tenantId: string, supplierId: string) {
    const purchases = await globalPrisma.purchase.findMany({
      where: {
        tenantId,
        supplierId,
        status: { not: 'cancelled' },
        paymentStatus: { in: ['pending', 'partial'] },
      },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        paymentStatus: true,
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });

    return purchases.map((p) => ({
      ...p,
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
      balanceAmount: Number(p.balanceAmount),
    }));
  }

  /**
   * Obtener resumen de cuenta corriente (para dashboard)
   */
  async getAccountSummary(tenantId: string) {
    // Total de deuda con todos los proveedores
    const totalDebt = await globalPrisma.purchase.aggregate({
      where: {
        tenantId,
        status: { not: 'cancelled' },
        paymentStatus: { in: ['pending', 'partial'] },
      },
      _sum: {
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Proveedores con deuda
    const suppliersWithDebt = await globalPrisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        tenantId,
        status: { not: 'cancelled' },
        paymentStatus: { in: ['pending', 'partial'] },
      },
      _sum: {
        balanceAmount: true,
      },
    });

    // Compras vencidas (más de 30 días sin pagar)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overduePurchases = await globalPrisma.purchase.aggregate({
      where: {
        tenantId,
        status: { not: 'cancelled' },
        paymentStatus: { in: ['pending', 'partial'] },
        purchaseDate: { lt: thirtyDaysAgo },
      },
      _sum: {
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalDebt: Number(totalDebt._sum.balanceAmount || 0),
      pendingPurchasesCount: totalDebt._count.id,
      suppliersWithDebtCount: suppliersWithDebt.length,
      overdueDebt: Number(overduePurchases._sum.balanceAmount || 0),
      overduePurchasesCount: overduePurchases._count.id,
    };
  }
}

export const supplierAccountService = new SupplierAccountService();
