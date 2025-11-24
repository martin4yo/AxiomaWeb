import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { useAuthStore } from '../../../stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea } from '../../../components/ui/TextArea'

const vatConditionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  isExempt: z.boolean().optional()
})

type VatConditionForm = z.infer<typeof vatConditionSchema>

export default function VatConditionsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedVatCondition, setSelectedVatCondition] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<VatConditionForm>({
    resolver: zodResolver(vatConditionSchema),
    defaultValues: selectedVatCondition || {}
  })

  // Fetch VAT conditions
  const { data: vatConditions, isLoading } = useQuery({
    queryKey: ['vat-conditions', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/${currentTenant!.slug}/vat-conditions?${params}`)
      if (!response.ok) throw new Error('Error fetching VAT conditions')
      const data = await response.json()
      return data.vatConditions || []
    },
    enabled: !!currentTenant
  })

  // Create VAT condition mutation
  const createVatCondition = useMutation({
    mutationFn: async (data: VatConditionForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/vat-conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al crear condición de IVA')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-conditions'] })
      reset()
      setShowModal(false)
    }
  })

  // Update VAT condition mutation
  const updateVatCondition = useMutation({
    mutationFn: async (data: VatConditionForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/vat-conditions/${selectedVatCondition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al actualizar condición de IVA')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-conditions'] })
      setShowModal(false)
      setSelectedVatCondition(null)
    }
  })

  // Delete VAT condition mutation
  const deleteVatCondition = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/${currentTenant!.slug}/vat-conditions/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar condición de IVA')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-conditions'] })
    }
  })

  const handleCreate = () => {
    setSelectedVatCondition(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (vatCondition: any) => {
    setSelectedVatCondition(vatCondition)
    setModalMode('edit')
    reset(vatCondition)
    setShowModal(true)
  }

  const handleDelete = (vatCondition: any) => {
    if (confirm(`¿Estás seguro de eliminar la condición de IVA "${vatCondition.name}"?`)) {
      deleteVatCondition.mutate(vatCondition.id)
    }
  }

  const onSubmit = (data: VatConditionForm) => {
    if (modalMode === 'create') {
      createVatCondition.mutate(data)
    } else {
      updateVatCondition.mutate(data)
    }
  }

  const actions = [
    {
      label: 'Nueva Condición de IVA',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Condiciones de IVA"
        subtitle="Gestiona las condiciones fiscales ante la AFIP"
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
                  placeholder="Buscar condiciones de IVA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de condiciones de IVA */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Condiciones de IVA ({vatConditions?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !vatConditions || vatConditions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                💼
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin condiciones de IVA</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron condiciones que coincidan con la búsqueda.'
                  : 'Comienza creando tu primera condición de IVA.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nueva Condición de IVA
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
                      Condición
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasa IVA
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
                  {vatConditions.map((vatCondition: any) => (
                    <tr key={vatCondition.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vatCondition.name}
                          </div>
                          {vatCondition.description && (
                            <div className="text-sm text-gray-500">
                              {vatCondition.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default">
                          {vatCondition.code}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {vatCondition.isExempt ? (
                            <Badge variant="warning">Exento</Badge>
                          ) : (
                            `${vatCondition.taxRate || 0}%`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={vatCondition.isActive ? 'success' : 'error'}>
                          {vatCondition.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vatCondition)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vatCondition)}
                          >
                            <TrashIcon className="h-4 w-4" />
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
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nueva Condición de IVA' : 'Editar Condición de IVA'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <Input
              label="Nombre *"
              placeholder="Ej: Responsable Inscripto"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Código *"
              placeholder="Ej: RI"
              error={errors.code?.message}
              {...register('code')}
            />
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional de la condición"
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tasa de IVA (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="21.00"
                error={errors.taxRate?.message}
                {...register('taxRate', { valueAsNumber: true })}
              />
              <div className="flex items-center pt-8">
                <input
                  id="isExempt"
                  type="checkbox"
                  {...register('isExempt')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isExempt" className="ml-2 block text-sm text-gray-900">
                  Exento de IVA
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Condición' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}