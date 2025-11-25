import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { useAuthStore } from '../../stores/authStore'
import { branchesApi, type Branch } from '../../api/branches'

const schema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

type FormData = z.infer<typeof schema>

interface BranchModalProps {
  isOpen: boolean
  onClose: () => void
  branch?: Branch | null
  mode: 'create' | 'edit'
}

export default function BranchModal({
  isOpen,
  onClose,
  branch,
  mode
}: BranchModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: branch || {
      code: '',
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      phone: '',
      email: '',
      isDefault: false,
      isActive: true
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      branchesApi.create(currentTenant!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      reset()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      branchesApi.update(currentTenant!.slug, branch!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
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

  const title = mode === 'create' ? 'Nueva Sucursal' : 'Editar Sucursal'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Código"
              {...register('code')}
              error={errors.code?.message}
              placeholder="CC"
              required
            />
          </div>

          <div>
            <Input
              label="Nombre"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Casa Central"
              required
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Dirección 1"
              {...register('addressLine1')}
              error={errors.addressLine1?.message}
              placeholder="Av. Principal 123"
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Dirección 2"
              {...register('addressLine2')}
              error={errors.addressLine2?.message}
              placeholder="Piso 2, Oficina B"
            />
          </div>

          <div>
            <Input
              label="Ciudad"
              {...register('city')}
              error={errors.city?.message}
              placeholder="Buenos Aires"
            />
          </div>

          <div>
            <Input
              label="Provincia/Estado"
              {...register('state')}
              error={errors.state?.message}
              placeholder="Buenos Aires"
            />
          </div>

          <div>
            <Input
              label="Código Postal"
              {...register('postalCode')}
              error={errors.postalCode?.message}
              placeholder="1000"
            />
          </div>

          <div>
            <Input
              label="Teléfono"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div>
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="sucursal@empresa.com"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                {...register('isDefault')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Sucursal por defecto
              </span>
            </label>
            <p className="text-xs text-gray-500">
              Solo puede haber una sucursal por defecto. Si marca esta opción, la anterior se desmarcará automáticamente.
            </p>
          </div>

          <div className="col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Sucursal activa
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Crear Sucursal' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
