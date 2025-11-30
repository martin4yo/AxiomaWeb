import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supplierAccountsApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';

export default function SupplierAccountDetailPage() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: balance } = useQuery({
    queryKey: ['supplier-balance', currentTenant?.slug, supplierId],
    queryFn: () => supplierAccountsApi.getBalance(currentTenant!.slug, supplierId!),
    enabled: !!currentTenant && !!supplierId,
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ['supplier-movements', currentTenant?.slug, supplierId, dateFrom, dateTo, page],
    queryFn: () =>
      supplierAccountsApi.getMovements(currentTenant!.slug, supplierId!, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 50,
      }),
    enabled: !!currentTenant && !!supplierId,
  });

  const { data: pendingPurchases } = useQuery({
    queryKey: ['supplier-pending', currentTenant?.slug, supplierId],
    queryFn: () => supplierAccountsApi.getPendingPurchases(currentTenant!.slug, supplierId!),
    enabled: !!currentTenant && !!supplierId,
  });

  if (!currentTenant || !supplierId) {
    return <div>Proveedor no encontrado</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/supplier-accounts')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Volver a Cuenta Corriente
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Cuenta Corriente: {balance?.supplierName}
        </h1>
        {balance?.supplierCode && (
          <p className="text-gray-600">Código: {balance.supplierCode}</p>
        )}
      </div>

      {/* Resumen */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Comprado</div>
            <div className="text-2xl font-bold text-gray-900">
              ${Number(balance.totalPurchases).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{balance.purchaseCount} compras</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Pagado</div>
            <div className="text-2xl font-bold text-green-600">
              ${Number(balance.totalPaid).toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Saldo Deudor</div>
            <div className="text-2xl font-bold text-red-600">
              ${Number(balance.totalDebt).toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Compras Pendientes</div>
            <div className="text-2xl font-bold text-orange-600">
              {pendingPurchases?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Compras pendientes de pago */}
      {pendingPurchases && pendingPurchases.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            Compras Pendientes de Pago ({pendingPurchases.length})
          </h3>
          <div className="space-y-2">
            {pendingPurchases.map((purchase: any) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between bg-white p-3 rounded"
              >
                <div>
                  <span className="font-medium">{purchase.purchaseNumber}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {new Date(purchase.purchaseDate).toLocaleDateString('es-AR')}
                  </span>
                  {purchase.invoiceNumber && (
                    <span className="text-sm text-gray-500 ml-2">
                      Fact: {purchase.invoiceNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Total: ${Number(purchase.totalAmount).toFixed(2)}
                    </div>
                    <div className="text-sm font-semibold text-red-600">
                      Saldo: ${Number(purchase.balanceAmount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/purchases/${purchase.id}/payment`)
                    }
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de movimientos */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">Movimientos de Cuenta Corriente</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : movements?.movements && movements.movements.length > 0 ? (
          <>
            {/* Saldo de apertura */}
            {movements.summary.openingBalance !== 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b">
                <div className="flex justify-between">
                  <span className="font-medium">Saldo de Apertura</span>
                  <span className="font-semibold">
                    ${Number(movements.summary.openingBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Debe
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Haber
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.movements.map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(mov.date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{mov.description}</div>
                      {mov.paymentMethod && (
                        <div className="text-xs text-gray-500">Método: {mov.paymentMethod}</div>
                      )}
                      {mov.reference && (
                        <div className="text-xs text-gray-500">Ref: {mov.reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mov.documentNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                      {mov.debit > 0 ? `$${Number(mov.debit).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                      {mov.credit > 0 ? `$${Number(mov.credit).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      ${Number(mov.balance).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right">
                    TOTALES:
                  </td>
                  <td className="px-6 py-4 text-right text-red-600">
                    ${Number(movements.summary.totalDebits).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">
                    ${Number(movements.summary.totalCredits).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-lg">
                    ${Number(movements.summary.closingBalance).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Paginación */}
            {movements.pagination && movements.pagination.totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Página {movements.pagination.page} de {movements.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= movements.pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No hay movimientos para mostrar en el período seleccionado.
          </div>
        )}
      </div>
    </div>
  );
}
