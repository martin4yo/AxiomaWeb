import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { cashMovementService } from '../services/cashMovementService.js';

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

export default router;
