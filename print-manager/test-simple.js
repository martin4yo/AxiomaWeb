const axios = require('axios');

console.log('🧪 Test de Impresión - Print Manager Simple\n');

const testSale = {
  business: {
    name: "MI NEGOCIO TEST",
    cuit: "20-12345678-9",
    address: "Calle Falsa 123, Ciudad Autónoma de Buenos Aires",
    phone: "11 1234-5678",
    email: "test@minegocio.com"
  },
  sale: {
    number: "0001-00000001",
    date: new Date().toLocaleDateString('es-AR'),
    voucherName: "Ticket",
    voucherLetter: "X",
    discriminatesVat: false,
    customer: "Cliente de Prueba",
    items: [
      {
        description: "Producto Test 1",
        quantity: 2,
        unitPrice: 100.50,
        total: 201.00
      },
      {
        description: "Producto Test 2 - Descripción Larga para Probar Formato",
        quantity: 1,
        unitPrice: 150.75,
        total: 150.75
      },
      {
        description: "Producto Test 3",
        quantity: 5,
        unitPrice: 25.00,
        total: 125.00
      }
    ],
    subtotal: 476.75,
    discount: 26.75,
    vatAmount: 0,
    total: 450.00,
    payments: [
      {
        method: "Efectivo",
        amount: 500.00
      },
      {
        method: "Cambio",
        amount: -50.00
      }
    ]
  }
};

console.log('📤 Enviando solicitud de impresión...\n');

axios.post('http://localhost:9100/print', {
  sale: testSale,
  template: 'simple'
})
  .then(response => {
    console.log('✅ Respuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n🎉 ¡Ticket enviado correctamente!');
    console.log('📝 Revisa tu impresora para ver el resultado.');
  })
  .catch(error => {
    console.error('❌ Error al enviar ticket:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error);
    } else {
      console.error('   ', error.message);
      console.error('\n💡 Asegúrate de que el Print Manager esté corriendo:');
      console.error('   npm start');
    }
    process.exit(1);
  });
