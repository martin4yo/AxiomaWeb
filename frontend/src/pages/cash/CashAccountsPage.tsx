import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCardIcon,
  WalletIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api as axios } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface CashAccount {
  id: string
  name: string
  description: string | null
  accountType: string
  isDefault: boolean
  initialBalance: number
  balance: number
  totalIncome: number
  totalExpense: number
  isActive: boolean
}

interface AccountFormData {
  name: string
  description: string
  accountType: string
  initialBalance: number
  isDefault: boolean
}

export default function CashAccountsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CashAccount | null>(null)

  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    description: '',
    accountType: 'CASH',
    initialBalance: 0,
    isDefault: false,
  })

  // Obtener cuentas
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['cash-accounts', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/cash/accounts`)
      return response.data
    },
    enabled: !!currentTenant,
  })

  // Crear cuenta
  const createMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      const response = await axios.post(`/${currentTenant!.slug}/cash/accounts`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setShowCreateModal(false)
      resetForm()
    },
  })

  // Actualizar cuenta
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AccountFormData> }) => {
      const response = await axios.put(`/${currentTenant!.slug}/cash/accounts/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setShowEditModal(false)
      setSelectedAccount(null)
      resetForm()
    },
  })

  // Eliminar cuenta
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/${currentTenant!.slug}/cash/accounts/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setShowDeleteModal(false)
      setSelectedAccount(null)
    },
  })

  const accounts: CashAccount[] = accountsData?.accounts || []
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalIncome = accounts.reduce((sum, acc) => sum + acc.totalIncome, 0)
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.totalExpense, 0)

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      accountType: 'CASH',
      initialBalance: 0,
      isDefault: false,
    })
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEdit = (account: CashAccount) => {
    setSelectedAccount(account)
    setFormData({
      name: account.name,
      description: account.description || '',
      accountType: account.accountType,
      initialBalance: account.initialBalance,
      isDefault: account.isDefault,
    })
    setShowEditModal(true)
  }

  const handleDelete = (account: CashAccount) => {
    setSelectedAccount(account)
    setShowDeleteModal(true)
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAccount) {
      updateMutation.mutate({ id: selectedAccount.id, data: formData })
    }
  }

  const handleConfirmDelete = () => {
    if (selectedAccount) {
      deleteMutation.mutate(selectedAccount.id)
    }
  }

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
      CHECK: 'Cheque',
      OTHER: 'Otro',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance de Cuentas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tus cuentas de efectivo y bancos
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Nueva Cuenta
        </button>
      </div>

      {/* Total Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium opacity-90">Balance Total</h2>
            <p className="text-4xl font-bold mt-2">
              ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <WalletIcon className="h-16 w-16 opacity-20" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm opacity-90">Total Ingresos</p>
            <p className="text-2xl font-bold mt-1">
              +${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm opacity-90">Total Egresos</p>
            <p className="text-2xl font-bold mt-1">
              -${totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
              account.isDefault ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center flex-1">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCardIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                    {account.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Por defecto
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(account)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {account.description && (
                <p className="text-sm text-gray-500 mb-4">{account.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tipo:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {getAccountTypeLabel(account.accountType)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Balance Inicial:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${account.initialBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Ingresos:</span>
                    <span className="text-sm font-medium text-green-600">
                      +${account.totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Egresos:</span>
                    <span className="text-sm font-medium text-red-600">
                      -${account.totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Balance Actual:</span>
                    <span
                      className={`text-lg font-bold ${
                        account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ${account.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-50 px-6 py-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Disponible</span>
                <span>
                  {account.totalIncome > 0
                    ? ((account.balance / (account.initialBalance + account.totalIncome)) * 100).toFixed(1)
                    : 100}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    account.balance >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        account.totalIncome > 0
                          ? (account.balance / (account.initialBalance + account.totalIncome)) * 100
                          : 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <WalletIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuentas configuradas</h3>
          <p className="mt-1 text-sm text-gray-500 mb-4">
            Comienza creando tu primera cuenta de caja.
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nueva Cuenta
          </button>
        </div>
      )}

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Nueva Cuenta</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: Caja Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Descripción opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cuenta *
                </label>
                <select
                  required
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CHECK">Cheque</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  Marcar como cuenta predeterminada
                </label>
              </div>

              {createMutation.isError && (
                <div className="text-sm text-red-600">
                  {(createMutation.error as any)?.response?.data?.error || 'Error al crear cuenta'}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Editar Cuenta</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedAccount(null)
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cuenta *
                </label>
                <select
                  required
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CHECK">Cheque</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Balance actual: ${selectedAccount.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultEdit"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefaultEdit" className="ml-2 block text-sm text-gray-700">
                  Marcar como cuenta predeterminada
                </label>
              </div>

              {updateMutation.isError && (
                <div className="text-sm text-red-600">
                  {(updateMutation.error as any)?.response?.data?.error || 'Error al actualizar cuenta'}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedAccount(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Eliminar Cuenta</h3>
                  <p className="text-sm text-gray-500">
                    ¿Estás seguro de eliminar "{selectedAccount.name}"?
                  </p>
                </div>
              </div>

              {deleteMutation.isError && (
                <div className="mt-4 text-sm text-red-600">
                  {(deleteMutation.error as any)?.response?.data?.error || 'Error al eliminar cuenta'}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedAccount(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
