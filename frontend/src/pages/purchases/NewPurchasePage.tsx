import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { purchasesApi, PurchaseItem, PurchasePayment } from '../../api/purchases';
import { api as axios } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface PurchaseFormItem extends PurchaseItem {
  id: string;
}

interface PurchaseFormPayment extends PurchasePayment {
  id: string;
  paymentMethodName?: string;
}

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const { currentTenant } = useAuthStore();

  // Estado del formulario
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Estado de items
  const [items, setItems] = useState<PurchaseFormItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Estado de pagos
  const [payments, setPayments] = useState<PurchaseFormPayment[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Queries
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/entities`, {
        params: { isSupplier: true },
      });
      // El endpoint devuelve { entities: [...] }
      return response.data.entities || [];
    },
    enabled: !!currentTenant,
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/inventory/warehouses`);
      // El endpoint devuelve directamente el array
      return Array.isArray(response.data) ? response.data : response.data.warehouses || [];
    },
    enabled: !!currentTenant,
  });

  const { data: products } = useQuery({
    queryKey: ['products', currentTenant?.slug, productSearch],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/products`, {
        params: {
          search: productSearch || undefined,
          limit: 50,
        },
      });
      // El endpoint devuelve { products: [...] }
      return response.data.products || [];
    },
    enabled: !!currentTenant,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/payment-methods`);
      return response.data.paymentMethods || [];
    },
    enabled: !!currentTenant,
  });

  // Mutation para crear compra
  const createPurchaseMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.create(currentTenant!.slug, data),
    onSuccess: () => {
      alert('Compra creada exitosamente');
      navigate('/purchases');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al crear la compra');
    },
  });

  // Agregar item al carrito
  const handleAddItem = () => {
    if (!selectedProductId) {
      alert('Selecciona un producto');
      return;
    }

    const product = products?.find((p: any) => p.id === selectedProductId);
    if (!product) return;

    const existingItem = items.find((item) => item.productId === selectedProductId);
    if (existingItem) {
      // Incrementar cantidad
      setItems(
        items.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Agregar nuevo item
      const newItem: PurchaseFormItem = {
        id: Math.random().toString(),
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.costPrice) || 0,
        discountPercent: 0,
        taxRate: 21, // IVA por defecto
      };
      setItems([...items, newItem]);
    }

    setSelectedProductId('');
    setProductSearch('');
  };

  // Actualizar item
  const updateItem = (id: string, field: keyof PurchaseFormItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Eliminar item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Calcular totales de un item
  const calculateItemTotals = (item: PurchaseFormItem) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discountPercent = item.discountPercent || 0;
    const taxRate = item.taxRate || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discountPercent) / 100;
    const subtotalWithDiscount = subtotal - discountAmount;
    const taxAmount = (subtotalWithDiscount * taxRate) / 100;
    const total = subtotalWithDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  };

  // Calcular totales generales
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const itemTotals = calculateItemTotals(item);
      subtotal += itemTotals.subtotal - itemTotals.discountAmount;
      totalTax += itemTotals.taxAmount;
    });

    const discountAmount = (subtotal * discountPercent) / 100;
    const subtotalWithDiscount = subtotal - discountAmount;
    const total = subtotalWithDiscount + totalTax;

    return {
      subtotal,
      discountAmount,
      totalTax,
      total,
    };
  };

  // Agregar pago
  const handleAddPayment = () => {
    if (!selectedPaymentMethodId) {
      alert('Selecciona un método de pago');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    const totals = calculateTotals();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totals.total - totalPaid;

    if (amount > remaining) {
      alert('El monto excede el saldo pendiente');
      return;
    }

    const paymentMethod = paymentMethods?.find(
      (pm: any) => pm.id === selectedPaymentMethodId
    );

    const newPayment: PurchaseFormPayment = {
      id: Math.random().toString(),
      paymentMethodId: selectedPaymentMethodId,
      paymentMethodName: paymentMethod?.name,
      amount,
      reference: paymentReference || undefined,
    };

    setPayments([...payments, newPayment]);
    setSelectedPaymentMethodId('');
    setPaymentAmount('');
    setPaymentReference('');
  };

  // Eliminar pago
  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  // Crear compra
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      alert('Selecciona un proveedor');
      return;
    }

    if (!warehouseId) {
      alert('Selecciona un almacén');
      return;
    }

    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    const totals = calculateTotals();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Validar que no se pague más del total
    if (totalPaid > totals.total) {
      alert('El total de pagos no puede exceder el total de la compra');
      return;
    }

    const purchaseData = {
      supplierId,
      warehouseId,
      invoiceNumber: invoiceNumber || undefined,
      invoiceDate: invoiceDate || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxRate: item.taxRate || 0,
      })),
      payments: payments.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        reference: p.reference,
      })),
      discountPercent,
      notes: notes || undefined,
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  const totals = calculateTotals();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totals.total - totalPaid;

  if (!currentTenant) {
    return <div>No hay tenant seleccionado</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Compra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información general */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Información General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers?.map((supplier: any) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.code ? `(${supplier.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Almacén *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Seleccionar almacén</option>
                {warehouses?.map((warehouse: any) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Factura
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ej: 0001-00001234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Factura
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Productos</h2>

          {/* Agregar producto */}
          <div className="mb-4 flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar producto</option>
              {products?.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) - ${product.costPrice}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Agregar
            </button>
          </div>

          {/* Lista de items */}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Desc %</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">IVA %</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => {
                    const itemTotals = calculateItemTotals(item);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm">{item.productName}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.discountPercent || 0}
                            onChange={(e) =>
                              updateItem(item.id, 'discountPercent', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.taxRate || 0}
                            onChange={(e) =>
                              updateItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium">
                          ${itemTotals.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No hay productos agregados. Usa el buscador para agregar productos.
            </div>
          )}
        </div>

        {/* Formas de pago */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Formas de Pago</h2>

          {/* Agregar pago */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={selectedPaymentMethodId}
              onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Método de pago</option>
              {paymentMethods?.map((pm: any) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Monto"
              min="0"
              step="0.01"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Referencia (opcional)"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              type="button"
              onClick={handleAddPayment}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Agregar Pago
            </button>
          </div>

          {/* Lista de pagos */}
          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-medium">{payment.paymentMethodName}</span>
                    {payment.reference && (
                      <span className="text-sm text-gray-600 ml-2">({payment.reference})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => removePayment(payment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totales y notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Notas</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Observaciones sobre la compra..."
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento ({discountPercent}%):</span>
                  <span>-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>IVA:</span>
                <span>${totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              {payments.length > 0 && (
                <>
                  <div className="flex justify-between text-green-600 border-t pt-2">
                    <span>Pagado:</span>
                    <span>${totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Saldo:</span>
                    <span>${balance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createPurchaseMutation.isPending || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createPurchaseMutation.isPending ? 'Guardando...' : 'Guardar Compra'}
          </button>
        </div>
      </form>
    </div>
  );
}
