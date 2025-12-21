import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Lightbulb } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuthStore } from '../../stores/authStore'
import { entityAccountService, PendingDocument } from '../../services/entityAccountService'
import { api } from '../../services/api'
import { format } from 'date-fns'
import { useDialog } from '../../hooks/useDialog'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityName: string
  type: 'customer' | 'supplier' // customer = cobro, supplier = pago
}

export function PaymentModal({ isOpen, onClose, entityId, entityName, type }: PaymentModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const dialog = useDialog()

  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const isCustomer = type === 'customer'
  const title = isCustomer ? 'Registrar Cobro' : 'Registrar Pago'
  const actionLabel = isCustomer ? 'Cobrar' : 'Pagar'

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/payment-methods`)
      return response.data
    },
    enabled: !!currentTenant
  })

  // Fetch pending documents
  const { data: pendingDocs, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-documents', currentTenant?.slug, entityId, type],
    queryFn: () => entityAccountService.getPendingDocuments(entityId, type),
    enabled: !!currentTenant && isOpen
  })

  // Register payment mutation
  const registerPayment = useMutation({
    mutationFn: async (data: any) => {
      return await entityAccountService.registerPayment(entityId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-balance'] })
      queryClient.invalidateQueries({ queryKey: ['entity-movements'] })
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] })
      onClose()
      // Reset form
      setAmount('')
      setPaymentMethodId('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setReference('')
      setNotes('')
    }
  })

  useEffect(() => {
    if (isOpen && paymentMethods && paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].id)
    }
  }, [isOpen, paymentMethods, paymentMethodId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      dialog.warning('Ingrese un monto válido')
      return
    }

    if (!paymentMethodId) {
      dialog.warning('Seleccione un método de pago')
      return
    }

    const selectedMethod = paymentMethods?.find((pm: any) => pm.id === paymentMethodId)
    if (!selectedMethod) {
      dialog.warning('Método de pago no encontrado')
      return
    }

    registerPayment.mutate({
      type: isCustomer ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT',
      amount: parseFloat(amount),
      paymentMethodId,
      paymentMethodName: selectedMethod.name,
      date,
      reference: reference || undefined,
      notes: notes || undefined
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy')
  }

  const totalPending = pendingDocs?.reduce((sum, doc) => sum + doc.balanceAmount, 0) || 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{entityName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Payment Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {totalPending > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Saldo pendiente total: {formatCurrency(totalPending)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago *
                </label>
                <Select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {paymentMethods?.map((method: any) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referencia
                </label>
                <Input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Nro. cheque, transferencia, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            {/* Pending Documents */}
            {isLoadingPending ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            ) : pendingDocs && pendingDocs.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Comprobantes Pendientes ({pendingDocs.length})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Número
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Pagado
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingDocs.map((doc: PendingDocument) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {doc.documentNumber}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {formatDate(doc.date)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatCurrency(doc.totalAmount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600 text-right">
                            {formatCurrency(doc.paidAmount)}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                            {formatCurrency(doc.balanceAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" /> El pago se aplicará automáticamente a los comprobantes pendientes más antiguos
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  No hay comprobantes pendientes
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={registerPayment.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={registerPayment.isPending}
            >
              {registerPayment.isPending ? 'Procesando...' : actionLabel}
            </Button>
          </div>
        </form>
      </div>
      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
