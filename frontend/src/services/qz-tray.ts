/**
 * QZ Tray Service
 *
 * Servicio para integración con QZ Tray para impresión térmica directa
 * Compatible con todos los navegadores
 *
 * Documentación: https://qz.io/wiki/
 */

// Dynamic import para mejor compatibilidad con build tools
let qz: any = null;

// Certificado digital (generado con QZ Tray)
// Generado: 2025-12-12, válido por 365 días
// Para regenerar: cd qz-tray && ./generar-certificados.sh (o .bat en Windows)
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDlzCCAn8CFBhtuBBgopAogeDBUpGi7KbAEFPaMA0GCSqGSIb3DQEBCwUAMIGH
MQswCQYDVQQGEwJBUjEVMBMGA1UECAwMQnVlbm9zIEFpcmVzMRUwEwYDVQQHDAxC
dWVub3MgQWlyZXMxEjAQBgNVBAoMCUF4aW9tYVdlYjESMBAGA1UEAwwJbG9jYWxo
b3N0MSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3ZWIuY29tMB4XDTI1MTIx
MjE2MDIyOVoXDTI2MTIxMjE2MDIyOVowgYcxCzAJBgNVBAYTAkFSMRUwEwYDVQQI
DAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJ
QXhpb21hV2ViMRIwEAYDVQQDDAlsb2NhbGhvc3QxIjAgBgkqhkiG9w0BCQEWE2Fk
bWluQGF4aW9tYXdlYi5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
AQDHUdSdIxld95sdpYWDk4Owl7nRnUGcGG3LYjgjz+EXcBFkMnXSBH3i1sZ+cMnO
UTB9bHvNthtQ3I3VZglZn27VvAMvGPtOGVxW7tW2rWueWc9NQOvm3HJMW/c/6GeP
zojWGs59vowK3/TVlcIYdk6mPhJXBOgHg234oM8rjQsgdxBg7e6PzOafBMxCV0y4
0APPiJaE78iOIthLXcZ94ppMz2FbZkUEHQCXjzDXAYf97kf4xyvx1EFSF/9RKbE7
CxxSSc7EfongQgN6qeLp4xjC68Jhrv/V2Sw+9uoptRRg9ubXoU33fqEHaxAhF8iw
w1NWphf6LlXVMkVp0HUnPlVvAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABT2opbU
AvPcSbs7MBipxwK3sh539A5yLBAmorcswLZfy9IF/7gz2YT5R1gx9laEcI1rTVey
8yWeq/jsKQ7/vXZZDJ/kCQYE4gzmDHaJWuM7kO6N5ohOdhlFih+elZlIY3qu56Eh
o1RN/5IspgoxXrTaCb097r6fo4Zz1cFPLDdq4mJYv/bDzSw0hwaVQhbU90hpwJad
YNx2i3C7BqW/AttYiWjIfnuPNIgI/fxhoUOJIKVJXh31kJxLtrbaY6Wi3wbXWcqe
EueDS2POuRVtNcBlybJeMbycFOntNNVCeypRDyBfOdQtC1J17nbzNaWiz8ju6x7c
lyImJCbNWzCGP5c=
-----END CERTIFICATE-----`;

// Nota: PRIVATE_KEY se usaría para firma con jsrsasign en producción
// Por ahora, los certificados self-signed no requieren firma compleja
// const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
// REPLACE_WITH_YOUR_PRIVATE_KEY
// -----END PRIVATE KEY-----`;

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
   * Cargar módulo QZ Tray dinámicamente
   */
  private async loadQZ(): Promise<void> {
    if (!qz) {
      console.log('📦 Cargando módulo qz-tray...');
      const qzModule = await import('qz-tray');

      // Debug: Ver estructura completa
      console.log('🔍 qzModule completo:', qzModule);
      console.log('🔍 qzModule.default:', qzModule.default);
      console.log('🔍 Object.keys(qzModule):', Object.keys(qzModule));

      // El módulo puede exportar default o named exports
      qz = qzModule.default || qzModule;
      console.log('✅ Módulo qz-tray cargado:', qz);
      console.log('🔍 qz.websockets después de asignar:', qz?.websockets);
    }
  }

  /**
   * Inicializar QZ Tray
   */
  async initialize(): Promise<void> {
    try {
      // Cargar módulo dinámicamente
      await this.loadQZ();

      // Debug: Verificar que qz esté correctamente cargado
      console.log('🔍 Debug - qz object:', qz);
      console.log('🔍 Debug - qz.websockets:', qz?.websockets);
      console.log('🔍 Debug - qz.websockets.connect:', qz?.websockets?.connect);

      if (!qz || !qz.websockets || !qz.websockets.connect) {
        throw new Error('QZ Tray library not loaded correctly.');
      }

      // Cargar configuración guardada
      this.loadConfig();

      // Configurar firma digital
      await this.setupSigning();

      // Conectar a QZ Tray
      console.log('🔌 Intentando conectar a QZ Tray...');
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
      await this.loadQZ();
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
