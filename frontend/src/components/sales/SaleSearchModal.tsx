import React, { useState } from 'react'
import { api as axios } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface Sale {
  id: string
  saleNumber: string
  fullVoucherNumber: string | null
  saleDate: string
  customerName: string
  totalAmount: number
  availableForCredit: number
  totalCreditNotes: number
  totalDebitNotes: number
  customer?: {
    id: string
    name: string
    ivaCondition: string
  }
  voucherConfiguration?: {
    voucherType?: {
      name: string
      letter: string
    }
  }
}

interface SaleSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (sale: Sale) => void
  customerId?: string
}

export const SaleSearchModal: React.FC<SaleSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  customerId
}) => {
  const { currentTenant } = useAuthStore()
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

  const searchSales = async () => {
    if (!currentTenant) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (customerId) params.append('customerId', customerId)
      params.append('limit', '20')

      const response = await axios.get(
        `/api/${currentTenant.slug}/sales/search-for-credit-debit?${params.toString()}`
      )
      setSales(response.data.sales)
    } catch (error) {
      console.error('Error buscando ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      searchSales()
    }
  }, [isOpen, customerId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Seleccionar Venta Original
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchSales()}
                placeholder="Buscar por número o cliente..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={searchSales}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Cargando ventas...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron ventas
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => onSelect(sale)}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {sale.fullVoucherNumber || sale.saleNumber}
                        </span>
                        {sale.voucherConfiguration?.voucherType && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {sale.voucherConfiguration.voucherType.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {sale.customerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(sale.saleDate).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${sale.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Disponible: ${sale.availableForCredit.toFixed(2)}
                      </p>
                      {(sale.totalCreditNotes > 0 || sale.totalDebitNotes > 0) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {sale.totalCreditNotes > 0 && (
                            <span>NC: ${sale.totalCreditNotes.toFixed(2)}</span>
                          )}
                          {sale.totalCreditNotes > 0 && sale.totalDebitNotes > 0 && ' | '}
                          {sale.totalDebitNotes > 0 && (
                            <span>ND: ${sale.totalDebitNotes.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
