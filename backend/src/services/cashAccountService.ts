import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateCashAccountData {
  tenantId: string;
  name: string;
  description?: string;
  accountType: string;
  initialBalance?: number;
  isDefault?: boolean;
  userId: string;
}

interface UpdateCashAccountData {
  name?: string;
  description?: string;
  accountType?: string;
  initialBalance?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export const cashAccountService = {
  /**
   * Crear nueva cuenta de caja
   */
  async createAccount(data: CreateCashAccountData) {
    const { tenantId, name, description, accountType, initialBalance, isDefault, userId } = data;

    // Si se marca como predeterminada, quitar la marca de las demás
    if (isDefault) {
      await prisma.cashAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Verificar que no exista otra cuenta con el mismo nombre
    const existingAccount = await prisma.cashAccount.findFirst({
      where: {
        tenantId,
        name,
        isActive: true,
      },
    });

    if (existingAccount) {
      throw new Error(`Ya existe una cuenta con el nombre "${name}"`);
    }

    const account = await prisma.cashAccount.create({
      data: {
        tenantId,
        name,
        description: description || null,
        accountType,
        initialBalance: initialBalance || 0,
        isDefault: isDefault || false,
        createdBy: userId,
      },
    });

    return account;
  },

  /**
   * Obtener cuenta por ID
   */
  async getAccountById(tenantId: string, accountId: string) {
    const account = await prisma.cashAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    return account;
  },

  /**
   * Listar todas las cuentas activas
   */
  async listAccounts(tenantId: string) {
    const accounts = await prisma.cashAccount.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return accounts;
  },

  /**
   * Actualizar cuenta
   */
  async updateAccount(tenantId: string, accountId: string, data: UpdateCashAccountData) {
    // Verificar que la cuenta existe
    const account = await this.getAccountById(tenantId, accountId);

    // Si se marca como predeterminada, quitar la marca de las demás
    if (data.isDefault === true) {
      await prisma.cashAccount.updateMany({
        where: {
          tenantId,
          isDefault: true,
          id: { not: accountId },
        },
        data: { isDefault: false },
      });
    }

    // Si se cambia el nombre, verificar que no exista otra con ese nombre
    if (data.name && data.name !== account.name) {
      const existingAccount = await prisma.cashAccount.findFirst({
        where: {
          tenantId,
          name: data.name,
          isActive: true,
          id: { not: accountId },
        },
      });

      if (existingAccount) {
        throw new Error(`Ya existe una cuenta con el nombre "${data.name}"`);
      }
    }

    const updatedAccount = await prisma.cashAccount.update({
      where: { id: accountId },
      data: {
        ...data,
        description: data.description === '' ? null : data.description,
      },
    });

    return updatedAccount;
  },

  /**
   * Eliminar cuenta (soft delete)
   */
  async deleteAccount(tenantId: string, accountId: string) {
    // Verificar que la cuenta existe
    await this.getAccountById(tenantId, accountId);

    // Verificar que no tenga movimientos
    const movementsCount = await prisma.cashMovement.count({
      where: { cashAccountId: accountId },
    });

    if (movementsCount > 0) {
      throw new Error(
        `No se puede eliminar la cuenta porque tiene ${movementsCount} movimiento(s) registrado(s). Desactívela en su lugar.`
      );
    }

    // Verificar que no esté vinculada a métodos de pago
    const paymentMethodsCount = await prisma.paymentMethod.count({
      where: {
        cashAccountId: accountId,
        isActive: true,
      },
    });

    if (paymentMethodsCount > 0) {
      throw new Error(
        `No se puede eliminar la cuenta porque está vinculada a ${paymentMethodsCount} método(s) de pago. Desvincule primero.`
      );
    }

    // Soft delete
    const deletedAccount = await prisma.cashAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    return deletedAccount;
  },

  /**
   * Obtener cuenta predeterminada
   */
  async getDefaultAccount(tenantId: string) {
    const account = await prisma.cashAccount.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!account) {
      // Si no hay predeterminada, devolver la primera activa
      return await prisma.cashAccount.findFirst({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return account;
  },
};
