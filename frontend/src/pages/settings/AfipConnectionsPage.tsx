import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Wifi, Check, X, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { afipConnectionsApi, type AfipConnection } from '../../api/afip-connections'
import AfipConnectionModal from '../../components/settings/AfipConnectionModal'
import { useDialog } from '../../hooks/useDialog'

export default function AfipConnectionsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<AfipConnection | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [testResultModal, setTestResultModal] = useState<{ show: boolean; result: any }>({ show: false, result: null })

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['afip-connections', currentTenant?.slug],
    queryFn: () => afipConnectionsApi.getAll(currentTenant!.slug),
    enabled: !!currentTenant
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => afipConnectionsApi.delete(currentTenant!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afip-connections'] })
    }
  })

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (id: string) => afipConnectionsApi.testConnection(currentTenant!.slug, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['afip-connections'] })
      setTestResultModal({ show: true, result: data })
    },
    onError: (error: any) => {
      setTestResultModal({
        show: true,
        result: {
          success: false,
          error: error.response?.data?.error || error.message,
          testSteps: []
        }
      })
    }
  })

  const handleCreate = () => {
    setSelectedConnection(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEdit = (connection: AfipConnection) => {
    setSelectedConnection(connection)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = async (connection: AfipConnection) => {
    dialog.confirm(
      `¿Está seguro de eliminar la conexión "${connection.name}"?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(connection.id)
        } catch (error: any) {
          dialog.error(error.response?.data?.error || 'Error al eliminar la conexión')
        }
      },
      'Eliminar Conexión'
    )
  }

  const handleTest = async (connection: AfipConnection) => {
    testMutation.mutate(connection.id)
  }

  const getEnvironmentBadge = (env: string) => {
    if (env === 'production') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Producción</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Testing</span>
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Activo</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactivo</span>
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
          <h1 className="text-2xl font-semibold text-gray-900">Conexiones AFIP</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestione las configuraciones de conexión a AFIP con sus certificados y ambientes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nueva Conexión
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Nombre
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      CUIT
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Ambiente
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Certificado
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Última Prueba
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {connections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        No hay conexiones AFIP configuradas
                      </td>
                    </tr>
                  ) : (
                    connections.map((connection) => (
                      <tr key={connection.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900">{connection.name}</div>
                          {connection.description && (
                            <div className="text-gray-500">{connection.description}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {connection.cuit.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getEnvironmentBadge(connection.environment)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getStatusBadge(connection.isActive)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {connection.certificate ? (
                            <span className="text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Configurado</span>
                          ) : (
                            <span className="text-gray-400">No configurado</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {connection.lastTest ? (
                            <div>
                              <div className={connection.lastTestStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                                {connection.lastTestStatus === 'success' ? 'Exitosa' : 'Error'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(connection.lastTest).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No probada</span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleTest(connection)}
                            className={`mr-4 ${testMutation.isPending ? 'text-gray-400' : 'text-green-600 hover:text-green-900'}`}
                            title="Probar conexión"
                            disabled={testMutation.isPending}
                          >
                            {testMutation.isPending ? (
                              <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <Wifi className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(connection)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(connection)}
                            className="text-red-600 hover:text-red-900"
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

      {/* Modal */}
      {isModalOpen && (
        <AfipConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          connection={selectedConnection}
          mode={modalMode}
        />
      )}

      {/* Test Result Modal */}
      {testResultModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              {testResultModal.result.success ? (
                <h2 className="text-2xl font-bold text-green-600 flex items-center gap-2"><Check className="h-6 w-6" /> Conexión Exitosa</h2>
              ) : (
                <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2"><X className="h-6 w-6" /> Error en la Conexión</h2>
              )}
            </div>

            {testResultModal.result.success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{testResultModal.result.message}</p>
                <div className="mt-2 space-y-1 text-xs text-green-700">
                  <div><strong>Ambiente:</strong> {testResultModal.result.environment === 'production' ? 'Producción' : 'Testing (Homologación)'}</div>
                  <div><strong>CUIT:</strong> {testResultModal.result.cuit}</div>
                </div>
              </div>
            )}

            {!testResultModal.result.success && testResultModal.result.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-semibold text-red-800">Error:</p>
                <p className="text-sm text-red-700 mt-1">{testResultModal.result.error}</p>
                {testResultModal.result.details && (
                  <p className="text-xs text-red-600 mt-2">{testResultModal.result.details}</p>
                )}
              </div>
            )}

            {/* Test Steps */}
            {testResultModal.result.testSteps && testResultModal.result.testSteps.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">Pasos de Verificación:</h3>
                {testResultModal.result.testSteps.map((step: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${
                      step.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : step.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {step.status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                        {step.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                        {step.status === 'running' && <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className={`text-sm font-medium ${
                          step.status === 'success' ? 'text-green-900' :
                          step.status === 'error' ? 'text-red-900' :
                          'text-yellow-900'
                        }`}>
                          {step.step}
                        </p>
                        {step.details && (
                          <p className={`text-xs mt-1 ${
                            step.status === 'success' ? 'text-green-700' :
                            step.status === 'error' ? 'text-red-700' :
                            'text-yellow-700'
                          }`}>
                            {step.details}
                          </p>
                        )}
                        {step.error && (
                          <p className="text-xs mt-1 text-red-700 font-semibold">
                            Error: {step.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setTestResultModal({ show: false, result: null })}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
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
