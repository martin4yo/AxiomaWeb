import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step7Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

const defaultCategories = [
  { code: 'PROD', name: 'Productos' },
  { code: 'SERV', name: 'Servicios' },
  { code: 'INSU', name: 'Insumos' },
  { code: 'REPR', name: 'Repuestos' },
  { code: 'OTRO', name: 'Otros' }
]

export function Step7ProductCategories({ wizardData, onUpdate }: Step7Props) {
  // Inicializar con todas las categorías seleccionadas por defecto si no hay selección
  const selectedCategories = wizardData.categories?.length
    ? wizardData.categories
    : defaultCategories.map((c) => c.code)

  const toggleCategory = (code: string) => {
    const newCategories = selectedCategories.includes(code)
      ? selectedCategories.filter((c) => c !== code)
      : [...selectedCategories, code]
    onUpdate({ categories: newCategories })
  }

  return (
    <WizardStep
      title="Categorías de Productos"
      description="Organiza tus productos en categorías"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      }
      tip="Al menos una categoría debe estar seleccionada."
    >
      <div className="grid md:grid-cols-2 gap-3">
        {defaultCategories.map((category) => (
          <div
            key={category.code}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedCategories.includes(category.code)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() => toggleCategory(category.code)}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.code)}
                onChange={() => {}}
              />
              <span className="font-medium text-gray-900">{category.name}</span>
            </div>
          </div>
        ))}
      </div>
    </WizardStep>
  )
}
