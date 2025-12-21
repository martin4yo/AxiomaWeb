import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Pencil, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { voucherConfigurationsApi, type VoucherConfiguration } from '../../api/voucher-configurations'
import { api } from '../../services/api'
import { useDialog } from '../../hooks/useDialog'

export default function VoucherConfigurationsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [afipCheckResult, setAfipCheckResult] = useState<{ show: boolean; data: any }>({ show: false, data: null })
  const [checkingConfigId, setCheckingConfigId] = useState<string | null>(null)

  // Fetch configurations
  const { data: configurations = [], isLoading } = useQuery({
    queryKey: ['voucher-configurations', currentTenant?.slug],
    queryFn: () => voucherConfigurationsApi.getAll(currentTenant!.slug),
    enabled: !!currentTenant
  })

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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => voucherConfigurationsApi.delete(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voucher-configurations'] })
    }
  })

  // Check AFIP number mutation
  const checkAfipMutation = useMutation({
    mutationFn: (id: string) => voucherConfigurationsApi.checkAfipNumber(currentTenant!.slug, id),
    onSuccess: (data) => {
      setAfipCheckResult({ show: true, data })
      setCheckingConfigId(null)
      // Si se actualizó el número, refrescar la lista
      if (data.wasUpdated) {
        queryClient.invalidateQueries({ queryKey: ['voucher-configurations'] })
      }
    },
    onError: (error: any) => {
      setCheckingConfigId(null)
      dialog.error(error.response?.data?.error || error.message)
    }
  })

  const handleCheckAfipNumber = (configId: string) => {
    setCheckingConfigId(configId)
    checkAfipMutation.mutate(configId)
  }

  const handleDelete = async (config: VoucherConfiguration) => {
    dialog.confirm(
      `¿Está seguro de eliminar la configuración para ${config.voucherType?.name}?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(config.id)
        } catch (error: any) {
          dialog.error(error.response?.data?.error || 'Error al eliminar la configuración')
        }
      },
      'Eliminar Configuración'
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Configuración de Comprobantes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure qué tipos de comprobantes se pueden emitir en cada sucursal y asigne las conexiones AFIP y puntos de venta correspondientes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a
            href="/settings/voucher-configurations/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nueva Configuración
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Configuraciones Activas</dt>
                  <dd className="text-lg font-medium text-gray-900">{configurations.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tipos Disponibles</dt>
                  <dd className="text-lg font-medium text-gray-900">{voucherTypes.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sucursales</dt>
                  <dd className="text-lg font-medium text-gray-900">{branches.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configurations List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Tipo de Comprobante
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Sucursal
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Conexión AFIP
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Punto de Venta
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Próximo Número
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {configurations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        No hay configuraciones creadas. Comienza creando tu primera configuración.
                      </td>
                    </tr>
                  ) : (
                    configurations.map((config) => (
                      <tr key={config.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900">{config.voucherType?.name}</div>
                          <div className="text-gray-500">{config.voucherType?.code}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {config.branch ? `${config.branch.code} - ${config.branch.name}` : 'Todas'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {config.afipConnection ? (
                            <div>
                              <div>{config.afipConnection.name}</div>
                              <div className="text-xs text-gray-400">CUIT: {config.afipConnection.cuit}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No asignada</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {config.salesPoint ? (
                            `PV ${config.salesPoint.number.toString().padStart(5, '0')} - ${config.salesPoint.name}`
                          ) : (
                            <span className="text-gray-400">No asignado</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-mono">
                          {config.nextVoucherNumber.toString().padStart(8, '0')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          {config.voucherType?.requiresCae && config.afipConnectionId && (
                            <button
                              onClick={() => handleCheckAfipNumber(config.id)}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              title="Consultar último número en AFIP"
                              disabled={checkingConfigId === config.id}
                            >
                              {checkingConfigId === config.id ? (
                                <div className="inline-block animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <RefreshCw className="h-5 w-5 inline" />
                              )}
                            </button>
                          )}
                          <a
                            href={`/settings/voucher-configurations/${config.id}/edit`}
                            className="text-gray-600 hover:text-gray-900"
                            title="Editar configuración"
                          >
                            <Pencil className="h-5 w-5 inline" />
                          </a>
                          <button
                            onClick={() => handleDelete(config)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar configuración"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AFIP Check Result Modal */}
      {afipCheckResult.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Consulta de Número en AFIP
            </h2>

            {afipCheckResult.data.success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-900">Consulta Exitosa</span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último número en BD local:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {afipCheckResult.data.dbNumber?.toString().padStart(8, '0')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Último número en AFIP:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {afipCheckResult.data.afipNumber?.toString().padStart(8, '0')}
                      </span>
                    </div>

                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-gray-600 font-semibold">Mayor de ambos:</span>
                      <span className="font-mono font-bold text-blue-600">
                        {afipCheckResult.data.maxNumber?.toString().padStart(8, '0')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Configuración anterior:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {afipCheckResult.data.localNumber?.toString().padStart(8, '0')}
                      </span>
                    </div>

                    {afipCheckResult.data.wasUpdated && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">Nueva configuración:</span>
                        <span className="font-mono font-bold text-green-600">
                          {afipCheckResult.data.newLocalNumber?.toString().padStart(8, '0')}
                        </span>
                      </div>
                    )}
                  </div>

                  {afipCheckResult.data.wasUpdated ? (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs text-green-800">
                        Numero local actualizado al mayor entre BD local y AFIP + 1.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-blue-800">
                        La configuracion ya esta sincronizada.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center mb-2">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-semibold text-red-900">Error en la Consulta</span>
                </div>
                <p className="text-sm text-red-700 mt-2">{afipCheckResult.data.error}</p>
                <div className="mt-3 text-sm">
                  <span className="text-gray-600">Número local actual: </span>
                  <span className="font-mono font-bold">
                    {afipCheckResult.data.localNumber?.toString().padStart(8, '0')}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setAfipCheckResult({ show: false, data: null })}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
