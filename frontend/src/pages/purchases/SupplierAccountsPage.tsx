import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supplierAccountsApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';

export default function SupplierAccountsPage() {
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();
  const [search, setSearch] = useState('');
  const [hasDebt, setHasDebt] = useState(false);

  const { data: balances, isLoading } = useQuery({
    queryKey: ['supplier-balances', currentTenant?.slug, search, hasDebt],
    queryFn: () =>
      supplierAccountsApi.getAllBalances(currentTenant!.slug, {
        search: search || undefined,
        hasDebt: hasDebt || undefined,
      }),
    enabled: !!currentTenant,
  });

  const { data: summary } = useQuery({
    queryKey: ['supplier-account-summary', currentTenant?.slug],
    queryFn: () => supplierAccountsApi.getSummary(currentTenant!.slug),
    enabled: !!currentTenant,
  });

  if (!currentTenant) {
    return <div>No hay tenant seleccionado</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuenta Corriente de Proveedores</h1>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Deuda Total</div>
            <div className="text-2xl font-bold text-red-600">
              ${Number(summary.totalDebt).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.pendingPurchasesCount} compras pendientes
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Proveedores con Deuda</div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.suppliersWithDebtCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Deuda Vencida</div>
            <div className="text-2xl font-bold text-orange-600">
              ${Number(summary.overdueDebt).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.overduePurchasesCount} compras vencidas (+30 días)
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Acciones</div>
            <button
              onClick={() => navigate('/purchases/new')}
              className="w-full mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Nueva Compra
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasDebt}
              onChange={(e) => setHasDebt(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Solo con deuda</span>
          </label>
        </div>
      </div>

      {/* Tabla de saldos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : balances && balances.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Compras
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Comprado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Pagado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Saldo Deudor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {balances.map((balance: any) => (
                <tr key={balance.supplierId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{balance.supplierName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.supplierCode || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {balance.purchaseCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${Number(balance.totalPurchases).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                    ${Number(balance.totalPaid).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-semibold ${
                        balance.totalDebt > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      ${Number(balance.totalDebt).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() =>
                        navigate(`/supplier-accounts/${balance.supplierId}`)
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Ver Cuenta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No hay proveedores para mostrar.
          </div>
        )}
      </div>
    </div>
  );
}
