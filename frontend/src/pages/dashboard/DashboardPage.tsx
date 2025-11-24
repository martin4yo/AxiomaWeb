import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  UsersIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'

const DashboardPage = () => {
  // Mock data - in real app, this would come from API
  const stats = [
    {
      name: 'Ventas del Mes',
      value: '$45,600',
      change: '+12%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Documentos Pendientes',
      value: '23',
      change: '-5%',
      changeType: 'negative',
      icon: DocumentTextIcon,
    },
    {
      name: 'Clientes Activos',
      value: '156',
      change: '+8%',
      changeType: 'positive',
      icon: UsersIcon,
    },
    {
      name: 'Productos',
      value: '89',
      change: '+2%',
      changeType: 'positive',
      icon: CubeIcon,
    },
  ]

  const recentDocuments = [
    {
      id: '1',
      type: 'Factura',
      number: 'FAC-00001234',
      client: 'Cliente Example S.A.',
      amount: '$2,450.00',
      date: '2024-01-15',
      status: 'Pendiente',
    },
    {
      id: '2',
      type: 'Presupuesto',
      number: 'PRE-00000892',
      client: 'Nuevo Cliente Ltd.',
      amount: '$8,900.00',
      date: '2024-01-14',
      status: 'Enviado',
    },
    {
      id: '3',
      type: 'Remito',
      number: 'REM-00002156',
      client: 'Distribuidora ABC',
      amount: '$1,200.00',
      date: '2024-01-14',
      status: 'Entregado',
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
        {stats.map((stat) => (
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
                      <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent documents */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Documentos Recientes</h2>
          </CardHeader>
          <CardBody className="p-0">
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
                  {recentDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {doc.type} {doc.number}
                          </div>
                          <div className="text-sm text-gray-500">{doc.client}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {doc.amount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.status === 'Pendiente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : doc.status === 'Enviado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Acciones Rápidas</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <button className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Nueva Factura</div>
                  <div className="text-xs text-gray-500">Crear una nueva factura de venta</div>
                </div>
              </button>
              <button className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <UsersIcon className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Nuevo Cliente</div>
                  <div className="text-xs text-gray-500">Agregar un nuevo cliente</div>
                </div>
              </button>
              <button className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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