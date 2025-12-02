import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';

export default function PurchasesPage() {
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', currentTenant?.slug, page, search, paymentStatus, dateFrom, dateTo],
    queryFn: () =>
      purchasesApi.getAll(currentTenant!.slug, {
        page,
        limit: 20,
        search: search || undefined,
        paymentStatus: paymentStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: !!currentTenant,
  });

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pagada' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Parcial' },
      pending: { bg: 'bg-red-100', text: 'text-red-800', label: 'Pendiente' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (!currentTenant) {
    return <div>No hay tenant seleccionado</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <button
          onClick={() => navigate('/purchases/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Nueva Compra
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Todos los estados</option>
            <option value="paid">Pagadas</option>
            <option value="partial">Parcial</option>
            <option value="pending">Pendientes</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Hasta"
          />
          <button
            onClick={() => {
              setSearch('');
              setPaymentStatus('');
              setDateFrom('');
              setDateTo('');
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((purchase: any) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${Number(purchase.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      ${Number(purchase.paidAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      ${Number(purchase.balanceAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(purchase.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/purchases/${purchase.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Ver
                      </button>
                      {purchase.paymentStatus !== 'paid' && purchase.status !== 'cancelled' && (
                        <button
                          onClick={() =>
                            navigate(`/purchases/${purchase.id}/payment`)
                          }
                          className="text-green-600 hover:text-green-800"
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Página {data.pagination.page} de {data.pagination.totalPages} (Total:{' '}
                  {data.pagination.total})
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
                    disabled={page >= data.pagination.totalPages}
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
            No hay compras registradas. Haz clic en "Nueva Compra" para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}
