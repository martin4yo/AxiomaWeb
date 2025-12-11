import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { cashMovementService } from '../services/cashMovementService.js';
import { cashAccountService } from '../services/cashAccountService.js';

const router = Router();

/**
 * GET /api/:tenantSlug/cash/accounts
 * Obtener todas las cuentas de caja con sus balances
 */
router.get('/accounts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const accounts = await cashMovementService.getAccountsSummary(tenantId);
    res.json({ accounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/:tenantSlug/cash/accounts/:id/balance
 * Obtener balance de una cuenta específica
 */
router.get('/accounts/:id/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    const balance = await cashMovementService.getAccountBalance(tenantId, id);
    res.json(balance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/:tenantSlug/cash/movements
 * Listar movimientos de caja con filtros
 */
router.get('/movements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const {
      cashAccountId,
      dateFrom,
      dateTo,
      movementType,
      category,
      page = '1',
      limit = '50',
    } = req.query;

    const movements = await cashMovementService.listMovements({
      tenantId,
      cashAccountId: cashAccountId as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      movementType: movementType as 'income' | 'expense' | undefined,
      category: category as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/:tenantSlug/cash/movements/income
 * Registrar un ingreso manual
 */
router.post('/movements/income', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { cashAccountId, amount, category, description, reference, notes, paymentMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    if (!description) {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }

    const movement = await cashMovementService.registerIncome({
      tenantId,
      cashAccountId,
      amount,
      category: category || 'deposit',
      description,
      reference,
      notes,
      paymentMethodId,
      userId,
    });

    res.status(201).json({ movement });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/:tenantSlug/cash/movements/expense
 * Registrar un egreso manual
 */
router.post('/movements/expense', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { cashAccountId, amount, category, description, reference, notes, paymentMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    if (!description) {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }

    const movement = await cashMovementService.registerExpense({
      tenantId,
      cashAccountId,
      amount,
      category: category || 'withdrawal',
      description,
      reference,
      notes,
      paymentMethodId,
      userId,
    });

    res.status(201).json({ movement });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CRUD de Cuentas de Caja
// ============================================

/**
 * POST /api/:tenantSlug/cash/accounts
 * Crear nueva cuenta de caja
 */
router.post('/accounts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const { name, description, accountType, initialBalance, isDefault } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!accountType) {
      return res.status(400).json({ error: 'El tipo de cuenta es requerido' });
    }

    const account = await cashAccountService.createAccount({
      tenantId,
      name: name.trim(),
      description: description?.trim(),
      accountType,
      initialBalance: initialBalance || 0,
      isDefault: isDefault || false,
      userId,
    });

    res.status(201).json({ account });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/:tenantSlug/cash/accounts/:id
 * Actualizar cuenta de caja
 */
router.put('/accounts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    const { name, description, accountType, initialBalance, isDefault, isActive } = req.body;

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description?.trim();
    if (accountType !== undefined) updateData.accountType = accountType;
    if (initialBalance !== undefined) updateData.initialBalance = initialBalance;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    const account = await cashAccountService.updateAccount(tenantId, id, updateData);

    res.json({ account });
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/:tenantSlug/cash/accounts/:id
 * Eliminar cuenta de caja (soft delete)
 */
router.delete('/accounts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;

    await cashAccountService.deleteAccount(tenantId, id);

    res.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('No se puede eliminar')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/:tenantSlug/cash/accounts/:id
 * Obtener una cuenta específica
 */
router.get('/accounts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;

    const account = await cashAccountService.getAccountById(tenantId, id);

    res.json({ account });
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
