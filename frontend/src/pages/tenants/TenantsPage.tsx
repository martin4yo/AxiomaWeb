import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Building2, CheckCircle, Star, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { TenantModal } from '../../components/tenants/TenantModal'
import { tenantsApi, Tenant } from '../../api/tenants'
import { useAuthStore } from '../../stores/authStore'

export function TenantsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>()

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', currentTenant?.slug],
    queryFn: () => tenantsApi.getTenants(currentTenant!.slug),
    enabled: !!currentTenant,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.deleteTenant(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Esta seguro de desactivar este tenant?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedTenant(undefined)
  }

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning'> = {
      free: 'info',
      basic: 'warning',
      premium: 'success',
    }
    return variants[plan] || 'info'
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning'> = {
      active: 'success',
      inactive: 'error',
      suspended: 'warning',
    }
    return variants[status] || 'info'
  }

  const actions = [
    {
      label: 'Nuevo Tenant',
      icon: PlusIcon,
      onClick: () => setShowModal(true),
      variant: 'primary' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Tenants"
        subtitle="Administrar empresas y organizaciones del sistema"
        actions={actions}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{tenants?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {tenants?.filter((t: Tenant) => t.status === 'active').length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tenants?.filter((t: Tenant) => t.planType === 'premium').length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspendidos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {tenants?.filter((t: Tenant) => t.status === 'suspended').length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lista de Tenants</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : !tenants || tenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay tenants registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant: Tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{tenant.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getPlanBadge(tenant.planType)}>
                          {tenant.planType.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusBadge(tenant.status)}>
                          {tenant.status === 'active' && 'Activo'}
                          {tenant.status === 'inactive' && 'Inactivo'}
                          {tenant.status === 'suspended' && 'Suspendido'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {tenant._count?.users || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tenant)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tenant.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
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

      <TenantModal
        isOpen={showModal}
        onClose={handleCloseModal}
        tenant={selectedTenant}
      />
    </div>
  )
}
