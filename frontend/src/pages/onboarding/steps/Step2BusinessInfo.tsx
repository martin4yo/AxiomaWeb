import { useState, useEffect } from 'react'
import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'
import { api } from '../../../services/api'
import { useAuthStore } from '../../../stores/authStore'

interface Step2Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export function Step2BusinessInfo({ wizardData, onUpdate }: Step2Props) {
  const { currentTenant } = useAuthStore()
  const [vatConditions, setVatConditions] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadVatConditions()
  }, [])

  const loadVatConditions = async () => {
    if (!currentTenant) {
      console.log('⚠️ No hay currentTenant')
      return
    }
    console.log('🔍 Loading VAT conditions for tenant:', currentTenant.slug)
    try {
      const response = await api.get(`/${currentTenant.slug}/vat-conditions`)
      console.log('📥 VAT conditions response:', response.data)
      // El backend retorna { conditions: [...] }
      const data = response.data.conditions || []
      console.log('✅ VAT conditions loaded:', data.length, 'items')
      setVatConditions(data)
    } catch (error) {
      console.error('❌ Error loading VAT conditions:', error)
      setVatConditions([]) // Fallback a array vacío
    }
  }

  const validateCUIT = (cuit: string) => {
    // Formato: XX-XXXXXXXX-X
    const cuitRegex = /^\d{2}-\d{8}-\d{1}$/
    return cuitRegex.test(cuit)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleChange = (field: keyof WizardData, value: any) => {
    onUpdate({ [field]: value })

    // Limpiar errores al escribir
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleBlur = (field: keyof WizardData) => {
    const newErrors = { ...errors }

    if (field === 'cuit' && wizardData.cuit && !validateCUIT(wizardData.cuit)) {
      newErrors.cuit = 'Formato inválido. Debe ser XX-XXXXXXXX-X'
    }

    if (field === 'email' && wizardData.email && !validateEmail(wizardData.email)) {
      newErrors.email = 'Email inválido'
    }

    setErrors(newErrors)
  }

  return (
    <WizardStep
      title="Datos del Negocio"
      description="Información básica de tu empresa"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      }
      tip="Esta información aparecerá en tus facturas y comprobantes. Asegúrate de que sea correcta."
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre comercial <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={wizardData.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mi Empresa S.A."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CUIT <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={wizardData.cuit || ''}
              onChange={(e) => handleChange('cuit', e.target.value)}
              onBlur={() => handleBlur('cuit')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.cuit ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="20-12345678-9"
              required
            />
            {errors.cuit && <p className="text-red-500 text-xs mt-1">{errors.cuit}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={wizardData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Av. Corrientes 1234, CABA"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={wizardData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+54 11 1234-5678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={wizardData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="contacto@miempresa.com"
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo (URL) <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <input
            type="url"
            value={wizardData.logo || ''}
            onChange={(e) => handleChange('logo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://miempresa.com/logo.png"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condición de IVA <span className="text-red-500">*</span>
          </label>
          <select
            value={wizardData.vatConditionId || ''}
            onChange={(e) => handleChange('vatConditionId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Seleccionar...</option>
            {vatConditions.map((vc) => (
              <option key={vc.id} value={vc.id}>
                {vc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresos Brutos <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={wizardData.grossIncomeNumber || ''}
              onChange={(e) => handleChange('grossIncomeNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio de actividades <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={wizardData.activityStartDate || ''}
              onChange={(e) => handleChange('activityStartDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>
    </WizardStep>
  )
}
