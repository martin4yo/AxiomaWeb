/**
 * Axioma Print Manager Extension - Content Script
 *
 * Intercepta las peticiones de impresión y las redirige al Native Host
 */

console.log('Axioma Print Manager Extension cargada');

// Interceptar fetch a localhost:9100
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [resource, config] = args;

  // Detectar peticiones al Print Manager local
  if (resource && typeof resource === 'string' &&
      (resource.includes('localhost:9100') || resource.includes('127.0.0.1:9100'))) {

    console.log('Interceptando petición de impresión:', resource);

    // Obtener datos del body
    let printData = null;
    if (config && config.body) {
      try {
        printData = JSON.parse(config.body);
      } catch (e) {
        console.error('Error parseando datos de impresión:', e);
      }
    }

    if (printData && printData.data) {
      // Enviar al background script para que lo maneje el Native Host
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'print', data: printData.data },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error comunicándose con extensión:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response.success) {
              // Simular respuesta exitosa del Print Manager
              resolve(new Response(
                JSON.stringify({
                  success: true,
                  message: 'Impreso correctamente',
                  method: 'extension',
                  printer: response.data.printer || 'POS-80'
                }),
                {
                  status: 200,
                  statusText: 'OK',
                  headers: { 'Content-Type': 'application/json' }
                }
              ));
            } else {
              // Mostrar error al usuario si el Native Host no está instalado
              if (response.needsInstall) {
                showInstallNotification();
              }

              reject(new Error(response.error || 'Error al imprimir'));
            }
          }
        );
      });
    }
  }

  // Si no es una petición de impresión, usar fetch original
  return originalFetch.apply(this, args);
};

/**
 * Mostrar notificación para instalar el Native Host
 */
function showInstallNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 400px;
  `;

  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">
      Print Manager no instalado
    </div>
    <div style="margin-bottom: 10px; font-size: 14px;">
      Para imprimir automáticamente, necesitas instalar el Print Manager en tu PC.
    </div>
    <button onclick="this.parentElement.remove()" style="
      background: white;
      color: #ff6b6b;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    ">
      Cerrar
    </button>
  `;

  document.body.appendChild(notification);

  // Auto-cerrar después de 10 segundos
  setTimeout(() => {
    notification.remove();
  }, 10000);
}

// Inyectar indicador de estado en la página
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response && response.connected) {
      console.log('✅ Axioma Print Manager: Conectado');

      // Agregar indicador visual (opcional)
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #51cf66;
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      indicator.textContent = '🖨️ Print Manager Activo';
      document.body.appendChild(indicator);

      // Ocultar después de 3 segundos
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s';
        setTimeout(() => indicator.remove(), 300);
      }, 3000);
    } else {
      console.warn('⚠️ Axioma Print Manager: No conectado');
    }
  });
});
