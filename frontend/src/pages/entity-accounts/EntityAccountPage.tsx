import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, FileDown, Calendar, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../stores/authStore'
import { entityAccountService } from '../../services/entityAccountService'
import { PaymentModal } from '../../components/entity-accounts/PaymentModal'
import { api } from '../../services/api'
import { useDialog } from '../../hooks/useDialog'

export default function EntityAccountPage() {
  const { entityId } = useParams<{ entityId: string }>()
  const navigate = useNavigate()
  const { currentTenant } = useAuthStore()
  const dialog = useDialog()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Fetch entity details
  const { data: entity } = useQuery({
    queryKey: ['entity', currentTenant?.slug, entityId],
    queryFn: async () => {
      const response = await api.get(`/entities/${entityId}`)
      return response.data
    },
    enabled: !!currentTenant && !!entityId
  })

  // Fetch entity balance
  const { data: balance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['entity-balance', currentTenant?.slug, entityId],
    queryFn: () => entityAccountService.getEntityBalance(entityId!),
    enabled: !!currentTenant && !!entityId
  })

  // Fetch movements
  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['entity-movements', currentTenant?.slug, entityId, dateFrom, dateTo],
    queryFn: () => entityAccountService.getEntityMovements(entityId!, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 100
    }),
    enabled: !!currentTenant && !!entityId
  })

  const handleExportPDF = async () => {
    try {
      const statement = await entityAccountService.getEntityStatement(entityId!, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })

      // TODO: Implementar generación de PDF
      console.log('Export PDF:', statement)
      dialog.info('Exportación a PDF próximamente')
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SALE': 'Venta',
      'SALE_PAYMENT': 'Cobro',
      'PURCHASE': 'Compra',
      'PURCHASE_PAYMENT': 'Pago',
      'CREDIT_NOTE': 'Nota de Crédito',
      'DEBIT_NOTE': 'Nota de Débito',
      'ADJUSTMENT': 'Ajuste',
      'INITIAL_BALANCE': 'Saldo Inicial'
    }
    return labels[type] || type
  }

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      'SALE': 'info',
      'SALE_PAYMENT': 'success',
      'PURCHASE': 'warning',
      'PURCHASE_PAYMENT': 'error',
      'CREDIT_NOTE': 'success',
      'DEBIT_NOTE': 'warning',
      'ADJUSTMENT': 'info',
      'INITIAL_BALANCE': 'info'
    }
    return variants[type] || 'info'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: es })
  }

  const actions = [
    {
      label: 'Exportar PDF',
      icon: FileDown,
      onClick: handleExportPDF,
      variant: 'secondary' as const
    },
    {
      label: 'Registrar Pago',
      icon: Plus,
      onClick: () => setShowPaymentModal(true),
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cuenta Corriente - {balance?.entityName || 'Cargando...'}
            </h1>
            {balance?.entityCode && (
              <p className="text-sm text-gray-500 mt-1">Código: {balance.entityCode}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant}
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Card */}
      {!isLoadingBalance && balance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-500">Saldo Actual</div>
              <div className={`text-2xl font-bold mt-2 ${
                balance.currentBalance > 0 ? 'text-red-600' :
                balance.currentBalance < 0 ? 'text-green-600' :
                'text-gray-900'
              }`}>
                {formatCurrency(balance.currentBalance)}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Débitos</div>
              <div className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(balance.totalDebits)}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Créditos</div>
              <div className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(balance.totalCredits)}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-sm font-medium text-gray-500">Movimientos</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {balance.movementCount}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {!isLoadingMovements && movementsData && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Saldo Inicial</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(movementsData.summary.openingBalance)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Débitos</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(movementsData.summary.totalDebits)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Créditos</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(movementsData.summary.totalCredits)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Saldo Final</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(movementsData.summary.closingBalance)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Movements Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Movimientos ({movementsData?.movements.length || 0})
          </h3>

          {isLoadingMovements ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !movementsData || movementsData.movements.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin movimientos</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay movimientos en el período seleccionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Débito
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crédito
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movementsData.movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(movement.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getMovementTypeBadge(movement.type)}>
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{movement.description}</div>
                        {movement.documentNumber && (
                          <div className="text-sm text-gray-500">Doc: {movement.documentNumber}</div>
                        )}
                        {movement.reference && (
                          <div className="text-sm text-gray-500">Ref: {movement.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                        {movement.debit > 0 ? formatCurrency(movement.debit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                        {movement.credit > 0 ? formatCurrency(movement.credit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(movement.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && entity && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          entityId={entityId!}
          entityName={entity.name}
          type={entity.isCustomer ? 'customer' : 'supplier'}
        />
      )}

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </div>
  )
}
