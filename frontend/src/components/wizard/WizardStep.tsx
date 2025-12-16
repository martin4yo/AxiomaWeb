import { ReactNode } from 'react'

interface WizardStepProps {
  title: string
  description?: string
  icon?: ReactNode
  tip?: string
  children: ReactNode
}

export function WizardStep({ title, description, icon, tip, children }: WizardStepProps) {
  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div className="flex items-start space-x-4">
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && <p className="mt-2 text-gray-600">{description}</p>}
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="bg-gray-50 rounded-lg p-6">{children}</div>

      {/* Tip (si existe) */}
      {tip && (
        <div className="flex items-start space-x-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-blue-700">{tip}</p>
        </div>
      )}
    </div>
  )
}
