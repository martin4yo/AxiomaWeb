import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { ordersApi, OrderStatus } from '@/api/orders'
import { useDialog } from '@/hooks/useDialog'
import { TraceabilityModal } from '@/components/traceability/TraceabilityModal'
import {
  ArrowLeft,
  Calendar,
  User,
  CheckCircle,
  Clock,
  Ban,
  Package,
  Truck,
  FileCheck,
  ClipboardList,
  Warehouse,
  Play,
  ShoppingCart,
  X,
  GitBranch
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dialog = useDialog()
  const [showTraceability, setShowTraceability] = useState(false)

  // Fetch order data
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id
  })

  // Mutation para confirmar
  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.confirmOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      dialog.success('Pedido confirmado exitosamente')
    },
    onError: (err: any) => {
      dialog.error(err.response?.data?.error || 'Error al confirmar pedido')
    }
  })

  // Mutation para cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateOrderStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      dialog.success('Estado actualizado exitosamente')
    },
    onError: (err: any) => {
      dialog.error(err.response?.data?.error || 'Error al actualizar estado')
    }
  })

  // Mutation para cancelar
  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      dialog.success('Pedido cancelado exitosamente')
    },
    onError: (err: any) => {
      dialog.error(err.response?.data?.error || 'Error al cancelar pedido')
    }
  })

  const handleConfirm = () => {
    dialog.showConfirm(
      'Confirmar Pedido',
      '¿Desea confirmar este pedido?',
      () => confirmMutation.mutate(),
      'info'
    )
  }

  const handleAdvanceStatus = () => {
    if (!order) return
    const statusFlow: Record<string, OrderStatus> = {
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'READY'
    }
    const nextStatus = statusFlow[order.status]
    if (nextStatus) {
      dialog.showConfirm(
        'Avanzar Estado',
        `¿Desea avanzar el pedido a "${getStatusLabel(nextStatus)}"?`,
        () => updateStatusMutation.mutate(nextStatus),
        'info'
      )
    }
  }

  const handleCancel = () => {
    dialog.showConfirm(
      'Cancelar Pedido',
      order?.stockBehavior !== 'NONE'
        ? 'El stock reservado/descontado sera liberado. ¿Desea cancelar este pedido?'
        : '¿Desea cancelar este pedido?',
      () => cancelMutation.mutate(),
      'danger'
    )
  }

  const handleConvertToSale = () => {
    navigate(`/sales/new?fromOrder=${id}`)
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      CONFIRMED: 'Confirmado',
      PROCESSING: 'En Preparacion',
      READY: 'Listo para Entrega',
      PARTIALLY_INVOICED: 'Parcialmente Facturado',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado'
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar el pedido</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-800', icon: ClipboardList },
    CONFIRMED: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    PROCESSING: { label: 'En Preparacion', className: 'bg-yellow-100 text-yellow-800', icon: Package },
    READY: { label: 'Listo para Entrega', className: 'bg-green-100 text-green-800', icon: Truck },
    PARTIALLY_INVOICED: { label: 'Parcialmente Facturado', className: 'bg-purple-100 text-purple-800', icon: FileCheck },
    COMPLETED: { label: 'Completado', className: 'bg-green-100 text-green-800', icon: CheckCircle },
    CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800', icon: Ban }
  }

  const stockBehaviorLabels: Record<string, { label: string; className: string }> = {
    NONE: { label: 'Sin afectar stock', className: 'bg-gray-100 text-gray-600' },
    RESERVE: { label: 'Stock reservado', className: 'bg-blue-100 text-blue-600' },
    DEDUCT: { label: 'Stock descontado', className: 'bg-orange-100 text-orange-600' }
  }

  const currentStatus = statusConfig[order.status] || statusConfig.DRAFT
  const StatusIcon = currentStatus.icon
  const stockInfo = stockBehaviorLabels[order.stockBehavior] || stockBehaviorLabels.NONE

  const canConfirm = order.status === 'DRAFT'
  const canAdvanceStatus = ['CONFIRMED', 'PROCESSING'].includes(order.status)
  const canInvoice = ['CONFIRMED', 'PROCESSING', 'READY', 'PARTIALLY_INVOICED'].includes(order.status)
  const canCancel = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'READY'].includes(order.status)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Pedidos
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Creado el {format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            {order.quote && (
              <p className="text-sm text-blue-600">
                Desde presupuesto: {order.quote.quoteNumber}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {canConfirm && (
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar
              </button>
            )}

            {canAdvanceStatus && (
              <button
                onClick={handleAdvanceStatus}
                disabled={updateStatusMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Avanzar Estado
              </button>
            )}

            {canInvoice && (
              <button
                onClick={handleConvertToSale}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Facturar
              </button>
            )}

            {/* Botón Trazabilidad */}
            <button
              onClick={() => setShowTraceability(true)}
              className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              Trazabilidad
            </button>

            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex gap-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.className}`}>
          <StatusIcon className="w-4 h-4 mr-2" />
          {currentStatus.label}
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stockInfo.className}`}>
          {stockInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Descuento</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    {order.status === 'PARTIALLY_INVOICED' && (
                      <>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Facturado</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          {item.productSku && (
                            <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                          )}
                          {item.description && (
                            <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {Number(item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        ${Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {Number(item.discountPercent) > 0 && `${Number(item.discountPercent)}%`}
                        {Number(item.discountAmount) > 0 && (
                          <div className="text-red-600">
                            -${Number(item.discountAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${Number(item.lineTotal).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {order.status === 'PARTIALLY_INVOICED' && (
                        <>
                          <td className="px-6 py-4 text-right text-sm text-green-600">
                            {Number(item.quantityInvoiced).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-blue-600">
                            {Number(item.quantityPending).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${Number(order.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-medium text-red-600">-${Number(order.discountAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(order.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">${Number(order.taxAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${Number(order.totalAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(order.invoicedAmount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Facturado:</span>
                      <span>${Number(order.invoicedAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-600 font-medium">
                      <span>Pendiente:</span>
                      <span>${Number(order.pendingAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.notes || order.internalNotes) && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Notas</h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                {order.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notas del Pedido</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
                {order.internalNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">Notas Internas</h3>
                    <p className="text-sm text-yellow-700 whitespace-pre-wrap">{order.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock Reservations */}
          {order.stockReservations && order.stockReservations.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Reservas de Stock</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reservado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Usado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.stockReservations.map((res: any) => (
                      <tr key={res.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {res.product?.name || 'Producto'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {Number(res.quantity).toLocaleString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-green-600">
                          {Number(res.quantityUsed).toLocaleString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            res.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            res.status === 'consumed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {res.status === 'active' ? 'Activa' :
                             res.status === 'consumed' ? 'Consumida' : 'Liberada'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Cliente</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                  {order.customer?.email && (
                    <p className="text-sm text-gray-500">{order.customer.email}</p>
                  )}
                  {order.customer?.phone && (
                    <p className="text-sm text-gray-500">{order.customer.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warehouse Info */}
          {order.warehouse && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Almacen</h2>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-start">
                  <Warehouse className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <p className="text-sm font-medium text-gray-900">{order.warehouse.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fechas</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Fecha del Pedido</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(order.orderDate), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              </div>
              {order.expectedDate && (
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha Esperada de Entrega</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(order.expectedDate), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Created by */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Auditoria</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div>
                <p className="text-sm text-gray-500">Creado por</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.creator?.firstName} {order.creator?.lastName}
                </p>
                <p className="text-xs text-gray-500">{order.creator?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de creacion</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div>
                  <p className="text-sm text-gray-500">Ultima actualizacion</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />

      {/* Modal de Trazabilidad */}
      <TraceabilityModal
        isOpen={showTraceability}
        onClose={() => setShowTraceability(false)}
        documentType="order"
        documentId={id || ''}
      />
    </div>
  )
}

export default OrderDetailPage
