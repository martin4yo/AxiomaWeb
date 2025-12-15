import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Configurar transporter con Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'axiomaremote@gmail.com',
        pass: 'rcfb uzlc yget wpgx'
      }
    })
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: '"Axioma ERP" <axiomaremote@gmail.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log('[Email] Mensaje enviado:', info.messageId)
      console.log('[Email] Preview URL:', nodemailer.getTestMessageUrl(info))
    } catch (error) {
      console.error('[Email] Error al enviar email:', error)
      throw new Error('No se pudo enviar el email')
    }
  }

  async sendSaleVoucher(
    to: string,
    saleNumber: string,
    voucherType: string,
    totalAmount: number,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const subject = `${voucherType} ${saleNumber} - Axioma ERP`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .total {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Axioma ERP</h1>
              <p style="margin: 10px 0 0 0;">Sistema de Gestión Empresarial</p>
            </div>
            <div class="content">
              <h2>Nuevo Comprobante Generado</h2>
              <div class="info-box">
                <p><strong>Tipo:</strong> ${voucherType}</p>
                <p><strong>Número:</strong> ${saleNumber}</p>
                <div class="total">Total: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <p>Adjuntamos el comprobante en formato PDF para su registro.</p>
              <p>Si tiene alguna consulta, no dude en contactarnos.</p>
              <div class="footer">
                <p>Este es un mensaje automático, por favor no responder.</p>
                <p>&copy; ${new Date().getFullYear()} Axioma ERP. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    await this.sendEmail({
      to,
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    })
  }
}
