import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import {
  CurrencyDollarIcon,
  UsersIcon,
  CubeIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { currentTenant } = useAuthStore()

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', currentTenant?.slug],
    queryFn: () => dashboardService.getStats(currentTenant!.slug),
    enabled: !!currentTenant
  })

  // Fetch recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['dashboard-recent-sales', currentTenant?.slug],
    queryFn: () => dashboardService.getRecentSales(currentTenant!.slug),
    enabled: !!currentTenant
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      draft: 'Borrador',
      confirmed: 'Confirmado',
      completed: 'Completado',
      cancelled: 'Cancelado',
    }
    return statusLabels[status] || status
  }

  const statsCards = [
    {
      name: 'Ventas del Mes',
      value: stats ? formatCurrency(stats.salesOfMonth.total) : '-',
      change: stats ? `${stats.salesOfMonth.change}%` : '-',
      changeType: stats?.salesOfMonth.changeType || 'positive',
      icon: CurrencyDollarIcon,
      loading: statsLoading,
    },
    {
      name: 'Productos con Stock Bajo',
      value: stats ? stats.products.lowStock.toString() : '-',
      change: '',
      changeType: 'negative',
      icon: ExclamationTriangleIcon,
      loading: statsLoading,
    },
    {
      name: 'Clientes Activos',
      value: stats ? stats.customers.total.toString() : '-',
      change: '',
      changeType: 'positive',
      icon: UsersIcon,
      loading: statsLoading,
    },
    {
      name: 'Productos',
      value: stats ? stats.products.total.toString() : '-',
      change: '',
      changeType: 'positive',
      icon: CubeIcon,
      loading: statsLoading,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vista general de tu negocio</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.name}>
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stat.loading ? '...' : stat.value}
                      </p>
                    </div>
                    {stat.change && (
                      <div className={`text-sm font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sales */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Ventas Recientes</h2>
          </CardHeader>
          <CardBody className="p-0">
            {salesLoading ? (
              <div className="px-6 py-8 text-center text-gray-500">Cargando...</div>
            ) : recentSales.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No hay ventas recientes</div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Documento
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sale.documentType} {sale.saleNumber}
                            </div>
                            <div className="text-sm text-gray-500">{sale.customerName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(Number(sale.totalAmount))}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                            {getStatusLabel(sale.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Acciones Rápidas</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/sales/new')}
                className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Nueva Venta</div>
                  <div className="text-xs text-gray-500">Crear una nueva venta</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/entities')}
                className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UsersIcon className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Nueva Entidad</div>
                  <div className="text-xs text-gray-500">Agregar cliente, proveedor o empleado</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/products')}
                className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CubeIcon className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Nuevo Producto</div>
                  <div className="text-xs text-gray-500">Agregar un nuevo producto</div>
                </div>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage