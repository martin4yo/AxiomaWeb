import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TextArea } from '../ui/TextArea'
import { inventoryApi } from '../../api/inventory'
import { productsApi } from '../../api/products'
import { useAuthStore } from '../../stores/authStore'

const itemSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  currentQty: z.number(),
  adjustedQty: z.number().min(0, 'La cantidad debe ser mayor o igual a 0'),
  unitCost: z.number().positive('El costo debe ser mayor a 0'),
  reason: z.string().optional()
})

const schema = z.object({
  warehouseId: z.string().min(1, 'Selecciona un almacén'),
  reason: z.string().min(1, 'Ingresa el motivo del ajuste'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Agrega al menos un producto')
})

type FormData = z.infer<typeof schema>

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  warehouses: any[]
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  warehouses
}: StockAdjustmentModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    watch,
    setValue
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ productId: '', currentQty: 0, adjustedQty: 0, unitCost: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const selectedWarehouse = watch('warehouseId')

  // Obtener productos
  const { data: products } = useQuery({
    queryKey: ['products', currentTenant?.slug],
    queryFn: () => productsApi.getProducts(),
    enabled: !!currentTenant
  })

  // Obtener stock del almacén seleccionado
  const { data: warehouseStock } = useQuery({
    queryKey: ['warehouseStock', currentTenant?.slug, selectedWarehouse],
    queryFn: () => inventoryApi.getWarehouseStock(currentTenant!.slug, selectedWarehouse),
    enabled: !!currentTenant && !!selectedWarehouse
  })

  const createAdjustment = useMutation({
    mutationFn: (data: FormData) =>
      inventoryApi.createAdjustment(currentTenant!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      reset()
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    createAdjustment.mutate(data)
  }

  const addItem = () => {
    append({ productId: '', currentQty: 0, adjustedQty: 0, unitCost: 0 })
  }

  const updateCurrentStock = (index: number, productId: string) => {
    const stock = warehouseStock?.find(s => s.productId === productId)
    if (stock) {
      setValue(`items.${index}.currentQty`, Number(stock.quantity))
      setValue(`items.${index}.unitCost`, Number(stock.product.costPrice))
    }
  }

  const calculateTotalValue = () => {
    const items = watch('items')
    return items.reduce((sum, item) => {
      const difference = item.adjustedQty - item.currentQty
      return sum + (difference * item.unitCost)
    }, 0)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste de Inventario" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Almacén */}
        <Select
          label="Almacén"
          error={errors.warehouseId?.message}
          {...register('warehouseId')}
        >
          <option value="">Seleccionar almacén</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </option>
          ))}
        </Select>

        {/* Motivo */}
        <Input
          label="Motivo del Ajuste"
          placeholder="Ej: Recuento físico, productos dañados, etc."
          error={errors.reason?.message}
          {...register('reason')}
        />

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Productos a Ajustar
            </label>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Agregar Producto
            </Button>
          </div>

          {errors.items?.message && (
            <p className="text-sm text-red-600 mb-4">{errors.items.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Producto {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Producto */}
                  <div className="md:col-span-2">
                    <Select
                      label="Producto"
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId`)}
                      onChange={(e) => {
                        register(`items.${index}.productId`).onChange(e)
                        updateCurrentStock(index, e.target.value)
                      }}
                    >
                      <option value="">Seleccionar producto</option>
                      {products?.filter((p: any) => p.trackStock).map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.sku}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Stock actual */}
                  <Input
                    label="Stock Actual"
                    type="number"
                    step="0.01"
                    readOnly
                    error={errors.items?.[index]?.currentQty?.message}
                    {...register(`items.${index}.currentQty`, { valueAsNumber: true })}
                  />

                  {/* Stock ajustado */}
                  <Input
                    label="Stock Ajustado"
                    type="number"
                    step="0.01"
                    error={errors.items?.[index]?.adjustedQty?.message}
                    {...register(`items.${index}.adjustedQty`, { valueAsNumber: true })}
                  />

                  {/* Costo unitario */}
                  <Input
                    label="Costo Unitario"
                    type="number"
                    step="0.01"
                    error={errors.items?.[index]?.unitCost?.message}
                    {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                  />

                  {/* Diferencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diferencia
                    </label>
                    <div className="p-2 bg-gray-50 rounded-md text-sm">
                      {(() => {
                        const item = watch(`items.${index}`)
                        const diff = item.adjustedQty - item.currentQty
                        return (
                          <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {diff >= 0 ? '+' : ''}{diff}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Motivo específico */}
                  <div className="md:col-span-2">
                    <Input
                      label="Motivo Específico (opcional)"
                      placeholder="Motivo para este producto específico"
                      error={errors.items?.[index]?.reason?.message}
                      {...register(`items.${index}.reason`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Valor total del ajuste */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Valor Total del Ajuste:</span>
            <span className={`font-bold ${
              calculateTotalValue() >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${calculateTotalValue().toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Notas */}
        <TextArea
          label="Notas Adicionales (opcional)"
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
            Crear Ajuste
          </Button>
        </div>
      </form>
    </Modal>
  )
}