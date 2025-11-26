import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

interface AFIPProgressStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'success' | 'error' | 'warning'
  message?: string
  detail?: string
}

interface AFIPProgressModalProps {
  isOpen: boolean
  steps: AFIPProgressStep[]
  onClose?: () => void
  canClose: boolean
}

export function AFIPProgressModal({
  isOpen,
  steps,
  onClose,
  canClose
}: AFIPProgressModalProps) {
  if (!isOpen) return null

  const getStepIcon = (status: AFIPProgressStep['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />
      case 'pending':
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
    }
  }

  const getStepColor = (status: AFIPProgressStep['status']) => {
    switch (status) {
      case 'loading':
        return 'text-blue-700 bg-blue-50'
      case 'success':
        return 'text-green-700 bg-green-50'
      case 'error':
        return 'text-red-700 bg-red-50'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50'
      case 'pending':
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Facturación Electrónica AFIP
            </h2>
          </div>
        </div>

        {/* Content - Progress Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start space-x-4 p-4 rounded-lg border ${
                  step.status === 'pending' ? 'border-gray-200' :
                  step.status === 'loading' ? 'border-blue-200' :
                  step.status === 'success' ? 'border-green-200' :
                  step.status === 'error' ? 'border-red-200' :
                  'border-yellow-200'
                } ${getStepColor(step.status)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {step.label}
                    </p>
                    {step.status === 'loading' && (
                      <span className="text-xs text-blue-600 font-medium">
                        Procesando...
                      </span>
                    )}
                  </div>
                  {step.message && (
                    <p className={`mt-1 text-sm ${
                      step.status === 'error' ? 'text-red-600' :
                      step.status === 'warning' ? 'text-yellow-600' :
                      step.status === 'success' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {step.message}
                    </p>
                  )}
                  {step.detail && (
                    <p className="mt-1 text-xs font-mono text-gray-500 bg-gray-100 p-2 rounded">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {canClose && onClose && (
          <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
