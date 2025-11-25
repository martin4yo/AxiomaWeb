import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { useAuthStore } from '../../stores/authStore'
import { salesPointsApi, type SalesPoint } from '../../api/sales-points'

const schema = z.object({
  number: z.number().int().min(1, 'El número debe ser mayor a 0').max(99999, 'El número no puede superar 99999'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

type FormData = z.infer<typeof schema>

interface SalesPointModalProps {
  isOpen: boolean
  onClose: () => void
  salesPoint?: SalesPoint | null
  mode: 'create' | 'edit'
}

export default function SalesPointModal({
  isOpen,
  onClose,
  salesPoint,
  mode
}: SalesPointModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: salesPoint || {
      number: 1,
      name: '',
      description: '',
      isActive: true
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      salesPointsApi.create(currentTenant!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-points'] })
      reset()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      salesPointsApi.update(currentTenant!.slug, salesPoint!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-points'] })
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    if (mode === 'create') {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  const title = mode === 'create' ? 'Nuevo Punto de Venta' : 'Editar Punto de Venta'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Número de Punto de Venta"
              type="number"
              {...register('number', { valueAsNumber: true })}
              error={errors.number?.message}
              placeholder="1"
              required
              min={1}
              max={99999}
            />
            <p className="mt-1 text-sm text-gray-500">
              Número del punto de venta en AFIP (1-99999)
            </p>
          </div>

          <div>
            <Input
              label="Nombre"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ej: Casa Central"
              required
            />
          </div>

          <div className="col-span-2">
            <TextArea
              label="Descripción"
              {...register('description')}
              error={errors.description?.message}
              placeholder="Descripción opcional del punto de venta"
              rows={2}
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Punto de venta activo
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Crear Punto de Venta' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
