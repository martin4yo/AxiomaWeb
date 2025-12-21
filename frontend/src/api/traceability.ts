import { api } from '../services/api'

export interface TraceabilityNode {
  id: string
  type: 'quote' | 'order' | 'sale' | 'payment' | 'credit_note' | 'debit_note'
  number: string
  date: string
  status: string
  amount: number
  customerName?: string
  children: TraceabilityNode[]
  metadata?: Record<string, any>
}

export interface TraceabilityResponse {
  origin: TraceabilityNode[]  // Documentos anteriores
  tree: TraceabilityNode      // Árbol de documentos derivados
}

export const traceabilityApi = {
  // Obtener trazabilidad de un documento
  getTraceability: async (type: 'quote' | 'order' | 'sale', id: string): Promise<TraceabilityResponse> => {
    const response = await api.get(`/traceability/${type}/${id}`)
    return response.data
  }
}
