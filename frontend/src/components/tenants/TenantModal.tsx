import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { tenantsApi, Tenant } from '../../api/tenants'
import { useAuthStore } from '../../stores/authStore'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo se permiten letras minúsculas, números y guiones'),
  planType: z.enum(['free', 'basic', 'premium']),
  status: z.enum(['active', 'inactive', 'suspended']),
  currency: z.string().default('ARS'),
  timezone: z.string().default('America/Argentina/Buenos_Aires'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  // Datos del negocio para impresión
  businessName: z.string().optional(),
  cuit: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface TenantModalProps {
  isOpen: boolean
  onClose: () => void
  tenant?: Tenant
}

export function TenantModal({ isOpen, onClose, tenant }: TenantModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'config' | 'business'>('general')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      planType: 'free',
      status: 'active',
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      dateFormat: 'DD/MM/YYYY',
    },
  })

  useEffect(() => {
    if (tenant) {
      setValue('name', tenant.name)
      setValue('slug', tenant.slug)
      setValue('planType', tenant.planType)
      setValue('status', tenant.status)
      setValue('currency', tenant.settings.currency)
      setValue('timezone', tenant.settings.timezone)
      setValue('dateFormat', tenant.settings.dateFormat)
      setValue('businessName', tenant.businessName || '')
      setValue('cuit', tenant.cuit || '')
      setValue('address', tenant.address || '')
      setValue('phone', tenant.phone || '')
      setValue('email', tenant.email || '')
    } else {
      reset()
    }
  }, [tenant, setValue, reset])

  // Reset tab when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general')
    }
  }, [isOpen])

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      tenantsApi.createTenant(currentTenant!.slug, {
        name: data.name,
        slug: data.slug,
        planType: data.planType,
        status: data.status,
        settings: {
          currency: data.currency,
          timezone: data.timezone,
          dateFormat: data.dateFormat,
        },
        businessName: data.businessName || null,
        cuit: data.cuit || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      reset()
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      tenantsApi.updateTenant(currentTenant!.slug, tenant!.id, {
        name: data.name,
        slug: data.slug,
        planType: data.planType,
        status: data.status,
        settings: {
          currency: data.currency,
          timezone: data.timezone,
          dateFormat: data.dateFormat,
        },
        businessName: data.businessName || null,
        cuit: data.cuit || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      reset()
      onClose()
    },
  })

  const onSubmit = (data: FormData) => {
    if (tenant) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    if (!tenant) {
      setValue('slug', slug)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tenant ? 'Editar Tenant' : 'Nuevo Tenant'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Datos Principales
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Configuración
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`${
                activeTab === 'business'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Datos del Negocio
            </button>
          </nav>
        </div>

        {/* Tab Content con altura fija igual a Datos del Negocio */}
        <div className="min-h-[520px]">
          {/* Tab: Datos Principales */}
          {activeTab === 'general' && (
            <div className="space-y-4">
          <Input
            label="Nombre"
            error={errors.name?.message}
            {...register('name', {
              onChange: handleNameChange,
            })}
          />

          <Input
            label="Slug"
            placeholder="mi-empresa"
            error={errors.slug?.message}
            disabled={!!tenant}
            helperText={
              tenant
                ? 'El slug no puede ser modificado'
                : 'Se genera autom�ticamente del nombre'
            }
            {...register('slug')}
          />

          <Select label="Plan" error={errors.planType?.message} {...register('planType')}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </Select>

          <Select label="Estado" error={errors.status?.message} {...register('status')}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </Select>
            </div>
          )}

          {/* Tab: Configuración */}
          {activeTab === 'config' && (
            <div className="space-y-4">
            <Select
              label="Moneda"
              error={errors.currency?.message}
              {...register('currency')}
            >
              <option value="ARS">Peso Argentino (ARS)</option>
              <option value="USD">D�lar Estadounidense (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="BRL">Real Brasile�o (BRL)</option>
            </Select>

            <Select
              label="Zona Horaria"
              error={errors.timezone?.message}
              {...register('timezone')}
            >
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="America/Sao_Paulo">S�o Paulo (GMT-3)</option>
              <option value="America/Mexico_City">Ciudad de M�xico (GMT-6)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
            </Select>

            <Select
              label="Formato de Fecha"
              error={errors.dateFormat?.message}
              {...register('dateFormat')}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
            </div>
          )}

          {/* Tab: Datos del Negocio */}
          {activeTab === 'business' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-4">
                Esta información se utilizará en la impresión de tickets y comprobantes
              </p>
            <Input
              label="Nombre Comercial"
              placeholder="Nombre del negocio (opcional)"
              error={errors.businessName?.message}
              helperText="Si está vacío, se usará el nombre del tenant"
              {...register('businessName')}
            />

            <Input
              label="CUIT"
              placeholder="20-12345678-9"
              error={errors.cuit?.message}
              {...register('cuit')}
            />

            <Input
              label="Dirección"
              placeholder="Av. Corrientes 1234, CABA"
              error={errors.address?.message}
              {...register('address')}
            />

            <Input
              label="Teléfono"
              placeholder="(011) 4567-8900"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="contacto@negocio.com"
              error={errors.email?.message}
              {...register('email')}
            />
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {tenant ? 'Actualizar' : 'Crear'} Tenant
          </Button>
        </div>
      </form>
    </Modal>
  )
}
