import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Receipt } from 'lucide-react'
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
import { useDialog } from '../../../hooks/useDialog'

const taxSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(20),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  rate: z.number().min(0).max(100, 'La tasa debe ser entre 0 y 100%'),
  taxType: z.enum(['IVA', 'PERCEPTION', 'INTERNAL', 'OTHER'], {
    errorMap: () => ({ message: 'Selecciona un tipo de impuesto válido' })
  }),
  applicableToRI: z.boolean().default(true),
  applicableToMT: z.boolean().default(false),
  applicableToEX: z.boolean().default(false),
  calculationBase: z.enum(['NET', 'GROSS']).default('NET'),
  displayInInvoice: z.boolean().default(true),
  isActive: z.boolean().default(true)
})

type TaxForm = z.infer<typeof taxSchema>

export default function TaxesPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
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
    dialog.confirm(
      `¿Estás seguro de eliminar el impuesto "${tax.name}"?`,
      () => deleteTax.mutate(tax.id),
      'Eliminar Impuesto'
    )
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
      IVA: 'IVA',
      PERCEPTION: 'Percepción',
      INTERNAL: 'Impuesto Interno',
      OTHER: 'Otro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const actions = [
    {
      label: 'Nuevo Impuesto',
      icon: Plus,
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin impuestos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron impuestos que coincidan con la búsqueda.'
                  : 'Comienza creando tu primer impuesto.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
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
                      Código
                    </th>
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
                      Aplicable a
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
                        <div className="text-sm font-mono font-medium text-gray-900">
                          {tax.code}
                        </div>
                      </td>
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
                        <div className="text-xs text-gray-600 space-x-1">
                          {tax.applicableToRI && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">RI</span>}
                          {tax.applicableToMT && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">MT</span>}
                          {tax.applicableToEX && <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">EX</span>}
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
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tax)}
                          >
                            <Trash2 className="h-4 w-4" />
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
          <div className="flex-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Código *"
                placeholder="IVA21"
                error={errors.code?.message}
                {...register('code')}
                maxLength={20}
              />
              <Input
                label="Nombre *"
                placeholder="IVA 21%"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <TextArea
              label="Descripción"
              rows={2}
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
                  <option value="IVA">IVA</option>
                  <option value="PERCEPTION">Percepción</option>
                  <option value="INTERNAL">Impuesto Interno</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aplicable a condiciones IVA
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('applicableToRI')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Responsable Inscripto (RI)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('applicableToMT')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Monotributo (MT)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('applicableToEX')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Exento (EX)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base de Cálculo
                </label>
                <select
                  {...register('calculationBase')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="NET">Neto (sin IVA)</option>
                  <option value="GROSS">Bruto (con IVA)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('displayInInvoice')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mostrar en factura</span>
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Activo</span>
              </label>
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

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}