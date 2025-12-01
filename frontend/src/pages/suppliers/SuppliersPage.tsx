import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { EntityModal } from '../../components/entities/EntityModal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { currentTenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch suppliers (entities that are suppliers)
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('type', 'supplier') // Only get suppliers

      const response = await api.get(`/${currentTenant!.slug}/entities?${params}`)
      return response.data.entities || []
    },
    enabled: !!currentTenant
  })

  const handleCreate = () => {
    setSelectedSupplier({
      isCustomer: false,
      isSupplier: true,
      isEmployee: false
    })
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedSupplier(null)
  }

  const handleViewAccount = (supplierId: string) => {
    navigate(`/supplier-accounts/${supplierId}`)
  }

  const actions = [
    {
      label: 'Nuevo Proveedor',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona tu base de datos de proveedores"
        actions={actions}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
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
      </Card>

      {/* Lista de proveedores */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Proveedores ({suppliers?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !suppliers || suppliers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                🏪
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin proveedores</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron proveedores que coincidan con los filtros.'
                  : 'Comienza creando tu primer proveedor.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nuevo Proveedor
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
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condición IVA
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
                  {suppliers.map((supplier: any) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {supplier.code && `${supplier.code} • `}
                            {supplier.taxId || supplier.cuit || 'Sin CUIT/DNI'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {supplier.email || 'Sin email'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {supplier.phone || 'Sin teléfono'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {supplier.city && supplier.state
                            ? `${supplier.city}, ${supplier.state}`
                            : supplier.city || supplier.state || 'Sin ubicación'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {supplier.country || 'AR'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {supplier.ivaCondition || 'No especificada'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={supplier.isActive ? 'success' : 'error'}>
                          {supplier.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAccount(supplier.id)}
                            title="Ver cuenta corriente"
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(supplier)}
                            title="Editar proveedor"
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
        entity={selectedSupplier}
        mode={modalMode}
      />
    </div>
  )
}
