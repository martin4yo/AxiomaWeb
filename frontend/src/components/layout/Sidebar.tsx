import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import {
  Home,
  BarChart3,
  Settings,
  X,
  Archive,
  ShoppingCart,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Tag,
  Store,
  Users,
  LayoutGrid,
  Banknote,
  CreditCard,
  ClipboardList,
  Building2,
  Link as LinkIcon,
  FileText,
  Wallet,
  Bell,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavigationItem {
  name: string
  href?: string
  icon: any
  children?: NavigationItem[]
  requiresAdmin?: boolean  // Nueva propiedad para indicar si requiere admin
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    name: 'Inventarios',
    icon: Archive,
    children: [
      { name: 'Productos', href: '/products', icon: Archive },
      { name: 'Categorías', href: '/product-categories', icon: Tag },
      { name: 'Marcas', href: '/product-brands', icon: Store },
      { name: 'Almacenes', href: '/inventory/warehouses', icon: Store },
      { name: 'Alertas', href: '/inventory/alerts', icon: Bell },
    ]
  },
  {
    name: 'Ventas',
    icon: ShoppingCart,
    children: [
      { name: 'Listado', href: '/sales', icon: ShoppingCart },
      { name: 'Clientes', href: '/customers', icon: Users },
      { name: 'Categorías', href: '/customer-categories', icon: LayoutGrid },
    ]
  },
  {
    name: 'Compras',
    icon: ShoppingBag,
    children: [
      { name: 'Proveedores', href: '/suppliers', icon: Users },
      { name: 'Listado de Compras', href: '/purchases', icon: FileText },
      { name: 'Cuenta Corriente', href: '/supplier-accounts', icon: Wallet },
    ]
  },
  {
    name: 'Fondos',
    icon: Wallet,
    children: [
      { name: 'Movimientos', href: '/cash/movements', icon: Banknote },
      { name: 'Balance', href: '/cash/accounts', icon: CreditCard },
    ]
  },
  { name: 'Entidades', href: '/entities', icon: Users },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  {
    name: 'Configuración',
    icon: Settings,
    requiresAdmin: true,
    children: [
      { name: 'General', href: '/settings', icon: Settings },
      { name: 'Tenants', href: '/tenants', icon: Building2 },
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Formas de Pago', href: '/settings/payment-methods', icon: CreditCard },
      { name: 'Condiciones de IVA', href: '/settings/vat-conditions', icon: Banknote },
      { name: 'Comprobantes', href: '/settings/documents', icon: ClipboardList },
      { name: 'Conexiones AFIP', href: '/settings/afip-connections', icon: LinkIcon },
      { name: 'Sucursales', href: '/branches', icon: Building2 },
      { name: 'Puntos de Venta', href: '/settings/sales-points', icon: Store },
      { name: 'Configuración de Comprobantes', href: '/settings/voucher-configurations', icon: Settings },
    ]
  },
]

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()
  const { currentTenant } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  // Función para verificar si el usuario es admin o superadmin
  const isAdminOrSuperAdmin = () => {
    const role = currentTenant?.role?.toLowerCase()
    return role === 'admin' || role === 'superadmin'
  }

  // Filtrar navegación según permisos
  const filteredNavigation = navigation.filter(item => {
    if (item.requiresAdmin) {
      return isAdminOrSuperAdmin()
    }
    return true
  })

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const isActive = item.href && location.pathname === item.href
    const hasActiveChild = hasChildren && item.children?.some(child =>
      child.href && location.pathname === child.href
    )

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={clsx(
              'group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
              level === 0 ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-25',
              hasActiveChild ? 'bg-primary-25 text-primary-700' : ''
            )}
          >
            <item.icon
              className={clsx(
                'mr-3 h-5 w-5 flex-shrink-0',
                hasActiveChild ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            <span className="flex-1 text-left">{item.name}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        to={item.href!}
        className={clsx(
          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          level === 0
            ? (isActive
                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
            : (isActive
                ? 'bg-primary-100 text-primary-800'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
        )}
      >
        <item.icon
          className={clsx(
            'mr-3 h-5 w-5 flex-shrink-0',
            isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
          )}
        />
        {item.name}
      </Link>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-primary-600">Axioma Mini</h1>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {filteredNavigation.map(item => renderNavigationItem(item))}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-600">Axioma Mini</h1>
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map(item => {
              const renderedItem = renderNavigationItem(item)
              // Add click handler to close mobile menu when navigating
              if (item.href) {
                return (
                  <div key={item.name} onClick={onClose}>
                    {renderedItem}
                  </div>
                )
              }
              return renderedItem
            })}
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar