import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface WarehouseSelectorProps {
  warehouses: any[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function WarehouseSelector({
  warehouses,
  value,
  onChange,
  placeholder = 'Seleccionar almacén'
}: WarehouseSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
      >
        <option value="">{placeholder}</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name} ({warehouse.code})
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  )
}