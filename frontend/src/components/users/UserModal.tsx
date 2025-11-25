import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { usersApi, User } from '../../api/users'
import { useAuthStore } from '../../stores/authStore'

const schema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'user']),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  user?: User
}

export function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'user',
      isActive: true,
    },
  })

  useEffect(() => {
    if (user) {
      setValue('email', user.email)
      setValue('firstName', user.firstName || '')
      setValue('lastName', user.lastName || '')
      setValue('role', user.role)
      setValue('isActive', user.isActive)
    } else {
      reset()
    }
  }, [user, setValue, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.createUser(currentTenant!.slug, {
        email: data.email,
        password: data.password!,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.updateUser(currentTenant!.slug, user!.id, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
  })

  const onSubmit = (data: FormData) => {
    if (user) {
      updateMutation.mutate(data)
    } else {
      if (!data.password) {
        return
      }
      createMutation.mutate(data)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre"
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <Input
            label="Apellido"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />

        {!user && (
          <Input
            label="Contrasena"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            helperText="Minimo 6 caracteres"
          />
        )}

        <Select label="Rol" error={errors.role?.message} {...register('role')}>
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
          <option value="superadmin">Super Admin</option>
        </Select>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            {...register('isActive')}
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Usuario activo
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {user ? 'Actualizar' : 'Crear'} Usuario
          </Button>
        </div>
      </form>
    </Modal>
  )
}
