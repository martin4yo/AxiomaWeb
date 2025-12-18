import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../../api/reports'

type DateFilter = 'today' | 'yesterday' | 'last-7-days' | 'this-week' | 'this-month' | 'custom'

// Función para formatear números con separadores de miles y decimales
const formatNumber = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date()
    let dateFrom: Date
    let dateTo: Date = today

    switch (dateFilter) {
      case 'today':
        dateFrom = today
        break
      case 'yesterday':
        dateFrom = new Date(today)
        dateFrom.setDate(today.getDate() - 1)
        dateTo = new Date(today)
        dateTo.setDate(today.getDate() - 1)
        break
      case 'last-7-days':
        dateFrom = new Date(today)
        dateFrom.setDate(today.getDate() - 6) // Últimos 7 días incluyendo hoy
        break
      case 'this-week':
        dateFrom = new Date(today)
        // Start of week (Monday in Argentina)
        const dayOfWeek = today.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        dateFrom.setDate(today.getDate() - daysToMonday)
        break
      case 'this-month':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'custom':
        if (!customDateFrom || !customDateTo) {
          // Default to today if custom dates not set
          dateFrom = today
        } else {
          dateFrom = new Date(customDateFrom + 'T00:00:00')
          dateTo = new Date(customDateTo + 'T23:59:59')
        }
        break
      default:
        dateFrom = today
    }

    // Format dates as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return {
      dateFrom: formatLocalDate(dateFrom),
      dateTo: formatLocalDate(dateTo)
    }
  }

  const { dateFrom, dateTo } = getDateRange()

  // Debug: Log date range

  // Fetch reports data
  const { data: salesByProductData, isLoading: loadingSalesByProduct, refetch: refetchSalesByProduct } = useQuery({
    queryKey: ['salesByProduct', dateFrom, dateTo],
    queryFn: () => reportsApi.getSalesByProduct(dateFrom, dateTo),
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    gcTime: 0
  })

  const { data: collectionsByPaymentMethodData, isLoading: loadingCollectionsByPaymentMethod, refetch: refetchCollections } = useQuery({
    queryKey: ['collectionsByPaymentMethod', dateFrom, dateTo],
    queryFn: () => reportsApi.getCollectionsByPaymentMethod(dateFrom, dateTo),
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    gcTime: 0
  })

  const { data: salesSummaryData, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['salesSummary', dateFrom, dateTo],
    queryFn: () => reportsApi.getSalesSummary(dateFrom, dateTo),
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    gcTime: 0
  })

  const { data: salesEvolutionData, isLoading: loadingEvolution, refetch: refetchEvolution } = useQuery({
    queryKey: ['salesEvolution', dateFrom, dateTo],
    queryFn: () => reportsApi.getSalesEvolution(dateFrom, dateTo),
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    gcTime: 0
  })

  const handleRefresh = () => {
    refetchSalesByProduct()
    refetchCollections()
    refetchSummary()
    refetchEvolution()
  }

  const summary = salesSummaryData?.summary

  // Debug: Log summary data

  // Calculate max values for bar charts
  const maxSalesAmount = salesByProductData?.salesByProduct
    ? Math.max(...salesByProductData.salesByProduct.map(p => Number(p.total_amount)))
    : 0

  const maxCollectionAmount = collectionsByPaymentMethodData?.collectionsByPaymentMethod
    ? Math.max(...collectionsByPaymentMethodData.collectionsByPaymentMethod.map(c => Number(c.total_amount)))
    : 0

  // Agrupar datos por fecha y calcular totales
  const evolutionByDate = salesEvolutionData?.salesEvolution.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = { date: item.date, products: [], total: 0 }
    }
    acc[item.date].products.push(item)
    acc[item.date].total += Number(item.amount)
    return acc
  }, {} as Record<string, { date: string; products: typeof salesEvolutionData.salesEvolution; total: number }>)

  const evolutionDates = evolutionByDate ? Object.values(evolutionByDate).sort((a, b) => a.date.localeCompare(b.date)) : []
  const maxEvolutionAmount = evolutionDates.length > 0 ? Math.max(...evolutionDates.map(d => d.total)) : 0

  // Obtener lista única de productos para el color
  const allProducts = salesEvolutionData?.salesEvolution.reduce((acc, item) => {
    if (!acc.find(p => p.product_id === item.product_id)) {
      acc.push({ product_id: item.product_id, product_name: item.product_name })
    }
    return acc
  }, [] as Array<{ product_id: string; product_name: string }>) || []

  // Colores para cada producto
  const productColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDateFilter('yesterday')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'yesterday'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ayer
                </button>
                <button
                  onClick={() => setDateFilter('last-7-days')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'last-7-days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Últimos 7 Días
                </button>
                <button
                  onClick={() => setDateFilter('this-week')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'this-week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  onClick={() => setDateFilter('this-month')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'this-month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Este Mes
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-4 py-2 rounded-md ${
                    dateFilter === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Personalizado
                </button>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

        <div className="mt-3 text-sm text-gray-600">
          Mostrando datos desde <strong>{dateFrom.split('-').reverse().join('/')}</strong> hasta{' '}
          <strong>{dateTo.split('-').reverse().join('/')}</strong>
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Ventas</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(summary.total_sales || 0, 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Monto Total</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              ${formatNumber(summary.total_amount || 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Venta Promedio</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              ${formatNumber(summary.average_sale || 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Cobrado</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              ${formatNumber(summary.paid_amount || 0)}
            </div>
            {Number(summary.pending_amount || 0) > 0 && (
              <div className="mt-1 text-sm text-red-600">
                Pendiente: ${formatNumber(summary.pending_amount)}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Product */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas por Producto</h2>
          {loadingSalesByProduct ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : salesByProductData?.salesByProduct && salesByProductData.salesByProduct.length > 0 ? (
            <div className="space-y-3">
              {salesByProductData.salesByProduct.map((product: any) => {
                const percentage = maxSalesAmount > 0
                  ? (Number(product.total_amount) / maxSalesAmount) * 100
                  : 0

                return (
                  <div key={product.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {product.sku} - {product.name}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        ${formatNumber(product.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {formatNumber(product.total_quantity, 0)} ud.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay datos de ventas para el período seleccionado
            </div>
          )}
        </div>

        {/* Collections by Payment Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cobranzas por Medio de Pago</h2>
          {loadingCollectionsByPaymentMethod ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : collectionsByPaymentMethodData?.collectionsByPaymentMethod &&
             collectionsByPaymentMethodData.collectionsByPaymentMethod.length > 0 ? (
            <div className="space-y-3">
              {collectionsByPaymentMethodData.collectionsByPaymentMethod.map((method) => {
                const percentage = maxCollectionAmount > 0
                  ? (Number(method.total_amount) / maxCollectionAmount) * 100
                  : 0

                return (
                  <div key={method.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {method.name}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        ${formatNumber(method.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div
                          className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                            method.payment_type === 'CASH'
                              ? 'bg-green-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {formatNumber(method.payment_count, 0)} pago{method.payment_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay datos de cobranzas para el período seleccionado
            </div>
          )}
        </div>
      </div>

      {/* Sales Evolution Chart */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Evolución de Ventas por Producto</h2>
        {loadingEvolution ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : evolutionDates.length > 0 ? (
          <div className="space-y-4">
            {/* Chart */}
            <div className="relative h-64" style={{ overflow: 'visible' }}>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-12 w-20 flex flex-col justify-between text-xs text-gray-600 text-right pr-2">
                <span>${formatNumber(maxEvolutionAmount)}</span>
                <span>${formatNumber(maxEvolutionAmount * 0.75)}</span>
                <span>${formatNumber(maxEvolutionAmount * 0.5)}</span>
                <span>${formatNumber(maxEvolutionAmount * 0.25)}</span>
                <span>$0</span>
              </div>

              {/* Chart area */}
              <div className="absolute left-20 right-0 top-0 bottom-12 border-l border-b border-gray-300" style={{ overflow: 'visible' }}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="border-t border-gray-200 w-full"></div>
                  ))}
                </div>

                {/* Stacked bars container */}
                <div className="absolute inset-0 flex items-end justify-evenly" style={{ overflow: 'visible' }}>
                  {evolutionDates.map((dayData) => {
                    const barWidth = Math.min(80, Math.max(40, (100 / evolutionDates.length) * 0.6))
                    let cumulativeHeight = 0

                    return (
                      <div
                        key={dayData.date}
                        className="flex flex-col-reverse relative"
                        style={{ width: `${barWidth}px`, height: '100%' }}
                      >
                        {dayData.products.map((product) => {
                          const productHeight = (Number(product.amount) / maxEvolutionAmount) * 100
                          const color = productColors[allProducts.findIndex(p => p.product_id === product.product_id) % productColors.length]
                          cumulativeHeight += productHeight

                          return (
                            <div
                              key={product.product_id}
                              className="relative group cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                height: `${productHeight}%`,
                                backgroundColor: color,
                                zIndex: 1
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg" style={{ zIndex: 50 }}>
                                {product.product_name}: ${formatNumber(product.amount)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="absolute left-20 right-0 bottom-0 h-12">
                <div className="h-full flex items-start justify-evenly text-xs text-gray-600">
                  {evolutionDates.map(dayData => (
                    <div key={dayData.date} className="text-center">
                      <div className="font-medium">{dayData.date.split('-').reverse().join('/')}</div>
                      <div className="text-gray-500">${formatNumber(dayData.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {allProducts.map((product, index) => (
                <div key={product.product_id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: productColors[index % productColors.length] }}
                  ></div>
                  <span className="text-gray-700">{product.product_name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay datos de ventas para el período seleccionado
          </div>
        )}
      </div>
    </div>
  )
}
