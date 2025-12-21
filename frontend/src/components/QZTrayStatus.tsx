/**
 * Componente de Estado de QZ Tray
 *
 * Muestra el estado de conexión con QZ Tray y permite configurar impresoras
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Printer } from 'lucide-react';
import { qzTrayService } from '../services/qz-tray';
import { useDialog } from '../hooks/useDialog';

export function QZTrayStatus() {
  const dialog = useDialog();
  const [status, setStatus] = useState<{
    connected: boolean;
    version?: string;
    printerName?: string;
  }>({
    connected: false
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Verificar estado al montar
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const currentStatus = await qzTrayService.getStatus();
      setStatus(currentStatus);

      if (currentStatus.connected) {
        loadPrinters();
      }
    } catch (error) {
      console.error('Error verificando QZ Tray:', error);
      setStatus({ connected: false });
    }
  };

  const loadPrinters = async () => {
    try {
      const availablePrinters = await qzTrayService.listPrinters();
      setPrinters(availablePrinters);
    } catch (error) {
      console.error('Error listando impresoras:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await qzTrayService.initialize();
      await checkStatus();
    } catch (error: any) {
      dialog.error(error.message || 'Error conectando a QZ Tray');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrinter = async () => {
    if (!selectedPrinter) {
      dialog.warning('Selecciona una impresora');
      return;
    }

    setLoading(true);
    try {
      await qzTrayService.configure(selectedPrinter, 'simple');
      await checkStatus();
      setShowConfig(false);
      dialog.success('Impresora configurada correctamente');
    } catch (error) {
      dialog.error('Error configurando impresora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              status.connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <div>
            <h3 className="font-semibold text-gray-900">QZ Tray</h3>
            <p className="text-sm text-gray-500">
              {status.connected
                ? `Conectado${status.version ? ` (v${status.version})` : ''}`
                : 'Desconectado'}
            </p>
          </div>
        </div>

        {!status.connected && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        )}
      </div>

      {status.connected && (
        <>
          {status.printerName && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-900 flex items-center gap-1">
                <Printer className="h-4 w-4" /> Impresora configurada: {status.printerName}
              </p>
            </div>
          )}

          {!showConfig && (
            <button
              onClick={() => setShowConfig(true)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {status.printerName ? 'Cambiar Impresora' : 'Configurar Impresora'}
            </button>
          )}

          {showConfig && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar impresora térmica:
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar --</option>
                  {printers.map((printer) => (
                    <option key={printer} value={printer}>
                      {printer}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePrinter}
                  disabled={!selectedPrinter || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!status.connected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-900 flex items-center gap-1 flex-wrap">
            <AlertTriangle className="h-4 w-4" /> QZ Tray no está conectado.{' '}
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Descargar e instalar QZ Tray
            </a>
          </p>
        </div>
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  );
}
