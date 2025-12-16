interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
}

export function WizardProgress({ currentStep, totalSteps, stepLabels }: WizardProgressProps) {
  const defaultLabels = [
    'Bienvenida',
    'Datos',
    'AFIP',
    'Tipos',
    'Impresión',
    'Pagos',
    'Categorías',
    'Almacenes',
    'QZ Tray',
    'Usuarios',
    'Resumen'
  ]

  const labels = stepLabels || defaultLabels

  return (
    <div className="w-full py-6">
      {/* Barra de progreso principal */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">
          Paso {currentStep} de {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((currentStep / totalSteps) * 100)}% completado
        </span>
      </div>

      {/* Barra visual */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Indicadores de pasos - Solo en pantallas grandes */}
      <div className="hidden lg:flex items-center justify-between">
        {labels.map((label, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              {/* Círculo del paso */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Label del paso */}
              <span
                className={`
                  mt-2 text-xs text-center
                  ${isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-500'}
                `}
              >
                {label}
              </span>

              {/* Línea conectora (excepto el último) */}
              {index < totalSteps - 1 && (
                <div
                  className={`
                    hidden lg:block absolute w-full h-0.5 top-5
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                  style={{
                    left: '50%',
                    width: `${100 / (totalSteps - 1)}%`,
                    zIndex: -1
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Vista móvil - Solo paso actual */}
      <div className="lg:hidden text-center">
        <div className="inline-flex items-center space-x-2 text-sm">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {currentStep}
          </div>
          <span className="font-medium text-gray-700">{labels[currentStep - 1]}</span>
        </div>
      </div>
    </div>
  )
}
