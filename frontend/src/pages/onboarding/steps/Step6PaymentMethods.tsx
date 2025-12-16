import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step6Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

const defaultMethods = [
  { code: 'CASH', name: 'Efectivo' },
  { code: 'DEBIT', name: 'Tarjeta de Débito' },
  { code: 'CREDIT', name: 'Tarjeta de Crédito' },
  { code: 'TRANSFER', name: 'Transferencia' },
  { code: 'CHECK', name: 'Cheque' },
  { code: 'MP', name: 'Mercado Pago' },
  { code: 'CC', name: 'Cuenta Corriente' }
]

export function Step6PaymentMethods({ wizardData, onUpdate }: Step6Props) {
  // Inicializar con todos los métodos seleccionados por defecto si no hay selección
  const selectedMethods = wizardData.paymentMethods?.length
    ? wizardData.paymentMethods
    : defaultMethods.map((m) => m.code)

  const toggleMethod = (code: string) => {
    const newMethods = selectedMethods.includes(code)
      ? selectedMethods.filter((m) => m !== code)
      : [...selectedMethods, code]
    onUpdate({ paymentMethods: newMethods })
  }

  return (
    <WizardStep
      title="Formas de Pago"
      description="Configura los métodos de pago disponibles"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      }
      tip="Debes tener al menos una forma de pago habilitada."
    >
      <div className="grid md:grid-cols-2 gap-3">
        {defaultMethods.map((method) => (
          <div
            key={method.code}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedMethods.includes(method.code)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() => toggleMethod(method.code)}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedMethods.includes(method.code)}
                onChange={() => {}}
              />
              <span className="font-medium text-gray-900">{method.name}</span>
            </div>
          </div>
        ))}
      </div>
    </WizardStep>
  )
}
