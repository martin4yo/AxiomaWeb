import { Router, Request, Response } from 'express';
import { purchaseService } from '../services/purchaseService';

const router = Router();

/**
 * Crear una nueva compra
 * POST /api/:tenantSlug/purchases
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req as any;
    const { supplierId, warehouseId, invoiceNumber, invoiceDate, items, payments, discountPercent, notes } =
      req.body;

    // Validaciones básicas
    if (!supplierId) {
      return res.status(400).json({ error: 'El proveedor es requerido' });
    }

    if (!warehouseId) {
      return res.status(400).json({ error: 'El almacén es requerido' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un item' });
    }

    const purchase = await purchaseService.createPurchase({
      tenantId,
      supplierId,
      warehouseId,
      invoiceNumber,
      invoiceDate,
      items,
      payments: payments || [],
      discountPercent: discountPercent || 0,
      notes,
      userId,
    });

    res.status(201).json(purchase);
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: error.message || 'Error al crear la compra' });
  }
});

/**
 * Listar compras
 * GET /api/:tenantSlug/purchases
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { page, limit, dateFrom, dateTo, supplierId, paymentStatus, search } = req.query;

    const result = await purchaseService.listPurchases(tenantId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      supplierId: supplierId as string,
      paymentStatus: paymentStatus as string,
      search: search as string,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error listing purchases:', error);
    res.status(500).json({ error: error.message || 'Error al listar compras' });
  }
});

/**
 * Obtener una compra por ID
 * GET /api/:tenantSlug/purchases/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req as any;
    const { id } = req.params;

    const purchase = await purchaseService.getPurchaseById(tenantId, id);
    res.json(purchase);
  } catch (error: any) {
    console.error('Error getting purchase:', error);
    res.status(404).json({ error: error.message || 'Compra no encontrada' });
  }
});

/**
 * Agregar un pago a una compra
 * POST /api/:tenantSlug/purchases/:id/payments
 */
router.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req as any;
    const { id } = req.params;
    const { paymentMethodId, amount, reference, referenceDate, notes } = req.body;

    // Validaciones
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'El método de pago es requerido' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    }

    const result = await purchaseService.addPayment({
      tenantId,
      purchaseId: id,
      paymentMethodId,
      amount,
      reference,
      referenceDate,
      notes,
      userId,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: error.message || 'Error al agregar el pago' });
  }
});

/**
 * Cancelar una compra
 * PUT /api/:tenantSlug/purchases/:id/cancel
 */
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req as any;
    const { id } = req.params;

    const purchase = await purchaseService.cancelPurchase(tenantId, id, userId);
    res.json(purchase);
  } catch (error: any) {
    console.error('Error cancelling purchase:', error);
    res.status(500).json({ error: error.message || 'Error al cancelar la compra' });
  }
});

export default router;
