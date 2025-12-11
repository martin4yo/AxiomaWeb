/**
 * Desinstalador de Servicio de Windows para Print Manager
 *
 * Este script elimina el servicio de Windows del Print Manager
 *
 * IMPORTANTE: Debe ejecutarse como ADMINISTRADOR
 *
 * Uso:
 *   node desinstalar-servicio.js
 */

const Service = require('node-windows').Service;
const path = require('path');

const SERVICE_NAME = 'AxiomaWebPrintManager';

// Crear referencia al servicio
const svc = new Service({
  name: SERVICE_NAME,
  script: path.join(__dirname, 'server-thermal-windows.js')
});

// Escuchar evento de desinstalación
svc.on('uninstall', () => {
  console.log('');
  console.log('================================================');
  console.log('  ✅ Servicio desinstalado exitosamente');
  console.log('================================================');
  console.log('');
  console.log(`El servicio "${SERVICE_NAME}" ha sido eliminado.`);
  console.log('Ya no se iniciará automáticamente con Windows.');
  console.log('');
});

svc.on('error', (err) => {
  console.error('');
  console.error('❌ Error desinstalando servicio:', err.message);
  console.error('');
  console.error('Asegúrate de:');
  console.error('  1. Ejecutar como ADMINISTRADOR');
  console.error('  2. Que el servicio esté instalado');
  console.error('');
});

svc.on('doesnotexist', () => {
  console.error('');
  console.error('❌ El servicio no está instalado.');
  console.error('');
  console.error('No hay nada que desinstalar.');
  console.error('');
});

// Desinstalar servicio
console.log('');
console.log('🔧 Desinstalando Print Manager...');
console.log('');

svc.uninstall();
