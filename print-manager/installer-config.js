/**
 * Configuración del instalador
 * Este archivo se usará para configurar el instalador durante la instalación
 */

module.exports = {
  appName: 'Axioma Print Manager',
  version: '1.0.0',
  publisher: 'Axioma Web',
  description: 'Print Manager para impresión térmica automática',

  // Configuración por defecto
  defaults: {
    printerName: 'POS-80',
    port: 9100,
    autoStart: true,
    installAsService: true
  },

  // Rutas de instalación
  paths: {
    installDir: 'C:\\Program Files\\AxiomaPrintManager',
    dataDir: '%APPDATA%\\AxiomaPrintManager',
    logsDir: '%APPDATA%\\AxiomaPrintManager\\logs'
  }
};
