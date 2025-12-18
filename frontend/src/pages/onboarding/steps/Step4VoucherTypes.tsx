import { useEffect } from 'react'
import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step4Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

const voucherOptions = [
  { code: 'FA', name: 'Factura A', description: 'Para Responsables Inscriptos' },
  { code: 'FB', name: 'Factura B', description: 'Para Monotributo o Consumidor Final' },
  { code: 'FC', name: 'Factura C', description: 'Para operaciones exentas' },
  { code: 'NCA', name: 'Nota de Crédito A', description: 'Anula o corrige Factura A' },
  { code: 'NCB', name: 'Nota de Crédito B', description: 'Anula o corrige Factura B' },
  { code: 'NCC', name: 'Nota de Crédito C', description: 'Anula o corrige Factura C' },
  { code: 'NDA', name: 'Nota de Débito A', description: 'Adicional a Factura A' },
  { code: 'NDB', name: 'Nota de Débito B', description: 'Adicional a Factura B' },
  { code: 'NDC', name: 'Nota de Débito C', description: 'Adicional a Factura C' },
  { code: 'PRE', name: 'Presupuesto', description: 'Cotización o presupuesto' }
]

export function Step4VoucherTypes({ wizardData, onUpdate }: Step4Props) {
  // Inicializar con todos los tipos seleccionados por defecto si no hay selección
  const selectedTypes = wizardData.voucherTypes || []

  // useEffect para inicializar los valores por defecto al montar el componente
  useEffect(() => {
    if (!wizardData.voucherTypes || wizardData.voucherTypes.length === 0) {
      const allCodes = voucherOptions.map(v => v.code)
      onUpdate({ voucherTypes: allCodes })
    }
  }, [])

  const toggleVoucherType = (code: string) => {
    const newTypes = selectedTypes.includes(code)
      ? selectedTypes.filter((t) => t !== code)
      : [...selectedTypes, code]

    onUpdate({ voucherTypes: newTypes })
  }

  const hasFacturaSelected = selectedTypes.some((t) => ['FA', 'FB', 'FC'].includes(t))

  return (
    <WizardStep
      title="Tipos de Comprobantes"
      description="Selecciona qué tipos de comprobantes vas a emitir"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      tip="Debes seleccionar al menos un tipo de factura (A, B o C)."
    >
      <div className="space-y-3">
        {voucherOptions.map((voucher) => (
          <div
            key={voucher.code}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedTypes.includes(voucher.code)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() => toggleVoucherType(voucher.code)}
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedTypes.includes(voucher.code)}
                onChange={() => {}}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{voucher.name}</h4>
                  <span className="text-xs font-mono text-gray-500">{voucher.code}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
              </div>
            </div>
          </div>
        ))}

        {!hasFacturaSelected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Debes seleccionar al menos un tipo de factura (A, B o C)
            </p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Tip:</strong> Si no estás seguro, puedes seleccionar todos. Luego podrás
            activar o desactivar los que no uses.
          </p>
        </div>
      </div>
    </WizardStep>
  )
}
