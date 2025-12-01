import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronDown, ChevronUp, Edit3, Calendar } from 'lucide-react'
import { api as axios } from '../../services/api'
import { purchasesApi } from '../../api/purchases'
import { useAuthStore } from '../../stores/authStore'
import { AlertDialog } from '../../components/ui/AlertDialog'

interface Product {
  id: string
  sku: string
  name: string
  costPrice: number
  trackStock: boolean
  currentStock: number
  barcode?: string
  abbreviation?: string
}

interface Supplier {
  id: string
  name: string
  code?: string
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

interface PurchaseItem {
  lineId: string
  productId: string
  productSku: string
  productName: string
  description?: string
  expirationDate?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface Payment {
  paymentMethodId: string
  paymentMethodName: string
  amount: number
  reference?: string
}

export default function NewPurchasePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentTenant } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const priceRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // State
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [cart, setCart] = useState<PurchaseItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState('')
  const [editingDescription, setEditingDescription] = useState<{ lineId: string; description: string } | null>(null)
  const [editingExpiration, setEditingExpiration] = useState<{ lineId: string; expirationDate: string } | null>(null)
  const [documentClass, setDocumentClass] = useState<'invoice' | 'credit_note' | 'debit_note' | 'quote'>('invoice')
  const [purchaseDataExpanded, setPurchaseDataExpanded] = useState(true)
  const [productSearchExpanded, setProductSearchExpanded] = useState(false)
  const [invalidItems, setInvalidItems] = useState<Set<string>>(new Set())
  const [alertDialog, setAlertDialog] = useState<{ show: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ show: false, title: '', message: '', type: 'info' })

  // Check if purchase data is complete
  const purchaseDataComplete = !!(selectedSupplier && selectedWarehouse)

  // Auto-open product search when purchase data is complete
  useEffect(() => {
    if (purchaseDataComplete && purchaseDataExpanded) {
      setPurchaseDataExpanded(false)
      setProductSearchExpanded(true)
      // Focus on search input after accordion opens
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [purchaseDataComplete])

  // Queries
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/inventory/warehouses`)
      return response.data
    },
    enabled: !!currentTenant
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/entities`, {
        params: { type: 'supplier', limit: 1000 }
      })
      return response.data.entities
    },
    enabled: !!currentTenant
  })

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['paymentMethods', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/payment-methods`)
      return response.data.paymentMethods || []
    },
    enabled: !!currentTenant
  })

  // Quick access products
  const { data: quickAccessProductsData } = useQuery({
    queryKey: ['quickAccessProducts', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/products/quick-access`)
      return response.data
    },
    enabled: !!currentTenant
  })

  // Product search
  const { data: productsData } = useQuery({
    queryKey: ['products', productSearchTerm, currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/products`, {
        params: {
          search: productSearchTerm || undefined,
          limit: productSearchTerm ? 10 : 20
        }
      })
      return response.data
    },
    enabled: !!currentTenant
  })

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await purchasesApi.create(currentTenant!.slug, data)
    },
    onSuccess: () => {
      showAlert('Compra creada', 'La compra se ha registrado exitosamente', 'success')
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setTimeout(() => navigate('/purchases'), 1500)
    },
    onError: (error: any) => {
      showAlert('Error', error.response?.data?.error || 'Error al crear la compra', 'error')
    }
  })

  // Set default values
  useEffect(() => {
    if (warehousesData && !selectedWarehouse) {
      const defaultWarehouse = warehousesData.find((w: Warehouse) => w.isDefault) || warehousesData[0]
      setSelectedWarehouse(defaultWarehouse)
    }
  }, [warehousesData, selectedWarehouse])

  // Add product to cart
  const addProductToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id)

    if (existingItem) {
      // Increment quantity
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
          : item
      ))
      // Focus quantity input
      setTimeout(() => {
        quantityRefs.current[existingItem.lineId]?.focus()
        quantityRefs.current[existingItem.lineId]?.select()
      }, 0)
    } else {
      // Add new item
      const newItem: PurchaseItem = {
        lineId: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity: 1,
        unitPrice: product.costPrice || 0,
        lineTotal: product.costPrice || 0
      }
      setCart([...cart, newItem])
      // Focus quantity input after adding
      setTimeout(() => {
        quantityRefs.current[newItem.lineId]?.focus()
        quantityRefs.current[newItem.lineId]?.select()
      }, 0)
    }

    setProductSearchTerm('')
    inputRef.current?.focus()
  }

  // Add from quick access
  const addFromQuickAccess = (product: Product) => {
    if (!purchaseDataComplete) {
      showAlert('Datos incompletos', 'Complete los datos de la compra antes de agregar productos', 'warning')
      return
    }
    addProductToCart(product)
  }

  // Handle product search key down
  const handleProductSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productSearchTerm.trim()) {
      e.preventDefault()
      const searchTerm = productSearchTerm.trim()

      // Check if it's a barcode (numeric and longer than SKU)
      if (/^\d+$/.test(searchTerm) && searchTerm.length > 5) {
        try {
          const response = await axios.get(`/${currentTenant!.slug}/products`, {
            params: { barcode: searchTerm }
          })

          if (response.data.products && response.data.products.length > 0) {
            const product = response.data.products.find((p: Product) => p.barcode === searchTerm)

            if (product) {
              addProductToCart(product)
              return
            }
          }

          showAlert('Producto no encontrado', `Producto con código de barras ${searchTerm} no encontrado`, 'warning')
          setProductSearchTerm('')
          inputRef.current?.focus()
          return
        } catch (error) {
          console.error('Error searching product:', error)
          showAlert('Error', 'Error al buscar el producto', 'error')
          setProductSearchTerm('')
          inputRef.current?.focus()
          return
        }
      }

      // Normal text search
      if (productsData?.products && productsData.products.length > 0) {
        if (productsData.products.length === 1) {
          addProductToCart(productsData.products[0])
        } else {
          const exactMatch = productsData.products.find(
            (p: Product) => p.sku.toLowerCase() === searchTerm.toLowerCase()
          )
          if (exactMatch) {
            addProductToCart(exactMatch)
          } else {
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
        ? { ...item, quantity: numQuantity, lineTotal: numQuantity * item.unitPrice }
        : item
    ))
  }

  // Update price
  const updatePrice = (lineId: string, unitPrice: number) => {
    setCart(cart.map(item =>
      item.lineId === lineId
        ? { ...item, unitPrice, lineTotal: item.quantity * unitPrice }
        : item
    ))
  }

  // Handle keyboard navigation
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

  // Show alert dialog
  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertDialog({ show: true, title, message, type })
  }

  // Validate cart
  const validateCart = (): boolean => {
    const invalid = new Set<string>()
    let hasErrors = false

    cart.forEach(item => {
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        invalid.add(item.lineId)
        hasErrors = true
      }
    })

    setInvalidItems(invalid)
    return !hasErrors
  }

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
  const total = subtotal

  // Calculate payment totals
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const balance = total - totalPaid

  // Handle quick payment
  const handleQuickPayment = (paymentMethod: PaymentMethod) => {
    if (!validateCart()) {
      showAlert('Productos inválidos', 'Algunos productos tienen cantidad o precio en 0', 'warning')
      return
    }

    if (!selectedSupplier) {
      showAlert('Proveedor requerido', 'Debe seleccionar un proveedor', 'warning')
      return
    }

    if (!selectedWarehouse) {
      showAlert('Almacén requerido', 'Debe seleccionar un almacén', 'warning')
      return
    }

    // Add payment with full amount
    const newPayment: Payment = {
      paymentMethodId: paymentMethod.id,
      paymentMethodName: paymentMethod.name,
      amount: total
    }

    handleSubmitPurchase([newPayment])
  }

  // Handle account payment (cuenta corriente - no payment)
  const handleAccountPayment = () => {
    if (!validateCart()) {
      showAlert('Productos inválidos', 'Algunos productos tienen cantidad o precio en 0', 'warning')
      return
    }

    if (!selectedSupplier) {
      showAlert('Proveedor requerido', 'Debe seleccionar un proveedor', 'warning')
      return
    }

    if (!selectedWarehouse) {
      showAlert('Almacén requerido', 'Debe seleccionar un almacén', 'warning')
      return
    }

    // Submit purchase with no payments (quedará pendiente en cuenta corriente)
    handleSubmitPurchase([])
  }

  // Handle submit purchase
  const handleSubmitPurchase = (purchasePayments: Payment[]) => {
    const purchaseData = {
      supplierId: selectedSupplier!.id,
      warehouseId: selectedWarehouse!.id,
      invoiceNumber,
      invoiceDate: invoiceDate || undefined,
      items: cart.map(item => ({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        description: item.description,
        expirationDate: item.expirationDate,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      payments: purchasePayments.map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        reference: p.reference
      })),
      notes
    }

    createPurchaseMutation.mutate(purchaseData)
  }

  // ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/purchases')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Description Edit Modal */}
      {editingDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar Descripción</h2>
            <textarea
              value={editingDescription.description}
              onChange={(e) => setEditingDescription({ ...editingDescription, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Descripción personalizada del producto..."
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingDescription(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setCart(cart.map(item =>
                    item.lineId === editingDescription.lineId
                      ? { ...item, description: editingDescription.description || undefined }
                      : item
                  ))
                  setEditingDescription(null)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Date Edit Modal */}
      {editingExpiration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Editar Fecha de Vencimiento</h2>
            <input
              type="date"
              value={editingExpiration.expirationDate}
              onChange={(e) => setEditingExpiration({ ...editingExpiration, expirationDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingExpiration(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setCart(cart.map(item =>
                    item.lineId === editingExpiration.lineId
                      ? { ...item, expirationDate: editingExpiration.expirationDate || undefined }
                      : item
                  ))
                  setEditingExpiration(null)
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.show}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column - Purchase Data and Product Selection */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          {/* Acordeón 1: Datos de Compra */}
          <div className="bg-white rounded-lg shadow flex-shrink-0">
            <button
              onClick={() => setPurchaseDataExpanded(!purchaseDataExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">1. Datos de Compra</span>
                {purchaseDataComplete && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                    ✓ Completo
                  </span>
                )}
              </div>
              {purchaseDataExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {purchaseDataExpanded && (
              <div className="p-4 space-y-3 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor *
                  </label>
                  <select
                    value={selectedSupplier?.id || ''}
                    onChange={(e) => {
                      const supplier = suppliersData?.find((s: Supplier) => s.id === e.target.value)
                      setSelectedSupplier(supplier || null)
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliersData?.map((supplier: Supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Almacén *
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Comprobante
                  </label>
                  <select
                    value={documentClass}
                    onChange={(e) => setDocumentClass(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="invoice">Factura</option>
                    <option value="credit_note">Nota de Crédito</option>
                    <option value="debit_note">Nota de Débito</option>
                    <option value="quote">Presupuesto</option>
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
                    placeholder="Ej: 0001-00001234"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Acordeón 2: Selección de Productos */}
          <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
            {!purchaseDataComplete && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                <p className="text-xs text-amber-800">
                  Complete los datos de compra para habilitar la selección de productos
                </p>
              </div>
            )}
            <button
              onClick={() => {
                if (purchaseDataComplete) setProductSearchExpanded(!productSearchExpanded)
              }}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors flex-shrink-0 ${
                purchaseDataComplete ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-50 bg-gray-50'
              }`}
              disabled={!purchaseDataComplete}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">2. Selección de Productos</span>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {productSearchExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {productSearchExpanded && (
              <div className="p-4 flex-1 flex flex-col overflow-hidden border-t border-gray-200">
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

                {/* Search Results */}
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
                            <div className="text-lg font-semibold text-blue-600">
                              ${Number(product.costPrice).toFixed(2)}
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
            )}
          </div>
        </div>

        {/* Right Column - Cart and Totals */}
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          {/* Quick Access Bar */}
          <div className="bg-white rounded-lg shadow p-3 flex-shrink-0">
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {quickAccessProductsData?.products && quickAccessProductsData.products.length > 0 ? (
                  quickAccessProductsData.products.map((product: Product) => (
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
                onClick={() => navigate('/purchases')}
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
                cart.map((item) => {
                  const hasError = invalidItems.has(item.lineId)
                  return (
                    <div key={item.lineId} className={`flex items-end gap-3 p-3 border rounded-md ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{item.productName}</div>
                          <button
                            onClick={() => setEditingDescription({ lineId: item.lineId, description: item.description || '' })}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Editar descripción"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setEditingExpiration({ lineId: item.lineId, expirationDate: item.expirationDate || '' })}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Editar fecha de vencimiento"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                        <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                        {item.description && (
                          <div className="text-xs text-blue-600 italic mt-1">
                            {item.description}
                          </div>
                        )}
                        {item.expirationDate && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            Vence: {new Date(item.expirationDate).toLocaleDateString('es-AR')}
                          </div>
                        )}
                        {hasError && (
                          <div className="text-xs text-red-600 font-semibold mt-1">
                            ⚠ Cantidad o precio no puede ser 0
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-[7rem]">
                        <label className={`text-sm font-medium whitespace-nowrap text-right ${hasError ? 'text-red-700' : 'text-gray-700'}`}>Cantidad</label>
                        <input
                          ref={(el) => quantityRefs.current[item.lineId] = el}
                          data-quantity-input
                          type="number"
                          lang="en"
                          value={item.quantity}
                          onChange={(e) => {
                            updateQuantity(item.lineId, e.target.value)
                            if (hasError) {
                              setInvalidItems(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(item.lineId)
                                return newSet
                              })
                            }
                          }}
                          onKeyDown={(e) => handleQuantityKeyDown(e, item.lineId)}
                          className={`w-32 text-xl text-center focus:outline-none focus:ring-0 rounded-md ${hasError ? 'bg-red-100 border-red-300 text-red-900' : 'bg-gray-50'} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-[8rem]">
                        <label className={`text-sm font-medium whitespace-nowrap text-right ${hasError ? 'text-red-700' : 'text-gray-700'}`}>Precio</label>
                        <input
                          ref={(el) => priceRefs.current[item.lineId] = el}
                          type="number"
                          lang="en"
                          value={item.unitPrice}
                          onChange={(e) => {
                            updatePrice(item.lineId, Number(e.target.value))
                            if (hasError) {
                              setInvalidItems(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(item.lineId)
                                return newSet
                              })
                            }
                          }}
                          onKeyDown={handlePriceKeyDown}
                          className={`w-36 text-xl text-right focus:outline-none focus:ring-0 rounded-md ${hasError ? 'bg-red-100 border-red-300 text-red-900' : 'bg-gray-50'} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
                  )
                })
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
                  const isDisabled = !purchaseDataComplete || cart.length === 0 || !selectedWarehouse || createPurchaseMutation.isPending

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

                {/* Cuenta Corriente - No payment, leave pending */}
                <button
                  onClick={handleAccountPayment}
                  disabled={!purchaseDataComplete || cart.length === 0 || !selectedWarehouse || createPurchaseMutation.isPending}
                  className={`
                    flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]
                    ${!purchaseDataComplete || cart.length === 0 || !selectedWarehouse || createPurchaseMutation.isPending
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-orange-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }
                  `}
                >
                  <div className="text-sm font-bold">CTA CTE</div>
                  <div className="text-xs opacity-90 mt-1">Cuenta Corriente</div>
                </button>

                {/* Otros - Opens modal */}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!purchaseDataComplete || cart.length === 0 || !selectedWarehouse || createPurchaseMutation.isPending}
                  className={`
                    flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]
                    ${!purchaseDataComplete || cart.length === 0 || !selectedWarehouse || createPurchaseMutation.isPending
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Registrar Pago - Total: ${total.toFixed(2)}</h2>

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
                <div className="border rounded-md p-4 space-y-2">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{payment.paymentMethodName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                        <button
                          onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Pagado:</span>
                      <span>${totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Saldo:</span>
                      <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPayments([])
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!validateCart()) {
                    showAlert('Productos inválidos', 'Algunos productos tienen cantidad o precio en 0', 'warning')
                    return
                  }

                  if (payments.length === 0) {
                    showAlert('Sin pagos', 'Debe agregar al menos una forma de pago', 'warning')
                    return
                  }

                  handleSubmitPurchase(payments)
                  setShowPaymentModal(false)
                }}
                disabled={payments.length === 0 || createPurchaseMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                {createPurchaseMutation.isPending ? 'Guardando...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
