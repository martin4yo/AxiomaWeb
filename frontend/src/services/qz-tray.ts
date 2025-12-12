/**
 * QZ Tray Service
 *
 * Servicio para integración con QZ Tray para impresión térmica directa
 * Compatible con todos los navegadores
 *
 * Documentación: https://qz.io/wiki/
 */

import qz from 'qz-tray';

// Certificado digital (generado con QZ Tray)
// TODO: Reemplazar con certificado real en producción
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
REPLACE_WITH_YOUR_CERTIFICATE
-----END CERTIFICATE-----`;

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
REPLACE_WITH_YOUR_PRIVATE_KEY
-----END PRIVATE KEY-----`;

interface PrinterConfig {
  printerName: string;
  defaultTemplate: 'simple' | 'legal';
}

interface BusinessInfo {
  name: string;
  cuit: string;
  address: string;
  phone?: string;
  email?: string;
}

interface SaleData {
  number: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
  payments?: Array<{
    method: string;
    amount: number;
  }>;
  cae?: {
    number: string;
    expirationDate: string;
  };
}

class QZTrayService {
  private isConnected = false;
  private config: PrinterConfig | null = null;

  /**
   * Inicializar QZ Tray
   */
  async initialize(): Promise<void> {
    try {
      // Cargar configuración guardada
      this.loadConfig();

      // Configurar firma digital
      await this.setupSigning();

      // Conectar a QZ Tray
      await qz.websockets.connect();
      this.isConnected = true;

      console.log('✅ QZ Tray conectado exitosamente');
    } catch (error) {
      console.error('❌ Error conectando a QZ Tray:', error);
      throw new Error('No se pudo conectar con QZ Tray. Asegúrate de que esté instalado y ejecutándose.');
    }
  }

