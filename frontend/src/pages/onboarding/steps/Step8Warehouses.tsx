import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step8Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export function Step8Warehouses({ wizardData, onUpdate }: Step8Props) {
  const warehouses = wizardData.warehouses || [
    {
      code: 'MAIN',
      name: 'Almacén Principal',
      address: '',
      allowNegativeStock: false,
      isDefault: true
    }
  ]

  const updateWarehouse = (index: number, field: string, value: any) => {
    const newWarehouses = [...warehouses]
    newWarehouses[index] = { ...newWarehouses[index], [field]: value }
    onUpdate({ warehouses: newWarehouses })
  }

  return (
    <WizardStep
      title="Almacenes"
      description="Configura los depósitos para control de stock"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      }
      tip="Al menos un almacén es requerido. Puedes agregar más luego."
    >
      <div className="space-y-4">
        {warehouses.map((warehouse, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                <input
                  type="text"
                  value={warehouse.code}
                  onChange={(e) => updateWarehouse(index, 'code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={warehouse.name}
                  onChange={(e) => updateWarehouse(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección (opcional)
              </label>
              <input
                type="text"
                value={warehouse.address}
                onChange={(e) => updateWarehouse(index, 'address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={warehouse.allowNegativeStock}
                  onChange={(e) => updateWarehouse(index, 'allowNegativeStock', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Permitir stock negativo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={warehouse.isDefault}
                  onChange={(e) => updateWarehouse(index, 'isDefault', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Almacén por defecto</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </WizardStep>
  )
}
