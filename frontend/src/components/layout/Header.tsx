import { Menu } from '@headlessui/react'
import { Menu as MenuIcon, ChevronDown, ShoppingCart, Archive, Users, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuClick: () => void
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, currentTenant, tenants, setCurrentTenant, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleQuickAction = (action: 'sale' | 'product' | 'entity' | 'reports') => {
    switch (action) {
      case 'sale':
        navigate('/sales/new')
        break
      case 'product':
        navigate('/products?action=new')
        break
      case 'entity':
        navigate('/entities?action=new')
        break
      case 'reports':
        navigate('/reports')
        break
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onMenuClick}
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          {/* Tenant selector */}
          <div className="flex items-center">
            {tenants.length > 0 && (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-2 px-4 py-2 rounded-md text-base font-semibold text-gray-900 hover:bg-gray-100">
                  <span className="text-lg">{currentTenant?.name}</span>
                  {tenants.length > 1 && <ChevronDown className="h-5 w-5" />}
                </Menu.Button>
                {tenants.length > 1 && (
                  <Menu.Items className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      {tenants.map((tenant) => (
                        <Menu.Item key={tenant.id}>
                          {({ active }) => (
                            <button
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } ${
                                currentTenant?.id === tenant.id ? 'font-semibold' : ''
                              } block w-full text-left px-4 py-2 text-base text-gray-700`}
                              onClick={() => setCurrentTenant(tenant)}
                            >
                              {tenant.name}
                              {tenant.role && (
                                <span className="text-gray-500 ml-2 text-sm">({tenant.role})</span>
                              )}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                )}
              </Menu>
            )}
          </div>

          {/* Quick Actions */}
          <div className="hidden lg:flex items-center gap-3 ml-auto mr-4">
            <button
              onClick={() => handleQuickAction('sale')}
              className="flex items-center justify-center gap-1.5 w-16 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:-translate-y-0.5 hover:scale-105 transition-all shadow-sm hover:shadow-lg"
              title="Nueva Venta"
            >
              <span className="text-lg font-bold">+</span>
              <ShoppingCart className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleQuickAction('product')}
              className="flex items-center justify-center gap-1.5 w-16 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 hover:-translate-y-0.5 hover:scale-105 transition-all shadow-sm hover:shadow-lg"
              title="Nuevo Producto"
            >
              <span className="text-lg font-bold">+</span>
              <Archive className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleQuickAction('entity')}
              className="flex items-center justify-center gap-1.5 w-16 h-10 bg-purple-600 text-white rounded-full hover:bg-purple-700 hover:-translate-y-0.5 hover:scale-105 transition-all shadow-sm hover:shadow-lg"
              title="Nueva Entidad"
            >
              <span className="text-lg font-bold">+</span>
              <Users className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleQuickAction('reports')}
              className="flex items-center justify-center w-16 h-10 bg-orange-600 text-white rounded-full hover:bg-orange-700 hover:-translate-y-0.5 hover:scale-105 transition-all shadow-sm hover:shadow-lg"
              title="Ver Reportes"
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            </button>
          </div>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block">
                {user?.firstName ? `${user.firstName} ${user?.lastName || ''}` : user?.email}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    >
                      Perfil
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                    >
                      Configuración
                    </button>
                  )}
                </Menu.Item>
                <div className="border-t border-gray-200">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        onClick={logout}
                      >
                        Cerrar sesión
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </div>
            </Menu.Items>
          </Menu>
        </div>
      </div>
    </header>
  )
}

export default Header