  /**
   * Configurar firma digital
   */
  private async setupSigning(): Promise<void> {
    // Función para obtener certificado
    qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
      resolve(CERTIFICATE);
    });

    // Función para firmar mensajes
    qz.security.setSignaturePromise((toSign: string) => {
      return (resolve: (signature: string) => void) => {
        // En producción, esto debería firmar con la clave privada
        // Por ahora, usar firma simplificada
        resolve(this.signMessage(toSign));
      };
    });
  }

  /**
   * Firmar mensaje (versión simplificada)
   * En producción, usar jsrsasign o similar
   */
  private signMessage(message: string): string {
    // TODO: Implementar firma real con jsrsasign
    // Por ahora, retornar el mensaje (funciona para certificados self-signed)
    return message;
  }

  /**
   * Verificar si QZ Tray está conectado
   */
  async isActive(): Promise<boolean> {
    try {
      return qz.websockets.isActive();
    } catch {
      return false;
    }
  }

  /**
   * Obtener estado de conexión
   */
  async getStatus(): Promise<{
    connected: boolean;
    version?: string;
    printerName?: string;
  }> {
    try {
      const connected = await this.isActive();

      if (!connected) {
        return { connected: false };
      }

      const version = await qz.api.getVersion();

      return {
        connected: true,
        version,
        printerName: this.config?.printerName
      };
    } catch (error) {
      return { connected: false };
    }
  }

  /**
   * Listar impresoras disponibles
   */
  async listPrinters(): Promise<string[]> {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const printers = await qz.printers.find();
      return printers;
    } catch (error) {
      console.error('Error listando impresoras:', error);
      throw new Error('No se pudieron obtener las impresoras');
    }
  }

  /**
   * Configurar impresora predeterminada
   */
  async configure(printerName: string, template: 'simple' | 'legal' = 'simple'): Promise<void> {
    this.config = { printerName, defaultTemplate: template };
    this.saveConfig();
  }

  /**
   * Cargar configuración guardada
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('qz-tray-config');
      if (saved) {
        this.config = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  /**
   * Guardar configuración
   */
  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem('qz-tray-config', JSON.stringify(this.config));
    }
  }

  /**
   * Imprimir ticket térmico
   */
  async printThermal(
    business: BusinessInfo,
    sale: SaleData,
    template: 'simple' | 'legal' = 'simple'
  ): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }

    if (!this.config?.printerName) {
      throw new Error('No hay impresora configurada. Usa configure() primero.');
    }

    try {
      // Generar comandos ESC/POS
      const commands = this.generateESCPOS(business, sale, template);

      // Configurar impresión
      const config = qz.configs.create(this.config.printerName);

      // Imprimir
      await qz.print(config, commands);

      console.log('✅ Ticket impreso correctamente');
    } catch (error) {
      console.error('❌ Error imprimiendo ticket:', error);
      throw new Error('Error al imprimir el ticket');
    }
  }

  /**
   * Generar comandos ESC/POS para ticket térmico
   */
  private generateESCPOS(
    business: BusinessInfo,
    sale: SaleData,
    template: 'simple' | 'legal'
  ): Array<{ type: string; data: string }> {
    const ESC = '\x1B';
    const GS = '\x1D';

    const commands: Array<{ type: string; data: string }> = [];

    // Inicializar impresora
    commands.push({ type: 'raw', data: `${ESC}@` });

    // Centrar texto
    commands.push({ type: 'raw', data: `${ESC}a${String.fromCharCode(1)}` });

    // Negrita
    commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(1)}` });

    // Nombre del negocio
    commands.push({ type: 'raw', data: `${business.name}\n` });

    // Desactivar negrita
    commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(0)}` });

    // CUIT
    if (business.cuit) {
      commands.push({ type: 'raw', data: `CUIT: ${business.cuit}\n` });
    }

    // Dirección
    if (business.address) {
      commands.push({ type: 'raw', data: `${business.address}\n` });
    }

    // Teléfono
    if (business.phone) {
      commands.push({ type: 'raw', data: `Tel: ${business.phone}\n` });
    }

    // Separador
    commands.push({ type: 'raw', data: `${'-'.repeat(40)}\n` });

    // Alinear a la izquierda
    commands.push({ type: 'raw', data: `${ESC}a${String.fromCharCode(0)}` });

    // Número de venta
    commands.push({ type: 'raw', data: `Comprobante: ${sale.number}\n` });
    commands.push({ type: 'raw', data: `Fecha: ${sale.date}\n` });

    // Separador
    commands.push({ type: 'raw', data: `${'-'.repeat(40)}\n` });

    // Items
    sale.items.forEach((item) => {
      // Descripción
      commands.push({ type: 'raw', data: `${item.description}\n` });

      // Cantidad x Precio = Total
      const line = `${item.quantity} x $${item.price.toFixed(2)} = $${item.total.toFixed(2)}`;
      commands.push({ type: 'raw', data: `${line}\n` });
    });

    // Separador
    commands.push({ type: 'raw', data: `${'-'.repeat(40)}\n` });

    // Total
    commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(1)}` }); // Negrita
    commands.push({ type: 'raw', data: `TOTAL: $${sale.total.toFixed(2)}\n` });
    commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(0)}` }); // Desactivar negrita

    // Pagos
    if (sale.payments && sale.payments.length > 0) {
      commands.push({ type: 'raw', data: `\nFormas de pago:\n` });
      sale.payments.forEach((payment) => {
        commands.push({
          type: 'raw',
          data: `  ${payment.method}: $${payment.amount.toFixed(2)}\n`
        });
      });
    }

    // CAE (si es legal)
    if (template === 'legal' && sale.cae) {
      commands.push({ type: 'raw', data: `\n${'-'.repeat(40)}\n` });
      commands.push({ type: 'raw', data: `CAE: ${sale.cae.number}\n` });
      commands.push({ type: 'raw', data: `Vto. CAE: ${sale.cae.expirationDate}\n` });
    }

    // Footer
    commands.push({ type: 'raw', data: `\n${'-'.repeat(40)}\n` });
    commands.push({ type: 'raw', data: `${ESC}a${String.fromCharCode(1)}` }); // Centrar
    commands.push({ type: 'raw', data: `Gracias por su compra!\n` });

    // Cortar papel
    commands.push({ type: 'raw', data: `\n\n\n${GS}V${String.fromCharCode(66)}${String.fromCharCode(0)}` });

    return commands;
  }

  /**
   * Desconectar de QZ Tray
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await qz.websockets.disconnect();
        this.isConnected = false;
        console.log('✅ Desconectado de QZ Tray');
      } catch (error) {
        console.error('Error desconectando:', error);
      }
    }
  }
}

// Exportar instancia singleton
export const qzTrayService = new QZTrayService();

// Exportar tipos
export type { PrinterConfig, BusinessInfo, SaleData };
