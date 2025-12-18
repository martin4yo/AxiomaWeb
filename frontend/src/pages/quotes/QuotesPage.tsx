import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotesApi } from '../../api/quotes'
import { FileText, Loader2, XCircle, CheckCircle, Clock, Ban } from 'lucide-react'

// Función para formatear números con separadores de miles y decimales
const formatNumber = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00'
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Función para formatear fechas
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR')
}

// Badges de estado
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    PENDING: {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-800',
      icon: Clock
    },
    APPROVED: {
      label: 'Aprobado',
      className: 'bg-green-100 text-green-800',
      icon: CheckCircle
    },
    REJECTED: {
      label: 'Rechazado',
      className: 'bg-red-100 text-red-800',
      icon: XCircle
    },
    EXPIRED: {
      label: 'Vencido',
      className: 'bg-gray-100 text-gray-800',
      icon: Clock
    },
    PARTIALLY_CONVERTED: {
      label: 'Parcialmente Convertido',
      className: 'bg-blue-100 text-blue-800',
      icon: FileText
    },
    FULLY_CONVERTED: {
      label: 'Totalmente Convertido',
      className: 'bg-purple-100 text-purple-800',
      icon: CheckCircle
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-gray-100 text-gray-800',
      icon: Ban
    }
  }

  const config = statusConfig[status] || statusConfig.PENDING
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export default function QuotesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [orderBy, setOrderBy] = useState('quoteDate')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')

  // Estado para modal de cancelación
  const [cancelModal, setCancelModal] = useState<{
    show: boolean
    quote: any | null
  }>({
    show: false,
    quote: null
  })

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', page, search, status, orderBy, orderDirection],
    queryFn: () => quotesApi.getQuotes({
      page,
      limit: 20,
      search: search || undefined,
      status: status || undefined,
      orderBy,
      orderDirection
    })
  })

  // Mutation para cancelar presupuesto
  const cancelQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => quotesApi.cancelQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      setCancelModal({ show: false, quote: null })
      alert('Presupuesto cancelado correctamente')
    },
    onError: (error: any) => {
      alert(`Error al cancelar presupuesto: ${error.response?.data?.error || error.message}`)
    }
  })

  const handleCancelQuote = (quote: any) => {
    setCancelModal({ show: true, quote })
  }

  const confirmCancelQuote = () => {
    if (cancelModal.quote) {
      cancelQuoteMutation.mutate(cancelModal.quote.id)
    }
  }

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setOrderDirection('desc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-600">Gestiona los presupuestos de tu negocio</p>
        </div>
        <Link
          to="/quotes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo Presupuesto
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Estado */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="APPROVED">Aprobado</option>
            <option value="REJECTED">Rechazado</option>
            <option value="EXPIRED">Vencido</option>
            <option value="PARTIALLY_CONVERTED">Parcialmente Convertido</option>
            <option value="FULLY_CONVERTED">Totalmente Convertido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          {/* Ordenamiento */}
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="quoteDate">Fecha</option>
            <option value="quoteNumber">Número</option>
            <option value="customerName">Cliente</option>
            <option value="totalAmount">Monto</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quoteNumber')}
                    >
                      Número {orderBy === 'quoteNumber' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quoteDate')}
                    >
                      Fecha {orderBy === 'quoteDate' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customerName')}
                    >
                      Cliente {orderBy === 'customerName' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalAmount')}
                    >
                      Total {orderBy === 'totalAmount' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No se encontraron presupuestos
                      </td>
                    </tr>
                  ) : (
                    data?.data?.map((quote: any) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quote.quoteNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(quote.quoteDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quote.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quote.validUntil ? formatDate(quote.validUntil) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          ${formatNumber(quote.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={quote.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                          <Link
                            to={`/quotes/${quote.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver
                          </Link>
                          {quote.status !== 'FULLY_CONVERTED' && quote.status !== 'CANCELLED' && (
                            <>
                              <Link
                                to={`/sales/new?fromQuote=${quote.id}`}
                                className="text-green-600 hover:text-green-900"
                              >
                                Convertir
                              </Link>
                              <button
                                onClick={() => handleCancelQuote(quote)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {data?.pagination && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">{(page - 1) * data.pagination.limit + 1}</span>
                      {' '}-{' '}
                      <span className="font-medium">
                        {Math.min(page * data.pagination.limit, data.pagination.total)}
                      </span>
                      {' '}de{' '}
                      <span className="font-medium">{data.pagination.total}</span>
                      {' '}presupuestos
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Página {page} de {data.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= data.pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación de cancelación */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Cancelación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro que deseas cancelar el presupuesto <strong>{cancelModal.quote?.quoteNumber}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelModal({ show: false, quote: null })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelQuoteMutation.isPending}
              >
                No, volver
              </button>
              <button
                onClick={confirmCancelQuote}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelQuoteMutation.isPending}
              >
                {cancelQuoteMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </span>
                ) : (
                  'Sí, cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
