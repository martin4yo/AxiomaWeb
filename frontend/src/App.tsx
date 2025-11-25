import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EntitiesPage from '@/pages/entities/EntitiesPage'
import ProductsPage from '@/pages/products/ProductsPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import WarehousesPage from '@/pages/inventory/WarehousesPage'
import ProductCategoriesPage from '@/pages/product-categories/ProductCategoriesPage'
import ProductBrandsPage from '@/pages/product-brands/ProductBrandsPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerCategoriesPage from '@/pages/customer-categories/CustomerCategoriesPage'
import TaxesPage from '@/pages/settings/taxes/TaxesPage'
import PaymentMethodsPage from '@/pages/settings/payment-methods/PaymentMethodsPage'
import VatConditionsPage from '@/pages/settings/vat-conditions/VatConditionsPage'
import SettingsDocumentsPage from '@/pages/settings/documents/DocumentsPage'
import AfipConnectionsPage from '@/pages/settings/AfipConnectionsPage'
import SalesPointsPage from '@/pages/settings/SalesPointsPage'
import BranchesPage from '@/pages/BranchesPage'
import VoucherConfigurationsPage from '@/pages/settings/VoucherConfigurationsPage'
import NewVoucherConfigurationPage from '@/pages/settings/NewVoucherConfigurationPage'
import SalesPage from '@/pages/sales/SalesPage'
import NewSalePage from '@/pages/sales/NewSalePage'
import ReportsPage from '@/pages/reports/ReportsPage'
import { TenantsPage } from '@/pages/tenants/TenantsPage'
import { UsersPage } from '@/pages/users/UsersPage'

function App() {
  const { isAuthenticated, currentTenant, _hasHydrated } = useAuthStore()

  // Wait for store to hydrate from localStorage
  if (!_hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Cargando...</div>
    </div>
  }

  // If not authenticated, show auth routes
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // If authenticated but no tenant selected, redirect to login
  if (!currentTenant) {
    return <Navigate to="/login" replace />
  }

  // Main app routes
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="entities" element={<EntitiesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="product-categories" element={<ProductCategoriesPage />} />
        <Route path="product-brands" element={<ProductBrandsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customer-categories" element={<CustomerCategoriesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="inventory/warehouses" element={<WarehousesPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings/taxes" element={<TaxesPage />} />
        <Route path="settings/payment-methods" element={<PaymentMethodsPage />} />
        <Route path="settings/vat-conditions" element={<VatConditionsPage />} />
        <Route path="settings/documents" element={<SettingsDocumentsPage />} />
        <Route path="settings/afip-connections" element={<AfipConnectionsPage />} />
        <Route path="settings/sales-points" element={<SalesPointsPage />} />
        <Route path="settings/voucher-configurations" element={<VoucherConfigurationsPage />} />
        <Route path="settings/voucher-configurations/new" element={<NewVoucherConfigurationPage />} />
      </Route>
      <Route path="/sales/new" element={<NewSalePage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App