import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { tenantMiddleware } from '../middleware/tenantMiddleware.js'

const router = Router({ mergeParams: true })

// Apply middlewares
router.use(tenantMiddleware)

interface TraceabilityNode {
  id: string
  type: 'quote' | 'order' | 'sale' | 'payment' | 'credit_note' | 'debit_note'
  number: string
  date: string
  status: string
  amount: number
  customerName?: string
  children: TraceabilityNode[]
  metadata?: Record<string, any>
}

// GET /api/:tenantSlug/traceability/:type/:id
// type: quote | order | sale
router.get('/:type/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.params
    const prisma = req.tenantDb!
    const tenantId = req.tenant!.id

    let rootNode: TraceabilityNode | null = null

    if (type === 'quote') {
      rootNode = await buildTreeFromQuote(prisma, tenantId, id)
    } else if (type === 'order') {
      rootNode = await buildTreeFromOrder(prisma, tenantId, id)
    } else if (type === 'sale') {
      rootNode = await buildTreeFromSale(prisma, tenantId, id)
    } else {
      return res.status(400).json({ error: 'Invalid type. Use quote, order, or sale' })
    }

    if (!rootNode) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // También obtener el origen (hacia arriba en la cadena)
    const origin = await getOriginChain(prisma, tenantId, type, id)

    res.json({
      origin,  // Documentos anteriores (presupuesto, pedido origen)
      tree: rootNode  // Árbol de documentos derivados
    })
  } catch (error) {
    next(error)
  }
})

async function getOriginChain(
  prisma: any,
  tenantId: string,
  type: string,
  id: string
): Promise<TraceabilityNode[]> {
  const chain: TraceabilityNode[] = []

  if (type === 'sale') {
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        originOrder: true,
        originQuote: true,
        originSale: true
      }
    })

    if (sale?.originOrder) {
      const order = sale.originOrder
      // Verificar si el pedido tiene un presupuesto origen
      const orderWithQuote = await prisma.customerOrder.findFirst({
        where: { id: order.id },
        include: { quote: true }
      })

      if (orderWithQuote?.quote) {
        chain.push({
          id: orderWithQuote.quote.id,
          type: 'quote',
          number: orderWithQuote.quote.quoteNumber,
          date: orderWithQuote.quote.quoteDate.toISOString(),
          status: orderWithQuote.quote.status,
          amount: Number(orderWithQuote.quote.totalAmount),
          customerName: orderWithQuote.quote.customerName,
          children: []
        })
      }

      chain.push({
        id: order.id,
        type: 'order',
        number: order.orderNumber,
        date: order.orderDate.toISOString(),
        status: order.status,
        amount: Number(order.totalAmount),
        customerName: order.customerName,
        children: [],
        metadata: { stockBehavior: order.stockBehavior }
      })
    } else if (sale?.originQuote) {
      chain.push({
        id: sale.originQuote.id,
        type: 'quote',
        number: sale.originQuote.quoteNumber,
        date: sale.originQuote.quoteDate.toISOString(),
        status: sale.originQuote.status,
        amount: Number(sale.originQuote.totalAmount),
        customerName: sale.originQuote.customerName,
        children: []
      })
    }

    if (sale?.originSale) {
      chain.push({
        id: sale.originSale.id,
        type: 'sale',
        number: sale.originSale.fullVoucherNumber || sale.originSale.saleNumber,
        date: sale.originSale.saleDate.toISOString(),
        status: sale.originSale.status,
        amount: Number(sale.originSale.totalAmount),
        customerName: sale.originSale.customerName,
        children: [],
        metadata: { voucherType: sale.originSale.voucherType }
      })
    }
  } else if (type === 'order') {
    const order = await prisma.customerOrder.findFirst({
      where: { id, tenantId },
      include: { quote: true }
    })

    if (order?.quote) {
      chain.push({
        id: order.quote.id,
        type: 'quote',
        number: order.quote.quoteNumber,
        date: order.quote.quoteDate.toISOString(),
        status: order.quote.status,
        amount: Number(order.quote.totalAmount),
        customerName: order.quote.customerName,
        children: []
      })
    }
  }

  return chain
}

