/**
 * Axioma Print Manager Extension - Background Service Worker
 *
 * Maneja la comunicación con el Native Messaging Host para impresión térmica
 */

const NATIVE_HOST_NAME = 'com.axiomaweb.printmanager';
let nativePort = null;
let pendingRequests = new Map();
let requestId = 0;

// Conectar con el Native Host al iniciar
chrome.runtime.onStartup.addListener(() => {
  connectToNativeHost();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Axioma Print Manager instalado');
  connectToNativeHost();
});

/**
 * Conectar con el Native Messaging Host
 */
function connectToNativeHost() {
  if (nativePort) {
    nativePort.disconnect();
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((message) => {
      console.log('Mensaje recibido del native host:', message);

      // Resolver la promesa correspondiente
      if (message.requestId && pendingRequests.has(message.requestId)) {
        const { resolve, reject } = pendingRequests.get(message.requestId);

        if (message.success) {
          resolve(message);
        } else {
          reject(new Error(message.error || 'Error desconocido'));
        }

        pendingRequests.delete(message.requestId);
      }
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('Desconectado del native host');
      const lastError = chrome.runtime.lastError;

      if (lastError) {
        console.error('Error de conexión:', lastError.message);
      }

      nativePort = null;

      // Rechazar todas las peticiones pendientes
      pendingRequests.forEach(({ reject }) => {
        reject(new Error('Conexión perdida con el Print Manager'));
      });
      pendingRequests.clear();

      // Reintentar conexión después de 5 segundos
      setTimeout(connectToNativeHost, 5000);
    });

    console.log('Conectado al native host');
  } catch (error) {
    console.error('Error conectando al native host:', error);
  }
}

/**
 * Enviar comando al Native Host
 */
function sendToNativeHost(command, data) {
  return new Promise((resolve, reject) => {
    if (!nativePort) {
      reject(new Error('No hay conexión con el Print Manager. Asegúrate de que esté instalado.'));
      return;
    }

    const id = ++requestId;
    const message = {
      requestId: id,
      command,
      data
    };

    pendingRequests.set(id, { resolve, reject });

    // Timeout de 30 segundos
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Timeout esperando respuesta del Print Manager'));
      }
    }, 30000);

    try {
      nativePort.postMessage(message);
    } catch (error) {
      pendingRequests.delete(id);
      reject(error);
    }
  });
}

/**
 * Escuchar mensajes desde content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensaje recibido:', request);

  if (request.action === 'print') {
    // Imprimir ticket térmico
    sendToNativeHost('print', request.data)
      .then(response => {
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('Error imprimiendo:', error);
        sendResponse({
          success: false,
          error: error.message,
          needsInstall: error.message.includes('No hay conexión')
        });
      });

    return true; // Mantener el canal abierto para respuesta asíncrona
  }

  if (request.action === 'getStatus') {
    // Verificar estado de conexión
    sendToNativeHost('status', {})
      .then(response => {
        sendResponse({ success: true, connected: true, data: response });
      })
      .catch(error => {
        sendResponse({
          success: false,
          connected: false,
          error: error.message
        });
      });

    return true;
  }

  if (request.action === 'getPrinters') {
    // Obtener lista de impresoras
    sendToNativeHost('listPrinters', {})
      .then(response => {
        sendResponse({ success: true, printers: response.printers });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (request.action === 'configure') {
    // Guardar configuración
    chrome.storage.local.set({ printerName: request.printerName }, () => {
      sendResponse({ success: true });
    });

    return true;
  }

  if (request.action === 'getConfig') {
    // Obtener configuración
    chrome.storage.local.get(['printerName'], (result) => {
      sendResponse({
        success: true,
        printerName: result.printerName || 'POS-80'
      });
    });

    return true;
  }
});

// Iniciar conexión
connectToNativeHost();
