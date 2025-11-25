import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router({ mergeParams: true })

// Reporte de ventas por producto
router.get('/sales-by-product', authMiddleware, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const salesByProduct = await req.tenantDb!.$queryRaw`
      SELECT
        p.id,
        p.sku,
        p.name,
        SUM(si.quantity)::decimal as total_quantity,
        SUM(si.line_total)::decimal as total_amount,
        COUNT(DISTINCT s.id)::int as sales_count
      FROM products p
      INNER JOIN sale_items si ON si.product_id = p.id
      INNER JOIN sales s ON s.id = si.sale_id
      WHERE p.tenant_id = ${req.tenant!.id}
        AND p.is_active = true
        AND s.status <> 'cancelled'
        AND s.sale_date >= ${dateFrom as string}::date
        AND s.sale_date <= ${dateTo as string}::date
      GROUP BY p.id, p.sku, p.name
      ORDER BY total_amount DESC
      LIMIT 20
    `

    res.json({ salesByProduct })
  } catch (error) {
    next(error)
  }
})

// Reporte de cobranzas por medio de pago
router.get('/collections-by-payment-method', authMiddleware, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const collectionsByPaymentMethod = await req.tenantDb!.$queryRaw`
      SELECT
        pm.id,
        pm.name,
        pm.payment_type,
        SUM(sp.amount)::decimal as total_amount,
        COUNT(sp.id)::int as payment_count
      FROM payment_methods pm
      INNER JOIN sale_payments sp ON sp.payment_method_id = pm.id
      INNER JOIN sales s ON s.id = sp.sale_id
      WHERE pm.tenant_id = ${req.tenant!.id}
        AND pm.is_active = true
        AND s.status <> 'cancelled'
        AND s.sale_date >= ${dateFrom as string}::date
        AND s.sale_date <= ${dateTo as string}::date
      GROUP BY pm.id, pm.name, pm.payment_type
      ORDER BY total_amount DESC
    `

    res.json({ collectionsByPaymentMethod })
  } catch (error) {
    next(error)
  }
})

// Resumen general de ventas
router.get('/sales-summary', authMiddleware, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    console.log('📊 Sales Summary Request:', { dateFrom, dateTo, tenant: req.tenant!.id })

    const summary = await req.tenantDb!.$queryRaw`
      SELECT
        COALESCE(COUNT(*), 0)::int as total_sales,
        COALESCE(SUM(total_amount), 0)::decimal as total_amount,
        COALESCE(AVG(total_amount), 0)::decimal as average_sale,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0)::decimal as paid_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0)::decimal as pending_amount
      FROM sales
      WHERE tenant_id = ${req.tenant!.id}
        AND status <> 'cancelled'
        AND sale_date >= ${dateFrom as string}::date
        AND sale_date <= ${dateTo as string}::date
    `

    // Si no hay resultados, devolver valores por defecto
    const result = summary[0] || {
      total_sales: 0,
      total_amount: '0',
      average_sale: '0',
      paid_amount: '0',
      pending_amount: '0'
    }

    res.json({ summary: result })
  } catch (error) {
    next(error)
  }
})

// Evolución de ventas por día
router.get('/sales-evolution', authMiddleware, async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    // Obtener ventas por día y producto
    const salesByDateAndProduct = await req.tenantDb!.$queryRaw`
      SELECT
        s.sale_date::text as date,
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(si.line_total), 0)::decimal as amount
      FROM sales s
      INNER JOIN sale_items si ON si.sale_id = s.id
      INNER JOIN products p ON p.id = si.product_id
      WHERE s.tenant_id = ${req.tenant!.id}
        AND s.status <> 'cancelled'
        AND s.sale_date >= ${dateFrom as string}::date
        AND s.sale_date <= ${dateTo as string}::date
      GROUP BY s.sale_date, p.id, p.name
      ORDER BY s.sale_date ASC, amount DESC
    `

    res.json({ salesEvolution: salesByDateAndProduct })
  } catch (error) {
    next(error)
  }
})

export default router
