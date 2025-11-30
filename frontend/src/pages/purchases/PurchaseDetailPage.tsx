import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', currentTenant?.slug, id],
    queryFn: () => purchasesApi.getById(currentTenant!.slug, id!),
    enabled: !!currentTenant && !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchasesApi.cancel(currentTenant!.slug, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase', currentTenant?.slug, id] });
      queryClient.invalidateQueries({ queryKey: ['purchases', currentTenant?.slug] });
      alert('Compra cancelada exitosamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al cancelar la compra');
    },
  });

  const handleCancel = () => {
    if (confirm('¿Estás seguro de que deseas cancelar esta compra? Esta acción revertirá el stock.')) {
      cancelMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Borrador' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pagada' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Parcial' },
      pending: { bg: 'bg-red-100', text: 'text-red-800', label: 'Pendiente' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (!currentTenant || !id) {
    return <div>Compra no encontrada</div>;
  }

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!purchase) {
    return <div className="p-6">Compra no encontrada</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/purchases')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Volver a Compras
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Compra {purchase.purchaseNumber}
            </h1>
            <p className="text-gray-600">
              {new Date(purchase.purchaseDate).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(purchase.status)}
            {getPaymentStatusBadge(purchase.paymentStatus)}
          </div>
        </div>
      </div>

      {/* Información general */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Información General</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Proveedor:</dt>
              <dd className="font-medium">{purchase.supplierName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Almacén:</dt>
              <dd className="font-medium">{purchase.warehouse?.name}</dd>
            </div>
            {purchase.invoiceNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Nº Factura:</dt>
                <dd className="font-medium">{purchase.invoiceNumber}</dd>
              </div>
            )}
            {purchase.invoiceDate && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Fecha Factura:</dt>
                <dd className="font-medium">
                  {new Date(purchase.invoiceDate).toLocaleDateString('es-AR')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Totales</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal:</dt>
              <dd className="font-medium">${Number(purchase.subtotal).toFixed(2)}</dd>
            </div>
            {purchase.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Descuento:</dt>
                <dd>-${Number(purchase.discountAmount).toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">IVA:</dt>
              <dd className="font-medium">${Number(purchase.taxAmount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <dt>TOTAL:</dt>
              <dd>${Number(purchase.totalAmount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-green-600 border-t pt-2">
              <dt>Pagado:</dt>
              <dd className="font-semibold">${Number(purchase.paidAmount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-red-600">
              <dt>Saldo:</dt>
              <dd className="font-semibold">${Number(purchase.balanceAmount).toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Precio Unit.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Desc.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  IVA
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchase.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    {item.productSku && (
                      <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {Number(item.quantity)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {item.discountPercent > 0
                      ? `${item.discountPercent}% ($${Number(item.discountAmount).toFixed(2)})`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    ${Number(item.taxAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ${Number(item.lineTotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagos */}
      {purchase.payments && purchase.payments.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Pagos Registrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchase.payments.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString('es-AR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentMethodName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payment.reference || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                      ${Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notas */}
      {purchase.notes && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-2">Notas</h2>
          <p className="text-gray-700">{purchase.notes}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        {purchase.status !== 'cancelled' && purchase.paymentStatus !== 'paid' && (
          <button
            onClick={() => navigate(`/purchases/${id}/payment`)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Registrar Pago
          </button>
        )}
        {purchase.status !== 'cancelled' && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Compra'}
          </button>
        )}
      </div>
    </div>
  );
}
