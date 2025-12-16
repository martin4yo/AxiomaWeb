interface WizardNavigationProps {
  currentStep?: number
  totalSteps?: number
  onPrevious: () => void
  onNext: () => void
  onSkip?: () => void
  canSkip?: boolean
  isFirstStep?: boolean
  isLastStep?: boolean
  nextLabel?: string
  previousLabel?: string
  skipLabel?: string
  isNextDisabled?: boolean
}

export function WizardNavigation({
  onPrevious,
  onNext,
  onSkip,
  canSkip = false,
  isFirstStep = false,
  isLastStep = false,
  nextLabel = 'Siguiente',
  previousLabel = 'Anterior',
  skipLabel = 'Omitir',
  isNextDisabled = false
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
      {/* Botón Omitir (izquierda) */}
      <div className="flex-1">
        {canSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            {skipLabel}
          </button>
        )}
      </div>

      {/* Botones de navegación (derecha) */}
      <div className="flex items-center space-x-3">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            ← {previousLabel}
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${
              isNextDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isLastStep ? 'Finalizar' : `${nextLabel} →`}
        </button>
      </div>
    </div>
  )
}
