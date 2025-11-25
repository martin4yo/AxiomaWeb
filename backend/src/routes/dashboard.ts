import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router({ mergeParams: true })

// GET /dashboard/stats
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id

    // Get current date info
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get previous month dates for comparison
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Sales of current month
    const currentMonthSales = await req.tenantDb!.sale.aggregate({
      where: {
        status: { not: 'cancelled' },
        saleDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    })

    // Sales of previous month for comparison
    const prevMonthSales = await req.tenantDb!.sale.aggregate({
      where: {
        status: { not: 'cancelled' },
        saleDate: {
          gte: firstDayOfPrevMonth,
          lte: lastDayOfPrevMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    })

    // Calculate sales change percentage
    const currentSalesAmount = Number(currentMonthSales._sum.totalAmount || 0)
    const prevSalesAmount = Number(prevMonthSales._sum.totalAmount || 0)
    const salesChange = prevSalesAmount > 0
      ? ((currentSalesAmount - prevSalesAmount) / prevSalesAmount) * 100
      : 0

    // Total active customers
    const totalCustomers = await req.tenantDb!.entity.count({
      where: {
        isCustomer: true,
        isActive: true,
      },
    })

    // Total products
    const totalProducts = await req.tenantDb!.product.count({
      where: {
        isActive: true,
      },
    })

    // Products with low stock - need to use raw query since Prisma doesn't support field comparisons
    const lowStockProducts = await req.tenantDb!.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM products
      WHERE tenant_id = ${tenantId}
        AND is_active = true
        AND track_stock = true
        AND current_stock <= min_stock
    `
    const lowStockCount = Number(lowStockProducts[0]?.count || 0)

    res.json({
      salesOfMonth: {
        total: currentSalesAmount,
        count: currentMonthSales._count,
        change: salesChange.toFixed(1),
        changeType: salesChange >= 0 ? 'positive' : 'negative',
      },
      customers: {
        total: totalCustomers,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    next(error)
  }
})

// GET /dashboard/recent-sales
router.get('/recent-sales', authMiddleware, async (req, res, next) => {
  try {
    const recentSales = await req.tenantDb!.sale.findMany({
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        invoice: {
          select: {
            documentType: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
      take: 5,
    })

    const formattedSales = recentSales.map((sale: any) => ({
      id: sale.id,
      documentType: sale.invoice?.documentType?.name || 'Venta',
      documentCode: sale.invoice?.documentType?.code || 'VTA',
      saleNumber: sale.saleNumber,
      customerName: sale.customer?.name || sale.customerName || 'Cliente',
      totalAmount: sale.totalAmount,
      saleDate: sale.saleDate,
      status: sale.status,
    }))

    res.json(formattedSales)
  } catch (error) {
    console.error('Error fetching recent sales:', error)
    next(error)
  }
})

export default router