async function buildTreeFromQuote(
  prisma: any,
  tenantId: string,
  quoteId: string
): Promise<TraceabilityNode | null> {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, tenantId }
  })

  if (!quote) return null

  const node: TraceabilityNode = {
    id: quote.id,
    type: 'quote',
    number: quote.quoteNumber,
    date: quote.quoteDate.toISOString(),
    status: quote.status,
    amount: Number(quote.totalAmount),
    customerName: quote.customerName,
    children: []
  }

  // Buscar pedidos derivados de este presupuesto
  const orders = await prisma.customerOrder.findMany({
    where: { quoteId: quote.id }
  })

  for (const order of orders) {
    const orderNode = await buildTreeFromOrder(prisma, tenantId, order.id)
    if (orderNode) {
      node.children.push(orderNode)
    }
  }

  // Buscar ventas directas de este presupuesto (sin pasar por pedido)
  const directSales = await prisma.sale.findMany({
    where: {
      quoteId: quote.id,
      orderId: null  // Solo ventas directas, no las que vienen de pedido
    }
  })

  for (const sale of directSales) {
    const saleNode = await buildTreeFromSale(prisma, tenantId, sale.id)
    if (saleNode) {
      node.children.push(saleNode)
    }
  }

  return node
}

async function buildTreeFromOrder(
  prisma: any,
  tenantId: string,
  orderId: string
): Promise<TraceabilityNode | null> {
  const order = await prisma.customerOrder.findFirst({
    where: { id: orderId, tenantId }
  })

  if (!order) return null

  const node: TraceabilityNode = {
    id: order.id,
    type: 'order',
    number: order.orderNumber,
    date: order.orderDate.toISOString(),
    status: order.status,
    amount: Number(order.totalAmount),
    customerName: order.customerName,
    children: [],
    metadata: {
      stockBehavior: order.stockBehavior,
      invoicedAmount: Number(order.invoicedAmount),
      pendingAmount: Number(order.pendingAmount)
    }
  }

  // Buscar ventas derivadas de este pedido
  const sales = await prisma.sale.findMany({
    where: { orderId: order.id }
  })

  for (const sale of sales) {
    const saleNode = await buildTreeFromSale(prisma, tenantId, sale.id)
    if (saleNode) {
      node.children.push(saleNode)
    }
  }

  return node
}

async function buildTreeFromSale(
  prisma: any,
  tenantId: string,
  saleId: string
): Promise<TraceabilityNode | null> {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId },
    include: {
      payments: {
        include: {
          paymentMethod: true
        }
      }
    }
  })

  if (!sale) return null

  // Determinar tipo de documento
  let docType: TraceabilityNode['type'] = 'sale'
  const voucherType = sale.voucherType?.toUpperCase() || ''
  if (voucherType.includes('NC') || voucherType.includes('CREDITO')) {
    docType = 'credit_note'
  } else if (voucherType.includes('ND') || voucherType.includes('DEBITO')) {
    docType = 'debit_note'
  }

  const node: TraceabilityNode = {
    id: sale.id,
    type: docType,
    number: sale.fullVoucherNumber || sale.saleNumber,
    date: sale.saleDate.toISOString(),
    status: sale.status,
    amount: Number(sale.totalAmount),
    customerName: sale.customerName,
    children: [],
    metadata: {
      voucherType: sale.voucherType,
      afipStatus: sale.afipStatus,
      cae: sale.cae,
      paidAmount: Number(sale.paidAmount),
      pendingAmount: Number(sale.pendingAmount)
    }
  }

  // Agregar pagos como hijos
  for (const payment of sale.payments) {
    node.children.push({
      id: payment.id,
      type: 'payment',
      number: `Pago ${payment.paymentMethod?.name || payment.paymentMethodName || 'N/A'}`,
      date: (payment.collectionDate || payment.createdAt).toISOString(),
      status: payment.status || 'completed',
      amount: Number(payment.amount),
      children: [],
      metadata: {
        paymentMethod: payment.paymentMethod?.name || payment.paymentMethodName,
        reference: payment.reference
      }
    })
  }

  // Buscar notas de crédito/débito asociadas
  const creditDebitNotes = await prisma.sale.findMany({
    where: { originSaleId: sale.id }
  })

  for (const note of creditDebitNotes) {
    const noteNode = await buildTreeFromSale(prisma, tenantId, note.id)
    if (noteNode) {
      node.children.push(noteNode)
    }
  }

  return node
}

export default router
