/**
 * Servicio de Impresión Térmica Local
 *
 * Conecta con un servicio de impresión local corriendo en localhost:5555
 * Compatible con comandos ESC/POS raw
 */

const PRINT_URL = 'http://localhost:5555';

export interface PrintServiceStatus {
  available: boolean;
  error?: string;
}

export interface PrintResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Verificar si el servicio de impresión está corriendo
 */
export async function isServiceRunning(): Promise<boolean> {
  try {
    const res = await fetch(PRINT_URL, {
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtener lista de impresoras disponibles
 * Retorna un array de strings con los nombres de las impresoras
 */
export async function getPrinters(): Promise<string[]> {
  try {
    const res = await fetch(`${PRINT_URL}/printers`);

    if (!res.ok) {
      throw new Error('No se pudo obtener lista de impresoras');
    }

    const data = await res.json();
    // El servicio retorna { success, printers: string[], defaultPrinter }
    return data.printers || [];
  } catch (error) {
    console.error('Error obteniendo impresoras:', error);
    return [];
  }
}

/**
 * Imprimir comandos ESC/POS raw
 */
export async function printRaw(
  printerName: string,
  data: string | Array<{ type: string; data: string }>
): Promise<PrintResponse> {
  try {
    // Convertir array de comandos a string si es necesario
    let rawData: string;

    if (Array.isArray(data)) {
      // Si viene en formato [{type: 'raw', data: '...'}], extraer solo el data
      rawData = data.map(cmd => cmd.data).join('');
    } else {
      rawData = data;
    }

    const res = await fetch(`${PRINT_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName,
        data: rawData,
        isBase64: false,
        codePage: 850
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Error HTTP ${res.status}`
      };
    }

    const result = await res.json();
    return {
      success: true,
      message: result.message || 'Impreso correctamente'
    };
  } catch (error: any) {
    console.error('Error imprimiendo:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión con servicio de impresión'
    };
  }
}

/**
 * Imprimir ticket de prueba
 */
export async function printTest(printerName: string): Promise<PrintResponse> {
  try {
    const res = await fetch(`${PRINT_URL}/print/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Error HTTP ${res.status}`
      };
    }

    const result = await res.json();
    return {
      success: true,
      message: result.message || 'Ticket de prueba enviado'
    };
  } catch (error: any) {
    console.error('Error imprimiendo test:', error);
    return {
      success: false,
      error: error.message || 'Error de conexión con servicio de impresión'
    };
  }
}

/**
 * Verificar estado del servicio
 */
export async function getServiceStatus(): Promise<PrintServiceStatus> {
  const available = await isServiceRunning();

  if (!available) {
    return {
      available: false,
      error: 'Servicio de impresión no disponible en localhost:5555'
    };
  }

  return { available: true };
}
