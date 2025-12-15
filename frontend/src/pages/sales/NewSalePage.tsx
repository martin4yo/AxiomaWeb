import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react'
import { api as axios } from '../../services/api'
import { salesApi, SaleItem as APISaleItem, SalePayment as APISalePayment } from '../../api/sales'
import { useAuthStore } from '../../stores/authStore'
import { AlertDialog } from '../../components/ui/AlertDialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AFIPProgressModal } from '../../components/sales/AFIPProgressModal'
import { SaleSearchModal } from '../../components/sales/SaleSearchModal'

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
  isDefaultCustomer?: boolean
}

interface Warehouse {
  id: string
  name: string
  code: string
  isDefault?: boolean
}

interface Branch {
  id: string
  name: string
  code: string
}

interface SalesPoint {
  id: string
  number: number
  name: string
  branchId?: string
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
  description?: string
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
  const { currentTenant } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const priceRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // State
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedSalesPoint, setSelectedSalesPoint] = useState<SalesPoint | null>(null)
  const [cart, setCart] = useState<SaleItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [editingDescription, setEditingDescription] = useState<{ lineId: string; description: string } | null>(null)
  const [documentClass, setDocumentClass] = useState<'invoice' | 'credit_note' | 'debit_note' | 'quote'>(
    (currentTenant?.defaultDocumentClass as 'invoice' | 'credit_note' | 'debit_note' | 'quote') || 'invoice'
  )
  const [voucherInfo, setVoucherInfo] = useState<any>(null)
  const [fiscalDataExpanded, setFiscalDataExpanded] = useState(true)
  const [productSearchExpanded, setProductSearchExpanded] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; message: string; amount: number; paymentMethod: PaymentMethod | null }>({ show: false, message: '', amount: 0, paymentMethod: null })
  const [invalidItems, setInvalidItems] = useState<Set<string>>(new Set())
  const [alertDialog, setAlertDialog] = useState<{ show: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ show: false, title: '', message: '', type: 'info' })
  const [originSale, setOriginSale] = useState<any>(null)
  const [showSaleSearchModal, setShowSaleSearchModal] = useState(false)

  // AFIP Progress Modal
  const [afipProgressModal, setAfipProgressModal] = useState<{
    show: boolean
    steps: Array<{
      id: string
      label: string
      status: 'pending' | 'loading' | 'success' | 'error' | 'warning'
      message?: string
      detail?: string
    }>
    canClose: boolean
    pendingSaleData?: any
    saleResult?: {
      sale: any
      caeInfo?: any
      caeError?: any
      payments?: Array<{
        paymentMethodName: string
        amount: number
      }>
    }
  }>({
    show: false,
    steps: [],
    canClose: false,
    pendingSaleData: null,
    saleResult: undefined
  })

  // Check if fiscal data is complete
  const fiscalDataComplete = useMemo(() => {
    const isComplete = !!(
      selectedCustomer &&
      selectedBranch &&
      selectedSalesPoint &&
      selectedWarehouse &&
      voucherInfo
    )
    console.log('[FiscalData] Complete check:', {
      selectedCustomer: !!selectedCustomer,
      selectedBranch: !!selectedBranch,
      selectedSalesPoint: !!selectedSalesPoint,
      selectedWarehouse: !!selectedWarehouse,
      voucherInfo: !!voucherInfo,
      isComplete
    })
    return isComplete
  }, [selectedCustomer, selectedBranch, selectedSalesPoint, selectedWarehouse, voucherInfo])

  // Queries
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/inventory/warehouses`)
      return response.data
    },
    enabled: !!currentTenant
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches', currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/branches`)
      return response.data.branches
    },
    enabled: !!currentTenant
  })

  const { data: salesPointsData } = useQuery({
    queryKey: ['sales-points', currentTenant?.slug, selectedBranch?.id],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/sales-points`, {
        params: selectedBranch?.id ? { branchId: selectedBranch.id } : {}
      })
      return response.data.salesPoints
    },
    enabled: !!currentTenant && !!selectedBranch
  })

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

  // Product search - siempre muestra productos
  const { data: productsData } = useQuery({
    queryKey: ['products', productSearchTerm, currentTenant?.slug],
    queryFn: async () => {
      const response = await axios.get(`/${currentTenant!.slug}/products`, {
        params: {
          search: productSearchTerm || undefined,
          limit: productSearchTerm ? 10 : 20  // Más productos si no hay búsqueda
        }
      })
      return response.data
    },
    enabled: !!currentTenant  // Solo si hay tenant
  })

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      // Si requiere facturación, mostrar modal de progreso
      const requiresCae = voucherInfo?.requiresCae || false
      if (requiresCae && data.customerId) {
        setAfipProgressModal({
          show: true,
          steps: [
            {
              id: 'check-afip',
              label: 'Consultando último comprobante en AFIP',
              status: 'loading',
              message: 'Verificando sincronización con AFIP...'
            },
            {
              id: 'create-sale',
              label: 'Creando venta',
              status: 'pending'
            },
            {
              id: 'request-cae',
              label: 'Solicitando CAE a AFIP',
              status: 'pending'
            }
          ],
          canClose: false,
          pendingSaleData: data,
          saleResult: undefined
        })
      }

      return salesApi.createSale(currentTenant!.slug, data)
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })

      // Actualizar progreso si el modal está abierto
      if (afipProgressModal.show) {
        setAfipProgressModal(prev => ({
          ...prev,
          steps: prev.steps.map(step => {
            if (step.id === 'check-afip') return { ...step, status: 'success', message: 'Sincronización verificada' }
            if (step.id === 'create-sale') return { ...step, status: 'success', message: 'Venta creada exitosamente' }
            if (step.id === 'request-cae' && response.sale.caeInfo) {
              const caeExpiration = new Date(response.sale.caeInfo.caeExpiration).toLocaleDateString('es-AR')
              return {
                ...step,
                status: 'success',
                message: 'CAE autorizado exitosamente',
                detail: `CAE: ${response.sale.caeInfo.cae}\nVencimiento: ${caeExpiration}`
              }
            }
            if (step.id === 'request-cae' && response.sale.caeError) {
              return {
                ...step,
                status: 'error',
                message: response.sale.caeError.message,
                detail: response.sale.caeError.detail
              }
            }
            return step
          }),
          canClose: true,
          saleResult: {
            sale: response.sale,
            caeInfo: response.sale.caeInfo,
            caeError: response.sale.caeError,
            payments: (response.sale.payments || []).map((p: any) => ({
              paymentMethodName: p.paymentMethodName || p.paymentMethod?.name || 'Sin especificar',
              amount: Number(p.amount)
            }))
          }
        }))
      } else {
        // Si no hay modal de progreso (venta sin CAE), mostrar modal con resultado directamente
        setAfipProgressModal({
          show: true,
          steps: [],
          canClose: true,
          pendingSaleData: null,
          saleResult: {
            sale: response.sale,
            caeInfo: response.sale.caeInfo,
            caeError: response.sale.caeError,
            payments: (response.sale.payments || []).map((p: any) => ({
              paymentMethodName: p.paymentMethodName || p.paymentMethod?.name || 'Sin especificar',
              amount: Number(p.amount)
            }))
          }
        })
      }

      // Clear form for next sale
      setCart([])
      setPayments([])
      setNotes('')
      setProductSearchTerm('')

      // Reselect default customer
      if (customersData && customersData.length > 0) {
        const defaultCustomer = customersData.find((c: Customer) => c.isDefaultCustomer)
        if (defaultCustomer) {
          setSelectedCustomer(defaultCustomer)
        } else {
          setSelectedCustomer(null)
        }
      } else {
        setSelectedCustomer(null)
      }

      // Imprimir ticket automáticamente
      handlePrintTicket(response)
    },
    onError: (error: any) => {
      // Verificar si es error de desincronización AFIP
      if (error.response?.status === 409 && error.response?.data?.data?.code === 'AFIP_OUT_OF_SYNC') {
        const { lastAfipNumber, localNumber } = error.response.data.data

        // Actualizar modal de progreso con warning
        setAfipProgressModal(prev => ({
          ...prev,
          steps: prev.steps.map(step => {
            if (step.id === 'check-afip') {
              return {
                ...step,
                status: 'warning',
                message: `Desincronización detectada`,
                detail: `AFIP: ${lastAfipNumber} | Local: ${localNumber}`
              }
            }
            if (step.id === 'create-sale') return { ...step, status: 'pending', message: 'Esperando confirmación' }
            if (step.id === 'request-cae') return { ...step, status: 'pending', message: 'No se solicitará CAE' }
            return step
          }),
          canClose: true,
          pendingSaleData: afipProgressModal.pendingSaleData
        }))
      } else {
        // Otro error
        console.log('[Sale Error] Full error object:', error)
        console.log('[Sale Error] Response:', error.response)
        console.log('[Sale Error] Response data:', error.response?.data)
        console.log('[Sale Error] Response data.data:', error.response?.data?.data)

        if (afipProgressModal.show) {
          // Extraer detalles del error de AFIP si están disponibles
          const errorMessage = error.response?.data?.error || error.message
          const errorData = error.response?.data?.data
          const errorDetail = errorData?.detail || null

          console.log('[Sale Error] Extracted message:', errorMessage)
          console.log('[Sale Error] Extracted errorData:', errorData)
          console.log('[Sale Error] Extracted detail:', errorDetail)
          console.log('[Sale Error] Will show detail in modal:', !!errorDetail)

          setAfipProgressModal(prev => ({
            ...prev,
            steps: prev.steps.map(step => {
              if (step.status === 'loading') {
                console.log('[Sale Error] Updating step:', step.id, 'with detail:', errorDetail)
                return {
                  ...step,
                  status: 'error',
                  message: errorMessage,
                  detail: errorDetail || undefined
                }
              }
              return step
            }),
            canClose: true
          }))
        } else {
          showAlert('Error al crear la venta', error.response?.data?.error || error.message, 'error')
        }
      }
    }
  })

  // Reset state when tenant changes
  useEffect(() => {
    setSelectedCustomer(null)
    setSelectedWarehouse(null)
    setCart([])
    setPayments([])
    setNotes('')
    setVoucherInfo(null)
    setProductSearchTerm('')
  }, [currentTenant?.slug])

  // Auto-select default warehouse when data changes or warehouse is null
  useEffect(() => {
    if (warehousesData && warehousesData.length > 0) {
      // Si no hay warehouse seleccionado, o si el warehouse seleccionado no está en la nueva lista
      // (significa que cambió el tenant), seleccionar el warehouse por defecto
      const warehouseIds = warehousesData.map((w: Warehouse) => w.id)
      if (!selectedWarehouse || !warehouseIds.includes(selectedWarehouse.id)) {
        const defaultWarehouse = warehousesData.find((w: Warehouse) => w.isDefault) || warehousesData[0]
        setSelectedWarehouse(defaultWarehouse)
      }
    }
  }, [warehousesData])

  // Auto-select default customer when data changes or customer is null
  useEffect(() => {
    if (customersData && customersData.length > 0) {
      const customerIds = customersData.map((c: Customer) => c.id)
      if (!selectedCustomer || !customerIds.includes(selectedCustomer.id)) {
        const defaultCustomer = customersData.find((c: Customer) => c.isDefaultCustomer)
        if (defaultCustomer) {
          setSelectedCustomer(defaultCustomer)
        }
      }
    }
  }, [customersData])

  // Auto-select first branch when data changes or branch is null
  useEffect(() => {
    if (branchesData && branchesData.length > 0) {
      const branchIds = branchesData.map((b: Branch) => b.id)
      if (!selectedBranch || !branchIds.includes(selectedBranch.id)) {
        // Seleccionar la primera sucursal por defecto
        setSelectedBranch(branchesData[0])
      }
    }
  }, [branchesData])

  // Auto-select first sales point when data changes or branch changes
  useEffect(() => {
    if (salesPointsData && salesPointsData.length > 0) {
      const salesPointIds = salesPointsData.map((sp: SalesPoint) => sp.id)
      if (!selectedSalesPoint || !salesPointIds.includes(selectedSalesPoint.id)) {
        // Seleccionar el primer punto de venta por defecto
        setSelectedSalesPoint(salesPointsData[0])
      }
    } else {
      // Si no hay puntos de venta para esta sucursal, limpiar selección
      setSelectedSalesPoint(null)
    }
  }, [salesPointsData, selectedBranch])

  // Determine voucher type when customer or document class changes
  useEffect(() => {
    const determineVoucher = async () => {
      console.log('[Voucher] Determining voucher type...', {
        hasCustomer: !!selectedCustomer,
        hasTenant: !!currentTenant,
        documentClass,
        branchId: selectedBranch?.id
      })

      if (!selectedCustomer || !currentTenant) {
        console.log('[Voucher] Missing customer or tenant, clearing voucherInfo')
        setVoucherInfo(null)
        return
      }

      try {
        console.log('[Voucher] Calling API...', {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerIvaCondition: selectedCustomer.ivaCondition,
          documentClass,
          branchId: selectedBranch?.id
        })
        const response = await axios.post(`/${currentTenant.slug}/voucher/determine`, {
          customerId: selectedCustomer.id,
          documentClass,
          branchId: selectedBranch?.id
        })
        console.log('[Voucher] API response:', response.data)
        setVoucherInfo(response.data)
      } catch (error: any) {
        console.error('[Voucher] Error determining voucher:', error)
        console.error('[Voucher] Error response:', error.response?.data)
        console.error('[Voucher] Error message:', error.response?.data?.error || error.message)
        setVoucherInfo(null)
        // Mostrar alerta con el error
        const errorMessage = error.response?.data?.error || error.message || 'Error desconocido'
        showAlert('Error de Configuración', errorMessage, 'error')
      }
    }

    determineVoucher()
  }, [selectedCustomer, documentClass, selectedBranch, currentTenant])

  // Auto-expand product search when fiscal data is complete
  useEffect(() => {
    // Datos fiscales completos: cliente, sucursal, punto de venta, almacén y voucher determinado
    console.log('Checking fiscal data:', {
      voucherInfo: !!voucherInfo,
      selectedBranch: !!selectedBranch,
      selectedSalesPoint: !!selectedSalesPoint,
      selectedWarehouse: !!selectedWarehouse
    })

    const fiscalDataComplete = voucherInfo && selectedBranch && selectedSalesPoint && selectedWarehouse

    if (fiscalDataComplete) {
      console.log('[OK] Fiscal data complete - expanding products accordion')
      setProductSearchExpanded(true)
      setFiscalDataExpanded(false)
      // Focus on product search input when expanded
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [voucherInfo, selectedBranch, selectedSalesPoint, selectedWarehouse])

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
            showAlert('Producto no encontrado', `Producto con código ${scaleData.productCode} no encontrado`, 'warning')
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

  // Show alert dialog helper
  const showAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertDialog({ show: true, title, message, type })
  }

  // Print ticket helper
  const handlePrintTicket = async (saleResponse: any) => {
    try {
      const sale = saleResponse.sale

      // Usar el nuevo sistema de impresión que respeta printFormat
      console.log('[NewSale] Iniciando impresión para venta:', sale.id)
      const result = await salesApi.printThermal(sale.id)

      console.log('[NewSale] Resultado de impresión:', result)
      if (result.success) {
        console.log(`[NewSale] ✓ Impreso exitosamente con método: ${result.method}`)
      }
    } catch (error) {
      console.error('[NewSale] Error al imprimir:', error)
      showAlert('Error de Impresión', 'No se pudo imprimir el ticket. Verifique su impresora.', 'error')
    }
  }

  // Validate cart items
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
  const totalDiscount = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice * item.discountPercent / 100), 0)
  const total = subtotal - totalDiscount

  // Calculate payment totals
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const balance = total - totalPaid
  const change = totalPaid > total ? totalPaid - total : 0

  // Handle payment submission
  const handleSubmitSale = () => {
    if (!selectedWarehouse) {
      showAlert('Seleccionar almacén', 'Debe seleccionar un almacén', 'warning')
      return
    }

    if (cart.length === 0) {
      showAlert('Carrito vacío', 'Debe agregar al menos un producto', 'warning')
      return
    }

    if (!validateCart()) {
      showAlert('Error en productos', 'Hay productos con cantidad o precio igual a 0. Por favor corríjalos o elimínelos del carrito.', 'error')
      return
    }

    if (Math.abs(balance) > 0.01) {
      showAlert('Pago incompleto', `El pago debe ser igual al total. Falta: $${balance.toFixed(2)}`, 'warning')
      return
    }

    // Validar que se haya seleccionado venta original para NC/ND
    if ((documentClass === 'credit_note' || documentClass === 'debit_note') && !originSale) {
      showAlert(
        'Venta original requerida',
        `Debe seleccionar la venta original para emitir una ${documentClass === 'credit_note' ? 'nota de crédito' : 'nota de débito'}`,
        'error'
      )
      return
    }

    // Prepare data
    const saleData = {
      customerId: selectedCustomer?.id,
      branchId: selectedBranch?.id,
      warehouseId: selectedWarehouse.id,
      saleDate,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        description: item.description
      })) as APISaleItem[],
      payments: payments.map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        reference: p.reference
      })) as APISalePayment[],
      notes: notes || undefined,
      shouldInvoice: voucherInfo?.requiresCae || false,
      documentClass,
      originSaleId: originSale?.id
    }

    createSaleMutation.mutate(saleData)
  }

  // Quick payment with confirmation - pays with single payment method
  const handleQuickPayment = (paymentMethod: PaymentMethod) => {
    if (!validateCart()) {
      showAlert('Error en productos', 'Hay productos con cantidad o precio igual a 0. Por favor corríjalos o elimínelos del carrito.', 'error')
      return
    }

    // Validar que se haya seleccionado venta original para NC/ND
    if ((documentClass === 'credit_note' || documentClass === 'debit_note') && !originSale) {
      showAlert(
        'Venta original requerida',
        `Debe seleccionar la venta original para emitir una ${documentClass === 'credit_note' ? 'nota de crédito' : 'nota de débito'}`,
        'error'
      )
      return
    }

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
        branchId: selectedBranch?.id,
        warehouseId: selectedWarehouse!.id,
        saleDate,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          description: item.description
        })) as APISaleItem[],
        payments: [{
          paymentMethodId: paymentMethod.id,
          amount: confirmDialog.amount
        }] as APISalePayment[],
        notes: notes || undefined,
        shouldInvoice: voucherInfo?.requiresCae || false,
        documentClass,
        originSaleId: originSale?.id
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
            <h1 className="text-2xl font-bold text-gray-900">Nueva Venta</h1>
          </div>

          {/* Acordeón 1: Datos Fiscales */}
          <div className="bg-white rounded-lg shadow flex-shrink-0">
            <button
              onClick={() => setFiscalDataExpanded(!fiscalDataExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                {fiscalDataExpanded ? (
                  <>
                    <span className="text-lg font-semibold text-gray-900">
                      {voucherInfo ? `1. ${voucherInfo.voucherType.name}` : '1. Datos Fiscales'}
                    </span>
                    {voucherInfo && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded whitespace-nowrap">
                        {selectedCustomer?.name}
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className="text-lg font-semibold text-gray-900 truncate"
                    title={voucherInfo && selectedCustomer ? `${voucherInfo.voucherType.name} - ${selectedCustomer.name}` : undefined}
                  >
                    {voucherInfo && selectedCustomer
                      ? `${voucherInfo.voucherType.name} - ${selectedCustomer.name}`
                      : '1. Datos Fiscales'
                    }
                  </span>
                )}
              </div>
              {fiscalDataExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}
            </button>

            {fiscalDataExpanded && (
              <div className="p-4 space-y-3 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customersData?.find((c: Customer) => c.id === e.target.value)
                  setSelectedCustomer(customer || null)
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente...</option>
                {customersData?.map((customer: Customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sucursal
              </label>
              <select
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const branch = branchesData?.find((b: Branch) => b.id === e.target.value)
                  setSelectedBranch(branch || null)
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {branchesData?.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punto de Venta
              </label>
              <select
                value={selectedSalesPoint?.id || ''}
                onChange={(e) => {
                  const salesPoint = salesPointsData?.find((sp: SalesPoint) => sp.id === e.target.value)
                  setSelectedSalesPoint(salesPoint || null)
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={!selectedBranch || !salesPointsData || salesPointsData.length === 0}
              >
                {salesPointsData && salesPointsData.length > 0 ? (
                  salesPointsData.map((sp: SalesPoint) => (
                    <option key={sp.id} value={sp.id}>
                      PV {sp.number.toString().padStart(5, '0')} - {sp.name}
                    </option>
                  ))
                ) : (
                  <option value="">No hay puntos de venta</option>
                )}
              </select>
              {!salesPointsData || salesPointsData.length === 0 ? (
                <p className="mt-1 text-xs text-red-600">
                  Configure un punto de venta para esta sucursal
                </p>
              ) : null}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={documentClass}
                onChange={(e) => {
                  setDocumentClass(e.target.value as any)
                  // Limpiar venta original si se cambia a factura/presupuesto
                  if (e.target.value === 'invoice' || e.target.value === 'quote') {
                    setOriginSale(null)
                  }
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="invoice">Factura</option>
                <option value="credit_note">Nota de Crédito</option>
                <option value="debit_note">Nota de Débito</option>
                <option value="quote">Presupuesto</option>
              </select>
            </div>

            {/* Selector de Venta Original para NC/ND */}
            {(documentClass === 'credit_note' || documentClass === 'debit_note') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venta Original {documentClass === 'credit_note' ? '(a acreditar)' : '(a debitar)'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {originSale ? (
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      <div className="text-sm font-semibold text-gray-900">
                        {originSale.fullVoucherNumber || originSale.saleNumber}
                      </div>
                      <div className="text-xs text-gray-600">
                        {originSale.customerName} - ${originSale.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600">
                        Disponible: ${originSale.availableForCredit.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => setOriginSale(null)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Limpiar selección"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaleSearchModal(true)}
                    className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Buscar venta original...
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Venta
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Voucher Info */}
            {voucherInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm font-semibold text-blue-900 mb-1">
                  {voucherInfo.voucherType.name}
                </div>
                <div className="text-xs text-blue-700">
                  Número: {voucherInfo.nextNumber}
                </div>
                {voucherInfo.requiresCae && (
                  <div className="text-xs text-blue-700">
                    ⚡ Requiere CAE de AFIP
                  </div>
                )}
                {voucherInfo.salesPoint && (
                  <div className="text-xs text-blue-600">
                    PV {voucherInfo.salesPoint.number.toString().padStart(5, '0')}
                  </div>
                )}
              </div>
            )}

            {!selectedCustomer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs text-yellow-800">
                Seleccione un cliente para determinar el tipo de comprobante
              </div>
            )}
              </div>
            )}
          </div>

          {/* Acordeón 2: Selección de Productos */}
          <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
            {!fiscalDataComplete && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                <p className="text-xs text-amber-800">
                  Complete todos los datos fiscales para habilitar la selección de productos
                </p>
              </div>
            )}
            <button
              onClick={() => {
                console.log('[ProductAccordion Button] Click!', 'fiscalDataComplete:', fiscalDataComplete)
                if (fiscalDataComplete) setProductSearchExpanded(!productSearchExpanded)
              }}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors flex-shrink-0 ${
                fiscalDataComplete ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-50 bg-gray-50'
              }`}
              disabled={!fiscalDataComplete}
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
                        </div>
                        <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                        {item.description && (
                          <div className="text-xs text-blue-600 italic mt-1">
                            {item.description}
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
                            // Clear error when user starts editing
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
                            // Clear error when user starts editing
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
                    const isDisabled = !fiscalDataComplete || cart.length === 0 || !selectedWarehouse || createSaleMutation.isPending

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
                    disabled={!fiscalDataComplete || cart.length === 0 || !selectedWarehouse || createSaleMutation.isPending}
                    className={`
                      flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[140px]
                      ${!fiscalDataComplete || cart.length === 0 || !selectedWarehouse || createSaleMutation.isPending
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
                disabled={!fiscalDataComplete || Math.abs(balance) > 0.01 || createSaleMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
              >
                {createSaleMutation.isPending ? 'Procesando...' : 'CONFIRMAR VENTA'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.show}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Confirm Dialog for Quick Payment */}
      <ConfirmDialog
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ show: false, message: '', amount: 0, paymentMethod: null })}
        onConfirm={handleConfirmPayment}
        title="Confirmar Venta"
        message={confirmDialog.message}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="success"
      />

      <AFIPProgressModal
        isOpen={afipProgressModal.show}
        steps={afipProgressModal.steps}
        canClose={afipProgressModal.canClose}
        saleResult={afipProgressModal.saleResult}
        onClose={() => {
          setAfipProgressModal({ show: false, steps: [], canClose: false, pendingSaleData: null, saleResult: undefined })
          inputRef.current?.focus()
        }}
      />

      {/* Sale Search Modal for Credit/Debit Notes */}
      <SaleSearchModal
        isOpen={showSaleSearchModal}
        onClose={() => setShowSaleSearchModal(false)}
        onSelect={(sale) => {
          setOriginSale(sale)
          setShowSaleSearchModal(false)
          // Si la venta original tiene un cliente, seleccionarlo automáticamente
          if (sale.customer) {
            setSelectedCustomer({
              id: sale.customer.id,
              name: sale.customer.name,
              ivaCondition: sale.customer.ivaCondition
            })
          }
        }}
        customerId={selectedCustomer?.id}
      />
    </>
  )
}
