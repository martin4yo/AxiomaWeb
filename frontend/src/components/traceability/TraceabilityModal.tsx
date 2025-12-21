import { useQuery } from '@tanstack/react-query'
import {
  X,
  FileText,
  ClipboardList,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Receipt,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { traceabilityApi, TraceabilityNode } from '../../api/traceability'

interface TraceabilityModalProps {
  isOpen: boolean
  onClose: () => void
  documentType: 'quote' | 'order' | 'sale'
  documentId: string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Configuración de colores y iconos por tipo
const nodeConfig: Record<string, {
  icon: any,
  bgColor: string,
  borderColor: string,
  textColor: string,
  label: string
}> = {
  quote: {
    icon: FileText,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600',
    label: 'Presupuesto'
  },
  order: {
    icon: ClipboardList,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-600',
    label: 'Pedido'
  },
  sale: {
    icon: ShoppingCart,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    textColor: 'text-green-600',
    label: 'Venta'
  },
  payment: {
    icon: Banknote,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-600',
    label: 'Pago'
  },
  credit_note: {
    icon: Receipt,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-600',
    label: 'Nota Crédito'
  },
  debit_note: {
    icon: Receipt,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-600',
    label: 'Nota Débito'
  }
}

// Configuración de estados
const statusConfig: Record<string, { icon: any, color: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600' },
  CONFIRMED: { icon: CheckCircle2, color: 'text-blue-600' },
  PROCESSING: { icon: Clock, color: 'text-blue-600' },
  READY: { icon: CheckCircle2, color: 'text-green-600' },
  COMPLETED: { icon: CheckCircle2, color: 'text-green-600' },
  FULLY_CONVERTED: { icon: CheckCircle2, color: 'text-green-600' },
  PARTIALLY_CONVERTED: { icon: Clock, color: 'text-amber-600' },
  PARTIALLY_INVOICED: { icon: Clock, color: 'text-amber-600' },
  CANCELLED: { icon: XCircle, color: 'text-red-600' },
  authorized: { icon: CheckCircle2, color: 'text-green-600' },
  pending: { icon: Clock, color: 'text-yellow-600' },
  completed: { icon: CheckCircle2, color: 'text-green-600' }
}

// Componente para un nodo del árbol
function TreeNode({
  node,
  level = 0,
  isLast = false
}: {
  node: TraceabilityNode
  level?: number
  isLast?: boolean
}) {
  const config = nodeConfig[node.type] || nodeConfig.sale
  const Icon = config.icon
  const status = statusConfig[node.status] || statusConfig.PENDING
  const StatusIcon = status.icon

  return (
    <div className="relative">
      {/* Línea vertical de conexión */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-px bg-gray-300"
          style={{
            height: isLast ? '24px' : '100%',
            marginLeft: `${(level - 1) * 24 + 12}px`
          }}
        />
      )}

      {/* Línea horizontal de conexión */}
      {level > 0 && (
        <div
          className="absolute top-6 h-px bg-gray-300"
          style={{
            left: `${(level - 1) * 24 + 12}px`,
            width: '12px'
          }}
        />
      )}

      {/* Nodo */}
      <div
        className={`
          ${config.bgColor} ${config.borderColor}
          border rounded-lg p-3 mb-2
          ${level > 0 ? 'ml-6' : ''}
        `}
        style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.textColor}`} />
          <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
          <StatusIcon className={`w-3 h-3 ml-auto ${status.color}`} />
        </div>

        <div className="font-bold text-gray-900 text-sm mt-1">
          {node.number}
        </div>

        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatDate(node.date)}</span>
          <span className="font-medium">{formatCurrency(node.amount)}</span>
        </div>

        {node.customerName && (
          <div className="text-xs text-gray-500 truncate mt-1">
            {node.customerName}
          </div>
        )}

        {node.metadata?.stockBehavior && node.metadata.stockBehavior !== 'NONE' && (
          <div className="mt-1">
            <span className={`
              px-1.5 py-0.5 rounded text-xs
              ${node.metadata.stockBehavior === 'RESERVE' ? 'bg-blue-100 text-blue-700' : ''}
              ${node.metadata.stockBehavior === 'DEDUCT' ? 'bg-amber-100 text-amber-700' : ''}
            `}>
              {node.metadata.stockBehavior === 'RESERVE' && 'Reservado'}
              {node.metadata.stockBehavior === 'DEDUCT' && 'Descontado'}
            </span>
          </div>
        )}

        {node.metadata?.cae && (
          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            CAE
          </div>
        )}

        {node.metadata?.paymentMethod && (
          <div className="text-xs text-gray-500 mt-1">
            {node.metadata.paymentMethod}
          </div>
        )}
      </div>

      {/* Hijos */}
      {node.children.length > 0 && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isLast={index === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TraceabilityModal({ isOpen, onClose, documentType, documentId }: TraceabilityModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['traceability', documentType, documentId],
    queryFn: () => traceabilityApi.getTraceability(documentType, documentId),
    enabled: isOpen && !!documentId
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Trazabilidad de Documento
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 py-8 justify-center">
                <AlertCircle className="w-5 h-5" />
                <span>Error al cargar la trazabilidad</span>
              </div>
            )}

            {data && (
              <div className="space-y-4">
                {/* Leyenda */}
                <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg text-xs">
                  {Object.entries(nodeConfig).slice(0, 4).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <div className={`p-1 rounded ${config.bgColor} ${config.borderColor} border`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-gray-600">{config.label}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Origen (documentos anteriores) */}
                {data.origin.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2 font-medium">ORIGEN</div>
                    {data.origin.map((node) => (
                      <TreeNode key={node.id} node={node} />
                    ))}
                    <div className="flex items-center gap-2 my-2 text-xs text-gray-400">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span>DOCUMENTO ACTUAL</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </div>
                )}

                {/* Árbol principal */}
                <TreeNode node={data.tree} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
