import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../../api/sales'
import { AFIPProgressModal } from '../../components/sales/AFIPProgressModal'
import { RefreshCw, Printer, FileText, Receipt, Loader2, Mail, XCircle } from 'lucide-react'

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
  const [afipStatus, setAfipStatus] = useState('')
  const [orderBy, setOrderBy] = useState('saleDate')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')

  // Estado para mostrar spinner mientras prepara impresión
  const [printingId, setPrintingId] = useState<string | null>(null)

  // Estado para modal de envío de email
  const [emailModal, setEmailModal] = useState<{
    show: boolean
    saleId: string | null
    email: string
    sending: boolean
    message: { type: 'success' | 'error'; text: string } | null
  }>({
    show: false,
    saleId: null,
    email: '',
    sending: false,
    message: null
  })

  // Estado para modal de confirmación de anulación
  const [cancelModal, setCancelModal] = useState<{
    show: boolean
    sale: any | null
  }>({
    show: false,
    sale: null
  })

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
    queryKey: ['sales', page, search, paymentStatus, afipStatus, orderBy, orderDirection],
    queryFn: () => salesApi.getSales({
      page,
      limit: 20,
      search: search || undefined,
      paymentStatus: paymentStatus || undefined,
      afipStatus: afipStatus || undefined,
      orderBy,
      orderDirection
    })
  })

  // Mutation para anular venta
  const cancelSaleMutation = useMutation({
    mutationFn: (saleId: string) => salesApi.cancelSale(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setCancelModal({ show: false, sale: null })
      alert('Venta anulada correctamente')
    },
    onError: (error: any) => {
      alert(`Error al anular venta: ${error.response?.data?.error || error.message}`)
    }
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

  // Reimprimir ticket de venta
  const handlePrintPDF = async (saleId: string) => {
    try {
      // Usar salesApi para obtener el PDF con autenticación
      const response = await salesApi.getPDF(saleId)

      // Crear blob URL y abrirlo en nueva ventana
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Limpiar blob URL después de un tiempo
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
    } catch (error: any) {
      console.error('Error al generar PDF:', error)
      alert(`Error al generar PDF: ${error.response?.data?.error || error.message}`)
    }
  }

  const handlePrintSale = async (saleId: string) => {
    try {
      // Mostrar spinner mientras prepara la impresión
      setPrintingId(saleId)

      // Usar el nuevo endpoint de impresión térmica
      const response = await salesApi.printThermal(saleId)

      // Mostrar mensaje de éxito
      console.log(`✅ ${response.message} (método: ${response.method})`)
    } catch (error: any) {
      console.error('Error al imprimir ticket:', error)
      alert(`Error al imprimir: ${error.message || 'Error desconocido'}`)
    } finally {
      // Quitar spinner después de un pequeño delay para que se vea el diálogo de impresión
      setTimeout(() => setPrintingId(null), 500)
    }
  }

  const handleOpenEmailModal = (saleId: string, customerEmail?: string) => {
    setEmailModal({
      show: true,
      saleId,
      email: customerEmail || '',
      sending: false,
      message: null
    })
  }

  const handleSendEmail = async () => {
    if (!emailModal.email.trim() || !emailModal.saleId) {
      setEmailModal(prev => ({
        ...prev,
        message: { type: 'error', text: 'Por favor ingrese un email válido' }
      }))
      return
    }

    setEmailModal(prev => ({ ...prev, sending: true, message: null }))

    try {
      const result = await salesApi.sendEmail(emailModal.saleId, emailModal.email.trim())

      setEmailModal(prev => ({
        ...prev,
        sending: false,
        message: { type: 'success', text: result.message || 'Email enviado correctamente' }
      }))

      // Cerrar modal después de 2 segundos si fue exitoso
      setTimeout(() => {
        setEmailModal({
          show: false,
          saleId: null,
          email: '',
          sending: false,
          message: null
        })
      }, 2000)
    } catch (error: any) {
      setEmailModal(prev => ({
        ...prev,
        sending: false,
        message: {
          type: 'error',
          text: error.response?.data?.error || error.message || 'Error al enviar email'
        }
      }))
    }
  }

  const handleOpenCancelModal = (sale: any) => {
    setCancelModal({ show: true, sale })
  }

  const handleConfirmCancel = () => {
    if (cancelModal.sale) {
      cancelSaleMutation.mutate(cancelModal.sale.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              Estado AFIP
            </label>
            <select
              value={afipStatus}
              onChange={(e) => setAfipStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="authorized">Autorizado</option>
              <option value="pending">Pendiente</option>
              <option value="error">Error</option>
              <option value="rejected">Rechazado</option>
              <option value="not_sent">Sin CAE</option>
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
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón de imprimir térmica - icono diferente según template */}
                        <button
                          onClick={() => handlePrintSale(sale.id)}
                          disabled={printingId === sale.id}
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                            printingId === sale.id
                              ? 'text-blue-400 cursor-wait'
                              : sale.voucherConfiguration?.printTemplate?.toUpperCase() === 'LEGAL' ||
                                sale.voucherConfiguration?.voucherType?.requiresCae
                                ? 'text-green-600 hover:text-green-800'
                                : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title={
                            printingId === sale.id
                              ? 'Preparando impresión...'
                              : sale.voucherConfiguration?.printTemplate?.toUpperCase() === 'LEGAL' ||
                                sale.voucherConfiguration?.voucherType?.requiresCae
                                ? 'Imprimir ticket fiscal (con CAE/QR)'
                                : 'Imprimir ticket simple'
                          }
                        >
                          {printingId === sale.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : sale.voucherConfiguration?.printTemplate?.toUpperCase() === 'LEGAL' ||
                             sale.voucherConfiguration?.voucherType?.requiresCae ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>

                        {/* Botón de generar PDF */}
                        <button
                          onClick={() => handlePrintPDF(sale.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          title="Generar PDF A4"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Botón de enviar por email */}
                        <button
                          onClick={() => handleOpenEmailModal(sale.id, sale.customer?.email)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800"
                          title="Enviar por email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>

                        {/* Botón de reintentar CAE - solo si aplica */}
                        {(sale.afipStatus === 'error' || sale.afipStatus === 'not_sent' || sale.afipStatus === 'pending') &&
                         (sale.voucherType || sale.voucherTypeRelation) &&
                         sale.voucherConfiguration?.afipConnection && (
                          <button
                            onClick={() => handleRetryCae(sale.id)}
                            disabled={retryCaeMutation.isPending}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Reintentar CAE"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botón de anular venta - solo si no está cancelada */}
                        {sale.status !== 'cancelled' && (
                          <button
                            onClick={() => handleOpenCancelModal(sale)}
                            disabled={cancelSaleMutation.isPending}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Anular venta"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

      {/* Email Modal */}
      {emailModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => !emailModal.sending && setEmailModal({ show: false, saleId: null, email: '', sending: false, message: null })} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Enviar Comprobante por Email</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email del Cliente
                </label>
                <input
                  type="email"
                  value={emailModal.email}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={emailModal.sending}
                />
              </div>

              {emailModal.message && (
                <div className={`p-2 rounded-md flex items-center space-x-2 ${
                  emailModal.message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <span className="text-xs font-medium">{emailModal.message.text}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEmailModal({ show: false, saleId: null, email: '', sending: false, message: null })}
                  disabled={emailModal.sending}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailModal.sending || !emailModal.email.trim()}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  {emailModal.sending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3" />
                      <span>Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal.show && cancelModal.sale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => !cancelSaleMutation.isPending && setCancelModal({ show: false, sale: null })} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Anulación de Venta</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Se va a anular la venta por el importe de <span className="font-bold">${formatNumber(cancelModal.sale.totalAmount)}</span>
                  {cancelModal.sale.afipStatus === 'authorized' && (
                    <> generando una <span className="font-bold">Nota de Crédito {cancelModal.sale.voucherConfiguration?.voucherType?.letter || 'C'}</span> con número de comprobante fiscal</>
                  )}
                  .
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Comprobante:</span> {cancelModal.sale.voucherTypeRelation?.name || cancelModal.sale.voucherType || 'Ticket'} {cancelModal.sale.saleNumber}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Cliente:</span> {cancelModal.sale.customerName}
                </p>
                {cancelModal.sale.afipStatus === 'authorized' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Importante:</strong> Esta venta tiene un CAE autorizado. Se generará automáticamente una Nota de Crédito {cancelModal.sale.voucherConfiguration?.voucherType?.letter || 'C'} que será enviada a AFIP.
                    </p>
                  </div>
                )}
                <p className="text-sm text-red-600 font-medium">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCancelModal({ show: false, sale: null })}
                disabled={cancelSaleMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelSaleMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {cancelSaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Anulando...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Anular Venta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
