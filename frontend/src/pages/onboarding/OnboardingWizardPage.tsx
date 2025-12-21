import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizard } from '../../hooks/useWizard'
import { useAuthStore } from '../../stores/authStore' // Usado en handleNext para logout
import { useDialog } from '../../hooks/useDialog'
import { WizardContainer } from '../../components/wizard/WizardContainer'
import { WizardProgress } from '../../components/wizard/WizardProgress'
import { WizardNavigation } from '../../components/wizard/WizardNavigation'
import { Step1Welcome } from './steps/Step1Welcome'
import { Step2BusinessInfo } from './steps/Step2BusinessInfo'
import { Step3AfipConfig } from './steps/Step3AfipConfig'
import { Step4VoucherTypes } from './steps/Step4VoucherTypes'
import { Step5PrintConfig } from './steps/Step5PrintConfig'
import { Step6PaymentMethods } from './steps/Step6PaymentMethods'
import { Step7ProductCategories } from './steps/Step7ProductCategories'
import { Step8Warehouses } from './steps/Step8Warehouses'
import { Step9ThermalPrinter } from './steps/Step9ThermalPrinter'
import { Step10Users } from './steps/Step10Users'
import { Step11Summary } from './steps/Step11Summary'

export default function OnboardingWizardPage() {
  const navigate = useNavigate()
  const dialog = useDialog()
  const {
    currentStep,
    totalSteps,
    wizardData,
    updateWizardData,
    nextStep,
    previousStep,
    skipStep,
    completeWizard,
    loadWizardState,
    isLoading
  } = useWizard()

  useEffect(() => {
    // Cargar el estado del wizard si existe
    loadWizardState()
  }, [])

  const handleNext = async () => {
    // Validar paso actual antes de avanzar
    if (!validateCurrentStep()) {
      return
    }

    if (currentStep === totalSteps) {
      // Último paso - completar wizard
      const success = await completeWizard()
      if (success) {
        // Hacer logout para que vuelva a hacer login con el tenant configurado
        useAuthStore.getState().logout()
        navigate('/login')
      }
    } else {
      await nextStep()
    }
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 2: // Datos del negocio
        if (
          !wizardData.businessName ||
          !wizardData.cuit ||
          !wizardData.address ||
          !wizardData.phone ||
          !wizardData.email ||
          !wizardData.vatConditionId ||
          !wizardData.activityStartDate
        ) {
          dialog.warning('Por favor completa todos los campos requeridos')
          return false
        }
        break
      case 4: // Tipos de comprobantes
        if (!wizardData.voucherTypes || wizardData.voucherTypes.length === 0) {
          dialog.warning('Debes seleccionar al menos un tipo de comprobante')
          return false
        }
        const hasFactura = wizardData.voucherTypes.some((t) => ['FA', 'FB', 'FC'].includes(t))
        if (!hasFactura) {
          dialog.warning('Debes seleccionar al menos un tipo de factura (A, B o C)')
          return false
        }
        break
      case 6: // Formas de pago
        if (!wizardData.paymentMethods || wizardData.paymentMethods.length === 0) {
          dialog.warning('Debes seleccionar al menos una forma de pago')
          return false
        }
        break
      case 7: // Categorías
        if (!wizardData.categories || wizardData.categories.length === 0) {
          dialog.warning('Debes seleccionar al menos una categoría')
          return false
        }
        break
      case 8: // Almacenes
        if (!wizardData.warehouses || wizardData.warehouses.length === 0) {
          dialog.warning('Debes configurar al menos un almacén')
          return false
        }
        break
    }
    return true
  }

  const canSkipCurrentStep = (): boolean => {
    // Pasos que se pueden omitir
    return [3, 5, 9, 10].includes(currentStep)
  }

  const isNextDisabled = (): boolean => {
    // No permitir avanzar si hay validaciones pendientes
    return false
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome />
      case 2:
        return <Step2BusinessInfo wizardData={wizardData} onUpdate={updateWizardData} />
      case 3:
        return <Step3AfipConfig wizardData={wizardData} onUpdate={updateWizardData} />
      case 4:
        return <Step4VoucherTypes wizardData={wizardData} onUpdate={updateWizardData} />
      case 5:
        return <Step5PrintConfig wizardData={wizardData} onUpdate={updateWizardData} />
      case 6:
        return <Step6PaymentMethods wizardData={wizardData} onUpdate={updateWizardData} />
      case 7:
        return <Step7ProductCategories wizardData={wizardData} onUpdate={updateWizardData} />
      case 8:
        return <Step8Warehouses wizardData={wizardData} onUpdate={updateWizardData} />
      case 9:
        return <Step9ThermalPrinter wizardData={wizardData} onUpdate={updateWizardData} />
      case 10:
        return <Step10Users wizardData={wizardData} onUpdate={updateWizardData} />
      case 11:
        return <Step11Summary wizardData={wizardData} />
      default:
        return <Step1Welcome />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <WizardContainer>
      <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />

      <div className="mt-8">{renderStep()}</div>

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={previousStep}
        onNext={handleNext}
        onSkip={canSkipCurrentStep() ? skipStep : undefined}
        canSkip={canSkipCurrentStep()}
        isFirstStep={currentStep === 1}
        isLastStep={currentStep === totalSteps}
        isNextDisabled={isNextDisabled()}
      />

      <dialog.AlertComponent />
      <dialog.ConfirmComponent />
    </WizardContainer>
  )
}
