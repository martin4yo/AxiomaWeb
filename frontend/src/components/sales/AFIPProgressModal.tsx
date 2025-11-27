import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

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
  saleResult?: {
    sale: any
    caeInfo?: any
    caeError?: any
    payments?: Array<{
      paymentMethodName: string
      amount: number
    }>
  }
}

export function AFIPProgressModal({
  isOpen,
  steps,
  onClose,
  canClose,
  saleResult
}: AFIPProgressModalProps) {
  // Listen for ENTER key to close modal
  useEffect(() => {
    if (!isOpen || !canClose || !onClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, canClose, onClose])

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
              {saleResult ? 'Venta Registrada' : 'Facturación Electrónica AFIP'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {saleResult ? (
            // Layout de una columna cuando hay resultado final
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-green-600 mb-4 text-center">✓ Comprobante Generado</h3>

              <div className="space-y-3">
                <div className="border-b pb-2">
                  <div className="text-sm text-gray-600">Número de Venta</div>
                  <div className="text-xl font-bold">{saleResult.sale?.saleNumber}</div>
                </div>

                <div className="border-b pb-2">
                  <div className="text-sm text-gray-600">Tipo de Comprobante</div>
                  <div className="text-lg font-semibold">{saleResult.sale?.voucherType || 'Ticket'}</div>
                </div>

                <div className="pb-2">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${Number(saleResult.sale?.totalAmount || 0).toFixed(2)}
                  </div>
                </div>

                {/* Formas de Pago */}
                {saleResult.payments && saleResult.payments.length > 0 && (
                  <div className="mt-4 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 border-2 border-blue-400 rounded-xl p-5 shadow-lg">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-blue-900">Formas de Pago</h4>
                    </div>
                    <div className="space-y-2">
                      {saleResult.payments.map((payment, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-semibold text-gray-700">{payment.paymentMethodName}</div>
                            </div>
                            <div className="text-xl font-bold text-blue-900">${payment.amount.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estado CAE - Simple */}
                {saleResult.caeInfo && (
                  <div className="mt-4 bg-green-50 border-2 border-green-400 rounded-lg p-4 flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-green-800">CAE Autorizado por AFIP</div>
                      <div className="text-sm text-green-700">Comprobante válido electrónicamente</div>
                    </div>
                  </div>
                )}

                {saleResult.caeError && (
                  <div className="mt-4 bg-red-50 border-2 border-red-400 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-red-800">Error al solicitar CAE</div>
                        <div className="text-sm text-red-700 mt-1">{saleResult.caeError.message}</div>
                        {saleResult.caeError.detail && (
                          <div className="text-xs text-red-600 mt-2 font-mono bg-red-100 p-2 rounded border border-red-300">
                            {saleResult.caeError.detail}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 mt-2">
                          La venta se guardó correctamente pero sin CAE. Puede resincronizar más tarde.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Layout original cuando no hay resultado (solo pasos)
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
                      <div className={`mt-2 text-xs font-mono p-3 rounded border ${
                        step.status === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                        step.status === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                        'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        {step.detail.split('\n').map((line, idx) => (
                          <div key={idx} className="mb-1 last:mb-0">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {canClose && onClose && (
          <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              autoFocus
              className="w-full px-4 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {saleResult ? 'ACEPTAR [ENTER]' : 'Cerrar [ENTER]'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
