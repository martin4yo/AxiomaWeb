const axios = require('axios');

const PRINT_MANAGER_URL = 'http://localhost:9100';

// Datos de prueba
const testData = {
  data: {
    business: {
      name: 'MI NEGOCIO DE PRUEBA',
      cuit: '20-12345678-9',
      address: 'Calle Falsa 123, Ciudad',
      phone: '011-1234-5678',
      email: 'info@minegocio.com'
    },
    sale: {
      number: '00001-00000042',
      date: new Date().toLocaleDateString('es-AR'),
      time: new Date().toLocaleTimeString('es-AR'),
      customer: 'Cliente de Prueba',
      items: [
        {
          name: 'Producto de Prueba 1',
          quantity: 2,
          unitPrice: 150.00,
          total: 300.00
        },
        {
          name: 'Producto de Prueba 2',
          quantity: 1,
          unitPrice: 250.50,
          total: 250.50
        },
        {
          name: 'Producto con nombre largo para probar el formato',
          quantity: 3,
          unitPrice: 99.99,
          total: 299.97
        }
      ],
      subtotal: 850.47,
      discountAmount: 0,
      taxAmount: 178.60,
      totalAmount: 1029.07,
      payments: [
        {
          name: 'Efectivo',
          amount: 1029.07
        }
      ],
      notes: 'Ticket de prueba generado automáticamente'
    }
  },
  template: 'simple'
};

async function testPrintManager() {
  console.log('\n🧪 Test de Impresión - Print Manager Windows\n');

  try {
    // 1. Health check
    console.log('1️⃣  Verificando estado del servidor...');
    const healthResponse = await axios.get(`${PRINT_MANAGER_URL}/health`);
    console.log('✅ Servidor respondiendo:', healthResponse.data);
    console.log('');

    // 2. Listar impresoras
    console.log('2️⃣  Obteniendo lista de impresoras...');
    const printersResponse = await axios.get(`${PRINT_MANAGER_URL}/printers`);
    console.log('✅ Impresoras disponibles:', printersResponse.data);
    console.log('');

    // 3. Enviar ticket a imprimir
    console.log('3️⃣  Enviando solicitud de impresión...');
    const printResponse = await axios.post(`${PRINT_MANAGER_URL}/print`, testData);

    console.log('\n✅ Respuesta del servidor:');
    console.log(JSON.stringify(printResponse.data, null, 2));

    if (printResponse.data.success) {
      console.log('\n🎉 ¡Ticket generado correctamente!');
      console.log(`📄 Archivo: ${printResponse.data.file}`);

      if (printResponse.data.autoprint) {
        console.log('🖨️  El ticket se está enviando a la impresora automáticamente.');
      } else {
        console.log('\n📝 Instrucciones:');
        printResponse.data.instructions.forEach(instruction => {
          console.log(`   ${instruction}`);
        });
      }
    } else {
      console.log('\n❌ Error al generar ticket');
    }

  } catch (error) {
    console.error('\n❌ Error en el test:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   El Print Manager no está corriendo.');
      console.error('   Ejecuta primero: node server-windows.js');
    } else if (error.response) {
      console.error('   Código:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   ', error.message);
    }
  }

  console.log('');
}

// Ejecutar test
testPrintManager();
