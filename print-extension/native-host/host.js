#!/usr/bin/env node
/**
 * Axioma Print Manager - Native Messaging Host
 *
 * Este programa se comunica con la extensión de Chrome/Edge vía Native Messaging
 * y maneja la impresión térmica directa
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Cargar thermal templates si existen
let renderSimpleThermalTicket, renderLegalThermalTicket;
try {
  const templates = require('./thermal-templates');
  renderSimpleThermalTicket = templates.renderSimpleThermalTicket;
  renderLegalThermalTicket = templates.renderLegalThermalTicket;
} catch (e) {
  // Templates no disponibles, usar fallback
  logError('Error cargando templates:', e);
}

// Configuración
const CONFIG_FILE = path.join(process.env.APPDATA || process.env.HOME, 'axioma-print-manager', 'config.json');

/**
 * Leer configuración
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    logError('Error cargando config:', e);
  }

  return {
    printerName: 'POS-80'
  };
}

/**
 * Guardar configuración
 */
function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    logError('Error guardando config:', e);
  }
}

/**
 * Log de errores (va a stderr, no interfiere con la comunicación)
 */
function logError(...args) {
  console.error(new Date().toISOString(), ...args);
}

/**
 * Listar impresoras instaladas
 */
function listPrinters() {
  return new Promise((resolve) => {
    exec('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json"', (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      try {
        const printers = JSON.parse(stdout);
        resolve(Array.isArray(printers) ? printers : [printers]);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

/**
 * Imprimir directamente a impresora
 */
async function printDirect(printerName, escposData) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(process.env.TEMP || '/tmp', `ticket-${Date.now()}.txt`);

    fs.writeFileSync(tempFile, escposData, 'binary');

    const command = `copy /B "${tempFile}" "\\\\.\\${printerName}"`;

    exec(command, (error) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}

      if (error) {
        reject(new Error(`Error imprimiendo: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Imprimir ticket
 */
async function handlePrint(data) {
  const config = loadConfig();
  const { business, sale, template = 'simple' } = data;

  try {
    // Generar comandos ESC/POS
    let escposData;
    if (template === 'legal' && renderLegalThermalTicket) {
      escposData = await renderLegalThermalTicket(sale, business);
    } else if (renderSimpleThermalTicket) {
      escposData = await renderSimpleThermalTicket(sale, business);
    } else {
      throw new Error('Templates de impresión no disponibles');
    }

    const buffer = Buffer.from(escposData, 'binary');

    // Intentar impresión directa
    await printDirect(config.printerName, buffer);

    return {
      success: true,
      message: 'Impreso correctamente',
      printer: config.printerName
    };
  } catch (error) {
    logError('Error imprimiendo:', error);
    throw error;
  }
}

/**
 * Procesar comando
 */
async function processCommand(message) {
  const { requestId, command, data } = message;

  try {
    let response;

    switch (command) {
      case 'print':
        response = await handlePrint(data);
        break;

      case 'status':
        const config = loadConfig();
        response = {
          connected: true,
          printerName: config.printerName,
          version: '1.0.0'
        };
        break;

      case 'listPrinters':
        const printers = await listPrinters();
        response = { printers };
        break;

      case 'configure':
        const newConfig = { ...loadConfig(), ...data };
        saveConfig(newConfig);
        response = { success: true };
        break;

      default:
        throw new Error(`Comando desconocido: ${command}`);
    }

    return {
      requestId,
      success: true,
      ...response
    };
  } catch (error) {
    return {
      requestId,
      success: false,
      error: error.message
    };
  }
}

/**
 * Enviar mensaje a la extensión
 */
function sendMessage(message) {
  const buffer = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

/**
 * Leer mensaje de la extensión
 */
function readMessage() {
  return new Promise((resolve, reject) => {
    const headerBuffer = Buffer.alloc(4);

    process.stdin.read(4, (err, bytesRead, buffer) => {
      if (err || bytesRead !== 4) {
        reject(new Error('Error leyendo header'));
        return;
      }

      const messageLength = buffer.readUInt32LE(0);
      const messageBuffer = Buffer.alloc(messageLength);

      process.stdin.read(messageLength, (err, bytesRead, buffer) => {
        if (err || bytesRead !== messageLength) {
          reject(new Error('Error leyendo mensaje'));
          return;
        }

        try {
          const message = JSON.parse(buffer.toString());
          resolve(message);
        } catch (e) {
          reject(new Error('Error parseando JSON'));
        }
      });
    });
  });
}

/**
 * Loop principal
 */
async function main() {
  logError('Native Messaging Host iniciado');

  // Configurar stdin para modo binario
  process.stdin.setEncoding(null);

  // Leer mensajes continuamente
  let headerBuffer = Buffer.alloc(4);
  let headerBytesRead = 0;
  let messageBuffer = null;
  let messageBytesRead = 0;
  let messageLength = 0;

  process.stdin.on('data', async (chunk) => {
    let offset = 0;

    while (offset < chunk.length) {
      // Leer header
      if (headerBytesRead < 4) {
        const bytesToCopy = Math.min(4 - headerBytesRead, chunk.length - offset);
        chunk.copy(headerBuffer, headerBytesRead, offset, offset + bytesToCopy);
        headerBytesRead += bytesToCopy;
        offset += bytesToCopy;

        if (headerBytesRead === 4) {
          messageLength = headerBuffer.readUInt32LE(0);
          messageBuffer = Buffer.alloc(messageLength);
          messageBytesRead = 0;
        }
      }

      // Leer mensaje
      if (headerBytesRead === 4 && messageBytesRead < messageLength) {
        const bytesToCopy = Math.min(messageLength - messageBytesRead, chunk.length - offset);
        chunk.copy(messageBuffer, messageBytesRead, offset, offset + bytesToCopy);
        messageBytesRead += bytesToCopy;
        offset += bytesToCopy;

        if (messageBytesRead === messageLength) {
          // Mensaje completo recibido
          try {
            const message = JSON.parse(messageBuffer.toString());
            const response = await processCommand(message);
            sendMessage(response);
          } catch (error) {
            logError('Error procesando mensaje:', error);
            sendMessage({
              requestId: null,
              success: false,
              error: error.message
            });
          }

          // Reset para siguiente mensaje
          headerBytesRead = 0;
          messageBytesRead = 0;
        }
      }
    }
  });

  process.stdin.on('end', () => {
    logError('stdin cerrado, terminando');
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logError('Error no capturado:', error);
    process.exit(1);
  });
}

// Iniciar
main().catch((error) => {
  logError('Error fatal:', error);
  process.exit(1);
});
