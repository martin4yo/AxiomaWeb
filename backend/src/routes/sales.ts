import { Router } from 'express'
import { z } from 'zod'
import axios from 'axios'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { SalesService } from '../services/salesService.js'
import { PDFService } from '../services/pdfService.js'

const router = Router({ mergeParams: true })

// Validation schemas
const createSaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional()
})

const createSalePaymentSchema = z.object({
  paymentMethodId: z.string(),
  amount: z.number().positive(),
  reference: z.string().optional(),
  referenceDate: z.string().optional()
})

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  branchId: z.string().optional(),
  warehouseId: z.string(),
  items: z.array(createSaleItemSchema).min(1, 'Debe haber al menos un item'),
  payments: z.array(createSalePaymentSchema).min(1, 'Debe haber al menos una forma de pago'),
  notes: z.string().optional(),
  shouldInvoice: z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  documentClass: z.enum(['invoice', 'credit_note', 'debit_note', 'quote']).optional(),
  forceWithoutCAE: z.boolean().optional(),
  originSaleId: z.string().optional()
})

// POST /api/:tenantSlug/sales - Crear venta
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = createSaleSchema.parse(req.body)

    console.log(`[Route] Tenant info - ID: ${req.tenant!.id}, Slug: ${req.tenant!.slug}`)

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.createSale(validatedData)

    res.status(201).json({
      message: 'Venta creada exitosamente',
      sale
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/search-for-credit-debit - Buscar ventas para NC/ND
router.get('/search-for-credit-debit', authMiddleware, async (req, res, next) => {
  try {
    const { customerId, search, limit = '20' } = req.query

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    // Buscar ventas que puedan ser acreditadas/debitadas
    const where: any = {
      tenantId: req.tenant!.id,
      status: 'completed',
      documentClass: { in: ['INVOICE', null] }, // Solo facturas, no NC/ND
    }

    if (customerId) {
      where.customerId = customerId as string
    }

    if (search) {
      where.OR = [
        { saleNumber: { contains: search as string, mode: 'insensitive' } },
        { fullVoucherNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const sales = await req.tenantDb!.sale.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { saleDate: 'desc' },
      include: {
        customer: true,
        voucherConfiguration: {
          include: {
            voucherType: true
          }
        },
        creditDebitNotes: {
          where: {
            status: { not: 'cancelled' }
          },
          select: {
            id: true,
            saleNumber: true,
            documentClass: true,
            totalAmount: true
          }
        }
      }
    })

    // Calcular monto disponible para cada venta
    const salesWithAvailable = sales.map((sale: any) => {
      const totalCreditNotes = sale.creditDebitNotes
        .filter((note: any) => note.documentClass === 'CREDIT_NOTE')
        .reduce((sum: any, note: any) => sum.add(note.totalAmount), new (require('@prisma/client/runtime/library').Decimal)(0))

      const totalDebitNotes = sale.creditDebitNotes
        .filter((note: any) => note.documentClass === 'DEBIT_NOTE')
        .reduce((sum: any, note: any) => sum.add(note.totalAmount), new (require('@prisma/client/runtime/library').Decimal)(0))

      const availableForCredit = sale.totalAmount.add(totalDebitNotes).sub(totalCreditNotes)

      return {
        ...sale,
        availableForCredit: availableForCredit.toNumber(),
        totalCreditNotes: totalCreditNotes.toNumber(),
        totalDebitNotes: totalDebitNotes.toNumber()
      }
    })

    res.json({ sales: salesWithAvailable })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales - Listar ventas
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      dateFrom,
      dateTo,
      customerId,
      paymentStatus,
      afipStatus,
      search,
      orderBy,
      orderDirection
    } = req.query

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await salesService.listSales({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      customerId: customerId as string,
      paymentStatus: paymentStatus as string,
      afipStatus: afipStatus as string,
      search: search as string,
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc'
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/:id - Obtener detalle de venta
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.getSaleById(req.params.id)

    res.json({ sale })
  } catch (error) {
    next(error)
  }
})

// PUT /api/:tenantSlug/sales/:id/cancel - Cancelar venta
router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const sale = await salesService.cancelSale(req.params.id)

    res.json({
      message: 'Venta cancelada exitosamente',
      sale
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/sales/resync-cae - Resincronizar CAE pendientes
router.post('/resync-cae', authMiddleware, async (req, res, next) => {
  try {
    const limit = req.body.limit || 50

    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await salesService.resyncPendingCAE(limit)

    res.json({
      message: `Resincronización completada: ${result.successful} exitosas, ${result.failed} fallidas`,
      ...result
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/sales/:id/retry-cae - Reintentar CAE para una venta específica
router.post('/:id/retry-cae', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    const result = await salesService.retryCaeForSale(req.params.id)

    res.json({
      message: 'Solicitud de CAE procesada',
      sale: result
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/:id/pdf - Generar y descargar PDF A4
// Query params: template=legal|quote|simple (default: de la configuración del comprobante)
router.get('/:id/pdf', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    // Obtener venta con todas las relaciones
    const sale = await salesService.getSaleById(req.params.id)

    // Determinar tipo de plantilla
    // 1. Si viene en query, usar ese
    // 2. Si no, usar el de la configuración del comprobante
    // 3. Si no, usar 'legal' por defecto
    let template = (req.query.template as string) ||
                   sale.voucherConfiguration?.printTemplate?.toLowerCase() ||
                   'legal'

    // Mapear 'simple' a 'quote' para PDFs
    if (template === 'simple') {
      template = 'quote'
    }

    if (template !== 'legal' && template !== 'quote') {
      return res.status(400).json({
        error: 'Invalid template. Use "legal", "quote" or "simple"'
      })
    }

    // Generar PDF
    const pdfService = new PDFService()
    const pdfBuffer = await pdfService.generateInvoicePDF(sale, template)

    // Configurar headers para descarga
    const docType = template === 'legal' ? 'Factura' : 'Presupuesto'
    const filename = `${docType}-${sale.fullVoucherNumber || sale.saleNumber}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/:id/pdf/preview - Ver PDF en navegador (inline)
// Query params: template=legal|quote (default: legal)
router.get('/:id/pdf/preview', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    // Obtener venta con todas las relaciones
    const sale = await salesService.getSaleById(req.params.id)

    // Determinar tipo de plantilla
    // 1. Si viene en query, usar ese
    // 2. Si no, usar el de la configuración del comprobante
    // 3. Si no, usar 'legal' por defecto
    let template = (req.query.template as string) ||
                   sale.voucherConfiguration?.printTemplate?.toLowerCase() ||
                   'legal'

    // Mapear 'simple' a 'quote' para PDFs
    if (template === 'simple') {
      template = 'quote'
    }

    if (template !== 'legal' && template !== 'quote') {
      return res.status(400).json({
        error: 'Invalid template. Use "legal" or "quote"'
      })
    }

    // Generar PDF
    const pdfService = new PDFService()
    const pdfBuffer = await pdfService.generateInvoicePDF(sale, template)

    // Configurar headers para visualización inline
    const docType = template === 'legal' ? 'Factura' : 'Presupuesto'
    const filename = `${docType}-${sale.fullVoucherNumber || sale.saleNumber}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// GET /api/:tenantSlug/sales/:id/print/thermal-data - Obtener datos formateados para impresión térmica
// Query: { template?: 'legal' | 'simple' } (default: de la configuración del comprobante)
router.get('/:id/print/thermal-data', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    // Obtener venta con todas las relaciones
    const sale = await salesService.getSaleById(req.params.id)

    // Determinar tipo de plantilla
    let template = req.query.template as string ||
                   sale.voucherConfiguration?.printTemplate?.toLowerCase() ||
                   'legal'

    // Mapear 'quote' a 'simple' para tickets térmicos
    if (template === 'quote') {
      template = 'simple'
    }

    if (template !== 'legal' && template !== 'simple') {
      return res.status(400).json({
        error: 'Invalid template. Use "legal" or "simple"'
      })
    }

    // Preparar datos para el Print Manager
    const voucherTypeName = sale.voucherConfiguration?.voucherType?.name || 'FACTURA'
    const voucherLetter = sale.voucherConfiguration?.voucherType?.letter || ''

    // Extraer el nombre base sin la letra
    const voucherBaseName = voucherLetter
      ? voucherTypeName.replace(new RegExp(`\\s*${voucherLetter}\\s*$`), '').trim()
      : voucherTypeName

    const printData = {
      business: {
        name: sale.tenant.businessName || sale.tenant.name,
        cuit: sale.tenant.cuit,
        address: sale.tenant.address,
        phone: sale.tenant.phone,
        email: sale.tenant.email
      },
      sale: {
        // Info del comprobante
        number: sale.fullVoucherNumber || sale.saleNumber,
        date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
        voucherName: voucherBaseName,
        voucherLetter: voucherLetter,
        afipCode: sale.voucherConfiguration?.voucherType?.afipCode || null,
        discriminatesVat: sale.voucherConfiguration?.voucherType?.discriminatesVat || false,
        salesPointNumber: sale.voucherConfiguration?.salesPoint?.number || 1,

        // Cliente
        customer: sale.customerName || sale.customer?.name || 'Consumidor Final',
        customerCuit: sale.customer?.cuit || sale.customer?.taxId || null,
        customerVatCondition: sale.customer?.ivaCondition || 'CF',
        customerAddress: sale.customer?.addressLine1 || null,

        // Items
        items: sale.items.map(item => ({
          name: item.description || item.productName,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.lineTotal),
          taxAmount: Number(item.taxAmount)
        })),

        // Totales
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discountAmount),
        taxAmount: Number(sale.taxAmount),
        totalAmount: Number(sale.totalAmount),

        // Pagos
        payments: sale.payments.map(p => ({
          name: p.paymentMethodName,
          amount: Number(p.amount),
          reference: p.reference || null
        })),

        // CAE
        caeNumber: sale.cae || sale.afipCae || null,
        caeExpiration: sale.caeExpiration || sale.afipCaeExpiry
          ? new Date(sale.caeExpiration || sale.afipCaeExpiry!).toLocaleDateString('es-AR')
          : null,

        // Notas
        notes: sale.notes || null
      },
      template,
      printerName: sale.voucherConfiguration?.thermalPrinterName || null
    }

    // Devolver los datos sin intentar imprimir
    res.json({ data: printData })
  } catch (error) {
    next(error)
  }
})

// POST /api/:tenantSlug/sales/:id/print/thermal - Imprimir en impresora térmica
// Body: { template?: 'legal' | 'simple' } (default: de la configuración del comprobante)
router.post('/:id/print/thermal', authMiddleware, async (req, res, next) => {
  try {
    const salesService = new SalesService(
      req.tenantDb!,
      req.tenant!.id,
      req.user!.id
    )

    // Obtener venta con todas las relaciones
    const sale = await salesService.getSaleById(req.params.id)

    // Determinar tipo de plantilla
    // 1. Si viene en body, usar ese
    // 2. Si no, usar el de la configuración del comprobante
    // 3. Si no, usar 'legal' por defecto
    let template = req.body.template ||
                   sale.voucherConfiguration?.printTemplate?.toLowerCase() ||
                   'legal'

    // Mapear 'quote' a 'simple' para tickets térmicos
    if (template === 'quote') {
      template = 'simple'
    }

    if (template !== 'legal' && template !== 'simple') {
      return res.status(400).json({
        error: 'Invalid template. Use "legal" or "simple"'
      })
    }

    // Preparar datos para el Print Manager
    const voucherTypeName = sale.voucherConfiguration?.voucherType?.name || 'FACTURA'
    const voucherLetter = sale.voucherConfiguration?.voucherType?.letter || ''

    // Extraer el nombre base sin la letra (ej: "Factura B" -> "Factura")
    const voucherBaseName = voucherLetter
      ? voucherTypeName.replace(new RegExp(`\\s*${voucherLetter}\\s*$`), '').trim()
      : voucherTypeName

    const printData = {
      business: {
        name: sale.tenant.businessName || sale.tenant.name,
        cuit: sale.tenant.cuit,
        address: sale.tenant.address,
        phone: sale.tenant.phone,
        email: sale.tenant.email
      },
      sale: {
        // Info del comprobante
        number: sale.fullVoucherNumber || sale.saleNumber,
        date: new Date(sale.saleDate).toLocaleDateString('es-AR'),
        voucherName: voucherBaseName,
        voucherLetter: voucherLetter,
        afipCode: sale.voucherConfiguration?.voucherType?.afipCode || null,
        discriminatesVat: sale.voucherConfiguration?.voucherType?.discriminatesVat || false,
        salesPointNumber: sale.voucherConfiguration?.salesPoint?.number || 1,

        // Cliente
        customer: sale.customerName || sale.customer?.name || 'Consumidor Final',
        customerCuit: sale.customer?.cuit || sale.customer?.taxId || null,
        customerVatCondition: sale.customer?.ivaCondition || 'CF',
        customerAddress: sale.customer?.addressLine1 || null,

        // Items
        items: sale.items.map(item => ({
          name: item.description || item.productName,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.lineTotal),
          taxAmount: Number(item.taxAmount)
        })),

        // Totales
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discountAmount),
        taxAmount: Number(sale.taxAmount),
        totalAmount: Number(sale.totalAmount),

        // Pagos
        payments: sale.payments.map(p => ({
          name: p.paymentMethodName,
          amount: Number(p.amount),
          reference: p.reference || null
        })),

        // CAE
        caeNumber: sale.cae || sale.afipCae || null,
        caeExpiration: sale.caeExpiration || sale.afipCaeExpiry
          ? new Date(sale.caeExpiration || sale.afipCaeExpiry!).toLocaleDateString('es-AR')
          : null,

        // Notas
        notes: sale.notes || null
      },
      template
    }

    // Enviar a Print Manager
    const PRINT_MANAGER_URL = process.env.PRINT_MANAGER_URL || 'http://localhost:9100'

    try {
      const response = await axios.post(`${PRINT_MANAGER_URL}/print`, {
        data: printData
      }, {
        timeout: 10000 // 10 segundos de timeout
      })

      res.json({
        success: true,
        message: 'Ticket enviado a impresora térmica',
        printManager: response.data
      })
    } catch (printError: any) {
      // Si el Print Manager no está disponible o falla
      if (printError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          error: 'Print Manager no disponible. Asegúrate de que el servicio esté corriendo.',
          details: `No se pudo conectar a ${PRINT_MANAGER_URL}`
        })
      }

      // Otros errores del Print Manager
      return res.status(500).json({
        success: false,
        error: 'Error al imprimir ticket',
        details: printError.response?.data?.error || printError.message
      })
    }
  } catch (error) {
    next(error)
  }
})

export default router
