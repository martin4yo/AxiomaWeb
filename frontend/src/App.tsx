import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EntitiesPage from '@/pages/entities/EntitiesPage'
import ProductsPage from '@/pages/products/ProductsPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import ProductCategoriesPage from '@/pages/product-categories/ProductCategoriesPage'
import ProductBrandsPage from '@/pages/product-brands/ProductBrandsPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerCategoriesPage from '@/pages/customer-categories/CustomerCategoriesPage'
import TaxesPage from '@/pages/settings/taxes/TaxesPage'
import PaymentMethodsPage from '@/pages/settings/payment-methods/PaymentMethodsPage'
import VatConditionsPage from '@/pages/settings/vat-conditions/VatConditionsPage'
import SettingsDocumentsPage from '@/pages/settings/documents/DocumentsPage'

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
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="settings/taxes" element={<TaxesPage />} />
        <Route path="settings/payment-methods" element={<PaymentMethodsPage />} />
        <Route path="settings/vat-conditions" element={<VatConditionsPage />} />
        <Route path="settings/documents" element={<SettingsDocumentsPage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App