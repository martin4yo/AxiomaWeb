import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'
import { salesPointsApi, type SalesPoint } from '../../api/sales-points'
import SalesPointModal from '../../components/settings/SalesPointModal'
import { useDialog } from '../../hooks/useDialog'

export default function SalesPointsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSalesPoint, setSelectedSalesPoint] = useState<SalesPoint | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch sales points
  const { data: salesPoints = [], isLoading } = useQuery({
    queryKey: ['sales-points', currentTenant?.slug],
    queryFn: () => salesPointsApi.getAll(currentTenant!.slug),
    enabled: !!currentTenant
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesPointsApi.delete(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-points'] })
    }
  })

  const handleCreate = () => {
    setSelectedSalesPoint(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEdit = (salesPoint: SalesPoint) => {
    setSelectedSalesPoint(salesPoint)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = async (salesPoint: SalesPoint) => {
    dialog.confirm(
      `¿Está seguro de eliminar el punto de venta "${salesPoint.number} - ${salesPoint.name}"?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(salesPoint.id)
        } catch (error: any) {
          dialog.error(error.response?.data?.error || 'Error al eliminar el punto de venta')
        }
      },
      'Eliminar Punto de Venta'
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Activo</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactivo</span>
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
          <h1 className="text-2xl font-semibold text-gray-900">Puntos de Venta AFIP</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestione los puntos de venta (PV) configurados en AFIP para emitir comprobantes electrónicos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nuevo Punto de Venta
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
                      Número
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Sucursal
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Descripción
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
                  {salesPoints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        No hay puntos de venta configurados
                      </td>
                    </tr>
                  ) : (
                    salesPoints.map((salesPoint) => (
                      <tr key={salesPoint.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          PV {salesPoint.number.toString().padStart(5, '0')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {salesPoint.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {salesPoint.branch ? `${salesPoint.branch.code} - ${salesPoint.branch.name}` : '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {salesPoint.description || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(salesPoint.isActive)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(salesPoint)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(salesPoint)}
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
        <SalesPointModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          salesPoint={selectedSalesPoint}
          mode={modalMode}
        />
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
