import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TextArea } from '../ui/TextArea'
import { Tabs } from '../ui/Tabs'
import { useAuthStore } from '../../stores/authStore'
import { productCategoriesApi } from '../../api/product-categories'
import { productBrandsApi } from '../../api/product-brands'
import { api } from '../../services/api'

const schema = z.object({
  sku: z.string().min(1, 'El SKU es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  costPrice: z.number().min(0, 'El precio de costo debe ser mayor o igual a 0'),
  salePrice: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  currency: z.string().default('ARS'),
  trackStock: z.boolean().default(true),
  // Campos de stock opcionales - solo requeridos si trackStock es true (validación en superRefine)
  currentStock: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val)) ? null : Number(val),
    z.number().min(0, 'El stock actual debe ser mayor o igual a 0').nullable().optional()
  ),
  minStock: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val)) ? null : Number(val),
    z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0').nullable().optional()
  ),
  maxStock: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val)) ? null : Number(val),
    z.number().min(0, 'El stock máximo debe ser mayor o igual a 0').nullable().optional()
  ),
  reorderPoint: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val)) ? null : Number(val),
    z.number().min(0, 'El punto de pedido debe ser mayor o igual a 0').nullable().optional()
  ),
  barcode: z.string().optional(),
  // Peso opcional - puede estar vacío
  weight: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val)) ? null : Number(val),
    z.number().min(0, 'El peso debe ser mayor o igual a 0').nullable().optional()
  ),
  weightUnit: z.string().default('kg'),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
  showInQuickAccess: z.boolean().default(false),
  abbreviation: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  mode: 'create' | 'edit'
}

