import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Package } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface InventoryTableProps {
  data: any[]
  isLoading: boolean
  onMovement: (productId: string) => void
}

export function InventoryTable({ data, isLoading, onMovement }: InventoryTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin stock</h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay productos en stock en el almacén seleccionado.
        </p>
      </div>
    )
  }

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return { label: 'Sin Stock', variant: 'error' as const }
    if (current <= min) return { label: 'Stock Bajo', variant: 'warning' as const }
    return { label: 'Normal', variant: 'success' as const }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Producto
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Almacén
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock Actual
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Disponible
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reservado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => {
            const current = Number(item.quantity)
            const reserved = Number(item.reservedQty)
            const available = Number(item.availableQty)
            const minStock = Number(item.product.minStock)
            const unitCost = Number(item.product.costPrice)
            const totalValue = current * unitCost
            const status = getStockStatus(current, minStock)

            return (
              <tr key={`${item.warehouseId}-${item.productId}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.product.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      SKU: {item.product.sku}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.warehouse.name}</div>
                  <div className="text-sm text-gray-500">{item.warehouse.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {current.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Mín: {minStock.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-600 font-medium">
                    {available.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-orange-600">
                    {reserved.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    ${totalValue.toLocaleString('es-AR')}
                  </div>
                  <div className="text-sm text-gray-500">
                    @${unitCost.toLocaleString('es-AR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMovement(item.productId)}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}