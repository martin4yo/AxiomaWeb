import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { Select } from '../ui/Select'
import { useAuthStore } from '../../stores/authStore'
import { afipConnectionsApi, type AfipConnection } from '../../api/afip-connections'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  cuit: z.string()
    .regex(/^\d{11}$/, 'El CUIT debe tener 11 dígitos sin guiones'),
  environment: z.enum(['testing', 'production']),
  certificate: z.string().optional(),
  privateKey: z.string().optional(),
  wsaaUrl: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  wsfeUrl: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  timeout: z.number().min(5000, 'Mínimo 5 segundos').max(120000, 'Máximo 120 segundos').optional(),
  isActive: z.boolean().default(true)
})

type FormData = z.infer<typeof schema>

interface AfipConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  connection?: AfipConnection | null
  mode: 'create' | 'edit'
}

export default function AfipConnectionModal({
  isOpen,
  onClose,
  connection,
  mode
}: AfipConnectionModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: connection || {
      name: '',
      description: '',
      cuit: '',
      environment: 'testing',
      certificate: '',
      privateKey: '',
      wsaaUrl: '',
      wsfeUrl: '',
      timeout: 30000,
      isActive: true
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      afipConnectionsApi.create(currentTenant!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afip-connections'] })
      reset()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      afipConnectionsApi.update(currentTenant!.slug, connection!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afip-connections'] })
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

  const title = mode === 'create' ? 'Nueva Conexión AFIP' : 'Editar Conexión AFIP'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Nombre"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ej: Producción Principal"
              required
            />
          </div>

          <div className="col-span-2">
            <TextArea
              label="Descripción"
              {...register('description')}
              error={errors.description?.message}
              placeholder="Descripción opcional de la conexión"
              rows={2}
            />
          </div>

          <div>
            <Input
              label="CUIT"
              {...register('cuit')}
              error={errors.cuit?.message}
              placeholder="20123456789"
              maxLength={11}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              11 dígitos sin guiones
            </p>
          </div>

          <div>
            <Select
              label="Ambiente"
              {...register('environment')}
              error={errors.environment?.message}
              required
            >
              <option value="testing">Testing (Homologación)</option>
              <option value="production">Producción</option>
            </Select>
          </div>

          <div className="col-span-2">
            <TextArea
              label="Certificado (.crt)"
              {...register('certificate')}
              error={errors.certificate?.message}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500">
              Pegue aquí el contenido del archivo .crt
            </p>
          </div>

          <div className="col-span-2">
            <TextArea
              label="Clave Privada (.key)"
              {...register('privateKey')}
              error={errors.privateKey?.message}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500">
              Pegue aquí el contenido del archivo .key
            </p>
          </div>

          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              URLs de Web Services (Opcional)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Si no se especifican, se usarán las URLs por defecto según el ambiente seleccionado
            </p>
          </div>

          <div>
            <Input
              label="URL WSAA (Autenticación)"
              {...register('wsaaUrl')}
              error={errors.wsaaUrl?.message}
              placeholder="https://wsaahomo.afip.gov.ar/ws/services/LoginCms"
            />
          </div>

          <div>
            <Input
              label="URL WSFE (Facturación)"
              {...register('wsfeUrl')}
              error={errors.wsfeUrl?.message}
              placeholder="https://wswhomo.afip.gov.ar/wsfev1/service.asmx"
            />
          </div>

          <div>
            <Input
              label="Timeout (milisegundos)"
              type="number"
              {...register('timeout', { valueAsNumber: true })}
              error={errors.timeout?.message}
              placeholder="30000"
            />
            <p className="mt-1 text-sm text-gray-500">
              Tiempo máximo de espera para conexiones AFIP (5000-120000 ms)
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
                Conexión activa
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Crear Conexión' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
