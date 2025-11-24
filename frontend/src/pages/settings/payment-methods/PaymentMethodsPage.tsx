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

const paymentMethodSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  paymentType: z.enum(['CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER'], {
    errorMap: () => ({ message: 'Selecciona un tipo de pago válido' })
  }),
  requiresReference: z.boolean().optional(),
  daysToCollection: z.number().min(0).optional()
})

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>

export default function PaymentMethodsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: selectedPaymentMethod || {}
  })

  // Fetch payment methods
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['payment-methods', currentTenant?.slug, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/${currentTenant!.slug}/payment-methods?${params}`)
      if (!response.ok) throw new Error('Error fetching payment methods')
      const data = await response.json()
      return data.paymentMethods || []
    },
    enabled: !!currentTenant
  })

  // Create payment method mutation
  const createPaymentMethod = useMutation({
    mutationFn: async (data: PaymentMethodForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al crear forma de pago')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      reset()
      setShowModal(false)
    }
  })

  // Update payment method mutation
  const updatePaymentMethod = useMutation({
    mutationFn: async (data: PaymentMethodForm) => {
      const response = await fetch(`/api/${currentTenant!.slug}/payment-methods/${selectedPaymentMethod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Error al actualizar forma de pago')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setShowModal(false)
      setSelectedPaymentMethod(null)
    }
  })

  // Delete payment method mutation
  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/${currentTenant!.slug}/payment-methods/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Error al eliminar forma de pago')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    }
  })

  const handleCreate = () => {
    setSelectedPaymentMethod(null)
    setModalMode('create')
    reset()
    setShowModal(true)
  }

  const handleEdit = (paymentMethod: any) => {
    setSelectedPaymentMethod(paymentMethod)
    setModalMode('edit')
    reset(paymentMethod)
    setShowModal(true)
  }

  const handleDelete = (paymentMethod: any) => {
    if (confirm(`¿Estás seguro de eliminar la forma de pago "${paymentMethod.name}"?`)) {
      deletePaymentMethod.mutate(paymentMethod.id)
    }
  }

  const onSubmit = (data: PaymentMethodForm) => {
    if (modalMode === 'create') {
      createPaymentMethod.mutate(data)
    } else {
      updatePaymentMethod.mutate(data)
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    const labels = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      CHECK: 'Cheque',
      CARD: 'Tarjeta',
      OTHER: 'Otro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const actions = [
    {
      label: 'Nueva Forma de Pago',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formas de Pago"
        subtitle="Gestiona los métodos de pago disponibles"
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
                  placeholder="Buscar formas de pago..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de formas de pago */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Formas de Pago ({paymentMethods?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !paymentMethods || paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                💳
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin formas de pago</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'No se encontraron formas de pago que coincidan con la búsqueda.'
                  : 'Comienza creando tu primera forma de pago.'}
              </p>
              {!search && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nueva Forma de Pago
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((paymentMethod: any) => (
                <div key={paymentMethod.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{paymentMethod.name}</h4>
                      {paymentMethod.description && (
                        <p className="text-sm text-gray-500 mt-1">{paymentMethod.description}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        <Badge variant="default" size="sm">
                          {getPaymentTypeLabel(paymentMethod.paymentType)}
                        </Badge>
                        {paymentMethod.daysToCollection > 0 && (
                          <div className="text-sm text-blue-600">
                            Días para cobro: {paymentMethod.daysToCollection}
                          </div>
                        )}
                        {paymentMethod.requiresReference && (
                          <div className="text-sm text-orange-600">
                            Requiere referencia
                          </div>
                        )}
                        <Badge variant={paymentMethod.isActive ? 'success' : 'error'} size="sm">
                          {paymentMethod.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(paymentMethod)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(paymentMethod)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nueva Forma de Pago' : 'Editar Forma de Pago'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <Input
              label="Nombre *"
              placeholder="Nombre de la forma de pago"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextArea
              label="Descripción"
              rows={3}
              placeholder="Descripción opcional de la forma de pago"
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Pago *
                </label>
                <select
                  {...register('paymentType')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CHECK">Cheque</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="OTHER">Otro</option>
                </select>
                {errors.paymentType && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentType.message}</p>
                )}
              </div>
              <Input
                label="Días para cobro"
                type="number"
                min="0"
                placeholder="0"
                error={errors.daysToCollection?.message}
                {...register('daysToCollection', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center">
              <input
                id="requiresReference"
                type="checkbox"
                {...register('requiresReference')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="requiresReference" className="ml-2 block text-sm text-gray-900">
                Requiere número de referencia
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {modalMode === 'create' ? 'Crear Forma de Pago' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}