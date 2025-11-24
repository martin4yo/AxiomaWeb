import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { EntityModal } from '../../components/entities/EntityModal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

export default function EntitiesPage() {
  const { currentTenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch entities
  const { data: entities, isLoading } = useQuery({
    queryKey: ['entities', currentTenant?.slug, search, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter) params.append('type', typeFilter)

      const response = await api.get(`/${currentTenant!.slug}/entities?${params}`)
      return response.data.entities || []
    },
    enabled: !!currentTenant
  })

  const handleCreate = () => {
    setSelectedEntity(null)
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (entity: any) => {
    setSelectedEntity(entity)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedEntity(null)
  }

  const getEntityTypes = (entity: any) => {
    const types = []
    if (entity.isCustomer) types.push('Cliente')
    if (entity.isSupplier) types.push('Proveedor')
    if (entity.isEmployee) types.push('Empleado')
    return types
  }

  const getEntityTypeColor = (types: string[]) => {
    if (types.includes('Cliente') && types.includes('Proveedor')) return 'info'
    if (types.includes('Cliente')) return 'success'
    if (types.includes('Proveedor')) return 'warning'
    if (types.includes('Empleado')) return 'info'
    return 'info'
  }

  const actions = [
    {
      label: 'Nueva Entidad',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entidades"
        subtitle="Gestiona clientes, proveedores y empleados en un solo lugar"
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
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="customer">Solo Clientes</option>
                <option value="supplier">Solo Proveedores</option>
                <option value="employee">Solo Empleados</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de entidades */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Entidades ({entities?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !entities || entities.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                👥
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin entidades</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || typeFilter
                  ? 'No se encontraron entidades que coincidan con los filtros.'
                  : 'Comienza creando tu primera entidad.'
                }
              </p>
              {!search && !typeFilter && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nueva Entidad
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
                      Entidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
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
                  {entities.map((entity: any) => {
                    const types = getEntityTypes(entity)
                    const typeColor = getEntityTypeColor(types)

                    return (
                      <tr key={entity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {entity.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entity.code && `${entity.code} • `}
                              {entity.taxId || 'Sin CUIT/DNI'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {types.map((type, index) => (
                              <Badge
                                key={index}
                                variant={typeColor}
                                size="sm"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {entity.email || 'Sin email'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entity.phone || 'Sin teléfono'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {entity.city && entity.state
                              ? `${entity.city}, ${entity.state}`
                              : entity.city || entity.state || 'Sin ubicación'
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {entity.country || 'AR'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={entity.isActive ? 'success' : 'error'}>
                            {entity.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entity)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
        entity={selectedEntity}
        mode={modalMode}
      />
    </div>
  )
}