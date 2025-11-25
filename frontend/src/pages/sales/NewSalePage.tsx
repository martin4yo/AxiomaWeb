import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { api as axios } from '../../services/api'
import { salesApi, SaleItem as APISaleItem, SalePayment as APISalePayment } from '../../api/sales'
import { productsApi, TopProduct } from '../../api/products'

interface Product {
  id: string
  sku: string
  name: string
  salePrice: number
  costPrice: number
  trackStock: boolean
  currentStock: number
  barcode?: string
}

interface Customer {
  id: string
  name: string
  ivaCondition: string
}

interface Warehouse {
  id: string
  name: string
  code: string
  isDefault?: boolean
}

interface PaymentMethod {
  id: string
  name: string
  paymentType: string
  requiresReference: boolean
}

interface SaleItem {
  lineId: string // ID único de la línea
  productId: string
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  discountPercent: number
  lineTotal: number
}

interface Payment {
  paymentMethodId: string
  paymentMethodName: string
  amount: number
  reference?: string
}

export default function NewSalePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const priceRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // State
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [cart, setCart] = useState<SaleItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState('')
  const [shouldInvoice, setShouldInvoice] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; message: string; amount: number; paymentMethod: PaymentMethod | null }>({ show: false, message: '', amount: 0, paymentMethod: null })

  // Queries
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await axios.get('/inventory/warehouses')
      return response.data
    }
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await axios.get('/entities', {
        params: { isCustomer: true, limit: 1000 }
      })
      return response.data.entities
    }
  })

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await axios.get('/payment-methods')
      return response.data.paymentMethods || []
    }
  })

  // Top selling products
  const { data: topProductsData } = useQuery({
    queryKey: ['topProducts'],
    queryFn: () => productsApi.getTopSelling(5)
  })

  // Product search - siempre muestra productos
  const { data: productsData } = useQuery({
    queryKey: ['products', productSearchTerm],
    queryFn: async () => {
      const response = await axios.get('/products', {
        params: {
          search: productSearchTerm || undefined,
          limit: productSearchTerm ? 10 : 20  // Más productos si no hay búsqueda
        }
      })
      return response.data
    },
    enabled: true  // Siempre habilitado
  })

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })

      // Clear form for next sale
      setCart([])
      setPayments([])
      setNotes('')
      setShouldInvoice(false)
      setSelectedCustomer(null)
      setProductSearchTerm('')

      // Focus search input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.error || error.message}`)
    }
  })

  // Auto-select default warehouse
  useEffect(() => {
    if (warehousesData && !selectedWarehouse) {
      const defaultWarehouse = warehousesData.find((w: Warehouse) => w.isDefault) || warehousesData[0]
      setSelectedWarehouse(defaultWarehouse)
    }
  }, [warehousesData, selectedWarehouse])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle keyboard for confirmation dialog (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!confirmDialog.show) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirmPayment()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setConfirmDialog({ show: false, message: '', amount: 0, paymentMethod: null })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmDialog.show, confirmDialog.paymentMethod])

  // Add product to cart - always creates new line
  const addProductToCart = (product: Product, focusQuantity = true) => {
    // Generar ID único para la línea
    const lineId = crypto.randomUUID()

    // Siempre agregar nueva línea
    setCart([...cart, {
      lineId,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      quantity: 1,
      unitPrice: Number(product.salePrice),
      discountPercent: 0,
      lineTotal: Number(product.salePrice)
    }])

    // Clear search
    setProductSearchTerm('')

    // Focus quantity input for the product or search input
    if (focusQuantity) {
      setTimeout(() => {
        // Get the last added item (the newest one in the cart)
        const cartItems = document.querySelectorAll('[data-quantity-input]')
        const lastInput = cartItems[cartItems.length - 1] as HTMLInputElement
        if (lastInput) {
          lastInput.focus()
          lastInput.select()
        }
      }, 100)
    } else {
      inputRef.current?.focus()
    }
  }

  // Add product from quick access - always creates new line
  const addFromQuickAccess = (topProduct: TopProduct) => {
    const product: Product = {
      id: topProduct.id,
      sku: topProduct.sku,
      name: topProduct.name,
      salePrice: Number(topProduct.sale_price),
      costPrice: 0,
      trackStock: true,
      currentStock: Number(topProduct.current_stock)
    }
    addProductToCart(product, true)
  }

  // Handle Enter key to add product
  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productsData?.products && productsData.products.length > 0) {
      // If there's exactly one result, add it
      if (productsData.products.length === 1) {
        addProductToCart(productsData.products[0])
      }
      // If there are multiple results and the search term matches a SKU exactly, add that one
      else {
        const exactMatch = productsData.products.find(
          (p: Product) => p.sku.toLowerCase() === productSearchTerm.toLowerCase() ||
                         p.barcode?.toLowerCase() === productSearchTerm.toLowerCase()
        )
        if (exactMatch) {
          addProductToCart(exactMatch)
        } else {
          // Add the first result
          addProductToCart(productsData.products[0])
        }
      }
    }
  }

  // Remove from cart
  const removeFromCart = (lineId: string) => {
    setCart(cart.filter(item => item.lineId !== lineId))
  }

  // Update quantity
  const updateQuantity = (lineId: string, quantity: number | string) => {
    // Allow empty string or decimal point for editing
    if (quantity === '' || quantity === '.') {
      setCart(cart.map(item =>
        item.lineId === lineId
          ? { ...item, quantity: 0 }
          : item
      ))
      return
    }

    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity

    if (isNaN(numQuantity) || numQuantity <= 0) {
      removeFromCart(lineId)
      return
    }

    setCart(cart.map(item =>
      item.lineId === lineId
        ? { ...item, quantity: numQuantity, lineTotal: numQuantity * item.unitPrice * (1 - item.discountPercent / 100) }
        : item
    ))
  }

  // Update price
  const updatePrice = (lineId: string, unitPrice: number) => {
    setCart(cart.map(item =>
      item.lineId === lineId
        ? { ...item, unitPrice, lineTotal: item.quantity * unitPrice * (1 - item.discountPercent / 100) }
        : item
    ))
  }

  // Handle keyboard navigation: Quantity -> Price -> Search
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, lineId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      priceRefs.current[lineId]?.focus()
      priceRefs.current[lineId]?.select()
    }
  }

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.focus()
    }
  }

  // Update discount - reserved for future use
  // const updateDiscount = (lineId: string, discountPercent: number) => {
  //   setCart(cart.map(item =>
  //     item.lineId === lineId
  //       ? { ...item, discountPercent, lineTotal: item.quantity * item.unitPrice * (1 - discountPercent / 100) }
  //       : item
  //   ))
  // }

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
  const totalDiscount = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice * item.discountPercent / 100), 0)
  const total = subtotal - totalDiscount

  // Calculate payment totals
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const balance = total - totalPaid
  const change = totalPaid > total ? totalPaid - total : 0

  // Handle payment submission
  const handleSubmitSale = () => {
    if (!selectedWarehouse) {
      alert('Debe seleccionar un almacén')
      return
    }

    if (cart.length === 0) {
      alert('Debe agregar al menos un producto')
      return
    }

    if (Math.abs(balance) > 0.01) {
      alert(`El pago debe ser igual al total. Falta: $${balance.toFixed(2)}`)
      return
    }

    // Prepare data
    const saleData = {
      customerId: selectedCustomer?.id,
      warehouseId: selectedWarehouse.id,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent
      })) as APISaleItem[],
      payments: payments.map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        reference: p.reference
      })) as APISalePayment[],
      notes: notes || undefined,
      shouldInvoice
    }

    createSaleMutation.mutate(saleData)
  }

  // Quick payment with confirmation - pays with single payment method
  const handleQuickPayment = (paymentMethod: PaymentMethod) => {
    setConfirmDialog({
      show: true,
      message: `¿Confirmar venta por $${total.toFixed(2)} con ${paymentMethod.name}?`,
      amount: total,
      paymentMethod
    })
  }

  // Handle confirmation of quick payment
  const handleConfirmPayment = () => {
    const paymentMethod = confirmDialog.paymentMethod
    if (!paymentMethod) return

    // Close dialog
    setConfirmDialog({ show: false, message: '', amount: 0, paymentMethod: null })

    setPayments([{
      paymentMethodId: paymentMethod.id,
      paymentMethodName: paymentMethod.name,
      amount: confirmDialog.amount
    }])

    // Submit immediately
    setTimeout(() => {
      const saleData = {
        customerId: selectedCustomer?.id,
        warehouseId: selectedWarehouse!.id,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent
        })) as APISaleItem[],
        payments: [{
          paymentMethodId: paymentMethod.id,
          amount: confirmDialog.amount
        }] as APISalePayment[],
        notes: notes || undefined,
        shouldInvoice
      }

      createSaleMutation.mutate(saleData)
    }, 100)
  }

  // Legacy function for backward compatibility - reserved for future use
  // const handleQuickCashPayment = () => {
  //   const cashMethod = paymentMethodsData?.find((pm: PaymentMethod) => pm.paymentType === 'CASH')
  //   if (cashMethod) {
  //     handleQuickPayment(cashMethod)
  //   }
  // }

  return (
    <div className="fixed inset-0 lg:left-64 bg-gray-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
          <button
            onClick={() => navigate('/sales')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar [ESC]
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Product Search */}
          <div className="col-span-4 space-y-4">
            {/* Cliente y Almacén */}
            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente (opcional)
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customersData?.find((c: Customer) => c.id === e.target.value)
                    setSelectedCustomer(customer || null)
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Consumidor Final</option>
                  {customersData?.map((customer: Customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Almacén
                </label>
                <select
                  value={selectedWarehouse?.id || ''}
                  onChange={(e) => {
                    const warehouse = warehousesData?.find((w: Warehouse) => w.id === e.target.value)
                    setSelectedWarehouse(warehouse || null)
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {warehousesData?.map((warehouse: Warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Search */}
            <div className="bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Producto (SKU, nombre o código de barras)
              </label>
              <input
                ref={inputRef}
                type="text"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                onKeyDown={handleProductSearchKeyDown}
                placeholder="Escriba para buscar..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3"
                autoFocus
              />

              {/* Search Results - Siempre visible */}
              <div className="mt-3 border border-gray-200 rounded-md max-h-[500px] overflow-y-auto">
                {productsData?.products && productsData.products.length > 0 ? (
                  productsData.products.map((product: Product) => (
                    <button
                      key={product.id}
                      onClick={() => addProductToCart(product)}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 focus:outline-none focus:bg-blue-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          {product.trackStock && (
                            <div className="text-sm text-gray-500">Stock: {product.currentStock}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ${Number(product.salePrice).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {productSearchTerm ? 'No se encontraron productos' : 'Cargando productos...'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Cart and Totals */}
          <div className="col-span-8 space-y-4">
            {/* Quick Access Bar */}
            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex gap-2 overflow-x-auto">
                {topProductsData?.products && topProductsData.products.length > 0 ? (
                  topProductsData.products.map((product: TopProduct) => (
                    <button
                      key={product.id}
                      onClick={() => addFromQuickAccess(product)}
                      className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-3 min-w-[140px] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <div className="text-2xl font-bold mb-2">{product.sku}</div>
                      <div className="text-xs opacity-90 truncate">{product.name}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 py-2">Cargando productos más vendidos...</div>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay productos en el carrito
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.lineId} className="flex items-end gap-3 p-3 border border-gray-200 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                      </div>
                      <div className="flex flex-col gap-1 min-w-[6rem]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap text-right">Cantidad</label>
                        <input
                          ref={(el) => quantityRefs.current[item.lineId] = el}
                          data-quantity-input
                          type="number"
                          lang="en"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.lineId, e.target.value)}
                          onKeyDown={(e) => handleQuantityKeyDown(e, item.lineId)}
                          className="w-24 text-xl font-bold text-center border-0 focus:ring-2 focus:ring-blue-500 rounded-md bg-gray-50"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[7rem]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap text-right">Precio</label>
                        <input
                          ref={(el) => priceRefs.current[item.lineId] = el}
                          type="number"
                          lang="en"
                          value={item.unitPrice}
                          onChange={(e) => updatePrice(item.lineId, Number(e.target.value))}
                          onKeyDown={handlePriceKeyDown}
                          className="w-28 text-xl font-bold text-right border-0 focus:ring-2 focus:ring-blue-500 rounded-md bg-gray-50"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[8rem]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap text-right">Importe</label>
                        <input
                          type="text"
                          value={`$${Number(item.lineTotal).toFixed(2)}`}
                          readOnly
                          className="w-32 text-xl font-bold text-right border-0 rounded-md bg-gray-50 text-gray-900"
                        />
                      </div>
                      <button
                        onClick={() => removeFromCart(item.lineId)}
                        className="text-red-600 hover:text-red-700 p-2"
                        title="Eliminar producto"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Descuento:</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-2xl font-bold text-gray-900">
                    <span>TOTAL:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Cards */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Formas de Pago Rápidas</h3>
                <div className="flex gap-2 overflow-x-auto">
                  {paymentMethodsData?.slice(0, 5).map((pm: PaymentMethod) => {
                    const isDisabled = cart.length === 0 || !selectedWarehouse

                    return (
                      <button
                        key={pm.id}
                        onClick={() => handleQuickPayment(pm)}
                        disabled={isDisabled}
                        className={`
                          flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]
                          ${isDisabled
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : pm.paymentType === 'CASH'
                              ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                              : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-blue-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                          }
                        `}
                      >
                        <div className="text-sm font-bold">{pm.name}</div>
                        <div className="text-xs opacity-90 mt-1">{pm.paymentType}</div>
                      </button>
                    )
                  })}

                  {/* Otros - Opens modal */}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0 || !selectedWarehouse}
                    className={`
                      flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]
                      ${cart.length === 0 || !selectedWarehouse
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-purple-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                      }
                    `}
                  >
                    <div className="text-sm font-bold">OTROS</div>
                    <div className="text-xs opacity-90 mt-1">Más opciones</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirmar Venta</h2>
            <p className="text-gray-700 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog({ show: false, message: '', amount: 0, paymentMethod: null })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar [ESC]
              </button>
              <button
                onClick={handleConfirmPayment}
                autoFocus
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
              >
                Confirmar [ENTER]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Cobrar - Total: ${total.toFixed(2)}</h2>

            {/* Payment Method Selection */}
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Agregar Forma de Pago
              </label>
              <div className="flex gap-2">
                <select
                  id="paymentMethodSelect"
                  className="flex-1 rounded-md border-gray-300"
                >
                  {paymentMethodsData?.map((pm: PaymentMethod) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  id="paymentAmountInput"
                  placeholder="Monto"
                  className="w-32 rounded-md border-gray-300"
                  defaultValue={balance > 0 ? balance.toFixed(2) : ''}
                />
                <button
                  onClick={() => {
                    const select = document.getElementById('paymentMethodSelect') as HTMLSelectElement
                    const input = document.getElementById('paymentAmountInput') as HTMLInputElement
                    const pmId = select.value
                    const amount = parseFloat(input.value)

                    if (pmId && amount > 0) {
                      const pm = paymentMethodsData?.find((p: PaymentMethod) => p.id === pmId)
                      setPayments([...payments, {
                        paymentMethodId: pmId,
                        paymentMethodName: pm?.name || '',
                        amount
                      }])
                      input.value = ''
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>

              {/* Payments List */}
              {payments.length > 0 && (
                <div className="border border-gray-200 rounded-md divide-y">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3">
                      <span className="font-medium">{payment.paymentMethodName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">${payment.amount.toFixed(2)}</span>
                        <button
                          onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-md p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total a pagar:</span>
                  <span className="font-semibold">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagado:</span>
                  <span className="font-semibold">${totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  {balance > 0 ? (
                    <>
                      <span className="text-red-600">Falta:</span>
                      <span className="text-red-600">${balance.toFixed(2)}</span>
                    </>
                  ) : balance < 0 ? (
                    <>
                      <span className="text-green-600">Vuelto:</span>
                      <span className="text-green-600">${change.toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-600">✓ Completo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shouldInvoice"
                  checked={shouldInvoice}
                  onChange={(e) => setShouldInvoice(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="shouldInvoice" className="text-sm">
                  Generar Factura Electrónica AFIP
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitSale}
                disabled={Math.abs(balance) > 0.01 || createSaleMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
              >
                {createSaleMutation.isPending ? 'Procesando...' : 'CONFIRMAR VENTA'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
