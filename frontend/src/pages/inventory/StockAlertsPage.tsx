import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function StockAlertsPage() {
  const { currentTenant } = useAuthStore()

  // Fetch stock summary
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['stock-alerts-summary', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get('/inventory/alerts/summary')
      return response.data
    },
    enabled: !!currentTenant,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch all alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['stock-alerts', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get('/inventory/alerts')
      return response.data || []
    },
    enabled: !!currentTenant,
    refetchInterval: 30000
  })

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          icon: XCircleIcon
        }
      case 'critical':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-200',
          icon: ExclamationCircleIcon
        }
      case 'low':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          icon: ExclamationTriangleIcon
        }
      case 'over_max':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-200',
          icon: ArrowTrendingUpIcon
        }
      default:
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          icon: CheckCircleIcon
        }
    }
  }

  const getAlertLabel = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return 'Sin Stock'
      case 'critical':
        return 'Crítico'
      case 'low':
        return 'Bajo'
      case 'over_max':
        return 'Sobre Stock'
      default:
        return 'Normal'
    }
  }

  if (loadingSummary || loadingAlerts) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando alertas de stock...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas de Stock</h1>
        <p className="text-gray-600">
          Monitoreo en tiempo real del estado de inventario
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Out of Stock */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sin Stock</p>
              <p className="text-3xl font-bold text-red-600">{summary?.outOfStock || 0}</p>
            </div>
            <XCircleIcon className="h-12 w-12 text-red-500 opacity-50" />
          </div>
        </div>

        {/* Critical */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crítico</p>
              <p className="text-3xl font-bold text-orange-600">{summary?.critical || 0}</p>
            </div>
            <ExclamationCircleIcon className="h-12 w-12 text-orange-500 opacity-50" />
          </div>
          <p className="text-xs text-gray-500 mt-2">≤ Stock Mínimo</p>
        </div>

        {/* Low */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bajo</p>
              <p className="text-3xl font-bold text-yellow-600">{summary?.low || 0}</p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 opacity-50" />
          </div>
          <p className="text-xs text-gray-500 mt-2">≤ Punto de Pedido</p>
        </div>

        {/* Over Max */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sobre Stock</p>
              <p className="text-3xl font-bold text-purple-600">{summary?.overMax || 0}</p>
            </div>
            <ArrowTrendingUpIcon className="h-12 w-12 text-purple-500 opacity-50" />
          </div>
          <p className="text-xs text-gray-500 mt-2">&gt; Stock Máximo</p>
        </div>

        {/* Normal */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Normal</p>
              <p className="text-3xl font-bold text-green-600">{summary?.normal || 0}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500 opacity-50" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Stock OK</p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Productos con Alertas</h2>
          <p className="text-sm text-gray-600">
            {alerts?.length || 0} productos requieren atención
          </p>
        </div>

        {alerts?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">¡Todo en orden!</p>
            <p className="text-sm">No hay productos con alertas de stock en este momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punto Pedido
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Máximo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts?.map((alert: any) => {
                  const color = getAlertColor(alert.alertType)
                  const Icon = color.icon
                  return (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 ${color.text} mr-2`} />
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color.bg} ${color.text}`}
                          >
                            {getAlertLabel(alert.alertType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {alert.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{alert.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span
                          className={`font-semibold ${
                            alert.currentStock === 0
                              ? 'text-red-600'
                              : alert.currentStock <= alert.minStock
                              ? 'text-orange-600'
                              : alert.currentStock <= (alert.reorderPoint || 0)
                              ? 'text-yellow-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {alert.currentStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {alert.minStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {alert.reorderPoint || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {alert.maxStock || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Leyenda de Estados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-blue-800">
          <div>
            <strong>Sin Stock (0):</strong> Producto agotado, no se puede vender
          </div>
          <div>
            <strong>Crítico:</strong> Stock actual ≤ Stock mínimo configurado
          </div>
          <div>
            <strong>Bajo:</strong> Stock actual ≤ Punto de pedido (si está configurado)
          </div>
          <div>
            <strong>Sobre Stock:</strong> Stock actual &gt; Stock máximo (si está configurado)
          </div>
        </div>
      </div>
    </div>
  )
}
