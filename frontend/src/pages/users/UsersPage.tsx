import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '@heroicons/react/24/outline'
import { Users, Shield, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { UserModal } from '../../components/users/UserModal'
import { ChangePasswordModal } from '../../components/users/ChangePasswordModal'
import { usersApi, User } from '../../api/users'
import { useAuthStore } from '../../stores/authStore'

export function UsersPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | undefined>()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', currentTenant?.slug],
    queryFn: () => usersApi.getUsers(currentTenant!.slug),
    enabled: !!currentTenant,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleChangePassword = (user: User) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Esta seguro de desactivar este usuario?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(undefined)
  }

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false)
    setSelectedUser(undefined)
  }

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

  const actions = [
    {
      label: 'Nuevo Usuario',
      icon: PlusIcon,
      onClick: () => setShowModal(true),
      variant: 'primary' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Usuarios"
        subtitle="Administrar usuarios y permisos del tenant"
        actions={actions}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
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
                  {users?.filter((u: User) => u.isActive).length || 0}
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
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-orange-600">
                  {users?.filter((u: User) => u.role === 'admin').length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold text-red-600">
                  {users?.filter((u: User) => !u.isActive).length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lista de Usuarios</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: User) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`
                            : 'Sin nombre'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getRoleBadge(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.isActive ? 'success' : 'error'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleChangePassword(user)}
                          >
                            <KeyIcon className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
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

      <UserModal
        isOpen={showModal}
        onClose={handleCloseModal}
        user={selectedUser}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        user={selectedUser}
      />
    </div>
  )
}
