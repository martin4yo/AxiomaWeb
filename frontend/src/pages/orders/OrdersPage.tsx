import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, OrderStatus } from '../../api/orders'
import { useDialog } from '../../hooks/useDialog'
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  Clock,
  Ban,
  Eye,
  ShoppingCart,
  X,
  Package,
  Truck,
  FileCheck,
  Play
} from 'lucide-react'

const formatNumber = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0,00'
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR')
}

// Badges de estado
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig: Record<OrderStatus, { label: string; className: string; icon: any }> = {
    DRAFT: {
      label: 'Borrador',
      className: 'bg-gray-100 text-gray-800',
      icon: ClipboardList
    },
    CONFIRMED: {
      label: 'Confirmado',
      className: 'bg-blue-100 text-blue-800',
      icon: CheckCircle
    },
    PROCESSING: {
      label: 'En Preparacion',
      className: 'bg-yellow-100 text-yellow-800',
      icon: Package
    },
    READY: {
      label: 'Listo',
      className: 'bg-green-100 text-green-800',
      icon: Truck
    },
    PARTIALLY_INVOICED: {
      label: 'Parcialmente Facturado',
      className: 'bg-purple-100 text-purple-800',
      icon: FileCheck
    },
    COMPLETED: {
      label: 'Completado',
      className: 'bg-green-100 text-green-800',
      icon: CheckCircle
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-red-100 text-red-800',
      icon: Ban
    }
  }

  const config = statusConfig[status] || statusConfig.DRAFT
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// Badge de comportamiento de stock
const StockBehaviorBadge = ({ behavior }: { behavior: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    NONE: { label: 'Sin Stock', className: 'bg-gray-100 text-gray-600' },
    RESERVE: { label: 'Reservado', className: 'bg-blue-100 text-blue-600' },
    DEDUCT: { label: 'Descontado', className: 'bg-orange-100 text-orange-600' }
  }

  const c = config[behavior] || config.NONE
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${c.className}`}>
      {c.label}
    </span>
  )
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [orderBy, setOrderBy] = useState('orderDate')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')

  // Modal de cancelacion
  const [cancelModal, setCancelModal] = useState<{ show: boolean; order: any | null }>({
    show: false,
    order: null
  })

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, status, orderBy, orderDirection],
    queryFn: () => ordersApi.getOrders({
      page,
      limit: 20,
      search: search || undefined,
      status: (status as OrderStatus) || undefined,
      orderBy,
      orderDirection
    })
  })

  // Mutation para cancelar pedido
  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setCancelModal({ show: false, order: null })
      dialog.success('Pedido cancelado correctamente')
    },
    onError: (error: any) => {
      dialog.error(error.response?.data?.error || error.message)
    }
  })

  // Mutation para confirmar pedido
  const confirmOrderMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.confirmOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      dialog.success('Pedido confirmado correctamente')
    },
    onError: (error: any) => {
      dialog.error(error.response?.data?.error || error.message)
    }
  })

  // Mutation para cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      dialog.success('Estado actualizado correctamente')
    },
    onError: (error: any) => {
      dialog.error(error.response?.data?.error || error.message)
    }
  })

  const handleCancelOrder = (order: any) => {
    setCancelModal({ show: true, order })
  }

  const confirmCancelOrder = () => {
    if (cancelModal.order) {
      cancelOrderMutation.mutate(cancelModal.order.id)
    }
  }

  const handleConfirmOrder = (orderId: string) => {
    confirmOrderMutation.mutate(orderId)
  }

  const handleAdvanceStatus = (order: any) => {
    const statusFlow: Record<string, OrderStatus> = {
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'READY',
      READY: 'READY' // No avanza mas, debe facturarse
    }
    const nextStatus = statusFlow[order.status]
    if (nextStatus && nextStatus !== order.status) {
      updateStatusMutation.mutate({ id: order.id, status: nextStatus })
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

  const canAdvanceStatus = (status: string) => {
    return ['CONFIRMED', 'PROCESSING'].includes(status)
  }

  const canInvoice = (status: string) => {
    return ['CONFIRMED', 'PROCESSING', 'READY', 'PARTIALLY_INVOICED'].includes(status)
  }

  const canCancel = (status: string) => {
    return ['DRAFT', 'CONFIRMED', 'PROCESSING', 'READY'].includes(status)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gestiona los pedidos de clientes</p>
        </div>
        <Link
          to="/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo Pedido
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar por numero o cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="PROCESSING">En Preparacion</option>
            <option value="READY">Listo</option>
            <option value="PARTIALLY_INVOICED">Parcialmente Facturado</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="orderDate">Fecha</option>
            <option value="orderNumber">Numero</option>
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
                      onClick={() => handleSort('orderNumber')}
                    >
                      Numero {orderBy === 'orderNumber' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('orderDate')}
                    >
                      Fecha {orderBy === 'orderDate' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customerName')}
                    >
                      Cliente {orderBy === 'customerName' && (orderDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrega
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
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
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No se encontraron pedidos
                      </td>
                    </tr>
                  ) : (
                    data?.data?.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span>{order.orderNumber}</span>
                            {order.quote && (
                              <span className="text-xs text-gray-500">
                                De: {order.quote.quoteNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.expectedDate ? formatDate(order.expectedDate) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StockBehaviorBadge behavior={order.stockBehavior} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">${formatNumber(order.totalAmount)}</span>
                            {Number(order.pendingAmount) < Number(order.totalAmount) && (
                              <span className="text-xs text-green-600">
                                Pend: ${formatNumber(order.pendingAmount)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/orders/${order.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Ver detalle"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>

                            {/* Confirmar (solo si es borrador) */}
                            {order.status === 'DRAFT' && (
                              <button
                                onClick={() => handleConfirmOrder(order.id)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Confirmar pedido"
                                disabled={confirmOrderMutation.isPending}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                            )}

                            {/* Avanzar estado */}
                            {canAdvanceStatus(order.status) && (
                              <button
                                onClick={() => handleAdvanceStatus(order)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                title="Avanzar estado"
                                disabled={updateStatusMutation.isPending}
                              >
                                <Play className="h-5 w-5" />
                              </button>
                            )}

                            {/* Facturar */}
                            {canInvoice(order.status) && (
                              <Link
                                to={`/sales/new?fromOrder=${order.id}`}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Facturar pedido"
                              >
                                <ShoppingCart className="h-5 w-5" />
                              </Link>
                            )}

                            {/* Cancelar */}
                            {canCancel(order.status) && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                title="Cancelar pedido"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginacion */}
            {data?.pagination && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                      {' '}pedidos
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
                        Pagina {page} de {data.pagination.totalPages}
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

      {/* Modal de confirmacion de cancelacion */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Cancelacion</h3>
            <p className="text-gray-600 mb-2">
              ¿Esta seguro que desea cancelar el pedido <strong>{cancelModal.order?.orderNumber}</strong>?
            </p>
            {cancelModal.order?.stockBehavior !== 'NONE' && (
              <p className="text-sm text-blue-600 mb-4">
                El stock reservado/descontado sera liberado automaticamente.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelModal({ show: false, order: null })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelOrderMutation.isPending}
              >
                No, volver
              </button>
              <button
                onClick={confirmCancelOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelOrderMutation.isPending}
              >
                {cancelOrderMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </span>
                ) : (
                  'Si, cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
