import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Filter, ArrowLeftRight } from 'lucide-react'
import { api as axios } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CashMovement {
  id: string
  cashAccountId: string
  movementType: 'income' | 'expense'
  category: string
  amount: number
  description: string
  reference: string | null
  movementDate: string
  notes: string | null
  cashAccount: {
    id: string
    name: string
  }
  paymentMethod?: {
    name: string
  }
  sale?: {
    saleNumber: string
  }
  purchase?: {
    purchaseNumber: string
  }
  creator: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export default function CashMovementsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterType, setFilterType] = useState<'income' | 'expense' | ''>('')
  const [filterAccount, setFilterAccount] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    cashAccountId: '',
    amount: '',
    description: '',
    reference: '',
    notes: '',
  })

  // Transfer form state
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    reference: '',
  })

  // Get movements
  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['cash-movements', currentTenant?.slug, dateFrom, dateTo, filterType, filterAccount],
    queryFn: async () => {
      const params: any = {}
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (filterType) params.movementType = filterType
      if (filterAccount) params.cashAccountId = filterAccount

      const response = await axios.get(`/${currentTenant!.slug}/cash/movements`, { params })
      return response.data
    },
    enabled: !!currentTenant,
  })

  // Get accounts summary
  const { data: accountsData } = useQuery({
    queryKey: ['cash-accounts', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/cash/accounts`)
      return response.data
    },
    enabled: !!currentTenant,
  })

  // Create movement mutation
  const createMovementMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = movementType === 'income' ? 'income' : 'expense'
      return await axios.post(`/${currentTenant!.slug}/cash/movements/${endpoint}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setShowModal(false)
      setFormData({
        cashAccountId: '',
        amount: '',
        description: '',
        reference: '',
        notes: '',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMovementMutation.mutate({
      cashAccountId: formData.cashAccountId || undefined,
      amount: parseFloat(formData.amount),
      description: formData.description,
      reference: formData.reference || undefined,
      notes: formData.notes || undefined,
    })
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Permitir números con hasta 2 decimales
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormData({ ...formData, amount: value })
    }
  }

  const handleTransferAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Permitir números con hasta 2 decimales
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setTransferData({ ...transferData, amount: value })
    }
  }

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      // Primero egreso de cuenta origen
      await axios.post(`/${currentTenant!.slug}/cash/movements/expense`, {
        cashAccountId: data.fromAccountId,
        amount: data.amount,
        category: 'transfer',
        description: data.description,
        reference: data.reference || undefined,
      })
      // Luego ingreso en cuenta destino
      return await axios.post(`/${currentTenant!.slug}/cash/movements/income`, {
        cashAccountId: data.toAccountId,
        amount: data.amount,
        category: 'transfer',
        description: data.description,
        reference: data.reference || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setShowTransferModal(false)
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        description: '',
        reference: '',
      })
    },
  })

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    transferMutation.mutate({
      fromAccountId: transferData.fromAccountId,
      toAccountId: transferData.toAccountId,
      amount: parseFloat(transferData.amount),
      description: transferData.description,
      reference: transferData.reference || undefined,
    })
  }

  const movements = movementsData?.movements || []
  const accounts = accountsData?.accounts || []
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0)

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      sale: 'Venta',
      purchase: 'Compra',
      purchase_payment: 'Pago de Compra',
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      adjustment: 'Ajuste',
      transfer: 'Transferencia',
    }
    return labels[category] || category
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos de Caja</h1>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {accounts.map((account: any) => (
          <div key={account.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{account.name}</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${account.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Ingresos:</span>
                <span className="text-green-600">+${account.totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Egresos:</span>
                <span className="text-red-600">-${account.totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        ))}

        {accounts.length > 1 && (
          <div className="bg-blue-50 rounded-lg shadow p-6 border-2 border-blue-200">
            <h3 className="text-sm font-medium text-blue-700">Balance Total</h3>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => {
            setMovementType('income')
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          <ArrowDown className="h-5 w-5 mr-2" />
          Registrar Ingreso
        </button>

        <button
          onClick={() => {
            setMovementType('expense')
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
        >
          <ArrowUp className="h-5 w-5 mr-2" />
          Registrar Egreso
        </button>

        <button
          onClick={() => setShowTransferModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeftRight className="h-5 w-5 mr-2" />
          Transferencia
        </button>

        {/* Filters */}
        <div className="flex-1 flex gap-2 items-center">
          <Filter className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Hasta"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Egresos</option>
          </select>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Todas las cuentas</option>
            {accounts.map((account: any) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cuenta
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No hay movimientos registrados
                </td>
              </tr>
            ) : (
              movements.map((movement: CashMovement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(movement.movementDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {movement.movementType === 'income' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Egreso
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCategoryLabel(movement.category)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{movement.description}</div>
                    {movement.reference && (
                      <div className="text-xs text-gray-500">Ref: {movement.reference}</div>
                    )}
                    {movement.notes && (
                      <div className="text-xs text-gray-500">{movement.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.cashAccount.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className={movement.movementType === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {movement.movementType === 'income' ? '+' : '-'}$
                      {movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {movementType === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cuenta de Fondos</label>
                      <select
                        value={formData.cashAccountId}
                        onChange={(e) => setFormData({ ...formData, cashAccountId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Por defecto</option>
                        {accounts.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.name} (${Number(account.balance).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Monto *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={formData.amount}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descripción *</label>
                      <input
                        type="text"
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Referencia</label>
                      <input
                        type="text"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notas</label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createMovementMutation.isPending}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                      movementType === 'income'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {createMovementMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTransferModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleTransferSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Transferencia entre Cuentas
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cuenta Origen *</label>
                      <select
                        required
                        value={transferData.fromAccountId}
                        onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar cuenta</option>
                        {accounts.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.name} (${Number(account.balance).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cuenta Destino *</label>
                      <select
                        required
                        value={transferData.toAccountId}
                        onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar cuenta</option>
                        {accounts
                          .filter((account: any) => account.id !== transferData.fromAccountId)
                          .map((account: any) => (
                            <option key={account.id} value={account.id}>
                              {account.name} (${Number(account.balance).toFixed(2)})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Monto *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={transferData.amount}
                        onChange={handleTransferAmountChange}
                        placeholder="0.00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descripción *</label>
                      <input
                        type="text"
                        required
                        value={transferData.description}
                        onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Referencia</label>
                      <input
                        type="text"
                        value={transferData.reference}
                        onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={transferMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {transferMutation.isPending ? 'Procesando...' : 'Transferir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
