import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TextArea } from '../ui/TextArea'
import { inventoryApi } from '../../api/inventory'
import { productsApi } from '../../api/products'
import { useAuthStore } from '../../stores/authStore'

const schema = z.object({
  warehouseId: z.string().min(1, 'Selecciona un almacén'),
  productId: z.string().min(1, 'Selecciona un producto'),
  movementType: z.enum(['IN', 'OUT'], { required_error: 'Selecciona el tipo de movimiento' }),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitCost: z.number().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface StockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  warehouses: any[]
  productId?: string
}

export function StockMovementModal({
  isOpen,
  onClose,
  warehouses,
  productId
}: StockMovementModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: productId || '',
      movementType: 'IN'
    }
  })

  const selectedProduct = watch('productId')

  // Obtener productos
  const { data: products } = useQuery({
    queryKey: ['products', currentTenant?.slug],
    queryFn: () => productsApi.getProducts(),
    enabled: !!currentTenant
  })

  // Obtener stock del producto seleccionado
  const { data: productStock } = useQuery({
    queryKey: ['productStock', currentTenant?.slug, selectedProduct],
    queryFn: () => inventoryApi.getProductStock(currentTenant!.slug, selectedProduct),
    enabled: !!currentTenant && !!selectedProduct
  })

  const createMovement = useMutation({
    mutationFn: (data: FormData) =>
      inventoryApi.createMovement(currentTenant!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStock'] })
      reset()
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    createMovement.mutate(data)
  }

  const movementTypes = [
    { value: 'IN', label: 'Entrada' },
    { value: 'OUT', label: 'Salida' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Movimiento de Stock">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Almacén */}
        <Select
          label="Almacén"
          error={errors.productId?.message}
          {...register('warehouseId')}
        >
          <option value="">Seleccionar almacén</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </option>
          ))}
        </Select>

        {/* Producto */}
        <Select
          label="Producto"
          error={errors.productId?.message}
          {...register('productId')}
        >
          <option value="">Seleccionar producto</option>
          {products?.map((product: any) => (
            <option key={product.id} value={product.id}>
              {product.name} - {product.sku}
            </option>
          ))}
        </Select>

        {/* Stock actual del producto */}
        {productStock && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Stock Actual</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="ml-2 font-medium">{productStock.totalStock}</span>
              </div>
              <div>
                <span className="text-gray-600">Disponible:</span>
                <span className="ml-2 font-medium text-green-600">
                  {productStock.totalAvailable}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Reservado:</span>
                <span className="ml-2 font-medium text-orange-600">
                  {productStock.totalReserved}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tipo de movimiento */}
        <Select
          label="Tipo de Movimiento"
          error={errors.movementType?.message}
          {...register('movementType')}
        >
          {movementTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>

        {/* Cantidad */}
        <Input
          label="Cantidad"
          type="number"
          step="0.01"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />

        {/* Costo unitario */}
        <Input
          label="Costo Unitario (opcional)"
          type="number"
          step="0.01"
          error={errors.unitCost?.message}
          {...register('unitCost', { valueAsNumber: true })}
        />

        {/* Número de referencia */}
        <Input
          label="Número de Referencia (opcional)"
          placeholder="Ej: FAC-001, OC-123"
          error={errors.referenceNumber?.message}
          {...register('referenceNumber')}
        />

        {/* Notas */}
        <TextArea
          label="Notas (opcional)"
          rows={3}
          error={errors.notes?.message}
          {...register('notes')}
        />

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Crear Movimiento
          </Button>
        </div>
      </form>
    </Modal>
  )
}