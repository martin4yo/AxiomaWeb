import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Trash2, Edit3, X, Save } from 'lucide-react'
import { api as axios } from '../../services/api'
import { quotesApi } from '../../api/quotes'
import { useAuthStore } from '../../stores/authStore'

interface Product {
  id: string
  sku: string
  name: string
  salePrice: number
  trackStock: boolean
  currentStock: number
}

interface Customer {
  id: string
  name: string
  ivaCondition: string
  email?: string
}

interface QuoteItem {
  lineId: string
  productId: string
  productSku: string
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  discountPercent: number
  lineTotal: number
}

export default function NewQuotePage() {
  const navigate = useNavigate()
  const { currentTenant } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const priceRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // State
  const [activeTab, setActiveTab] = useState<'header' | 'products'>('header')
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<QuoteItem[]>([])
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  // Set default validity date to 15 days from today
  const getDefaultValidityDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 15)
    return date.toISOString().split('T')[0]
  }
  const [validUntil, setValidUntil] = useState(getDefaultValidityDate())
  const [editingDescription, setEditingDescription] = useState<{ lineId: string; description: string } | null>(null)

  // Queries
  const { data: customersData } = useQuery({
    queryKey: ['customers', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/entities`, {
        params: { isCustomer: true, limit: 1000 }
      })
      return response.data.entities
    },
    enabled: !!currentTenant
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', currentTenant?.slug, productSearchTerm],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/products`, {
        params: { search: productSearchTerm, limit: 100 }
      })
      return response.data.products || response.data.data
    },
    enabled: !!currentTenant
  })

  // Mutation para crear presupuesto
  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return await quotesApi.createQuote(data)
    },
    onSuccess: () => {
      alert('Presupuesto creado exitosamente')
      navigate('/quotes')
    },
    onError: (error: any) => {
      alert(`Error al crear presupuesto: ${error.response?.data?.error || error.message}`)
    }
  })

  // Auto-switch to products tab when header is complete (only once)
  useEffect(() => {
    if (selectedCustomer && !hasAutoSwitched) {
      setActiveTab('products')
      setHasAutoSwitched(true)
    }
  }, [selectedCustomer, hasAutoSwitched])

  // Focus input when switching to products tab
  useEffect(() => {
    if (activeTab === 'products') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeTab])

  // Agregar producto al carrito
  const addProductToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id)

    if (existingItem) {
      // Incrementar cantidad
      const newQuantity = existingItem.quantity + 1
      const newLineTotal = Number(newQuantity) * Number(existingItem.unitPrice) * (1 - Number(existingItem.discountPercent) / 100)
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: newQuantity, lineTotal: newLineTotal }
          : item
      ))

      // Focus en el input de cantidad
      setTimeout(() => {
        quantityRefs.current[existingItem.lineId]?.select()
      }, 100)
    } else {
      // Agregar nuevo item
      const unitPrice = Number(product.salePrice)
      const newItem: QuoteItem = {
        lineId: `line-${Date.now()}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        quantity: 1,
        unitPrice: unitPrice,
        discountPercent: 0,
        lineTotal: unitPrice
      }
      setCart([...cart, newItem])

      // Focus en el input de cantidad del nuevo item
      setTimeout(() => {
        quantityRefs.current[newItem.lineId]?.select()
      }, 100)
    }

    setProductSearchTerm('')
    inputRef.current?.focus()
  }

  // Actualizar cantidad
  const updateQuantity = (lineId: string, value: string) => {
    const quantity = Number(value) || 0
    if (quantity <= 0) {
      removeItem(lineId)
      return
    }
    setCart(cart.map(item => {
      if (item.lineId === lineId) {
        const lineTotal = Number(quantity) * Number(item.unitPrice) * (1 - Number(item.discountPercent) / 100)
        return { ...item, quantity, lineTotal }
      }
      return item
    }))
  }

  // Actualizar precio
  const updatePrice = (lineId: string, value: string) => {
    const unitPrice = Number(value) || 0
    if (unitPrice < 0) return
    setCart(cart.map(item => {
      if (item.lineId === lineId) {
        const lineTotal = Number(item.quantity) * Number(unitPrice) * (1 - Number(item.discountPercent) / 100)
        return { ...item, unitPrice, lineTotal }
      }
      return item
    }))
  }

  // Actualizar descuento
  const updateDiscount = (lineId: string, value: string) => {
    const discountPercent = Number(value) || 0
    if (discountPercent < 0 || discountPercent > 100) return
    setCart(cart.map(item => {
      if (item.lineId === lineId) {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice) * (1 - Number(discountPercent) / 100)
        return { ...item, discountPercent, lineTotal }
      }
      return item
    }))
  }

  // Eliminar item
  const removeItem = (lineId: string) => {
    setCart(cart.filter(item => item.lineId !== lineId))
  }

  // Abrir modal de edición de descripción
  const openDescriptionEditor = (lineId: string) => {
    const item = cart.find(i => i.lineId === lineId)
    if (item) {
      setEditingDescription({ lineId, description: item.description || '' })
    }
  }

  // Guardar descripción editada
  const saveDescription = () => {
    if (editingDescription) {
      setCart(cart.map(item =>
        item.lineId === editingDescription.lineId
          ? { ...item, description: editingDescription.description }
          : item
      ))
      setEditingDescription(null)
    }
  }

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.lineTotal), 0)

    // Si el cliente es exento de IVA, no calculamos IVA
    const isExempt = selectedCustomer?.ivaCondition === 'EX' || selectedCustomer?.ivaCondition === 'MT'
    const taxRate = isExempt ? 0 : 21
    const tax = Number(subtotal) * (taxRate / 100)
    const total = Number(subtotal) + Number(tax)

    return { subtotal, tax, total, taxRate }
  }

  const { subtotal, tax, total } = calculateTotals()

  // Crear presupuesto
  const handleCreateQuote = async () => {
    if (cart.length === 0) {
      alert('Debe agregar al menos un producto')
      return
    }

    const quoteData = {
      customerId: selectedCustomer?.id,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        description: item.description
      })),
      notes,
      termsAndConditions,
      internalNotes,
      validUntil: validUntil || undefined
    }

    createQuoteMutation.mutate(quoteData)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const headerComplete = !!selectedCustomer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Presupuesto</h1>
          <p className="text-gray-600">Crea un presupuesto para tus clientes</p>
        </div>
        <div className="flex items-center gap-4">
          {cart.length > 0 && (
            <>
              <div className="flex gap-6 text-lg mr-4">
                <div>
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="ml-2 font-semibold">${formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span className="text-gray-600">IVA:</span>
                  <span className="ml-2 font-semibold">${formatCurrency(tax)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="ml-2 font-semibold text-blue-600">${formatCurrency(total)}</span>
                </div>
              </div>
              <button
                onClick={handleCreateQuote}
                disabled={createQuoteMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
              >
                {createQuoteMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/quotes')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('header')}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === 'header'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                Datos del Presupuesto
                {headerComplete && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    ✓
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                if (headerComplete) setActiveTab('products')
              }}
              disabled={!headerComplete}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : headerComplete
                  ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                Productos
                {cart.length > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {cart.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'header' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customersData?.find((c: Customer) => c.id === e.target.value)
                    setSelectedCustomer(customer || null)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customersData?.map((customer: Customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.ivaCondition ? `(${customer.ivaCondition})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Validez */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Válido hasta
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas visibles para el cliente..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Términos y Condiciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Términos y Condiciones
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Términos y condiciones..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notas Internas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Internas
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas internas (no visibles para el cliente)..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de productos - Izquierda */}
              <div className="flex flex-col h-[600px]">
                <h3 className="font-semibold mb-3">Productos Disponibles</h3>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                />
                <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto">
                  {productsData && productsData.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {productsData.map((product: Product) => (
                        <button
                          key={product.id}
                          onClick={() => addProductToCart(product)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku} | ${formatCurrency(product.salePrice)}
                            {product.trackStock && ` | Stock: ${product.currentStock}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No hay productos disponibles
                    </div>
                  )}
                </div>
              </div>

              {/* Carrito - Derecha */}
              <div className="flex flex-col h-[600px]">
                <h3 className="font-semibold mb-3">Items del Presupuesto</h3>
                <div className="flex-1 border border-gray-300 rounded-lg overflow-y-auto p-3">
                  {cart.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No hay productos en el presupuesto
                    </div>
                  ) : (
                    <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.lineId} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">SKU: {item.productSku}</div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-1 italic">{item.description}</div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openDescriptionEditor(item.lineId)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Editar descripción"
                            >
                              <Edit3 className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => removeItem(item.lineId)}
                              className="p-1 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <label className="text-xs text-gray-500">Cant.</label>
                            <input
                              ref={(el) => (quantityRefs.current[item.lineId] = el)}
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.lineId, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Precio</label>
                            <input
                              ref={(el) => (priceRefs.current[item.lineId] = el)}
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updatePrice(item.lineId, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Desc %</label>
                            <input
                              type="number"
                              value={item.discountPercent}
                              onChange={(e) => updateDiscount(item.lineId, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Total</label>
                            <div className="px-2 py-1 bg-gray-50 rounded font-medium">
                              ${formatCurrency(item.lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de edición de descripción */}
      {editingDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Descripción</h3>
            <textarea
              value={editingDescription.description}
              onChange={(e) => setEditingDescription({ ...editingDescription, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingDescription(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="h-4 w-4 inline mr-1" />
                Cancelar
              </button>
              <button
                onClick={saveDescription}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="h-4 w-4 inline mr-1" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
