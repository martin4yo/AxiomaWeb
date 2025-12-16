import { useState, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { api } from '../services/api'

export interface WizardData {
  // Paso 2: Datos del Negocio
  businessName?: string
  cuit?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  vatConditionId?: string
  grossIncomeNumber?: string
  activityStartDate?: string

  // Paso 3: Config AFIP
  afipEnvironment?: 'testing' | 'production'
  afipCertificate?: File | null
  afipPrivateKey?: File | null
  afipSalesPoint?: number

  // Paso 4: Tipos de Comprobantes
  voucherTypes?: string[] // ['FA', 'FB', 'FC', etc.]

  // Paso 5: Config Impresión
  printConfigs?: Record<string, string> // { 'FA': 'factura-a-80mm', ... }
  autoPrint?: Record<string, boolean>

  // Paso 6: Formas de Pago
  paymentMethods?: string[] // ['CASH', 'DEBIT', 'CREDIT', etc.]
  customPaymentMethods?: Array<{ code: string; name: string }>

  // Paso 7: Categorías
  categories?: string[] // Categorías seleccionadas
  customCategories?: Array<{ code: string; name: string; description?: string }>

  // Paso 8: Almacenes
  warehouses?: Array<{
    code: string
    name: string
    address?: string
    allowNegativeStock: boolean
    isDefault: boolean
  }>

  // Paso 9: Impresora Térmica
  thermalPrinterConfigured?: boolean
  thermalPrinterName?: string

  // Paso 10: Usuarios
  invitedUsers?: Array<{ email: string; role: 'admin' | 'user' }>
}

export const useWizard = () => {
  const { currentTenant } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const TOTAL_STEPS = 11

  const updateWizardData = useCallback((data: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...data }))
  }, [])

  const saveProgress = useCallback(async (step: number) => {
    if (!currentTenant) return

    try {
      await api.put(`/${currentTenant.slug}/onboarding/step/${step}`, {
        wizardStep: step,
        data: wizardData
      })
    } catch (err: any) {
      console.error('Error saving wizard progress:', err)
      // No bloqueamos, solo logueamos
    }
  }, [currentTenant, wizardData])

  const nextStep = useCallback(async () => {
    if (currentStep >= TOTAL_STEPS) return

    // Guardar progreso antes de avanzar
    await saveProgress(currentStep)

    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  }, [currentStep, saveProgress, TOTAL_STEPS])

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [])

  const skipStep = useCallback(async () => {
    await nextStep()
  }, [nextStep])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step)
    }
  }, [TOTAL_STEPS])

  const completeWizard = useCallback(async () => {
    if (!currentTenant) return false

    setIsLoading(true)
    setError(null)

    try {
      await api.put(`/${currentTenant.slug}/onboarding/complete`, {
        wizardCompleted: true,
        wizardStep: TOTAL_STEPS,
        data: wizardData
      })

      return true
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al completar el wizard')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [currentTenant, wizardData, TOTAL_STEPS])

  const loadWizardState = useCallback(async () => {
    if (!currentTenant) return

    setIsLoading(true)
    try {
      const response = await api.get(`/${currentTenant.slug}/onboarding/status`)
      const { wizardStep, data } = response.data

      if (wizardStep > 0) {
        setCurrentStep(wizardStep)
      }
      if (data) {
        setWizardData(data)
      }
    } catch (err) {
      console.error('Error loading wizard state:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentTenant])

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    wizardData,
    isLoading,
    error,
    updateWizardData,
    nextStep,
    previousStep,
    skipStep,
    goToStep,
    completeWizard,
    loadWizardState,
    progress: Math.round((currentStep / TOTAL_STEPS) * 100)
  }
}
