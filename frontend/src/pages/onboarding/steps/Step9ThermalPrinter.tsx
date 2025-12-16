import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step9Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export function Step9ThermalPrinter({ wizardData, onUpdate }: Step9Props) {
  return (
    <WizardStep
      title="Impresora Térmica (QZ Tray)"
      description="Configura la impresión de tickets térmicos"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
      }
      tip="Este paso es completamente opcional. Puedes configurarlo más adelante."
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">¿Qué es QZ Tray?</h4>
          <p className="text-sm text-blue-700 mb-3">
            QZ Tray es una aplicación gratuita que permite imprimir directamente desde el navegador
            a impresoras térmicas. Es necesaria para imprimir tickets en formato térmico (58mm o
            80mm).
          </p>
          <a
            href="https://qz.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Descargar QZ Tray →
          </a>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Estado de conexión</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              No configurado
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la impresora
              </label>
              <input
                type="text"
                value={wizardData.thermalPrinterName || ''}
                onChange={(e) => onUpdate({ thermalPrinterName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TM-T20"
              />
            </div>

            <button
              type="button"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Probar impresión
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Nota:</strong> Si no tienes una impresora térmica, puedes omitir este paso. El
            sistema también permite imprimir en formato A4 o exportar a PDF.
          </p>
        </div>
      </div>
    </WizardStep>
  )
}
