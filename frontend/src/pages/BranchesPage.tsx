import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAuthStore } from '../stores/authStore'
import { branchesApi, type Branch } from '../api/branches'
import BranchModal from '../components/settings/BranchModal'
import { useDialog } from '../hooks/useDialog'

export default function BranchesPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch branches
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', currentTenant?.slug],
    queryFn: () => branchesApi.getAll(currentTenant!.slug),
    enabled: !!currentTenant
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    }
  })

  const handleCreate = () => {
    setSelectedBranch(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = async (branch: Branch) => {
    dialog.confirm(
      `¿Está seguro de eliminar la sucursal "${branch.name}"?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(branch.id)
        } catch (error: any) {
          dialog.error(error.response?.data?.error || 'Error al eliminar la sucursal')
        }
      },
      'Eliminar Sucursal'
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Activa</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactiva</span>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Sucursales</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestione las sucursales de su empresa para organizar las operaciones y comprobantes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nueva Sucursal
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Código
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Ubicación
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contacto
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        No hay sucursales configuradas
                      </td>
                    </tr>
                  ) : (
                    branches.map((branch) => (
                      <tr key={branch.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center">
                            {branch.isDefault && (
                              <StarIconSolid className="h-4 w-4 text-yellow-400 mr-2" title="Sucursal por defecto" />
                            )}
                            {branch.code}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {branch.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {branch.city || branch.state ? (
                            <div>
                              {branch.addressLine1 && <div>{branch.addressLine1}</div>}
                              {(branch.city || branch.state) && (
                                <div className="text-xs text-gray-400">
                                  {[branch.city, branch.state].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {branch.phone || branch.email ? (
                            <div>
                              {branch.phone && <div>{branch.phone}</div>}
                              {branch.email && <div className="text-xs text-gray-400">{branch.email}</div>}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(branch.isActive)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(branch)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(branch)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <BranchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          branch={selectedBranch}
          mode={modalMode}
        />
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
