import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { EntityModal } from '../../components/entities/EntityModal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

export default function CustomersPage() {
  const { currentTenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch customers (entities that are customers)
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', currentTenant?.slug, search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (categoryFilter) params.append('category', categoryFilter)
      params.append('type', 'customer') // Only get customers

      const response = await api.get(`/${currentTenant!.slug}/entities?${params}`)
      return response.data.entities || []
    },
    enabled: !!currentTenant
  })

  const handleCreate = () => {
    setSelectedCustomer({
      isCustomer: true,
      isSupplier: false,
      isEmployee: false
    })
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedCustomer(null)
  }

  const actions = [
    {
      label: 'Nuevo Cliente',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gestiona tu base de datos de clientes"
        actions={actions}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, código o CUIT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Mayorista</option>
                <option value="corporate">Corporativo</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de clientes */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Clientes ({customers?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                👥
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin clientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || categoryFilter
                  ? 'No se encontraron clientes que coincidan con los filtros.'
                  : 'Comienza creando tu primer cliente.'}
              </p>
              {!search && !categoryFilter && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Límite de Crédito
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer: any) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.code && `${customer.code} • `}
                            {customer.taxId || customer.cuit || 'Sin CUIT/DNI'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.email || 'Sin email'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.phone || 'Sin teléfono'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.city && customer.state
                            ? `${customer.city}, ${customer.state}`
                            : customer.city || customer.state || 'Sin ubicación'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.country || 'AR'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.customerCreditLimit
                            ? `$${customer.customerCreditLimit.toLocaleString()}`
                            : 'Sin límite'}
                        </div>
                        {customer.customerPaymentTerms && (
                          <div className="text-sm text-gray-500">
                            {customer.customerPaymentTerms} días
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={customer.isActive ? 'success' : 'error'}>
                          {customer.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <EntityModal
        isOpen={showModal}
        onClose={handleCloseModal}
        entity={selectedCustomer}
        mode={modalMode}
      />
    </div>
  )
}