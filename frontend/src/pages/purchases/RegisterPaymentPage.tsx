import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { purchasesApi } from '../../api/purchases';
import { api as axios } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();
  const queryClient = useQueryClient();

  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: purchase, isLoading: loadingPurchase } = useQuery({
    queryKey: ['purchase', currentTenant?.slug, id],
    queryFn: () => purchasesApi.getById(currentTenant!.slug, id!),
    enabled: !!currentTenant && !!id,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/payment-methods`);
      return response.data.paymentMethods || [];
    },
    enabled: !!currentTenant,
  });

  const addPaymentMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.addPayment(currentTenant!.slug, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase', currentTenant?.slug, id] });
      queryClient.invalidateQueries({ queryKey: ['purchases', currentTenant?.slug] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances', currentTenant?.slug] });
      alert('Pago registrado exitosamente');
      navigate(`/purchases/${id}`);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al registrar el pago');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethodId) {
      alert('Selecciona un método de pago');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (purchase && amountNum > Number(purchase.balanceAmount)) {
      alert('El monto no puede ser mayor al saldo pendiente');
      return;
    }

    addPaymentMutation.mutate({
      paymentMethodId,
      amount: amountNum,
      reference: reference || undefined,
      referenceDate: referenceDate || undefined,
      notes: notes || undefined,
    });
  };

  const handlePayFull = () => {
    if (purchase) {
      setAmount(Number(purchase.balanceAmount).toFixed(2));
    }
  };

  if (!currentTenant || !id) {
    return <div>Compra no encontrada</div>;
  }

  if (loadingPurchase) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!purchase) {
    return <div className="p-6">Compra no encontrada</div>;
  }

  if (purchase.paymentStatus === 'paid') {
    return (
      <div className="p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Esta compra ya está completamente pagada
          </h2>
          <button
            onClick={() => navigate(`/${currentTenant.slug}/purchases/${id}`)}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ver Detalle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/${currentTenant.slug}/purchases/${id}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Volver a Detalle de Compra
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Pago</h1>
        <p className="text-gray-600">Compra: {purchase.purchaseNumber}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Información de la compra */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Información de la Compra</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Proveedor:</dt>
              <dd className="font-medium">{purchase.supplierName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Fecha:</dt>
              <dd className="font-medium">
                {new Date(purchase.purchaseDate).toLocaleDateString('es-AR')}
              </dd>
            </div>
            {purchase.invoiceNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Factura:</dt>
                <dd className="font-medium">{purchase.invoiceNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Totales */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Estado de Pago</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-lg">
              <dt className="text-gray-600">Total:</dt>
              <dd className="font-bold">${Number(purchase.totalAmount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2">
              <dt className="text-gray-600">Pagado:</dt>
              <dd className="font-medium text-green-600">
                ${Number(purchase.paidAmount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between text-lg font-bold text-red-600">
              <dt>Saldo Pendiente:</dt>
              <dd>${Number(purchase.balanceAmount).toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Pagos anteriores */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Pagos Anteriores ({purchase.payments?.length || 0})
          </h2>
          {purchase.payments && purchase.payments.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {purchase.payments.map((payment: any) => (
                <div key={payment.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{payment.paymentMethodName}</span>
                    <span className="font-medium">${Number(payment.amount).toFixed(2)}</span>
                  </div>
                  {payment.reference && (
                    <div className="text-xs text-gray-500">Ref: {payment.reference}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay pagos registrados</p>
          )}
        </div>
      </div>

      {/* Formulario de pago */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6">Nuevo Pago</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Seleccionar método</option>
              {paymentMethods?.map((pm: any) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name} ({pm.paymentType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                max={Number(purchase.balanceAmount)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
                required
              />
              <button
                type="button"
                onClick={handlePayFull}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Saldo Total
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Máximo: ${Number(purchase.balanceAmount).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia (Opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Nº de cheque, transferencia, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Referencia (Opcional)
            </label>
            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Observaciones sobre el pago..."
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/${currentTenant.slug}/purchases/${id}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={addPaymentMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {addPaymentMutation.isPending ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </div>
  );
}
