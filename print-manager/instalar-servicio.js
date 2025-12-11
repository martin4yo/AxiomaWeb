/**
 * Instalador de Servicio de Windows para Print Manager
 *
 * Este script instala el Print Manager como un servicio de Windows
 * que se ejecuta automáticamente al iniciar el sistema.
 *
 * IMPORTANTE: Debe ejecutarse como ADMINISTRADOR
 *
 * Uso:
 *   1. Instalar node-windows: npm install node-windows
 *   2. Configurar PRINTER_NAME abajo
 *   3. Ejecutar como admin: node instalar-servicio.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// ⚙️ CONFIGURACIÓN
const PRINTER_NAME = process.env.PRINTER_NAME || 'POS-80';
const SERVICE_NAME = 'AxiomaWebPrintManager';
const SERVICE_DESCRIPTION = 'Print Manager para Axioma Web - Impresión térmica automática';

// Crear servicio
const svc = new Service({
  name: SERVICE_NAME,
  description: SERVICE_DESCRIPTION,
  script: path.join(__dirname, 'server-thermal-windows.js'),
  env: [
    {
      name: 'PRINTER_NAME',
      value: PRINTER_NAME
    },
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ],
  wait: 2,
  grow: 0.5,
  maxRestarts: 10
});

// Escuchar evento de instalación
svc.on('install', () => {
  console.log('');
  console.log('================================================');
  console.log('  ✅ Servicio instalado exitosamente!');
  console.log('================================================');
  console.log('');
  console.log(`Nombre del servicio: ${SERVICE_NAME}`);
  console.log(`Impresora configurada: ${PRINTER_NAME}`);
  console.log('');
  console.log('El servicio se iniciará automáticamente al arrancar Windows.');
  console.log('');
  console.log('Comandos útiles:');
  console.log(`  - Iniciar:   sc start ${SERVICE_NAME}`);
  console.log(`  - Detener:   sc stop ${SERVICE_NAME}`);
  console.log(`  - Estado:    sc query ${SERVICE_NAME}`);
  console.log('');
  console.log('Para ver logs del servicio:');
  console.log('  1. Abrir "Visor de eventos" de Windows');
  console.log('  2. Ir a "Registros de aplicaciones y servicios"');
  console.log(`  3. Buscar "${SERVICE_NAME}"`);
  console.log('');
  console.log('Para desinstalar:');
  console.log('  node desinstalar-servicio.js');
  console.log('');

  // Iniciar el servicio
  svc.start();
});

svc.on('start', () => {
  console.log('✅ Servicio iniciado correctamente');
  console.log('');
  console.log('Prueba la conexión en: https://localhost:9100/health');
  console.log('');
});

svc.on('alreadyinstalled', () => {
  console.error('');
  console.error('❌ El servicio ya está instalado.');
  console.error('');
  console.error('Para reinstalar:');
  console.error('  1. Ejecuta: node desinstalar-servicio.js');
  console.error('  2. Luego ejecuta: node instalar-servicio.js');
  console.error('');
});

svc.on('error', (err) => {
  console.error('');
  console.error('❌ Error instalando servicio:', err.message);
  console.error('');
  console.error('Asegúrate de:');
  console.error('  1. Ejecutar como ADMINISTRADOR (CMD o PowerShell como admin)');
  console.error('  2. Tener node-windows instalado: npm install node-windows');
  console.error('');
});

// Instalar servicio
console.log('');
console.log('🔧 Instalando Print Manager como servicio de Windows...');
console.log('');
console.log(`Impresora: ${PRINTER_NAME}`);
console.log('');

svc.install();
