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
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

const deliveryAddressSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  addressLine1: z.string().min(1, 'La dirección es requerida'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'La provincia es requerida'),
  postalCode: z.string().optional(),
  isDefault: z.boolean().default(false)
})

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  taxId: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('AR'),
  isCustomer: z.boolean().default(false),
  isSupplier: z.boolean().default(false),
  isEmployee: z.boolean().default(false),
  category: z.string().optional(),
  currency: z.string().default('ARS'),
  customerPaymentTerms: z.number().optional(),
  customerCreditLimit: z.number().optional(),
  supplierPaymentTerms: z.number().optional(),
  supplierCategory: z.string().optional(),
  employeePosition: z.string().optional(),
  employeeSalary: z.number().optional(),
  // Datos fiscales
  cuit: z.string().optional(),
  ivaCondition: z.string().optional(),
  grossIncomeNumber: z.string().optional(),
  businessActivity: z.string().optional(),
  // Direcciones de entrega
  deliveryAddresses: z.array(deliveryAddressSchema).default([])
})

type FormData = z.infer<typeof schema>

interface EntityModalProps {
  isOpen: boolean
  onClose: () => void
  entity?: any
  mode: 'create' | 'edit'
}

export function EntityModal({ isOpen, onClose, entity, mode }: EntityModalProps) {
  const { currentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [deliveryAddresses, setDeliveryAddresses] = useState<Array<z.infer<typeof deliveryAddressSchema>>>(
    entity?.deliveryAddresses || []
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: entity || {
      country: 'AR',
      currency: 'ARS',
      isCustomer: false,
      isSupplier: false,
      isEmployee: false,
      deliveryAddresses: []
    }
  })

  const isCustomer = watch('isCustomer')
  const isSupplier = watch('isSupplier')
  const isEmployee = watch('isEmployee')

  // Fetch customer categories
  const { data: customerCategories = [] } = useQuery({
    queryKey: ['customer-categories', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/customer-categories`)
      return response.data.categories || []
    },
    enabled: !!currentTenant
  })

  // Argentina IVA conditions
  const ivaConditions = [
    { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
    { value: 'exento', label: 'Exento' },
    { value: 'consumidor_final', label: 'Consumidor Final' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'no_responsable', label: 'No Responsable' },
    { value: 'responsable_no_inscripto', label: 'Responsable No Inscripto' }
  ]

  const addDeliveryAddress = () => {
    const newAddress = {
      id: Date.now().toString(),
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: deliveryAddresses.length === 0
    }
    const updatedAddresses = [...deliveryAddresses, newAddress]
    setDeliveryAddresses(updatedAddresses)
    setValue('deliveryAddresses', updatedAddresses)
  }

  const removeDeliveryAddress = (index: number) => {
    const updatedAddresses = deliveryAddresses.filter((_, i) => i !== index)
    setDeliveryAddresses(updatedAddresses)
    setValue('deliveryAddresses', updatedAddresses)
  }

  const updateDeliveryAddress = (index: number, field: string, value: any) => {
    const updatedAddresses = [...deliveryAddresses]
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value }
    setDeliveryAddresses(updatedAddresses)
    setValue('deliveryAddresses', updatedAddresses)
  }

  const setDefaultAddress = (index: number) => {
    const updatedAddresses = deliveryAddresses.map((addr, i) => ({
      ...addr,
      isDefault: i === index
    }))
    setDeliveryAddresses(updatedAddresses)
    setValue('deliveryAddresses', updatedAddresses)
  }

  const createEntity = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post(`/${currentTenant!.slug}/entities`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      reset()
      onClose()
    }
  })

  const updateEntity = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.put(`/${currentTenant!.slug}/entities/${entity.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    const submitData = { ...data, deliveryAddresses }
    if (mode === 'create') {
      createEntity.mutate(submitData)
    } else {
      updateEntity.mutate(submitData)
    }
  }

  const title = mode === 'create' ? 'Nueva Entidad' : 'Editar Entidad'

  const countries = [
    { value: 'AR', label: 'Argentina' },
    { value: 'BR', label: 'Brasil' },
    { value: 'CL', label: 'Chile' },
    { value: 'UY', label: 'Uruguay' },
    { value: 'PY', label: 'Paraguay' }
  ]

  const currencies = [
    { value: 'ARS', label: 'Peso Argentino (ARS)' },
    { value: 'USD', label: 'Dólar Estadounidense (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'BRL', label: 'Real Brasileño (BRL)' }
  ]

  // Tab content components
  const GeneralTab = (
    <div className="space-y-4">
      {/* Información básica y tipos de entidad en una sola sección */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Código"
            placeholder="Código único (opcional)"
            error={errors.code?.message}
            {...register('code')}
          />
          <div className="md:col-span-2">
            <Input
              label="Nombre *"
              placeholder="Nombre de la entidad"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <Input
            label="CUIT/DNI"
            placeholder="20-12345678-9"
            error={errors.taxId?.message}
            {...register('taxId')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="correo@ejemplo.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Teléfono"
            placeholder="+54 11 1234-5678"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>

        {/* Tipos de entidad y categoría en la misma fila */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              {...register('isCustomer')}
            />
            <span className="text-sm font-medium text-gray-700">Cliente</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              {...register('isSupplier')}
            />
            <span className="text-sm font-medium text-gray-700">Proveedor</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              {...register('isEmployee')}
            />
            <span className="text-sm font-medium text-gray-700">Empleado</span>
          </label>
          <Select
            label="Categoría de Cliente"
            error={errors.category?.message}
            {...register('category')}
          >
            <option value="">Seleccionar categoría</option>
            {customerCategories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Dirección y configuraciones específicas en una sola sección */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ubicación y Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Dirección Línea 1"
              placeholder="Calle y número"
              error={errors.addressLine1?.message}
              {...register('addressLine1')}
            />
          </div>
          <Input
            label="Ciudad"
            placeholder="Ciudad"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Provincia/Estado"
            placeholder="Provincia o estado"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Dirección Línea 2"
            placeholder="Piso, departamento, etc."
            error={errors.addressLine2?.message}
            {...register('addressLine2')}
          />
          <Input
            label="Código Postal"
            placeholder="1234"
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
          <Select
            label="País"
            error={errors.country?.message}
            {...register('country')}
          >
            {countries.map(country => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </Select>
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
      </div>

      {/* Configuraciones específicas por tipo en una sola fila */}
      {(isCustomer || isSupplier || isEmployee) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuraciones Específicas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isCustomer && (
              <>
                <Input
                  label="Plazo de Pago Cliente (días)"
                  type="number"
                  placeholder="30"
                  error={errors.customerPaymentTerms?.message}
                  {...register('customerPaymentTerms', { valueAsNumber: true })}
                />
                <Input
                  label="Límite de Crédito"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.customerCreditLimit?.message}
                  {...register('customerCreditLimit', { valueAsNumber: true })}
                />
              </>
            )}
            {isSupplier && (
              <>
                <Input
                  label="Plazo de Pago Proveedor (días)"
                  type="number"
                  placeholder="30"
                  error={errors.supplierPaymentTerms?.message}
                  {...register('supplierPaymentTerms', { valueAsNumber: true })}
                />
                <Input
                  label="Categoría de Proveedor"
                  placeholder="Ej: Servicios, Materias primas"
                  error={errors.supplierCategory?.message}
                  {...register('supplierCategory')}
                />
              </>
            )}
            {isEmployee && (
              <>
                <Input
                  label="Posición/Cargo"
                  placeholder="Ej: Vendedor, Gerente"
                  error={errors.employeePosition?.message}
                  {...register('employeePosition')}
                />
                <Input
                  label="Salario"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.employeeSalary?.message}
                  {...register('employeeSalary', { valueAsNumber: true })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const FiscalTab = (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Fiscales (Argentina)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="CUIT"
          placeholder="20-12345678-9"
          error={errors.cuit?.message}
          {...register('cuit')}
        />
        <Select
          label="Condición ante IVA"
          error={errors.ivaCondition?.message}
          {...register('ivaCondition')}
        >
          <option value="">Seleccionar condición</option>
          {ivaConditions.map(condition => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </Select>
        <Input
          label="Número de Ingresos Brutos"
          placeholder="12345678-9"
          error={errors.grossIncomeNumber?.message}
          {...register('grossIncomeNumber')}
        />
        <Input
          label="Actividad Comercial"
          placeholder="Ej: Venta de productos de computación"
          error={errors.businessActivity?.message}
          {...register('businessActivity')}
        />
      </div>
    </div>
  )

  const DeliveryAddressesTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Direcciones de Entrega</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addDeliveryAddress}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Dirección
        </Button>
      </div>

      {deliveryAddresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay direcciones de entrega configuradas.</p>
          <p className="text-sm">Haz clic en "Agregar Dirección" para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveryAddresses.map((address, index) => (
            <div key={address.id || index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="defaultAddress"
                    checked={address.isDefault}
                    onChange={() => setDefaultAddress(index)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {address.isDefault ? 'Dirección por defecto' : 'Marcar como predeterminada'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDeliveryAddress(index)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nombre de la dirección"
                  placeholder="Ej: Oficina principal"
                  value={address.name}
                  onChange={(e) => updateDeliveryAddress(index, 'name', e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Dirección Línea 1"
                    placeholder="Calle y número"
                    value={address.addressLine1}
                    onChange={(e) => updateDeliveryAddress(index, 'addressLine1', e.target.value)}
                  />
                </div>
                <Input
                  label="Dirección Línea 2"
                  placeholder="Piso, departamento, etc."
                  value={address.addressLine2}
                  onChange={(e) => updateDeliveryAddress(index, 'addressLine2', e.target.value)}
                />
                <Input
                  label="Ciudad"
                  placeholder="Ciudad"
                  value={address.city}
                  onChange={(e) => updateDeliveryAddress(index, 'city', e.target.value)}
                />
                <Input
                  label="Provincia"
                  placeholder="Provincia"
                  value={address.state}
                  onChange={(e) => updateDeliveryAddress(index, 'state', e.target.value)}
                />
                <Input
                  label="Código Postal"
                  placeholder="1234"
                  value={address.postalCode}
                  onChange={(e) => updateDeliveryAddress(index, 'postalCode', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'general', label: 'General', content: GeneralTab },
    { id: 'fiscal', label: 'Datos Fiscales', content: FiscalTab },
    { id: 'addresses', label: 'Direcciones de Entrega', content: DeliveryAddressesTab }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Tabs tabs={tabs} defaultTab="general" />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Crear Entidad' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}