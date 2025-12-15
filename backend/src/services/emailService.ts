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
    // Configurar transporter con Gmail usando variables de entorno
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para port 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    }

    console.log('[EmailService] Configuración SMTP:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
      passLength: smtpConfig.auth.pass?.length || 0
    })

    this.transporter = nodemailer.createTransport(smtpConfig)
  }

  async sendEmail(options: SendEmailOptions, fromName?: string): Promise<void> {
    try {
      const senderName = fromName || process.env.EMAIL_FROM_NAME || 'Axioma ERP'
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER

      const mailOptions = {
        from: `"${senderName}" <${fromAddress}>`,
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
    filename: string,
    tenantName: string
  ): Promise<void> {
    const subject = `${voucherType} ${saleNumber} - ${tenantName}`

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
              <h1 style="margin: 0;">${tenantName}</h1>
              <p style="margin: 10px 0 0 0;">Comprobante de Venta</p>
            </div>
            <div class="content">
              <h2>Detalle del Comprobante</h2>
              <div class="info-box">
                <p><strong>Tipo:</strong> ${voucherType}</p>
                <p><strong>Número:</strong> ${saleNumber}</p>
                <div class="total">Total: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <p>Adjuntamos el comprobante en formato PDF para su registro.</p>
              <p>Si tiene alguna consulta, no dude en contactarnos.</p>
              <div class="footer">
                <p>Este es un mensaje automático, por favor no responder.</p>
                <p>&copy; ${new Date().getFullYear()} ${tenantName}. Todos los derechos reservados.</p>
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
    }, tenantName)
  }
}
