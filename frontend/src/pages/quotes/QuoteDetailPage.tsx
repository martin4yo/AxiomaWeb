import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { quotesApi } from '@/api/quotes'
import { ArrowLeft, Calendar, User, FileText, CheckCircle, XCircle, Clock, AlertCircle, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const QuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch quote data
  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.getQuoteById(id!),
    enabled: !!id
  })

  const handleChangeStatus = async (newStatus: string) => {
    if (!id) return

    const confirmMessage = newStatus === 'CANCELLED'
      ? '¿Está seguro de cancelar este presupuesto?'
      : `¿Cambiar estado a ${newStatus}?`

    if (!window.confirm(confirmMessage)) return

    try {
      await quotesApi.updateQuoteStatus(id, newStatus)
      queryClient.invalidateQueries({ queryKey: ['quote', id] })
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      alert('Estado actualizado exitosamente')
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert(err.response?.data?.error || 'Error al actualizar estado')
    }
  }

  const handleConvertToSale = () => {
    navigate(`/sales/new?fromQuote=${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar el presupuesto</p>
          <button
            onClick={() => navigate('/quotes')}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = {
    PENDING: { label: 'Pendiente', className: 'bg-gray-100 text-gray-800', icon: Clock },
    APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-800', icon: XCircle },
    EXPIRED: { label: 'Vencido', className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    PARTIALLY_CONVERTED: { label: 'Parcialmente Convertido', className: 'bg-blue-100 text-blue-800', icon: FileText },
    FULLY_CONVERTED: { label: 'Totalmente Convertido', className: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    CANCELLED: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800', icon: Ban }
  }

  const currentStatus = statusConfig[quote.status as keyof typeof statusConfig]
  const StatusIcon = currentStatus.icon

  const canConvert = quote.status !== 'FULLY_CONVERTED' && quote.status !== 'CANCELLED'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/quotes"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Presupuestos
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {quote.quoteNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Creado el {format(new Date(quote.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex gap-2">
            {canConvert && (
              <button
                onClick={handleConvertToSale}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Convertir a Venta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.className}`}>
          <StatusIcon className="w-4 h-4 mr-2" />
          {currentStatus.label}
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
                    {quote.status === 'PARTIALLY_CONVERTED' && (
                      <>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Convertido</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quote.items?.map((item: any) => (
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
                      {quote.status === 'PARTIALLY_CONVERTED' && (
                        <>
                          <td className="px-6 py-4 text-right text-sm text-green-600">
                            {Number(item.quantityConverted).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
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
                  <span className="font-medium">${Number(quote.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(quote.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-medium text-red-600">-${Number(quote.discountAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(quote.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">${Number(quote.taxAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${Number(quote.totalAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(quote.notes || quote.termsAndConditions || quote.internalNotes) && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Notas y Condiciones</h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                {quote.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notas del Presupuesto</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
                {quote.termsAndConditions && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Términos y Condiciones</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.termsAndConditions}</p>
                  </div>
                )}
                {quote.internalNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">Notas Internas</h3>
                    <p className="text-sm text-yellow-700 whitespace-pre-wrap">{quote.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Información del Cliente</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{quote.customerName}</p>
                  {quote.customer?.email && (
                    <p className="text-sm text-gray-500">{quote.customer.email}</p>
                  )}
                  {quote.customer?.phone && (
                    <p className="text-sm text-gray-500">{quote.customer.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fechas</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Fecha del Presupuesto</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(quote.quoteDate), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              </div>
              {quote.validUntil && (
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Válido Hasta</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(quote.validUntil), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Estado</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {quote.status !== 'FULLY_CONVERTED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cambiar Estado
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={quote.status}
                    onChange={(e) => handleChangeStatus(e.target.value)}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="APPROVED">Aprobado</option>
                    <option value="REJECTED">Rechazado</option>
                    <option value="EXPIRED">Vencido</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              )}

              {quote.status === 'FULLY_CONVERTED' && (
                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="text-sm text-purple-800">
                    Este presupuesto ha sido totalmente convertido a venta(s).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Created by */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Información de Auditoría</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div>
                <p className="text-sm text-gray-500">Creado por</p>
                <p className="text-sm font-medium text-gray-900">
                  {quote.creator?.firstName} {quote.creator?.lastName}
                </p>
                <p className="text-xs text-gray-500">{quote.creator?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de creación</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(quote.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              {quote.updatedAt !== quote.createdAt && (
                <div>
                  <p className="text-sm text-gray-500">Última actualización</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(quote.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuoteDetailPage
