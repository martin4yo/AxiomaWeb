import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../../api/sales'
import { AFIPProgressModal } from '../../components/sales/AFIPProgressModal'
import { RefreshCw } from 'lucide-react'

// Función para formatear números con separadores de miles y decimales
const formatNumber = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00'
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export default function SalesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [orderBy, setOrderBy] = useState('saleDate')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')

  // AFIP Progress Modal
  const [afipProgressModal, setAfipProgressModal] = useState<{
    show: boolean
    steps: Array<{
      id: string
      label: string
      status: 'pending' | 'loading' | 'success' | 'error' | 'warning'
      message?: string
      detail?: string
    }>
    canClose: boolean
    saleId: string | null
  }>({
    show: false,
    steps: [],
    canClose: false,
    saleId: null
  })

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, search, paymentStatus, orderBy, orderDirection],
    queryFn: () => salesApi.getSales({
      page,
      limit: 20,
      search: search || undefined,
      paymentStatus: paymentStatus || undefined,
      orderBy,
      orderDirection
    })
  })

  // Mutation para reintentar CAE
  const retryCaeMutation = useMutation({
    mutationFn: (saleId: string) => salesApi.retryCae(saleId),
    onSuccess: (response: any) => {
      // Actualizar progreso si el modal está abierto
      if (afipProgressModal.show) {
        setAfipProgressModal(prev => ({
          ...prev,
          steps: prev.steps.map(step => {
            if (step.id === 'request-cae' && response.sale.caeInfo) {
              const caeExpiration = new Date(response.sale.caeInfo.caeExpiration).toLocaleDateString('es-AR')
              return {
                ...step,
                status: 'success',
                message: 'CAE autorizado exitosamente',
                detail: `CAE: ${response.sale.caeInfo.cae}\nVencimiento: ${caeExpiration}`
              }
            }
            if (step.id === 'request-cae' && response.sale.caeError) {
              return {
                ...step,
                status: 'error',
                message: response.sale.caeError.message,
                detail: response.sale.caeError.detail
              }
            }
            return step
          }),
          canClose: true
        }))

        // Cerrar modal después de 3 segundos si fue exitoso
        if (response.sale.caeInfo) {
          setTimeout(() => {
            setAfipProgressModal({ show: false, steps: [], canClose: false, saleId: null })
            queryClient.invalidateQueries({ queryKey: ['sales'] })
          }, 3000)
        }
      }
    },
    onError: (error: any) => {
      if (afipProgressModal.show) {
        const errorMessage = error.response?.data?.error || error.message
        setAfipProgressModal(prev => ({
          ...prev,
          steps: prev.steps.map(step => {
            if (step.status === 'loading') {
              return {
                ...step,
                status: 'error',
                message: errorMessage
              }
            }
            return step
          }),
          canClose: true
        }))
      }
    }
  })

  const handleRetryCae = (saleId: string) => {
    // Mostrar modal de progreso
    setAfipProgressModal({
      show: true,
      steps: [
        {
          id: 'request-cae',
          label: 'Solicitando CAE a AFIP',
          status: 'loading',
          message: 'Procesando solicitud...'
        }
      ],
      canClose: false,
      saleId
    })

    // Ejecutar mutation
    retryCaeMutation.mutate(saleId)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <Link
          to="/sales/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Nueva Venta
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Número de venta, cliente..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Pago
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="paid">Pagado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordenar por
            </label>
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="saleDate">Fecha</option>
              <option value="saleNumber">Número</option>
              <option value="totalAmount">Total</option>
              <option value="customerName">Cliente</option>
              <option value="afipStatus">Estado AFIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <select
              value={orderDirection}
              onChange={(e) => setOrderDirection(e.target.value as 'asc' | 'desc')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : data?.sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay ventas registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CAE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AFIP
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 mb-1">
                        {sale.voucherTypeRelation?.name || sale.voucherType || 'Ticket'}
                      </div>
                      <Link
                        to={`/sales/${sale.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        {sale.saleNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.saleDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      ${formatNumber(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : sale.paymentStatus === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sale.paymentStatus === 'paid' ? 'Pagado' :
                         sale.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.afipCae ? (
                        <div>
                          <div className="text-xs font-mono text-gray-900">{sale.afipCae}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Vto: {new Date(sale.caeExpiration).toLocaleDateString('es-AR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.afipStatus === 'authorized' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Autorizado
                        </span>
                      )}
                      {sale.afipStatus === 'not_sent' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No enviado
                        </span>
                      )}
                      {sale.afipStatus === 'pending' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      )}
                      {sale.afipStatus === 'rejected' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Rechazado
                        </span>
                      )}
                      {sale.afipStatus === 'error' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Error
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(sale.afipStatus === 'error' || sale.afipStatus === 'not_sent' || sale.afipStatus === 'pending') &&
                       (sale.voucherType || sale.voucherTypeRelation) && (
                        <button
                          onClick={() => handleRetryCae(sale.id)}
                          disabled={retryCaeMutation.isPending}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Reintentar CAE"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((page - 1) * 20) + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(page * 20, data.pagination.total)}
                  </span>{' '}
                  de <span className="font-medium">{data.pagination.total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= data.pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AFIP Progress Modal */}
      <AFIPProgressModal
        isOpen={afipProgressModal.show}
        steps={afipProgressModal.steps}
        canClose={afipProgressModal.canClose}
        onClose={() => {
          setAfipProgressModal({ show: false, steps: [], canClose: false, saleId: null })
          queryClient.invalidateQueries({ queryKey: ['sales'] })
        }}
      />
    </div>
  )
}
