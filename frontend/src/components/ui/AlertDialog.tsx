import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'error' | 'warning' | 'info' | 'success'
  buttonText?: string
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Aceptar'
}: AlertDialogProps) {
  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          button: 'bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
        }
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-500" />,
          button: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {typeStyles.icon}
            <h2 className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${typeStyles.button}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
