import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/:tenantSlug/dashboard/stats
router.get('/:tenantSlug/dashboard/stats', async (req, res) => {
  try {
    const { tenantSlug } = req.params
    const tenantId = (req as any).tenantId

    // Get current date info
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get previous month dates for comparison
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Sales of current month
    const currentMonthSales = await prisma.sale.aggregate({
      where: {
        tenantId,
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
    const prevMonthSales = await prisma.sale.aggregate({
      where: {
        tenantId,
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
    const totalCustomers = await prisma.entity.count({
      where: {
        tenantId,
        isCustomer: true,
        isActive: true,
      },
    })

    // Total products
    const totalProducts = await prisma.product.count({
      where: {
        tenantId,
        isActive: true,
      },
    })

    // Products with low stock
    const lowStockProducts = await prisma.product.count({
      where: {
        tenantId,
        isActive: true,
        trackStock: true,
        currentStock: {
          lte: prisma.product.fields.minStock,
        },
      },
    })

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
        lowStock: lowStockProducts,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' })
  }
})

// GET /api/:tenantSlug/dashboard/recent-sales
router.get('/:tenantSlug/dashboard/recent-sales', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId

    const recentSales = await prisma.sale.findMany({
      where: {
        tenantId,
      },
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

    const formattedSales = recentSales.map(sale => ({
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
    res.status(500).json({ error: 'Error al obtener ventas recientes' })
  }
})

export default router
