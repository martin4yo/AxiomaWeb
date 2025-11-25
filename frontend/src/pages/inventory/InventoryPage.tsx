import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, AdjustmentsHorizontalIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryTable } from '../../components/inventory/InventoryTable'
import { StockMovementModal } from '../../components/inventory/StockMovementModal'
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal'
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector'
import { inventoryApi } from '../../api/inventory'
import { useAuthStore } from '../../stores/authStore'

export function InventoryPage() {
  const { currentTenant } = useAuthStore()
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)

  // Consultas
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', currentTenant?.slug],
    queryFn: () => inventoryApi.getWarehouses(currentTenant!.slug),
    enabled: !!currentTenant
  })

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock', currentTenant?.slug, selectedWarehouse],
    queryFn: () => inventoryApi.getStock(currentTenant!.slug, { warehouseId: selectedWarehouse }),
    enabled: !!currentTenant
  })

  const { data: lowStock } = useQuery({
    queryKey: ['lowStock', currentTenant?.slug],
    queryFn: () => inventoryApi.getLowStock(currentTenant!.slug),
    enabled: !!currentTenant
  })

  const actions = [
    {
      label: 'Nuevo Movimiento',
      icon: ArrowPathIcon,
      onClick: () => setShowMovementModal(true),
      variant: 'primary' as const
    },
    {
      label: 'Ajuste de Inventario',
      icon: AdjustmentsHorizontalIcon,
      onClick: () => setShowAdjustmentModal(true),
      variant: 'secondary' as const
    }
  ]

  // Estadísticas
  const totalProducts = stock?.length || 0
  const totalValue = stock?.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.product.costPrice))
  }, 0) || 0
  const lowStockCount = lowStock?.length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Inventario"
        subtitle="Control de stock, movimientos y valuación"
        actions={actions}
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center">
                <PlusIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalValue.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
              <div className="h-8 w-8 rounded-md bg-red-100 flex items-center justify-center">
                <span className="text-lg">⚠️</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Almacenes</p>
                <p className="text-2xl font-bold text-gray-900">{warehouses?.length || 0}</p>
              </div>
              <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center">
                <span className="text-lg">🏭</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <WarehouseSelector
                warehouses={warehouses || []}
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                placeholder="Todos los almacenes"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla de Inventario */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Stock por Producto
          </h3>
          <InventoryTable
            data={stock || []}
            isLoading={isLoading}
            onMovement={() => setShowMovementModal(true)}
          />
        </div>
      </Card>

      {/* Alertas de Stock Bajo */}
      {lowStockCount > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-4">
              ⚠️ Productos con Stock Bajo ({lowStockCount})
            </h3>
            <div className="space-y-2">
              {lowStock?.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      Stock: {product.currentStock}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mínimo: {Number(product.minStock)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Modales */}
      <StockMovementModal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        warehouses={warehouses || []}
      />

      <StockAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        warehouses={warehouses || []}
      />
    </div>
  )
}