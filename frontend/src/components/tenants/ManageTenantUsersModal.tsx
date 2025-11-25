import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { tenantsApi, Tenant } from '../../api/tenants'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../stores/authStore'

interface ManageTenantUsersModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant | null
}

export function ManageTenantUsersModal({ isOpen, onClose, tenant }: ManageTenantUsersModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user')

  // Get all users in the system
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', currentTenant?.slug],
    queryFn: () => usersApi.getAllUsers(currentTenant!.slug),
    enabled: !!currentTenant && isOpen,
  })

  // Get users already assigned to this tenant
  const { data: tenantUsers = [], isLoading } = useQuery({
    queryKey: ['tenant-users', currentTenant?.slug, tenant?.id],
    queryFn: () => tenantsApi.getTenantUsers(currentTenant!.slug, tenant!.id),
    enabled: !!currentTenant && !!tenant && isOpen,
  })

  // Get users not assigned to this tenant
  const availableUsers = allUsers.filter(
    (user) => !tenantUsers.some((tu: any) => tu.id === user.id)
  )

  const assignMutation = useMutation({
    mutationFn: () =>
      tenantsApi.assignUserToTenant(
        currentTenant!.slug,
        tenant!.id,
        selectedUserId,
        selectedRole
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      setSelectedUserId('')
      setSelectedRole('user')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (tenantUserId: string) =>
      tenantsApi.removeUserFromTenant(currentTenant!.slug, tenant!.id, tenantUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
    },
  })

  const handleAssign = () => {
    if (selectedUserId) {
      assignMutation.mutate()
    }
  }

  const handleRemove = (tenantUserId: string) => {
    if (window.confirm('¿Está seguro de remover este usuario del tenant?')) {
      removeMutation.mutate(tenantUserId)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('')
      setSelectedRole('user')
    }
  }, [isOpen])

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'error' | 'warning' | 'info'> = {
      superadmin: 'error',
      admin: 'warning',
      user: 'info',
    }
    return variants[role] || 'info'
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      user: 'Usuario',
    }
    return labels[role] || role
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Gestionar Usuarios - ${tenant?.name || ''}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Add User Section */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Asignar Usuario</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0
                    ? 'No hay usuarios disponibles'
                    : 'Seleccione un usuario'}
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName} (${user.email})`
                      : user.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'user')}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </Select>
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignMutation.isPending}
              loading={assignMutation.isPending}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Asignar
            </Button>
          </div>
        </div>

        {/* Assigned Users List */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Usuarios Asignados ({tenantUsers.length})
          </h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : tenantUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios asignados a este tenant
            </div>
          ) : (
            <div className="space-y-2">
              {tenantUsers.map((user: any) => (
                <div
                  key={user.tenantUserId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : 'Sin nombre'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getRoleBadge(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(user.tenantUserId)}
                      disabled={removeMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
