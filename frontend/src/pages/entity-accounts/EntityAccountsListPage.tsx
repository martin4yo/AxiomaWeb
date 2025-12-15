import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../stores/authStore'
import { entityAccountService, EntityBalance } from '../../services/entityAccountService'

interface EntityAccountsListPageProps {
  type: 'customer' | 'supplier'
}

export default function EntityAccountsListPage({ type }: EntityAccountsListPageProps) {
  const navigate = useNavigate()
  const { currentTenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showWithBalance, setShowWithBalance] = useState(false)

  const isCustomer = type === 'customer'
  const title = isCustomer ? 'Cuentas Corrientes de Clientes' : 'Cuentas Corrientes de Proveedores'
  const subtitle = isCustomer
    ? 'Administra las cuentas corrientes de tus clientes'
    : 'Administra las cuentas corrientes de tus proveedores'

  // Fetch entities with balance
  const { data: balances, isLoading } = useQuery({
    queryKey: ['entity-balances', currentTenant?.slug, type, search, showWithBalance],
    queryFn: async () => {
      return await entityAccountService.getEntitiesWithBalance({
        isCustomer: type === 'customer',
        isSupplier: type === 'supplier',
        hasBalance: showWithBalance || undefined,
        search: search || undefined
      })
    },
    enabled: !!currentTenant
  })

  const handleViewAccount = (entityId: string) => {
    navigate(`/entity-accounts/${entityId}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600' // Nos deben o les debemos
    if (balance < 0) return 'text-green-600' // Pagaron de más o pagamos de más
    return 'text-gray-900'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWithBalance}
                  onChange={(e) => setShowWithBalance(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                />
                <span className="text-sm text-gray-700">Solo con saldo</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de cuentas */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isCustomer ? 'Clientes' : 'Proveedores'} ({balances?.length || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !balances || balances.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                💰
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Sin {isCustomer ? 'clientes' : 'proveedores'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || showWithBalance
                  ? 'No se encontraron coincidencias con los filtros.'
                  : `No hay ${isCustomer ? 'clientes' : 'proveedores'} con movimientos.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isCustomer ? 'Cliente' : 'Proveedor'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Actual
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Débitos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Créditos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Movimientos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balances.map((balance: EntityBalance) => (
                    <tr key={balance.entityId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {balance.entityName}
                          </div>
                          {balance.entityCode && (
                            <div className="text-sm text-gray-500">
                              Código: {balance.entityCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-bold ${getBalanceColor(balance.currentBalance)}`}>
                          {formatCurrency(balance.currentBalance)}
                        </div>
                        {balance.currentBalance !== 0 && (
                          <Badge variant={balance.currentBalance > 0 ? 'error' : 'success'} size="sm">
                            {balance.currentBalance > 0
                              ? (isCustomer ? 'Debe' : 'Debemos')
                              : (isCustomer ? 'A favor' : 'A favor')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                        {formatCurrency(balance.totalDebits)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                        {formatCurrency(balance.totalCredits)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {balance.movementCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAccount(balance.entityId)}
                          title="Ver cuenta corriente"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Ver Cuenta
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
