import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { voucherConfigurationsApi } from '../../api/voucher-configurations'
import { api } from '../../services/api'
import { useEffect } from 'react'

const schema = z.object({
  voucherTypeId: z.string().min(1, 'Seleccione un tipo de comprobante'),
  branchId: z.preprocess(val => val === '' ? null : val, z.string().nullable().optional()),
  afipConnectionId: z.preprocess(val => val === '' ? null : val, z.string().nullable().optional()),
  salesPointId: z.preprocess(val => val === '' ? null : val, z.string().nullable().optional()),
  nextVoucherNumber: z.number().int().min(1).default(1)
})

type FormData = z.infer<typeof schema>

export default function EditVoucherConfigurationPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nextVoucherNumber: 1
    }
  })

  // Fetch existing configuration
  const { data: configuration, isLoading: loadingConfig } = useQuery({
    queryKey: ['voucher-configuration', currentTenant?.slug, id],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/voucher-configurations/${id}`)
      return response.data
    },
    enabled: !!currentTenant && !!id
  })

  // Populate form with existing data
  useEffect(() => {
    if (configuration) {
      console.log('Configuration loaded:', configuration)
      const config = configuration.configuration || configuration
      console.log('Using config:', config)
      reset({
        voucherTypeId: config.voucherTypeId,
        branchId: config.branchId || null,
        afipConnectionId: config.afipConnectionId || null,
        salesPointId: config.salesPointId || null,
        nextVoucherNumber: config.nextVoucherNumber
      })
    }
  }, [configuration, reset])

  // Fetch voucher types
  const { data: voucherTypes = [] } = useQuery({
    queryKey: ['voucher-types', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/voucher-types`)
      return response.data.voucherTypes
    },
    enabled: !!currentTenant
  })

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/branches`)
      return response.data.branches
    },
    enabled: !!currentTenant
  })

  // Fetch AFIP connections
  const { data: afipConnections = [] } = useQuery({
    queryKey: ['afip-connections', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/afip-connections`)
      return response.data.connections
    },
    enabled: !!currentTenant
  })

  // Fetch sales points
  const { data: salesPoints = [] } = useQuery({
    queryKey: ['sales-points', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/sales-points`)
      return response.data.salesPoints
    },
    enabled: !!currentTenant
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => voucherConfigurationsApi.update(currentTenant!.slug, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voucher-configurations'] })
      queryClient.invalidateQueries({ queryKey: ['voucher-configuration', currentTenant?.slug, id] })
      navigate('/settings/voucher-configurations')
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al actualizar la configuración')
    }
  })

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data)
  }

  const selectedVoucherType = voucherTypes.find((vt: any) => vt.id === watch('voucherTypeId'))

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Editar Configuración de Comprobante</h1>
            <p className="mt-2 text-sm text-gray-700">
              Modifique la configuración de emisión de comprobantes
            </p>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Tipo de Comprobante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Comprobante *
              </label>
              <select
                {...register('voucherTypeId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled
              >
                <option value="">Seleccione un tipo</option>
                {voucherTypes.map((vt: any) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} ({vt.code}) - {vt.letter}
                  </option>
                ))}
              </select>
              {errors.voucherTypeId && (
                <p className="mt-1 text-sm text-red-600">{errors.voucherTypeId.message}</p>
              )}
              {selectedVoucherType && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Clase:</strong> {selectedVoucherType.documentClass} •
                    <strong> Letra:</strong> {selectedVoucherType.letter} •
                    <strong> Código AFIP:</strong> {selectedVoucherType.afipCode || 'N/A'} •
                    <strong> Requiere CAE:</strong> {selectedVoucherType.requiresCae ? 'Sí' : 'No'}
                  </p>
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500">
                El tipo de comprobante no se puede modificar
              </p>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal
              </label>
              <select
                {...register('branchId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas las sucursales</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} - {branch.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Si no selecciona una sucursal, esta configuración aplicará a todas
              </p>
            </div>

            {/* Conexión AFIP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conexión AFIP
              </label>
              <select
                {...register('afipConnectionId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Ninguna (sin facturación electrónica)</option>
                {afipConnections.map((conn: any) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} - CUIT: {conn.cuit} ({conn.environment})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Requerido solo si el comprobante necesita CAE de AFIP
              </p>
            </div>

            {/* Punto de Venta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Punto de Venta
              </label>
              <select
                {...register('salesPointId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Ninguno</option>
                {salesPoints.map((sp: any) => (
                  <option key={sp.id} value={sp.id}>
                    PV {sp.number.toString().padStart(5, '0')} - {sp.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Número de punto de venta registrado en AFIP
              </p>
            </div>

            {/* Próximo Número */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Próximo Número de Comprobante *
              </label>
              <input
                type="number"
                {...register('nextVoucherNumber', { valueAsNumber: true })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                min={1}
              />
              {errors.nextVoucherNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.nextVoucherNumber.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                El sistema comenzará a numerar desde este valor
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/settings/voucher-configurations')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
