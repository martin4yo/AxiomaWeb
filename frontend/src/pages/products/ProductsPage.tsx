import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PlusIcon, PencilIcon, MagnifyingGlassIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { Package } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { ProductModal } from '../../components/products/ProductModal'
import { ProductImportModal } from '../../components/products/ProductImportModal'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'
import { useDialog } from '../../hooks/useDialog'

export default function ProductsPage() {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const { showAlert, showConfirm, AlertComponent, ConfirmComponent } = useDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [showImportModal, setShowImportModal] = useState(false)

  // Check for action=new in URL params
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleCreate()
      // Remove the action param from URL
      searchParams.delete('action')
      setSearchParams(searchParams)
    }
  }, [searchParams])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter, brandFilter, stockFilter])

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['product-categories', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/product-categories`)
      return response.data.categories || []
    },
    enabled: !!currentTenant
  })

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['product-brands', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/product-brands`)
      return response.data.brands || []
    },
    enabled: !!currentTenant
  })

  // Fetch products with pagination
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentTenant?.slug, search, categoryFilter, brandFilter, stockFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      if (search) params.append('search', search)
      if (categoryFilter) params.append('categoryId', categoryFilter)
      if (brandFilter) params.append('brandId', brandFilter)
      if (stockFilter) params.append('stock', stockFilter)

      const response = await api.get(`/${currentTenant!.slug}/products?${params}`)
      return response.data
    },
    enabled: !!currentTenant
  })

  const products = productsData?.products || []
  const pagination = productsData?.pagination

  const handleCreate = () => {
    setSelectedProduct(null)
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (product: any) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedProduct(null)
  }

  const handleImport = () => {
    setShowImportModal(true)
  }

  const handleCloseImportModal = () => {
    setShowImportModal(false)
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/${currentTenant!.slug}/products/${productId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showAlert('Producto eliminado', 'El producto ha sido eliminado correctamente', 'success')
    },
    onError: (error: any) => {
      showAlert('Error', error.response?.data?.error || 'Error al eliminar el producto', 'error')
    }
  })

  const handleDelete = async (product: any) => {
    showConfirm(
      'Eliminar producto',
      `¿Está seguro de eliminar el producto "${product.name}"?`,
      () => deleteMutation.mutate(product.id),
      'danger',
      'Eliminar',
      'Cancelar'
    )
  }

  const getStockStatus = (product: any): { label: string; color: 'error' | 'success' | 'warning' | 'info' } | null => {
    if (!product.trackStock) return null
    if (product.currentStock === 0) return { label: 'Sin stock', color: 'error' as const }
    if (product.currentStock <= product.minStock) return { label: 'Stock bajo', color: 'warning' as const }
    return { label: 'Stock normal', color: 'success' as const }
  }

  const actions = [
    {
      label: 'Importar Excel',
      icon: ArrowUpTrayIcon,
      onClick: handleImport,
      variant: 'secondary' as const
    },
    {
      label: 'Nuevo Producto',
      icon: PlusIcon,
      onClick: handleCreate,
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        subtitle="Gestiona tu catálogo de productos y servicios"
        actions={actions}
      />

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por SKU, nombre o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="">Todas las marcas</option>
              {brands?.map((brand: any) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
            <Select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="low_stock">Stock bajo</option>
              <option value="no_stock">Sin stock</option>
              <option value="good_stock">Stock normal</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de productos */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Productos ({pagination?.total || 0})
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin productos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || categoryFilter || brandFilter || stockFilter
                  ? 'No se encontraron productos que coincidan con los filtros.'
                  : 'Comienza creando tu primer producto.'}
              </p>
              {!search && !categoryFilter && !brandFilter && !stockFilter && (
                <div className="mt-6">
                  <Button onClick={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product: any) => {
                    const stockStatus = getStockStatus(product)

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.sku && `${product.sku} • `}
                              {product.description || 'Sin descripción'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.productCategories && product.productCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.productCategories.map((pc: any) => (
                                <Badge key={pc.category.id} variant="info" size="sm">
                                  {pc.category.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="info" size="sm">Sin categoría</Badge>
                          )}
                          {product.productBrands && product.productBrands.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {product.productBrands.map((pb: any) => pb.brand.name).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${product.salePrice?.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }) || '0.00'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.currency || 'ARS'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.trackStock ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {product.currentStock || 0}
                                {product.minStock > 0 && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    (mín: {product.minStock})
                                  </span>
                                )}
                              </div>
                              {stockStatus && (
                                <Badge variant={stockStatus.color} size="sm">
                                  {stockStatus.label}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No controlado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={product.isActive ? 'success' : 'error'}>
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </Card>

      {/* Modal */}
      <ProductModal
        isOpen={showModal}
        onClose={handleCloseModal}
        product={selectedProduct}
        mode={modalMode}
      />

      {/* Import Modal */}
      <ProductImportModal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
      />

      {/* Dialogs */}
      <AlertComponent />
      <ConfirmComponent />
    </div>
  )
}