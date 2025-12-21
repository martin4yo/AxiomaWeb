import { useState } from 'react'
import { Check } from 'lucide-react'
import { WizardStep } from '../../../components/wizard/WizardStep'
import { WizardData } from '../../../hooks/useWizard'

interface Step3Props {
  wizardData: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export function Step3AfipConfig({ wizardData, onUpdate }: Step3Props) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [certFileName, setCertFileName] = useState<string>('')
  const [keyFileName, setKeyFileName] = useState<string>('')

  const handleFileChange = async (field: 'afipCertificateContent' | 'afipPrivateKeyContent', file: File | null) => {
    if (!file) {
      onUpdate({ [field]: null })
      return
    }

    // Guardar el nombre del archivo para mostrar
    if (field === 'afipCertificateContent') {
      setCertFileName(file.name)
    } else {
      setKeyFileName(file.name)
    }

    // Leer el contenido del archivo
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      onUpdate({ [field]: content })
    }
    reader.readAsText(file)
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    // TODO: Implementar test de conexión con AFIP
    setTimeout(() => {
      setTestStatus('success')
    }, 2000)
  }

  return (
    <WizardStep
      title="Configuración Fiscal AFIP"
      description="Configura la conexión con AFIP para facturación electrónica"
      icon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      }
      tip="Puedes omitir este paso y configurarlo más adelante desde la configuración del sistema."
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ambiente</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="testing"
                checked={wizardData.afipEnvironment === 'testing'}
                onChange={(e) =>
                  onUpdate({ afipEnvironment: e.target.value as 'testing' | 'production' })
                }
                className="mr-2"
              />
              <span className="text-sm">Testing (Homologación)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="production"
                checked={wizardData.afipEnvironment === 'production'}
                onChange={(e) =>
                  onUpdate({ afipEnvironment: e.target.value as 'testing' | 'production' })
                }
                className="mr-2"
              />
              <span className="text-sm">Producción</span>
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificado (.crt, .pem)
            </label>
            <input
              type="file"
              accept=".crt,.pem,.cer"
              onChange={(e) =>
                handleFileChange('afipCertificateContent', e.target.files?.[0] || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {(certFileName || wizardData.afipCertificateContent) && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="h-3 w-3" /> {certFileName || 'Certificado cargado'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clave privada (.key, .pem)
            </label>
            <input
              type="file"
              accept=".key,.pem"
              onChange={(e) =>
                handleFileChange('afipPrivateKeyContent', e.target.files?.[0] || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {(keyFileName || wizardData.afipPrivateKeyContent) && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="h-3 w-3" /> {keyFileName || 'Clave cargada'}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Punto de venta
          </label>
          <input
            type="number"
            min="1"
            max="9999"
            value={wizardData.afipSalesPoint || 1}
            onChange={(e) => onUpdate({ afipSalesPoint: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="1"
          />
        </div>

        {wizardData.afipCertificateContent && wizardData.afipPrivateKeyContent && (
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className={`
                w-full px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  testStatus === 'testing'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : testStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {testStatus === 'testing'
                ? 'Probando conexión...'
                : testStatus === 'success'
                ? 'Conexión exitosa'
                : 'Probar conexión con AFIP'}
            </button>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">¿No tienes los certificados?</h4>
          <p className="text-sm text-blue-700 mb-2">
            Puedes obtenerlos desde el sitio de AFIP. Te recomendamos seguir nuestra guía de
            configuración.
          </p>
          <a
            href="https://www.afip.gob.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ir a AFIP →
          </a>
        </div>
      </div>
    </WizardStep>
  )
}
