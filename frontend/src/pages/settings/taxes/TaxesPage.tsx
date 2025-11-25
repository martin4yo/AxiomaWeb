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

const taxSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  rate: z.number().min(0).max(100, 'La tasa debe ser entre 0 y 100%'),
  taxType: z.enum(['VAT', 'INCOME', 'GROSS_INCOME', 'OTHER'], {
    errorMap: () => ({ message: 'Selecciona un tipo de impuesto válido' })
  })
})

type TaxForm = z.infer<typeof taxSchema>

export default function TaxesPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedTax, setSelectedTax] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: selectedTax || {}
  })

  // Fetch taxes
  const { data: taxes, isLoading } = useQuery({
    queryKey: ['taxes', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/${currentTenant!.slug}/taxes?${params}`)
      if (!response.ok) throw new Error('Error fetching taxes')
      const data = await response.json()
      return data.taxes || []
    },
    enabled: !!currentTenant
  })

  // Create tax mutation
  const createTax = useMutation({
    mutationFn: async (data: TaxForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/taxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al crear impuesto')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      reset()
      setShowModal(false)
    }
  })

  // Update tax mutation
  const updateTax = useMutation({
    mutationFn: async (data: TaxForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/taxes/${selectedTax.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al actualizar impuesto')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      setShowModal(false)
      setSelectedTax(null)
    }
  })

  // Delete tax mutation
  const deleteTax = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/${currentTenant!.slug}/taxes/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar impuesto')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
    }
  })

  const handleCreate = () => {
    setSelectedTax(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (tax: any) => {
    setSelectedTax(tax)
    setModalMode('edit')
    reset(tax)
    setShowModal(true)
  }

  const handleDelete = (tax: any) => {
    if (confirm(`¿Estás seguro de eliminar el impuesto "${tax.name}"?`)) {
      deleteTax.mutate(tax.id)
    }
  }

  const onSubmit = (data: TaxForm) => {
    if (modalMode === 'create') {
      createTax.mutate(data)
    } else {
      updateTax.mutate(data)
    }
  }

  const getTaxTypeLabel = (type: string) => {
    const labels = {
      VAT: 'IVA',
      INCOME: 'Ganancias',
      GROSS_INCOME: 'Ingresos Brutos',
      OTHER: 'Otro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const actions = [
    {
      label: 'Nuevo Impuesto',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impuestos"
        subtitle="Gestiona los tipos de impuestos aplicables"
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
                  placeholder="Buscar impuestos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de impuestos */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Impuestos ({taxes?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !taxes || taxes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                🧾
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin impuestos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron impuestos que coincidan con la búsqueda.'
                  : 'Comienza creando tu primer impuesto.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nuevo Impuesto
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
                      Impuesto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasa
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
                  {taxes.map((tax: any) => (
                    <tr key={tax.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tax.name}
                          </div>
                          {tax.description && (
                            <div className="text-sm text-gray-500">
                              {tax.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">
                          {getTaxTypeLabel(tax.taxType)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tax.rate}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={tax.isActive ? 'success' : 'error'}>
                          {tax.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tax)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tax)}
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
        title={modalMode === 'create' ? 'Nuevo Impuesto' : 'Editar Impuesto'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <Input
              label="Nombre *"
              placeholder="Nombre del impuesto"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional del impuesto"
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Impuesto *
                </label>
                <select
                  {...register('taxType')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="VAT">IVA</option>
                  <option value="INCOME">Ganancias</option>
                  <option value="GROSS_INCOME">Ingresos Brutos</option>
                  <option value="OTHER">Otro</option>
                </select>
                {errors.taxType && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxType.message}</p>
                )}
              </div>
              <Input
                label="Tasa (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="21.00"
                error={errors.rate?.message}
                {...register('rate', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Impuesto' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}