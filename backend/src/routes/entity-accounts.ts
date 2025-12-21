import { Router, Request, Response } from 'express';
import { entityAccountService } from '../services/entityAccountService.js';

const router = Router();

/**
 * Obtener saldo de todas las entidades (clientes y/o proveedores)
 * GET /api/:tenantSlug/entity-accounts
 * Query params: isCustomer, isSupplier, hasBalance, search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { isCustomer, isSupplier, hasBalance, search } = req.query;

    const balances = await entityAccountService.getEntitiesWithBalance(tenantId, {
      isCustomer: isCustomer === 'true',
      isSupplier: isSupplier === 'true',
      hasBalance: hasBalance === 'true',
      search: search as string,
    });

    res.json(balances);
  } catch (error: any) {
    console.error('Error getting entity balances:', error);
    res.status(500).json({ error: error.message || 'Error al obtener saldos de entidades' });
  }
});

/**
 * Obtener saldo de una entidad específica
 * GET /api/:tenantSlug/entity-accounts/:entityId/balance
 */
router.get('/:entityId/balance', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;

    const balance = await entityAccountService.getEntityBalance(tenantId, entityId);
    res.json(balance);
  } catch (error: any) {
    console.error('Error getting entity balance:', error);
    res.status(404).json({ error: error.message || 'Error al obtener saldo de la entidad' });
  }
});

/**
 * Obtener movimientos de cuenta corriente de una entidad
 * GET /api/:tenantSlug/entity-accounts/:entityId/movements
 * Query params: dateFrom, dateTo, type, page, limit
 */
router.get('/:entityId/movements', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;
    const { dateFrom, dateTo, type, page, limit } = req.query;

    const result = await entityAccountService.getEntityMovements(tenantId, entityId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      type: type as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error getting entity movements:', error);
    res.status(500).json({ error: error.message || 'Error al obtener movimientos de la entidad' });
  }
});

/**
 * Obtener comprobantes pendientes de pago
 * GET /api/:tenantSlug/entity-accounts/:entityId/pending
 * Query params: type (customer | supplier)
 */
router.get('/:entityId/pending', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;
    const { type } = req.query;

    if (!type || !['customer', 'supplier'].includes(type as string)) {
      return res.status(400).json({ error: 'Tipo inválido. Debe ser "customer" o "supplier"' });
    }

    const documents = await entityAccountService.getPendingDocuments(
      tenantId,
      entityId,
      type as 'customer' | 'supplier'
    );

    res.json(documents);
  } catch (error: any) {
    console.error('Error getting pending documents:', error);
    res.status(500).json({ error: error.message || 'Error al obtener comprobantes pendientes' });
  }
});

/**
 * Obtener estado de cuenta completo (para exportar a PDF)
 * GET /api/:tenantSlug/entity-accounts/:entityId/statement
 * Query params: dateFrom, dateTo
 */
router.get('/:entityId/statement', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const statement = await entityAccountService.getEntityStatement(tenantId, entityId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.json(statement);
  } catch (error: any) {
    console.error('Error getting entity statement:', error);
    res.status(500).json({ error: error.message || 'Error al obtener estado de cuenta' });
  }
});

/**
 * Registrar un pago (cobro de cliente o pago a proveedor)
 * POST /api/:tenantSlug/entity-accounts/:entityId/payments
 * Body: {
 *   type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT',
 *   amount: number,
 *   paymentMethodId: string,
 *   paymentMethodName: string,
 *   date: string (ISO date),
 *   reference?: string,
 *   referenceDate?: string (ISO date),
 *   notes?: string
 * }
 */
router.post('/:entityId/payments', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;
    const { type, amount, paymentMethodId, paymentMethodName, date, reference, referenceDate, notes } = req.body;

    // Validaciones
    if (!type || !['CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de pago inválido' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    if (!paymentMethodId || !paymentMethodName) {
      return res.status(400).json({ error: 'Método de pago requerido' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const result =
      type === 'CUSTOMER_PAYMENT'
        ? await entityAccountService.registerCustomerPayment({
            tenantId,
            entityId,
            type,
            amount,
            paymentMethodId,
            paymentMethodName,
            date: new Date(date),
            reference,
            referenceDate: referenceDate ? new Date(referenceDate) : undefined,
            notes,
            createdBy: userId,
          })
        : await entityAccountService.registerSupplierPayment({
            tenantId,
            entityId,
            type,
            amount,
            paymentMethodId,
            paymentMethodName,
            date: new Date(date),
            reference,
            referenceDate: referenceDate ? new Date(referenceDate) : undefined,
            notes,
            createdBy: userId,
          });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error registering payment:', error);
    res.status(500).json({ error: error.message || 'Error al registrar el pago' });
  }
});

/**
 * Crear un movimiento manual (ajuste o saldo inicial)
 * POST /api/:tenantSlug/entity-accounts/:entityId/movements
 * Body: {
 *   type: 'ADJUSTMENT' | 'INITIAL_BALANCE' | 'CREDIT_NOTE' | 'DEBIT_NOTE',
 *   nature: 'DEBIT' | 'CREDIT',
 *   amount: number,
 *   date: string (ISO date),
 *   description?: string,
 *   notes?: string
 * }
 */
router.post('/:entityId/movements', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }
    const { entityId } = req.params;
    const { type, nature, amount, date, description, notes } = req.body;

    // Validaciones
    const allowedTypes = ['ADJUSTMENT', 'INITIAL_BALANCE', 'CREDIT_NOTE', 'DEBIT_NOTE'];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }

    if (!nature || !['DEBIT', 'CREDIT'].includes(nature)) {
      return res.status(400).json({ error: 'Naturaleza del movimiento inválida' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const movement = await entityAccountService.createMovement({
      tenantId,
      entityId,
      type,
      nature,
      amount,
      date: new Date(date),
      description,
      notes,
    });

    res.status(201).json(movement);
  } catch (error: any) {
    console.error('Error creating movement:', error);
    res.status(500).json({ error: error.message || 'Error al crear el movimiento' });
  }
});

export default router;
