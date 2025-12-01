import { useQuery } from '@tanstack/react-query'
import { CreditCardIcon, WalletIcon } from '@heroicons/react/24/outline'
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
}

export default function CashAccountsPage() {
  const { currentTenant } = useAuthStore()

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['cash-accounts', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/cash/accounts`)
      return response.data
    },
    enabled: !!currentTenant,
  })

  const accounts: CashAccount[] = accountsData?.accounts || []
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalIncome = accounts.reduce((sum, acc) => sum + acc.totalIncome, 0)
  const totalExpense = accounts.reduce((sum, acc) => sum + acc.totalExpense, 0)

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      cash: 'Efectivo',
      bank: 'Banco',
      mercadopago: 'Mercado Pago',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Balance de Cuentas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen del estado de tus cuentas de efectivo y bancos
        </p>
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
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCardIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                    {account.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Por defecto
                      </span>
                    )}
                  </div>
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
        <div className="text-center py-12">
          <WalletIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuentas configuradas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contacte al administrador para configurar cuentas de caja.
          </p>
        </div>
      )}
    </div>
  )
}
