import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../services/api'
import { useDialog } from '../../hooks/useDialog'

const warehouseSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
  allowNegativeStock: z.boolean().optional()
})

type WarehouseForm = z.infer<typeof warehouseSchema>

export default function WarehousesPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [showModal, setShowModal] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: selectedWarehouse || {}
  })

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get('/inventory/warehouses')
      return response.data || []
    },
    enabled: !!currentTenant
  })

  // Create warehouse mutation
  const createWarehouse = useMutation({
    mutationFn: async (data: WarehouseForm) => {
      const response = await api.post('/inventory/warehouses', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      reset()
      setShowModal(false)
      dialog.success('Almacén creado exitosamente')
    },
    onError: (error: any) => {
      console.error('[ERROR] Error al crear almacén:', error)
      console.error('[ERROR] Detalle del error:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || 'Error al crear almacén'
      if (errorMessage.includes('Unique constraint') || errorMessage.includes('unique constraint')) {
        dialog.error('Ya existe un almacén con ese código. Por favor, use un código diferente.')
      } else {
        dialog.error(errorMessage)
      }
    }
  })

  // Update warehouse mutation
  const updateWarehouse = useMutation({
    mutationFn: async (data: WarehouseForm) => {
      const response = await api.put(`/inventory/warehouses/${selectedWarehouse.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setShowModal(false)
      setSelectedWarehouse(null)
      dialog.success('Almacén actualizado exitosamente')
    },
    onError: (error: any) => {
      dialog.error(error.response?.data?.error || 'Error al actualizar almacén')
    }
  })

  // Delete warehouse mutation
  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/inventory/warehouses/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      dialog.success('Almacén eliminado exitosamente')
    },
    onError: (error: any) => {
      dialog.error(error.response?.data?.error || 'Error al eliminar almacén')
    }
  })

  const handleCreate = () => {
    setSelectedWarehouse(null)
    setModalMode('create')
    reset({ code: '', name: '', address: '', isDefault: false, allowNegativeStock: false })
    setShowModal(true)
  }

  const handleEdit = (warehouse: any) => {
    setSelectedWarehouse(warehouse)
    setModalMode('edit')
    reset(warehouse)
    setShowModal(true)
  }

  const handleDelete = (warehouse: any) => {
    dialog.confirm(
      `¿Estás seguro de eliminar el almacén "${warehouse.name}"?`,
      () => deleteWarehouse.mutate(warehouse.id),
      'Eliminar Almacén'
    )
  }

  const onSubmit = (data: WarehouseForm) => {
    if (modalMode === 'create') {
      createWarehouse.mutate(data)
    } else {
      updateWarehouse.mutate(data)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Almacenes</h1>
        <p className="text-gray-600">Gestiona los almacenes de tu empresa</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Lista de Almacenes</h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Almacén
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : warehouses?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay almacenes registrados. Crea uno para empezar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Por Defecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Negativo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {warehouses?.map((warehouse: any) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {warehouse.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {warehouse.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {warehouse.isDefault && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Por Defecto
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {warehouse.allowNegativeStock ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Permitido
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse)}
                        className="text-red-600 hover:text-red-900"
                        disabled={warehouse.isDefault}
                        title={warehouse.isDefault ? 'No se puede eliminar el almacén por defecto' : ''}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Nuevo Almacén' : 'Editar Almacén'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                {...register('code')}
                placeholder="Ej: ALM001"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                {...register('name')}
                placeholder="Ej: Almacén Principal"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <textarea
                {...register('address')}
                placeholder="Dirección completa del almacén"
                rows={2}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isDefault')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Establecer como almacén por defecto
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('allowNegativeStock')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Permitir stock negativo
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Si está activado, permite realizar ventas aunque no haya stock disponible
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
