import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { api as axios } from '../../services/api'
import { salesApi, SaleItem as APISaleItem, SalePayment as APISalePayment } from '../../api/sales'

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

interface QuickAccessProduct {
  id: string
  sku: string
  name: string
  abbreviation?: string
  salePrice: number
  trackStock: boolean
  currentStock: number
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

  // Quick access products
  const { data: quickAccessProductsData } = useQuery({
    queryKey: ['quickAccessProducts'],
    queryFn: async () => {
      const response = await axios.get('/products/quick-access')
      return response.data
    }
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
  const addFromQuickAccess = (qaProduct: QuickAccessProduct) => {
    const product: Product = {
      id: qaProduct.id,
      sku: qaProduct.sku,
      name: qaProduct.name,
      salePrice: Number(qaProduct.salePrice),
      costPrice: 0,
      trackStock: qaProduct.trackStock,
      currentStock: Number(qaProduct.currentStock)
    }
    addProductToCart(product, true)
  }

  // Check if string is an EAN barcode (8, 13, or 14 digits)
  const isEANBarcode = (code: string) => {
    return /^\d{8}$|^\d{13}$|^\d{14}$/.test(code)
  }

  // Parse barcode from scale (balanza)
  const parseScaleBarcode = (barcode: string) => {
    // Format: 20 + 0001 + 072935 + 7
    // Pos 1-2 (idx 0-1): tipo de código (20)
    // Pos 3-6 (idx 2-5): código de producto (4 dígitos)
    // Pos 7-12 (idx 6-11): importe (6 dígitos)
    // Pos 13 (idx 12): dígito verificador
    if (barcode.length === 13 && barcode.startsWith('20')) {
      const productCode = barcode.substring(2, 6) // positions 3-6 (4 digits)
      const priceStr = barcode.substring(6, 12) // positions 7-12 (6 digits)
      const price = parseInt(priceStr) // price as-is (e.g., 072935 -> 72935)

      return {
        isScaleBarcode: true,
        productCode: productCode, // keep full string with leading zeros
        price: price
      }
    }
    return { isScaleBarcode: false, productCode: '', price: 0 }
  }

  // Handle Enter key to add product
  const handleProductSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const searchTerm = productSearchTerm.trim()

      // Check if it's an EAN barcode
      if (isEANBarcode(searchTerm)) {
        // Check if it's a scale barcode (starts with 20)
        const scaleData = parseScaleBarcode(searchTerm)

        if (scaleData.isScaleBarcode) {
          // Search product by code for scale barcode
          try {
            const response = await axios.get('/products', {
              params: {
                search: scaleData.productCode,
                limit: 10
              }
            })

            if (response.data.products && response.data.products.length > 0) {
              const product = response.data.products.find((p: Product) => p.sku === scaleData.productCode)

              if (product) {
                // Add to cart with custom price from barcode
                const lineId = crypto.randomUUID()
                setCart([...cart, {
                  lineId,
                  productId: product.id,
                  productSku: product.sku,
                  productName: product.name,
                  quantity: 1,
                  unitPrice: scaleData.price,
                  discountPercent: 0,
                  lineTotal: scaleData.price
                }])

                // Clear search and focus input
                setProductSearchTerm('')
                setTimeout(() => {
                  inputRef.current?.focus()
                }, 100)
                return
              }
            }

            // If product not found, show alert
            alert(`Producto con código ${scaleData.productCode} no encontrado`)
            setProductSearchTerm('')
            inputRef.current?.focus()
            return
          } catch (error) {
            console.error('Error searching product:', error)
            alert('Error al buscar el producto')
            setProductSearchTerm('')
            inputRef.current?.focus()
            return
          }
        } else {
          // It's a regular EAN barcode - search by barcode field
          try {
            const response = await axios.get('/products', {
              params: {
                search: searchTerm,
                limit: 100
              }
            })

            if (response.data.products && response.data.products.length > 0) {
              // Find exact barcode match
              const product = response.data.products.find((p: Product) => p.barcode === searchTerm)

              if (product) {
                addProductToCart(product)
                return
              }
            }

            // If product not found by barcode, show alert
            alert(`Producto con código de barras ${searchTerm} no encontrado`)
            setProductSearchTerm('')
            inputRef.current?.focus()
            return
          } catch (error) {
            console.error('Error searching product:', error)
            alert('Error al buscar el producto')
            setProductSearchTerm('')
            inputRef.current?.focus()
            return
          }
        }
      }

      // Normal text search handling - this filters the list by code and name
      if (productsData?.products && productsData.products.length > 0) {
        // If there's exactly one result, add it
        if (productsData.products.length === 1) {
          addProductToCart(productsData.products[0])
        }
        // If there are multiple results and the search term matches a SKU exactly, add that one
        else {
          const exactMatch = productsData.products.find(
            (p: Product) => p.sku.toLowerCase() === searchTerm.toLowerCase()
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
    <>
      <div className="p-6 h-screen flex flex-col">
        {/* Main Content */}
        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column - Product Search */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">Axioma Mini - Venta Mostrador</h1>
          </div>

          {/* Cliente y Almacén */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3 flex-shrink-0">
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
          <div className="bg-white rounded-lg shadow p-4 flex-1 flex flex-col overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
              Buscar Producto (SKU, nombre o código de barras)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              onKeyDown={handleProductSearchKeyDown}
              placeholder="Escriba para buscar..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3 flex-shrink-0"
              autoFocus
            />

            {/* Search Results - Siempre visible */}
            <div className="mt-3 border border-gray-200 rounded-md flex-1 overflow-y-auto">
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
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          {/* Quick Access Bar */}
          <div className="bg-white rounded-lg shadow p-3 flex-shrink-0">
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {quickAccessProductsData?.products && quickAccessProductsData.products.length > 0 ? (
                  quickAccessProductsData.products.map((product: QuickAccessProduct) => (
                    <button
                      key={product.id}
                      onClick={() => addFromQuickAccess(product)}
                      className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-3 min-w-[140px] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <div className="text-2xl font-bold mb-1">{product.abbreviation || product.sku}</div>
                      <div className="text-xs opacity-75">SKU: {product.sku}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 py-2">No hay productos de acceso rápido</div>
                )}
              </div>

              {/* Botón Salir */}
              <button
                onClick={() => navigate('/sales')}
                className="flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg p-3 min-w-[140px] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <div className="text-2xl font-bold mb-1">SALIR</div>
                <div className="text-xs opacity-75">ESC</div>
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-2 flex-1 overflow-y-auto">
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
                      <div className="flex flex-col gap-1 min-w-[7rem]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap text-right">Cantidad</label>
                        <input
                          ref={(el) => quantityRefs.current[item.lineId] = el}
                          data-quantity-input
                          type="number"
                          lang="en"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.lineId, e.target.value)}
                          onKeyDown={(e) => handleQuantityKeyDown(e, item.lineId)}
                          className="w-32 text-xl text-center focus:outline-none focus:ring-0 rounded-md bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[8rem]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap text-right">Precio</label>
                        <input
                          ref={(el) => priceRefs.current[item.lineId] = el}
                          type="number"
                          lang="en"
                          value={item.unitPrice}
                          onChange={(e) => updatePrice(item.lineId, Number(e.target.value))}
                          onKeyDown={handlePriceKeyDown}
                          className="w-36 text-xl text-right focus:outline-none focus:ring-0 rounded-md bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                          className="w-36 text-xl text-right rounded-md bg-gray-50 text-gray-900 focus:outline-none"
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

            {/* Totals and Payment Methods */}
            <div className="bg-white rounded-lg shadow p-6 flex-shrink-0">
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
    </>
  )
}
