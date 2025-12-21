import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  ShoppingCart,
  CreditCard,
  ArrowDown,
  ArrowRight,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote
} from 'lucide-react'
import { traceabilityApi, TraceabilityNode } from '../../api/traceability'

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
  label: string
}> = {
  quote: {
    icon: FileText,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    label: 'Presupuesto'
  },
  order: {
    icon: ClipboardList,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    label: 'Pedido'
  },
  sale: {
    icon: ShoppingCart,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    label: 'Venta'
  },
  payment: {
    icon: Banknote,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-400',
    label: 'Pago'
  },
  credit_note: {
    icon: Receipt,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    label: 'Nota Crédito'
  },
  debit_note: {
    icon: Receipt,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
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
  isRoot = false,
  isLast = false
}: {
  node: TraceabilityNode
  isRoot?: boolean
  isLast?: boolean
}) {
  const config = nodeConfig[node.type] || nodeConfig.sale
  const Icon = config.icon
  const status = statusConfig[node.status] || statusConfig.PENDING
  const StatusIcon = status.icon

  const getDetailUrl = () => {
    switch (node.type) {
      case 'quote': return `/quotes/${node.id}`
      case 'order': return `/orders/${node.id}`
      case 'sale':
      case 'credit_note':
      case 'debit_note': return `/sales/${node.id}`
      default: return '#'
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Conector vertical superior */}
      {!isRoot && (
        <div className="w-0.5 h-6 bg-gray-300" />
      )}

      {/* Nodo */}
      <Link
        to={getDetailUrl()}
        className={`
          ${config.bgColor} ${config.borderColor}
          border-2 rounded-lg p-4 min-w-[200px] max-w-[280px]
          shadow-sm hover:shadow-md transition-shadow
          cursor-pointer
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-5 h-5 ${config.borderColor.replace('border-', 'text-')}`} />
          <span className="font-semibold text-gray-700">{config.label}</span>
          <StatusIcon className={`w-4 h-4 ml-auto ${status.color}`} />
        </div>

        <div className="text-lg font-bold text-gray-900 mb-1">
          {node.number}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatDate(node.date)}</span>
          </div>
          <div className="flex justify-between">
            <span>Monto:</span>
            <span className="font-medium">{formatCurrency(node.amount)}</span>
          </div>
          {node.customerName && (
            <div className="truncate text-gray-500 text-xs mt-1">
              {node.customerName}
            </div>
          )}
          {node.metadata?.paymentMethod && (
            <div className="text-xs text-gray-500">
              {node.metadata.paymentMethod}
            </div>
          )}
          {node.metadata?.stockBehavior && (
            <div className="text-xs">
              <span className={`
                px-1.5 py-0.5 rounded text-xs
                ${node.metadata.stockBehavior === 'RESERVE' ? 'bg-blue-100 text-blue-700' : ''}
                ${node.metadata.stockBehavior === 'DEDUCT' ? 'bg-amber-100 text-amber-700' : ''}
                ${node.metadata.stockBehavior === 'NONE' ? 'bg-gray-100 text-gray-600' : ''}
              `}>
                {node.metadata.stockBehavior === 'RESERVE' && 'Stock Reservado'}
                {node.metadata.stockBehavior === 'DEDUCT' && 'Stock Descontado'}
                {node.metadata.stockBehavior === 'NONE' && 'Sin Stock'}
              </span>
            </div>
          )}
          {node.metadata?.cae && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              CAE: {node.metadata.cae}
            </div>
          )}
        </div>
      </Link>

      {/* Hijos */}
      {node.children.length > 0 && (
        <>
          {/* Conector vertical inferior */}
          <div className="w-0.5 h-6 bg-gray-300" />

          {/* Contenedor de hijos */}
          <div className="flex gap-4">
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Conector horizontal si hay múltiples hijos */}
                {node.children.length > 1 && (
                  <div className="flex items-center">
                    {index === 0 && <div className="w-1/2" />}
                    {index > 0 && <div className="h-0.5 bg-gray-300 flex-1" />}
                    <div className="w-0.5 h-6 bg-gray-300" />
                    {index < node.children.length - 1 && <div className="h-0.5 bg-gray-300 flex-1" />}
                    {index === node.children.length - 1 && <div className="w-1/2" />}
                  </div>
                )}
                <TreeNode
                  node={child}
                  isLast={index === node.children.length - 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Componente para mostrar el origen (hacia arriba)
function OriginChain({ nodes }: { nodes: TraceabilityNode[] }) {
  if (nodes.length === 0) return null

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
        <ArrowDown className="w-4 h-4" />
        Origen
      </div>
      {nodes.map((node, index) => (
        <div key={node.id} className="flex flex-col items-center">
          <TreeNode node={node} isRoot={index === 0} />
          {index < nodes.length - 1 && (
            <div className="w-0.5 h-6 bg-gray-300" />
          )}
        </div>
      ))}
      <div className="w-0.5 h-6 bg-gray-300" />
      <div className="text-sm text-gray-500 my-2 flex items-center gap-1">
        <ArrowDown className="w-4 h-4" />
        Documento Actual
      </div>
    </div>
  )
}

export default function TraceabilityPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['traceability', type, id],
    queryFn: () => traceabilityApi.getTraceability(type as 'quote' | 'order' | 'sale', id!),
    enabled: !!type && !!id
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Error al cargar la trazabilidad</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trazabilidad de Documento</h1>
          <p className="text-gray-500">
            Visualización de la cadena de documentos relacionados
          </p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mb-6 flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        {Object.entries(nodeConfig).map(([key, config]) => {
          const Icon = config.icon
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div className={`p-1.5 rounded ${config.bgColor} ${config.borderColor} border`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-gray-600">{config.label}</span>
            </div>
          )
        })}
      </div>

      {/* Árbol de trazabilidad */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 overflow-x-auto">
        <div className="flex flex-col items-center min-w-max">
          {/* Origen (documentos anteriores) */}
          <OriginChain nodes={data.origin} />

          {/* Árbol principal (documento actual y derivados) */}
          <TreeNode node={data.tree} isRoot={data.origin.length === 0} />
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-blue-600 text-sm font-medium">Documento Raíz</div>
          <div className="text-xl font-bold text-blue-900">
            {data.origin.length > 0 ? data.origin[0].number : data.tree.number}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-green-600 text-sm font-medium">Monto Total</div>
          <div className="text-xl font-bold text-green-900">
            {formatCurrency(data.tree.amount)}
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="text-amber-600 text-sm font-medium">Estado Actual</div>
          <div className="text-xl font-bold text-amber-900">
            {data.tree.status}
          </div>
        </div>
      </div>
    </div>
  )
}
