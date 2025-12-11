const axios = require('axios');

const PRINT_MANAGER_URL = 'http://localhost:9100';

// Datos de prueba - Ticket fiscal completo
const testData = {
  data: {
    business: {
      name: 'MI NEGOCIO DE PRUEBA S.A.',
      cuit: '30-12345678-9',
      address: 'Av. Corrientes 1234, CABA, Buenos Aires',
      phone: '+54 11 1234-5678',
      email: 'info@minegocio.com'
    },
    sale: {
      // Datos del comprobante
      number: '00001-00000042',
      date: new Date().toLocaleDateString('es-AR'),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      voucherName: 'FACTURA',
      voucherLetter: 'B',
      afipCode: 6,
      discriminatesVat: false,
      salesPointNumber: 1,

      // Cliente
      customer: 'Juan Pérez - Consumidor Final',
      customerCuit: null,
      customerVatCondition: 'CF',

      // Items de la venta
      items: [
        {
          name: 'Coca-Cola 500ml',
          productName: 'Coca-Cola 500ml',
          quantity: 2,
          unitPrice: 450.00,
          total: 900.00,
          taxAmount: 189.00
        },
        {
          name: 'Alfajor Havanna',
          productName: 'Alfajor Havanna',
          quantity: 3,
          unitPrice: 380.50,
          total: 1141.50,
          taxAmount: 239.72
        },
        {
          name: 'Agua Mineral Villavicencio 1.5L',
          productName: 'Agua Mineral Villavicencio 1.5L',
          quantity: 1,
          unitPrice: 320.00,
          total: 320.00,
          taxAmount: 67.20
        }
      ],

      // Totales
      subtotal: 2361.50,
      discountAmount: 0,
      taxAmount: 495.92,
      totalAmount: 2857.42,

      // Formas de pago
      payments: [
        {
          name: 'Efectivo',
          amount: 3000.00
        }
      ],

      // CAE (datos fiscales AFIP)
      caeNumber: '72345678901234',
      caeExpiration: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'), // 10 días

      // Notas
      notes: 'Gracias por su compra. Vuelva pronto.'
    }
  },
  template: 'simple' // Puede ser 'simple' o 'legal'
};

async function testPrintManager() {
  console.log('\n🧪 Test de Impresión Térmica - Windows Direct\n');

  try {
    // 1. Health check
    console.log('1️⃣  Verificando estado del servidor...');
    const healthResponse = await axios.get(`${PRINT_MANAGER_URL}/health`);
    console.log('✅ Servidor respondiendo:');
    console.log(`   Estado: ${healthResponse.data.status}`);
    console.log(`   Versión: ${healthResponse.data.version}`);
    console.log(`   Impresora: ${healthResponse.data.printerName}`);
    console.log('');

    // 2. Listar impresoras
    console.log('2️⃣  Obteniendo lista de impresoras instaladas...');
    try {
      const printersResponse = await axios.get(`${PRINT_MANAGER_URL}/printers`);
      if (printersResponse.data.printers && printersResponse.data.printers.length > 0) {
        console.log('✅ Impresoras disponibles:');
        printersResponse.data.printers.forEach(p => {
          console.log(`   - ${p.Name || p.name} (Puerto: ${p.PortName || p.port || 'N/A'})`);
        });
      } else {
        console.log('⚠️  No se encontraron impresoras o error al listar.');
      }
      console.log(`   Impresora configurada: "${printersResponse.data.configured}"`);
      console.log('');
    } catch (err) {
      console.log('⚠️  No se pudo obtener lista de impresoras (esto no afecta la impresión)');
      console.log('');
    }

    // 3. Enviar ticket a imprimir
    console.log('3️⃣  Enviando solicitud de impresión...');
    console.log(`   Template: ${testData.template}`);
    console.log(`   Comprobante: ${testData.data.sale.voucherName} ${testData.data.sale.voucherLetter}`);
    console.log(`   Total: $${testData.data.sale.totalAmount.toFixed(2)}`);
    console.log('');

    const printResponse = await axios.post(`${PRINT_MANAGER_URL}/print`, testData, {
      timeout: 15000 // 15 segundos timeout
    });

    console.log('✅ Respuesta del servidor:');
    console.log(`   Success: ${printResponse.data.success}`);
    console.log(`   Método usado: ${printResponse.data.method}`);
    console.log(`   Mensaje: ${printResponse.data.message}`);

    if (printResponse.data.method === 'direct' || printResponse.data.method === 'copy') {
      console.log('');
      console.log('🎉 ¡Ticket enviado directamente a la impresora!');
      console.log('   Revisa si el ticket salió de la impresora.');
    } else if (printResponse.data.method === 'html') {
      console.log('');
      console.log('📝 Se generó un archivo HTML (método fallback)');
      console.log(`   Archivo: ${printResponse.data.file}`);
      console.log('');
      console.log('   Instrucciones:');
      printResponse.data.instructions.forEach((instruction, idx) => {
        console.log(`   ${idx + 1}. ${instruction}`);
      });
      console.log('');
      console.log('💡 Para impresión directa:');
      console.log('   - Verifica el nombre de tu impresora en Windows');
      console.log('   - Configura PRINTER_NAME en server-thermal-windows.js');
      console.log('   - Ejecuta como Administrador si es necesario');
    }

  } catch (error) {
    console.error('\n❌ Error en el test:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   El Print Manager no está corriendo.');
      console.error('   Ejecuta primero: node server-thermal-windows.js');
    } else if (error.response) {
      console.error('   Código:', error.response.status);
      console.error('   Error:', error.response.data.error || error.response.data);
    } else {
      console.error('   ', error.message);
    }
  }

  console.log('');
}

// Ejecutar test
testPrintManager();
