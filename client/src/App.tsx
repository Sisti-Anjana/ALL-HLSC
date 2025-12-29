import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { ThemeProvider } from './context/ThemeContext'
import PrivateRoute from './components/auth/PrivateRoute'
import AdminRoute from './components/auth/AdminRoute'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import UserLogin from './components/auth/UserLogin'
import AdminLogin from './components/auth/AdminLogin'
import ForgotPassword from './components/auth/ForgotPassword'
import Dashboard from './components/dashboard/Dashboard'
import PortfolioList from './components/portfolio/PortfolioList'
import IssueDetailsTable from './components/dashboard/IssueDetailsTable'
import AdminPanel from './components/admin/AdminPanel'
import PerformanceAnalytics from './components/analytics/PerformanceAnalytics'
import IssuesByUser from './components/analytics/IssuesByUser'
import CoverageMatrix from './components/analytics/CoverageMatrix'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <Router>
              <Routes>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<UserLogin />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/portfolios" element={<PortfolioList />} />
                  <Route path="/portfolios/:id" element={<PortfolioList />} />
                  <Route path="/issues" element={<IssueDetailsTable />} />
                  <Route path="/issues/:id" element={<IssueDetailsTable />} />
                  <Route path="/issues-by-user" element={<IssuesByUser />} />
                  {/* Admin-only routes - only accessible to super_admin and tenant_admin */}
                  <Route 
                    path="/analytics" 
                    element={
                      <AdminRoute>
                        <PerformanceAnalytics />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/coverage-matrix" 
                    element={
                      <AdminRoute>
                        <CoverageMatrix />
                      </AdminRoute>
                    } 
                  />
                  <Route path="/admin" element={<AdminPanel />} />
                </Route>
              </Routes>
            </Router>
            <Toaster position="top-right" />
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
