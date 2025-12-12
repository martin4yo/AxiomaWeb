/**
 * Popup de configuración del Axioma Print Manager
 */

const statusEl = document.getElementById('status');
const printerSelectEl = document.getElementById('printerSelect');
const saveBtnEl = document.getElementById('saveBtn');
const messageEl = document.getElementById('message');
const installMessageEl = document.getElementById('installMessage');
const downloadLinkEl = document.getElementById('downloadLink');

let connected = false;

/**
 * Verificar estado de conexión
 */
function checkStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (chrome.runtime.lastError) {
      showDisconnected('Error de comunicación');
      return;
    }

    if (response && response.connected) {
      showConnected(response.data);
      loadPrinters();
    } else {
      showDisconnected(response?.error || 'No conectado');
    }
  });
}

/**
 * Mostrar estado conectado
 */
function showConnected(data) {
  connected = true;
  statusEl.className = 'status connected';
  statusEl.textContent = '✅ Conectado - Print Manager funcionando';
  installMessageEl.style.display = 'none';
  saveBtnEl.disabled = false;
}

/**
 * Mostrar estado desconectado
 */
function showDisconnected(error) {
  connected = false;
  statusEl.className = 'status disconnected';
  statusEl.textContent = `❌ Desconectado - ${error}`;
  installMessageEl.style.display = 'block';
  saveBtnEl.disabled = true;

  printerSelectEl.innerHTML = '<option value="">Print Manager no disponible</option>';
}

/**
 * Cargar lista de impresoras
 */
function loadPrinters() {
  chrome.runtime.sendMessage({ action: 'getPrinters' }, (response) => {
    if (response && response.success && response.printers) {
      printerSelectEl.innerHTML = response.printers
        .map(printer => `<option value="${printer.name}">${printer.name}</option>`)
        .join('');

      // Cargar impresora guardada
      chrome.runtime.sendMessage({ action: 'getConfig' }, (configResponse) => {
        if (configResponse && configResponse.printerName) {
          printerSelectEl.value = configResponse.printerName;
        }
      });
    } else {
      printerSelectEl.innerHTML = '<option value="">Error cargando impresoras</option>';
    }
  });
}

/**
 * Guardar configuración
 */
saveBtnEl.addEventListener('click', () => {
  const printerName = printerSelectEl.value;

  if (!printerName) {
    showMessage('Selecciona una impresora', 'error');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'configure', printerName },
    (response) => {
      if (response && response.success) {
        showMessage('✅ Configuración guardada', 'success');
      } else {
        showMessage('❌ Error guardando configuración', 'error');
      }
    }
  );
});

/**
 * Mostrar mensaje
 */
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
}

/**
 * Link de descarga
 */
downloadLinkEl.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({
    url: 'https://github.com/martin4yo/AxiomaWeb/releases'
  });
});

// Verificar estado al abrir
checkStatus();

// Actualizar estado cada 5 segundos
setInterval(checkStatus, 5000);
