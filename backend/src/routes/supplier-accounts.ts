import { Router, Request, Response } from 'express';
import { supplierAccountService } from '../services/supplierAccountService.js';

const router = Router();

/**
 * Obtener saldo de todos los proveedores
 * GET /api/:tenantSlug/supplier-accounts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { search, hasDebt } = req.query;

    const balances = await supplierAccountService.getAllSuppliersBalance(tenantId, {
      search: search as string,
      hasDebt: hasDebt === 'true',
    });

    res.json(balances);
  } catch (error: any) {
    console.error('Error getting supplier balances:', error);
    res.status(500).json({ error: error.message || 'Error al obtener saldos de proveedores' });
  }
});

/**
 * Obtener saldo de un proveedor específico
 * GET /api/:tenantSlug/supplier-accounts/:supplierId/balance
 */
router.get('/:supplierId/balance', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { supplierId } = req.params;

    const balance = await supplierAccountService.getSupplierBalance(tenantId, supplierId);
    res.json(balance);
  } catch (error: any) {
    console.error('Error getting supplier balance:', error);
    res.status(404).json({ error: error.message || 'Error al obtener saldo del proveedor' });
  }
});

/**
 * Obtener movimientos de cuenta corriente de un proveedor
 * GET /api/:tenantSlug/supplier-accounts/:supplierId/movements
 */
router.get('/:supplierId/movements', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { supplierId } = req.params;
    const { dateFrom, dateTo, page, limit } = req.query;

    const result = await supplierAccountService.getSupplierMovements(tenantId, supplierId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error getting supplier movements:', error);
    res.status(500).json({ error: error.message || 'Error al obtener movimientos del proveedor' });
  }
});

/**
 * Obtener compras pendientes de pago de un proveedor
 * GET /api/:tenantSlug/supplier-accounts/:supplierId/pending
 */
router.get('/:supplierId/pending', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { supplierId } = req.params;

    const purchases = await supplierAccountService.getPendingPurchases(tenantId, supplierId);
    res.json(purchases);
  } catch (error: any) {
    console.error('Error getting pending purchases:', error);
    res.status(500).json({ error: error.message || 'Error al obtener compras pendientes' });
  }
});

/**
 * Obtener resumen de cuenta corriente (para dashboard)
 * GET /api/:tenantSlug/supplier-accounts/summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;

    const summary = await supplierAccountService.getAccountSummary(tenantId);
    res.json(summary);
  } catch (error: any) {
    console.error('Error getting account summary:', error);
    res.status(500).json({ error: error.message || 'Error al obtener resumen de cuentas' });
  }
});

export default router;
