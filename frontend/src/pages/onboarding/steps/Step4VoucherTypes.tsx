import { useEffect, useMemo } from 'react'
import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'
import { useAuthStore } from '../../../stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../services/api'

interface Step4Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

const allVoucherOptions = [
  { code: 'FA', name: 'Factura A', description: 'Para clientes Responsables Inscriptos', group: 'A' },
  { code: 'FB', name: 'Factura B', description: 'Para clientes Consumidor Final, Monotributo, Exento', group: 'B' },
  { code: 'FC', name: 'Factura C', description: 'Para todos los clientes (Monotributistas)', group: 'C' },
  { code: 'NCA', name: 'Nota de Crédito A', description: 'Anula o corrige Factura A', group: 'A' },
  { code: 'NCB', name: 'Nota de Crédito B', description: 'Anula o corrige Factura B', group: 'B' },
  { code: 'NCC', name: 'Nota de Crédito C', description: 'Anula o corrige Factura C', group: 'C' },
  { code: 'NDA', name: 'Nota de Débito A', description: 'Adicional a Factura A', group: 'A' },
  { code: 'NDB', name: 'Nota de Débito B', description: 'Adicional a Factura B', group: 'B' },
  { code: 'NDC', name: 'Nota de Débito C', description: 'Adicional a Factura C', group: 'C' },
  { code: 'PRE', name: 'Presupuesto', description: 'Cotización o presupuesto (sin validez fiscal)', group: 'PRE' }
]

export function Step4VoucherTypes({ wizardData, onUpdate }: Step4Props) {
  const { currentTenant } = useAuthStore()

  // Obtener condiciones de IVA para determinar cuál seleccionó el tenant
  const { data: vatConditions } = useQuery({
    queryKey: [currentTenant?.slug, 'vat-conditions'],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant?.slug}/vat-conditions`)
      return response.data
    },
    enabled: !!currentTenant?.slug
  })

  // Determinar la condición de IVA seleccionada en el paso 2
  const selectedVatCondition = useMemo(() => {
    if (!vatConditions || !wizardData.vatConditionId) return null
    return vatConditions.find((vc: any) => vc.id === wizardData.vatConditionId)
  }, [vatConditions, wizardData.vatConditionId])

  // Filtrar comprobantes según condición de IVA del tenant
  const voucherOptions = useMemo(() => {
    if (!selectedVatCondition) return allVoucherOptions

    const code = selectedVatCondition.code
    if (code === 'MT') {
      // Monotributista: Solo C y Presupuesto
      return allVoucherOptions.filter(v => v.group === 'C' || v.group === 'PRE')
    } else if (code === 'RI') {
      // Responsable Inscripto: A, B y Presupuesto
      return allVoucherOptions.filter(v => v.group === 'A' || v.group === 'B' || v.group === 'PRE')
    } else if (code === 'EX') {
      // Exento: Solo B y Presupuesto
      return allVoucherOptions.filter(v => v.group === 'B' || v.group === 'PRE')
    }
    return allVoucherOptions
  }, [selectedVatCondition])

  const selectedTypes = wizardData.voucherTypes || []

  // useEffect para inicializar los valores por defecto al montar o cambiar las opciones
  useEffect(() => {
    if (voucherOptions.length > 0) {
      // Filtrar los seleccionados actuales para mantener solo los válidos
      const validCodes = voucherOptions.map(v => v.code)
      const currentValid = selectedTypes.filter(code => validCodes.includes(code))

      // Si no hay selección o la selección actual no tiene comprobantes válidos, seleccionar todos
      if (currentValid.length === 0) {
        onUpdate({ voucherTypes: validCodes })
      } else if (currentValid.length !== selectedTypes.length) {
        // Si hay diferencia, actualizar para quitar los inválidos
        onUpdate({ voucherTypes: currentValid })
      }
    }
  }, [voucherOptions])

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
              ⚠️ Debes seleccionar al menos un tipo de factura
            </p>
          </div>
        )}

        {selectedVatCondition?.code === 'MT' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Monotributista:</strong> Solo puedes emitir comprobantes tipo C (Factura C, NC C, ND C) y Presupuestos.
            </p>
          </div>
        )}

        {selectedVatCondition?.code === 'RI' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Responsable Inscripto:</strong> Emitirás Factura A para clientes RI, y Factura B para Consumidor Final, Monotributo y Exento.
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
