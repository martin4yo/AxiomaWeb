const nodemailer = require('nodemailer');

// Configuración de prueba
const config = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'remoteaxioma@gmail.com',
    pass: 'axvpahcmzqkhcjjr' // Sin espacios - Nueva contraseña
  },
  debug: true, // Mostrar debug info
  logger: true // Mostrar logs
};

console.log('🔍 Probando conexión SMTP con:');
console.log('Usuario:', config.auth.user);
console.log('Contraseña length:', config.auth.pass.length);
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('-----------------------------------\n');

const transporter = nodemailer.createTransport(config);

// Verificar conexión
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ ERROR de conexión:');
    console.error(error);
    console.error('\n📋 SOLUCIONES POSIBLES:');
    console.error('1. Verifica que la cuenta tenga verificación en 2 pasos ACTIVADA');
    console.error('2. Genera una NUEVA contraseña de aplicación en:');
    console.error('   https://myaccount.google.com/apppasswords');
    console.error('3. Asegúrate de copiar la contraseña SIN espacios');
    console.error('4. Verifica que el acceso de apps menos seguras esté permitido');
    process.exit(1);
  } else {
    console.log('✅ Conexión exitosa! El servidor está listo para enviar emails.');

    // Intentar enviar un email de prueba
    console.log('\n📧 Enviando email de prueba...\n');

    transporter.sendMail({
      from: '"Test Axioma" <remoteaxioma@gmail.com>',
      to: 'martin4yo@gmail.com', // Enviar a tu otra cuenta para probar
      subject: 'Test de configuración SMTP',
      text: 'Si recibes este email, la configuración funciona correctamente!',
      html: '<h1>✅ Configuración SMTP funcionando</h1><p>La cuenta remoteaxioma@gmail.com está configurada correctamente.</p>'
    }, (error, info) => {
      if (error) {
        console.error('❌ Error al enviar email:', error);
        process.exit(1);
      }
      console.log('✅ Email enviado exitosamente!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
      process.exit(0);
    });
  }
});
