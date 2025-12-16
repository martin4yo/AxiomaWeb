import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step5Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

const templateOptions = [
  { value: 'thermal-58mm', label: 'Térmico 58mm' },
  { value: 'thermal-80mm', label: 'Térmico 80mm' },
  { value: 'a4-legal', label: 'A4 Legal' },
  { value: 'a4-quote', label: 'A4 Presupuesto' }
]

export function Step5PrintConfig({ wizardData, onUpdate }: Step5Props) {
  const selectedTypes = wizardData.voucherTypes || []
  const printConfigs = wizardData.printConfigs || {}
  const autoPrint = wizardData.autoPrint || {}

  const handleTemplateChange = (voucherType: string, template: string) => {
    onUpdate({
      printConfigs: { ...printConfigs, [voucherType]: template }
    })
  }

  const handleAutoPrintChange = (voucherType: string, enabled: boolean) => {
    onUpdate({
      autoPrint: { ...autoPrint, [voucherType]: enabled }
    })
  }

  return (
    <WizardStep
      title="Configuración de Impresión"
      description="Define cómo se imprimirán tus comprobantes"
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
      tip="Puedes cambiar estos templates más adelante desde la configuración."
    >
      <div className="space-y-4">
        {selectedTypes.map((typeCode) => (
          <div key={typeCode} className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">{typeCode}</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  value={printConfigs[typeCode] || templateOptions[0].value}
                  onChange={(e) => handleTemplateChange(typeCode, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrint[typeCode] || false}
                    onChange={(e) => handleAutoPrintChange(typeCode, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Imprimir automáticamente</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WizardStep>
  )
}
