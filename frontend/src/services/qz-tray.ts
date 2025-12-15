/**
 * QZ Tray Service
 *
 * Servicio para integración con QZ Tray para impresión térmica directa
 * Compatible con todos los navegadores
 *
 * Documentación: https://qz.io/wiki/
 */

import * as jsrsasign from 'jsrsasign';

// Dynamic import para mejor compatibilidad con build tools
let qz: any = null;

// Certificado digital (generado con QZ Tray)
// Generado: 2025-12-13, válido por 365 días
// CN: axiomaweb.axiomacloud.com
// SAN: axiomaweb.axiomacloud.com, localhost, 127.0.0.1
// Para regenerar: cd qz-tray && ./generar-certificados.sh (o .bat en Windows)
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIEGzCCAwOgAwIBAgIUZwr8GY39yP7jUDm2SbH0v1sUTdUwDQYJKoZIhvcNAQEL
BQAwgZcxCzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNV
BAcMDEJ1ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlh
eGlvbWF3ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBh
eGlvbWF3ZWIuY29tMB4XDTI1MTIxMzEyNTkwOFoXDTI2MTIxMzEyNTkwOFowgZcx
CzAJBgNVBAYTAkFSMRUwEwYDVQQIDAxCdWVub3MgQWlyZXMxFTATBgNVBAcMDEJ1
ZW5vcyBBaXJlczESMBAGA1UECgwJQXhpb21hV2ViMSIwIAYDVQQDDBlheGlvbWF3
ZWIuYXhpb21hY2xvdWQuY29tMSIwIAYJKoZIhvcNAQkBFhNhZG1pbkBheGlvbWF3
ZWIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoMYYJ31BHwyp
3+djbC+1/3NkpJFurUwo8mme13vrMhbxKWmcbPcU9FPVWVMtqnJuQjie/ytri5ZV
HiV6h10kWA73EtzRUSgZSNoCUBwQlM2az+6s9/CY7ZG5LvKM+n0TkoQS6t8iiG4p
K31W2/i9NWf1McVQ9LE5ntx0WJlHA8dVRkejZaXDNcQOpb5flrW+8LN2WLQXrKev
BwX48nJaxJ8XNsymczVR5hcJ7WcNyunk3/gzOvzTEwEFGxNEmwsi6xfkmAxsTf7A
0R0OL3Pb/Rr7OoWfCwfcz1kwXCdML+M4DnU/JJaoitXbfGL0lIFjacZC+vxCAO0F
2/nFvCHKzQIDAQABo10wWzA6BgNVHREEMzAxghlheGlvbWF3ZWIuYXhpb21hY2xv
dWQuY29tgglsb2NhbGhvc3SCCTEyNy4wLjAuMTAdBgNVHQ4EFgQUPUqpS0kRV/gB
g2F9iOEDeqD+ttgwDQYJKoZIhvcNAQELBQADggEBAJ4sPwTIyNZJzgUq5zfbafca
qi95ikjGJO8W+H1D66LnAFhzBynrl+MTH9u7pBfYXzcttdfy3vYFOCu0g+PwcGFf
DV9xPE1VkSo5in5DIfu7+/OPQk9uywOKglGORNBcm3tmjLsy0IeSWd+JA3vTYQ3Y
unGisCiWLEBfrDuG+5e92vfgq96NYbSdnAScekVffwROa6Fd24V23YG2J5uNp/Rf
rIoaH/FnMlFGVveCD2gblEUfqXgl/TCxBxXHNt3biNJIiD+m9TMH0JUuR0cioLyz
880/n9i13ehxWsOcL+tR32kdGmgiQxOSgojqZAv4yk1xlK3h3W7CdkTyw6scYzI=
-----END CERTIFICATE-----`;

// Clave privada para firmar mensajes
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgxhgnfUEfDKnf
52NsL7X/c2SkkW6tTCjyaZ7Xe+syFvEpaZxs9xT0U9VZUy2qcm5COJ7/K2uLllUe
JXqHXSRYDvcS3NFRKBlI2gJQHBCUzZrP7qz38Jjtkbku8oz6fROShBLq3yKIbikr
fVbb+L01Z/UxxVD0sTme3HRYmUcDx1VGR6NlpcM1xA6lvl+Wtb7ws3ZYtBesp68H
BfjyclrEnxc2zKZzNVHmFwntZw3K6eTf+DM6/NMTAQUbE0SbCyLrF+SYDGxN/sDR
HQ4vc9v9Gvs6hZ8LB9zPWTBcJ0wv4zgOdT8klqiK1dt8YvSUgWNpxkL6/EIA7QXb
+cW8IcrNAgMBAAECggEAAf0JOFdpSlORnn11Ly9oE+MVUmxV2KQmcn8VBTG/aJTV
9Tu2gOnnMxfK8PcHvs6tASBdpdn5E2NWPxBagFkwaKIz8vwGEh48/jfSC2cZdMzi
yaHetxW28nzY2m6+CLmqZKeOnooiQKedVnAcEA4dJ8KwirKXzBSM2gni3ePbBL35
0MKz3Rz5q9Hx+i2GTA2EeBC91ct/ViD4kCNR6H85rCaQ6q2TDBfHmjXRNyWtTO6a
u3aaYIKkHILP/ey4llBqGP/8HWY43jWHhpn/6HupTKPZY+SOgd/Geshfsq/dTfVU
cAZ8MzqyNu7vs2Smmo+cnlITE4XAEQ6txOO/geZIOQKBgQDCNk0TaCLr9JsQqMcD
+elkBdS0wazoRWAXqLjgkJ5VByTBdrXyJo7uEQI2FXHn7mo9b/DJWdIdhA338ipv
mPJdmUnHjr4IrffT+CyL0x/o6y4awOZRVeufdBkn9EWWLLEGlMFa67dsHK++T6aF
RAj3Q0Ee+9Wb5O+qmbVxAdQjyQKBgQDT7GTtkTLwhdVQANGfnm+efuoYMjgVEgB7
zxdXYsfreGSBWmyaeXVbq9O92178Iv3PTmGiiT+cUpHuZssToIz2dXv1yHgrLPAI
LFPiNMuHt6DotIK8ehIJel/kEMlIqcnDhA4N6GYBN7rwvkW2pFXgajSqt48BEUCz
LnVpowOI5QKBgQCEs22+0OzrpNs/atNxWBWtDn7kc2Gd46lhARwx9R76okLvHhn8
N3R6Ho0QP17xRuq4yAAS1JjJKi4RORrd3ffdFJxhCpu2eohYAb8OW1f2YpvCFARL
lxXEgiOeNT5G+oqLIKFtapqN+Jvswafabz5hFUct0I2IU8mfHB/p84HsYQKBgD86
O06J0JnkRCVPaTtnSMQP94XqjcLzkQNfYQZoaV8+lzXkpZxc+n+0P0NYzPkK85DD
QOv+aOUZ2YI4VwRvFT9/A9Hr0raG/MJjf09xEvxV9AMZwBu9i94aDbv8qiEszw6v
OoY5vR1F5FdpXWFFnH2NElOQ2nCmFhifltZClY5lAoGAWvEKOiy7Hx+uzS4e8h1Y
Z0IYCEmGuj0DJLycHGhaCejUqGYwLyTAyFx90w1JfS9feqVe7J6LZualTwj+O/JK
rcnmMzfuZ1nIub10HjLEsb4M4py5nP+Vn17hd8lUPTm3Nw/lHUFFHO3iN+Lcz+N2
/WfERsojABpzgcV1cuZ//sA=
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
  // Datos fiscales adicionales para template legal
  vatCondition?: string;        // Condición IVA (ej: "IVA Responsable Inscripto")
  grossIncomeNumber?: string;   // Número de Ingresos Brutos
  activityStartDate?: string;   // Fecha inicio actividades
}

interface SaleData {
  number: string;
  date: string;
  items: Array<{
    description: string;
    name?: string;
    productName?: string;
    quantity: number;
    price: number;
    unitPrice?: number;
    total: number;
    taxAmount?: number;
  }>;
  total: number;
  totalAmount?: number;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  payments?: Array<{
    method: string;
    name?: string;
    amount: number;
    reference?: string;
  }>;
  cae?: {
    number: string;
    expirationDate: string;
  };
  // Campos adicionales para template legal
  caeNumber?: string;
  caeExpiration?: string;
  voucherName?: string;         // "Factura", "Nota de Crédito", etc.
  voucherLetter?: string;       // "A", "B", "C"
  salesPointNumber?: number;
  customer?: string;
  customerCuit?: string;
  customerVatCondition?: string;
  customerAddress?: string;
  qrData?: string;              // URL del QR de AFIP
  discriminatesVat?: boolean;   // Si discrimina IVA (Factura A)
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
      console.log('🔍 qz.websocket después de asignar:', qz?.websocket);
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
      console.log('🔍 Debug - qz.websocket:', qz?.websocket);
      console.log('🔍 Debug - qz.websocket.connect:', qz?.websocket?.connect);

      if (!qz || !qz.websocket || !qz.websocket.connect) {
        throw new Error('QZ Tray library not loaded correctly.');
      }

      // Cargar configuración guardada
      this.loadConfig();

      // Configurar firma digital
      await this.setupSigning();

      // Conectar a QZ Tray
      console.log('🔌 Intentando conectar a QZ Tray...');
      await qz.websocket.connect();
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
   * Firmar mensaje con RSA-SHA256 usando jsrsasign
   */
  private signMessage(message: string): string {
    try {
      // Crear firma RSA-SHA256
      const signature = new jsrsasign.KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
      signature.init(PRIVATE_KEY);
      signature.updateString(message);
      const signatureHex = signature.sign();

      // Convertir hex a base64
      const signatureBase64 = jsrsasign.hextob64(signatureHex);

      console.log('🔐 Mensaje firmado correctamente con RSA-SHA256');
      return signatureBase64;
    } catch (error) {
      console.error('❌ Error firmando mensaje:', error);
      // Fallback: retornar mensaje sin firmar
      return message;
    }
  }

  /**
   * Verificar si QZ Tray está conectado
   */
  async isActive(): Promise<boolean> {
    try {
      await this.loadQZ();
      return qz.websocket.isActive();
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
  generateESCPOS(
    business: BusinessInfo,
    sale: SaleData,
    template: 'simple' | 'legal'
  ): Array<{ type: string; data: string }> {
    const ESC = '\x1B';
    const GS = '\x1D';
    const WIDTH = 42; // Caracteres por línea en impresora de 80mm

    const commands: Array<{ type: string; data: string }> = [];

    // Helpers
    const center = () => commands.push({ type: 'raw', data: `${ESC}a${String.fromCharCode(1)}` });
    const left = () => commands.push({ type: 'raw', data: `${ESC}a${String.fromCharCode(0)}` });
    const boldOn = () => commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(1)}` });
    const boldOff = () => commands.push({ type: 'raw', data: `${ESC}E${String.fromCharCode(0)}` });
    const doubleHeight = () => commands.push({ type: 'raw', data: `${GS}!${String.fromCharCode(16)}` });
    const normalSize = () => commands.push({ type: 'raw', data: `${GS}!${String.fromCharCode(0)}` });
    const print = (text: string) => commands.push({ type: 'raw', data: text });
    const divider = () => print(`${'='.repeat(WIDTH)}\n`);
    const dividerDash = () => print(`${'-'.repeat(WIDTH)}\n`);

    // Inicializar impresora
    commands.push({ type: 'raw', data: `${ESC}@` });

    // ============ HEADER DEL NEGOCIO ============
    center();
    boldOn();
    doubleHeight();
    print(`${business.name}\n`);
    normalSize();
    boldOff();

    // Datos fiscales del negocio (template legal)
    if (template === 'legal') {
      if (business.vatCondition) {
        print(`${business.vatCondition}\n`);
      }
    }

    if (business.cuit) {
      boldOn();
      print(`CUIT: ${business.cuit}\n`);
      boldOff();
    }

    if (business.address) {
      print(`${business.address}\n`);
    }

    // Datos fiscales adicionales (solo template legal)
    if (template === 'legal') {
      if (business.grossIncomeNumber) {
        print(`IIBB: ${business.grossIncomeNumber}\n`);
      }
      if (business.activityStartDate) {
        print(`Inicio Act.: ${business.activityStartDate}\n`);
      }
    }

    if (business.phone) {
      print(`Tel: ${business.phone}\n`);
    }

    divider();

    // ============ TIPO DE COMPROBANTE (template legal) ============
    if (template === 'legal' && sale.voucherLetter) {
      center();
      boldOn();
      doubleHeight();
      // Recuadro con la letra
      print(`[ ${sale.voucherLetter} ]\n`);
      normalSize();

      // Tipo de comprobante
      const voucherType = sale.voucherName || 'FACTURA';
      print(`${voucherType}\n`);
      boldOff();
    } else {
      center();
      boldOn();
      print(`TICKET DE VENTA\n`);
      boldOff();
    }

    // Número de comprobante
    center();
    boldOn();
    print(`Nro: ${sale.number}\n`);
    boldOff();
    print(`Fecha: ${sale.date}\n`);

    dividerDash();

    // ============ DATOS DEL CLIENTE (template legal) ============
    if (template === 'legal') {
      left();
      const customerName = sale.customer || 'Consumidor Final';
      print(`Cliente: ${customerName}\n`);

      if (sale.customerCuit) {
        print(`CUIT: ${sale.customerCuit}\n`);
      }
      if (sale.customerVatCondition && sale.customerVatCondition !== 'CF') {
        print(`Cond. IVA: ${sale.customerVatCondition}\n`);
      }
      if (sale.customerAddress) {
        print(`Dom.: ${sale.customerAddress}\n`);
      }
      dividerDash();
    }

    // ============ ITEMS ============
    left();
    sale.items.forEach((item) => {
      const desc = item.description || item.productName || item.name || 'Sin descripción';
      print(`${desc}\n`);

      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price || item.unitPrice) || 0;
      const total = Number(item.total) || 0;

      const line = `  ${quantity} x $${price.toFixed(2)} = $${total.toFixed(2)}`;
      print(`${line}\n`);
    });

    dividerDash();

    // ============ TOTALES ============
    left();

    // Subtotal y descuentos (si aplica)
    if (sale.subtotal && sale.subtotal !== sale.total) {
      print(`Subtotal: $${Number(sale.subtotal).toFixed(2)}\n`);
    }
    if (sale.discountAmount && Number(sale.discountAmount) > 0) {
      print(`Descuento: -$${Number(sale.discountAmount).toFixed(2)}\n`);
    }
    // IVA discriminado (Factura A)
    if (template === 'legal' && sale.discriminatesVat && sale.taxAmount) {
      print(`IVA 21%: $${Number(sale.taxAmount).toFixed(2)}\n`);
    }

    dividerDash();

    // Total
    const saleTotal = Number(sale.totalAmount || sale.total) || 0;
    center();
    boldOn();
    doubleHeight();
    print(`TOTAL: $${saleTotal.toFixed(2)}\n`);
    normalSize();
    boldOff();

    dividerDash();

    // ============ FORMAS DE PAGO ============
    if (sale.payments && sale.payments.length > 0) {
      left();
      boldOn();
      print(`FORMAS DE PAGO:\n`);
      boldOff();
      sale.payments.forEach((payment) => {
        const paymentAmount = Number(payment.amount) || 0;
        const method = payment.name || payment.method || 'Sin especificar';
        print(`  ${method}: $${paymentAmount.toFixed(2)}\n`);
      });
      dividerDash();
    }

    // ============ CAE Y QR (template legal) ============
    if (template === 'legal') {
      const caeNumber = sale.caeNumber || sale.cae?.number;
      const caeExpiration = sale.caeExpiration || sale.cae?.expirationDate;

      if (caeNumber) {
        center();
        print(`CAE: ${caeNumber}\n`);
        if (caeExpiration) {
          print(`Vto. CAE: ${caeExpiration}\n`);
        }

        // QR de AFIP (si la impresora lo soporta)
        if (sale.qrData) {
          print(`\n`);
          // Comando para QR en ESC/POS (GS ( k)
          // Modelo QR: Model 2, Tamaño: 4, Error correction: M
          const qrContent = sale.qrData;

          // Función de QR (GS ( k)
          // 1. Seleccionar modelo QR (Model 2)
          commands.push({ type: 'raw', data: `${GS}(k\x04\x00\x31\x41\x32\x00` });

          // 2. Tamaño del módulo (4 puntos)
          commands.push({ type: 'raw', data: `${GS}(k\x03\x00\x31\x43\x04` });

          // 3. Error correction level (M = 49)
          commands.push({ type: 'raw', data: `${GS}(k\x03\x00\x31\x45\x31` });

          // 4. Almacenar datos del QR
          const qrLen = qrContent.length + 3;
          const pL = qrLen % 256;
          const pH = Math.floor(qrLen / 256);
          commands.push({
            type: 'raw',
            data: `${GS}(k${String.fromCharCode(pL)}${String.fromCharCode(pH)}\x31\x50\x30${qrContent}`
          });

          // 5. Imprimir QR
          commands.push({ type: 'raw', data: `${GS}(k\x03\x00\x31\x51\x30` });

          print(`\n`);
        }

        print(`Comprobante Autorizado\n`);
      }
    }

    // ============ FOOTER ============
    dividerDash();
    center();
    if (template === 'legal') {
      print(`Gracias por su compra!\n`);
    } else {
      print(`TICKET NO VALIDO COMO FACTURA\n`);
      print(`Gracias por su compra!\n`);
    }

    // Cortar papel (con avance)
    print(`\n\n\n`);
    commands.push({ type: 'raw', data: `${GS}V${String.fromCharCode(66)}${String.fromCharCode(0)}` });

    return commands;
  }

  /**
   * Desconectar de QZ Tray
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await qz.websocket.disconnect();
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
