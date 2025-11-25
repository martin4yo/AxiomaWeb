import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { usersApi, User } from '../../api/users'
import { useAuthStore } from '../../stores/authStore'

const schema = z.object({
  newPassword: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma la contrasena'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  user?: User
}

export function ChangePasswordModal({ isOpen, onClose, user }: ChangePasswordModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.changePassword(currentTenant!.slug, user!.id, data.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
  })

  const onSubmit = (data: FormData) => {
    changePasswordMutation.mutate(data)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Contrasena"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-700">
            Cambiando contrasena para: <strong>{user?.email}</strong>
          </p>
        </div>

        <Input
          label="Nueva Contrasena"
          type="password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
          helperText="Minimo 6 caracteres"
        />

        <Input
          label="Confirmar Contrasena"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Cambiar Contrasena
          </Button>
        </div>
      </form>
    </Modal>
  )
}
