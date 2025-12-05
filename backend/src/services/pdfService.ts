import { PDFTemplateService, PDFTemplateType, SaleWithRelations } from './pdfTemplateService.js'

export class PDFService {
  private templateService: PDFTemplateService

  constructor() {
    this.templateService = new PDFTemplateService()
  }

  /**
   * Genera un PDF A4 de factura/ticket para una venta
   * @param sale Venta con todas sus relaciones
   * @param template Tipo de plantilla: 'legal' (factura legal con AFIP) o 'quote' (presupuesto)
   */
  async generateInvoicePDF(
    sale: SaleWithRelations,
    template: PDFTemplateType = 'legal'
  ): Promise<Buffer> {
    return this.templateService.generatePDF(sale, template)
  }

}
