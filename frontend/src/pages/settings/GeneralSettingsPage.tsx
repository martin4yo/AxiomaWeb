import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { AlertDialog } from '../../components/ui/AlertDialog'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

export default function GeneralSettingsPage() {
  const { currentTenant, setCurrentTenant } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDocumentClass, setSelectedDocumentClass] = useState<string>(
    currentTenant?.defaultDocumentClass || 'invoice'
  )
  const [businessData, setBusinessData] = useState({
    businessName: '',
    cuit: '',
    address: '',
    phone: '',
    email: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean
    title: string
    message: string
    type: 'error' | 'warning' | 'info' | 'success'
  }>({ show: false, title: '', message: '', type: 'info' })

  // Fetch tenant settings
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenant-settings', currentTenant?.slug],
    queryFn: async () => {
      const response = await api.get(`/${currentTenant!.slug}/tenants/settings`)
      return response.data
    },
    enabled: !!currentTenant
  })

  // Update form data when tenant data is loaded
  useEffect(() => {
    if (tenantData?.tenant) {
      if (tenantData.tenant.defaultDocumentClass) {
        setSelectedDocumentClass(tenantData.tenant.defaultDocumentClass)
      }
      setBusinessData({
        businessName: tenantData.tenant.businessName || '',
        cuit: tenantData.tenant.cuit || '',
        address: tenantData.tenant.address || '',
        phone: tenantData.tenant.phone || '',
        email: tenantData.tenant.email || ''
      })
    }
  }, [tenantData])

  // Update tenant settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      defaultDocumentClass: string
      businessName?: string
      cuit?: string
      address?: string
      phone?: string
      email?: string
    }) => {
      const response = await api.put(`/${currentTenant!.slug}/tenants/settings`, data)
      return response.data
    },
    onSuccess: () => {
      // Update the current tenant in the auth store
      if (currentTenant) {
        setCurrentTenant({
          ...currentTenant,
          defaultDocumentClass: selectedDocumentClass as any
        })
      }
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      setAlertDialog({
        show: true,
        title: 'Éxito',
        message: 'Configuración guardada exitosamente',
        type: 'success'
      })
    },
    onError: (error: any) => {
      setAlertDialog({
        show: true,
        title: 'Error',
        message: error.response?.data?.error || 'Error al guardar la configuración',
        type: 'error'
      })
    }
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettingsMutation.mutateAsync({
        defaultDocumentClass: selectedDocumentClass,
        ...businessData
      })
    } finally {
      setIsSaving(false)
    }
  }

  const documentClassOptions = [
    { value: 'invoice', label: 'Factura' },
    { value: 'quote', label: 'Presupuesto' },
    { value: 'credit_note', label: 'Nota de Crédito' },
    { value: 'debit_note', label: 'Nota de Débito' }
  ]

  return (
    <>
      <AlertDialog
        isOpen={alertDialog.show}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Configuración General" />

      <div className="mt-8 max-w-3xl">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuración de Ventas
            </h3>

            <div className="space-y-6">
              {/* Tipo de Documento por Defecto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento por Defecto
                </label>
                <select
                  value={selectedDocumentClass}
                  onChange={(e) => setSelectedDocumentClass(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {documentClassOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Este será el tipo de documento seleccionado por defecto al crear una nueva venta
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Datos del Negocio */}
        <Card className="mt-6">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Datos del Negocio
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta información se utiliza en los comprobantes fiscales y tickets de impresión
            </p>

            <div className="space-y-6">
              {/* Nombre Comercial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Comercial
                </label>
                <input
                  type="text"
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: Mi Negocio SA"
                  disabled={isLoading}
                />
              </div>

              {/* CUIT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CUIT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessData.cuit}
                  onChange={(e) => setBusinessData({ ...businessData, cuit: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: 20-12345678-9"
                  disabled={isLoading}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Requerido para generar comprobantes fiscales con QR de AFIP
                </p>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  disabled={isLoading}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: 011-4567-8910"
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ej: contacto@minegocio.com"
                  disabled={isLoading}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isLoading}
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
    </>
  )
}
