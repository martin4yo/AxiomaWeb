import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface ErrorPageProps {
  onRetry?: () => void
}

export default function ErrorPage({ onRetry }: ErrorPageProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-orange-400 to-red-500 rounded-full p-6">
                <ExclamationTriangleIcon className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            ¡Ups! Problemas Técnicos
          </h1>

          {/* Message */}
          <div className="space-y-4 mb-8">
            <p className="text-lg text-gray-600">
              Estamos experimentando dificultades técnicas temporales.
            </p>
            <p className="text-sm text-gray-500">
              Nuestro equipo está trabajando para resolver el problema lo antes posible.
              Por favor, intente nuevamente en unos momentos.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Consejo:</strong> Si el problema persiste, por favor contacte al administrador del sitio.
              </p>
            </div>
          </div>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Reintentar
          </button>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Código de error: CONN_ERROR
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            ¿Necesita ayuda urgente?{' '}
            <a href="mailto:soporte@axioma.com" className="text-blue-600 hover:text-blue-700 font-medium">
              Contáctenos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