export function ProductModal({ isOpen, onClose, product, mode }: ProductModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  // Selected categories, brands and taxes state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>([])

  // Fetch available categories
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', currentTenant?.slug],
    queryFn: async () => {
      return await productCategoriesApi.getAll(currentTenant!.slug)
    },
    enabled: !!currentTenant
  })

  // Fetch available brands
  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands', currentTenant?.slug],
    queryFn: async () => {
      return await productBrandsApi.getAll(currentTenant!.slug)
    },
    enabled: !!currentTenant
  })

  // Fetch available taxes
  const { data: taxes = [] } = useQuery({
    queryKey: ['taxes', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/taxes`)
      return response.data.taxes || []
    },
    enabled: !!currentTenant
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product || {
      currency: 'ARS',
      trackStock: true,
      currentStock: 0,
      minStock: 0,
      costPrice: 0,
      salePrice: 0,
      weightUnit: 'kg',
      showInQuickAccess: false,
      abbreviation: ''
    }
  })

  const trackStock = watch('trackStock')
  const costPrice = watch('costPrice')
  const salePrice = watch('salePrice')
  const showInQuickAccess = watch('showInQuickAccess')

  // Initialize form and selected categories/brands from product data
  useEffect(() => {
    if (product && mode === 'edit') {
      // Reset form with product data
      reset({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        currency: product.currency || 'ARS',
        trackStock: product.trackStock ?? true,
        currentStock: Number(product.currentStock) || 0,
        minStock: Number(product.minStock) || 0,
        maxStock: product.maxStock ? Number(product.maxStock) : null,
        reorderPoint: product.reorderPoint ? Number(product.reorderPoint) : null,
        barcode: product.barcode || '',
        weight: product.weight ? Number(product.weight) : undefined,
        weightUnit: product.weightUnit || 'kg',
        dimensions: product.dimensions || '',
        notes: product.notes || '',
        showInQuickAccess: product.showInQuickAccess ?? false,
        abbreviation: product.abbreviation || ''
      })
      // Map productCategories, productBrands and productTaxes from backend structure
      const categoryIds = product.productCategories?.map((pc: any) => pc.categoryId) || []
      const brandIds = product.productBrands?.map((pb: any) => pb.brandId) || []
      const taxIds = product.productTaxes?.map((pt: any) => pt.taxId) || []
      setSelectedCategories(categoryIds)
      setSelectedBrands(brandIds)
      setSelectedTaxes(taxIds)
    } else {
      // Reset to default values for create mode
      reset({
        currency: 'ARS',
        trackStock: true,
        currentStock: 0,
        minStock: 0,
        costPrice: 0,
        salePrice: 0,
        weightUnit: 'kg',
        showInQuickAccess: false,
        abbreviation: ''
      })
      setSelectedCategories([])
      setSelectedBrands([])
      setSelectedTaxes([])
    }
  }, [product, mode, reset])

  // Category management functions
  const addCategory = (categoryId: string) => {
    if (!selectedCategories.includes(categoryId)) {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const removeCategory = (categoryId: string) => {
    setSelectedCategories(selectedCategories.filter(id => id !== categoryId))
  }

  // Brand management functions
  const addBrand = (brandId: string) => {
    if (!selectedBrands.includes(brandId)) {
      setSelectedBrands([...selectedBrands, brandId])
    }
  }

  const removeBrand = (brandId: string) => {
    setSelectedBrands(selectedBrands.filter(id => id !== brandId))
  }

  // Tax management functions
  const addTax = (taxId: string) => {
    if (!selectedTaxes.includes(taxId)) {
      setSelectedTaxes([...selectedTaxes, taxId])
    }
  }

  const removeTax = (taxId: string) => {
    setSelectedTaxes(selectedTaxes.filter(id => id !== taxId))
  }

  const createProduct = useMutation({
    mutationFn: async (data: FormData) => {
      const productData = {
        ...data,
        categories: selectedCategories,
        brands: selectedBrands,
        taxes: selectedTaxes
      }
      const response = await api.post(`/${currentTenant!.slug}/products`, productData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      reset()
      setSelectedCategories([])
      setSelectedBrands([])
      setSelectedTaxes([])
      onClose()
    }
  })

  const updateProduct = useMutation({
    mutationFn: async (data: FormData) => {
      const productData = {
        ...data,
        categories: selectedCategories,
        brands: selectedBrands,
        taxes: selectedTaxes
      }
      const response = await api.put(`/${currentTenant!.slug}/products/${product.id}`, productData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    if (mode === 'create') {
      createProduct.mutate(data)
    } else {
      updateProduct.mutate(data)
    }
  }

  const title = mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'

  const currencies = [
    { value: 'ARS', label: 'Peso Argentino (ARS)' },
    { value: 'USD', label: 'Dólar Estadounidense (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' }
  ]

  const weightUnits = [
    { value: 'kg', label: 'Kilogramos (kg)' },
    { value: 'g', label: 'Gramos (g)' },
    { value: 'lb', label: 'Libras (lb)' },
    { value: 'oz', label: 'Onzas (oz)' }
  ]

  // Calcular margen de ganancia
  const margin = salePrice && costPrice ? ((salePrice - costPrice) / salePrice * 100) : 0

  // Tab content components
  const ProductTab = (
    <div className="space-y-6">
      {/* Información General */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <Input
              label="SKU *"
              placeholder="Código único del producto"
              error={errors.sku?.message}
              {...register('sku')}
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              label="Código de Barras"
              placeholder="EAN, UPC, etc."
              error={errors.barcode?.message}
              {...register('barcode')}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Moneda"
              error={errors.currency?.message}
              {...register('currency')}
            >
              {currencies.map(currency => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-6">
            <Input
              label="Nombre *"
              placeholder="Nombre del producto"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <div className="lg:col-span-6">
            <TextArea
              label="Descripción"
              rows={2}
              placeholder="Descripción detallada del producto"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
        </div>
      </div>

      {/* Precios */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Precios</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Input
            label="Precio de Costo *"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.costPrice?.message}
            {...register('costPrice', { valueAsNumber: true })}
          />
          <Input
            label="Precio de Venta *"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.salePrice?.message}
            {...register('salePrice', { valueAsNumber: true })}
          />
        </div>

        {/* Margen de ganancia */}
        {salePrice > 0 && costPrice > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Margen de Ganancia:</span>
                <span className={`font-medium ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ganancia por Unidad:</span>
                <span className={`font-medium ${salePrice - costPrice > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(salePrice - costPrice).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventario */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Inventario</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              {...register('trackStock')}
            />
            <span className="text-sm font-medium text-gray-700">
              Controlar stock
            </span>
          </label>

          {trackStock && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Stock Actual"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.currentStock?.message}
                  {...register('currentStock')}
                />
                <Input
                  label="Stock Mínimo (Crítico)"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.minStock?.message}
                  {...register('minStock')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Punto de Pedido"
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  error={errors.reorderPoint?.message}
                  {...register('reorderPoint')}
                  helperText="Aviso cuando stock llegue a este nivel"
                />
                <Input
                  label="Stock Máximo"
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  error={errors.maxStock?.message}
                  {...register('maxStock')}
                  helperText="Alerta si stock supera este nivel"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Indicadores de stock:</strong><br/>
                  • <strong>Crítico:</strong> Stock ≤ Stock Mínimo<br/>
                  • <strong>Bajo:</strong> Stock ≤ Punto de Pedido<br/>
                  • <strong>Sobre stock:</strong> Stock &gt; Stock Máximo
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Propiedades físicas */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Propiedades Físicas</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Input
            label="Peso"
            type="number"
            step="0.001"
            placeholder="Opcional"
            error={errors.weight?.message}
            {...register('weight')}
          />
          <Select
            label="Unidad de Peso"
            error={errors.weightUnit?.message}
            {...register('weightUnit')}
          >
            {weightUnits.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </Select>
          <div className="lg:col-span-2">
            <Input
              label="Dimensiones"
              placeholder="Ej: 10x5x2 cm"
              error={errors.dimensions?.message}
              {...register('dimensions')}
            />
          </div>
          <div className="lg:col-span-4">
            <TextArea
              label="Notas Adicionales"
              rows={2}
              placeholder="Notas internas sobre el producto"
              error={errors.notes?.message}
              {...register('notes')}
            />
          </div>
        </div>
      </div>

      {/* Acceso Rápido en Ventas */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acceso Rápido en Ventas</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              {...register('showInQuickAccess')}
            />
            <span className="text-sm font-medium text-gray-700">
              Mostrar en acceso rápido en la página de ventas
            </span>
          </label>

          {showInQuickAccess && (
            <Input
              label="Abreviatura (se muestra en lugar del código)"
              placeholder="Ej: CAF, GAS, etc."
              error={errors.abbreviation?.message}
              {...register('abbreviation')}
            />
          )}
        </div>
      </div>
    </div>
  )

  const CategoriesTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Categorías del Producto</h3>
        <span className="text-sm text-gray-500">
          {selectedCategories.length} de {categories.length} seleccionadas
        </span>
      </div>

      {/* Lista de todas las categorías con checkboxes */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map(category => (
            <label
              key={category.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    addCategory(category.id)
                  } else {
                    removeCategory(category.id)
                  }
                }}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <span className="text-sm font-medium text-gray-900 flex-1">
                {category.name}
              </span>
              {category.description && (
                <span className="text-xs text-gray-500 truncate max-w-[100px]">
                  {category.description}
                </span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay categorías disponibles.</p>
          <p className="text-sm">Crea categorías primero en la sección de Categorías.</p>
        </div>
      )}
    </div>
  )

  const BrandsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Marcas del Producto</h3>
        <span className="text-sm text-gray-500">
          {selectedBrands.length} de {brands.length} seleccionadas
        </span>
      </div>

      {/* Lista de todas las marcas con checkboxes */}
      {brands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {brands.map(brand => (
            <label
              key={brand.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    addBrand(brand.id)
                  } else {
                    removeBrand(brand.id)
                  }
                }}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="text-sm font-medium text-gray-900 flex-1">
                {brand.name}
              </span>
              {brand.description && (
                <span className="text-xs text-gray-500 truncate max-w-[100px]">
                  {brand.description}
                </span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay marcas disponibles.</p>
          <p className="text-sm">Crea marcas primero en la sección de Marcas.</p>
        </div>
      )}
    </div>
  )

  const TaxesTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Impuestos del Producto</h3>
        <span className="text-sm text-gray-500">
          {selectedTaxes.length} de {taxes.length} seleccionados
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          Los impuestos que se calcularán en una venta son la <strong>intersección</strong> entre los impuestos del producto y los del cliente.
        </p>
      </div>

      {/* Lista de todos los impuestos con checkboxes */}
      {taxes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {taxes.filter((tax: any) => tax.isActive).map((tax: any) => (
            <label
              key={tax.id}
              className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedTaxes.includes(tax.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    addTax(tax.id)
                  } else {
                    removeTax(tax.id)
                  }
                }}
                className="mt-1 rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {tax.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {tax.rate}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {tax.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {tax.taxType}
                  </span>
                </div>
                {tax.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {tax.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No hay impuestos disponibles.</p>
          <p className="text-sm">Crea impuestos primero en la sección de Configuración.</p>
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'product', label: 'Producto', content: ProductTab },
    { id: 'categories', label: 'Categorías', content: CategoriesTab },
    { id: 'brands', label: 'Marcas', content: BrandsTab },
    { id: 'taxes', label: 'Impuestos', content: TaxesTab }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Tabs tabs={tabs} defaultTab="product" />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}