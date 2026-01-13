import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import toast from 'react-hot-toast'
import ScrollToTop from '../common/ScrollToTop'

const MainLayout: React.FC = () => {
  const queryClient = useQueryClient()
  const { user, logout, availableTenants, switchTenant } = useAuth()
  const { selectedTenantId, selectedTenant, setSelectedTenantId, tenants, isLoading: tenantsLoading } = useTenant()
  const location = useLocation()
  const navigate = useNavigate()
  // const [sidebarOpen, setSidebarOpen] = useState(true)
  const isSuperAdmin = user?.role === 'super_admin'

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const getCurrentHourEST = () => {
    const now = new Date()
    const estOffset = -5 // EST is UTC-5
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const estTime = new Date(utc + (estOffset * 3600000))
    return estTime.getHours()
  }

  // Base navigation items available to all users
  const baseNavItems = [
    { path: '/', label: 'Dashboard & Log Issues', icon: '📊' },
    { path: '/issues', label: 'Issue Details', icon: '🎫' },
    { path: '/issues-by-user', label: 'Issues by User', icon: '👥' },
  ]

  // Admin-only navigation items (super_admin and tenant_admin)
  const adminNavItems = [
    { path: '/analytics', label: 'Performance Analytics', icon: '📈' },
    { path: '/coverage-matrix', label: 'Coverage Matrix', icon: '📊' },
  ]

  // Combine navigation items based on user role
  const navItems = [
    ...baseNavItems,
    // Only show admin nav items to super_admin and tenant_admin
    ...(user?.role === 'super_admin' || user?.role === 'tenant_admin' ? adminNavItems : []),
  ]

  // Admin Panel is shown as a button in the header, not in the navigation bar

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b-2 shadow-sm relative" style={{ borderColor: '#76ab3f' }}>
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <img
                src="/navbar.png"
                alt="American Green Solutions"
                className="h-8 sm:h-10 md:h-12 w-auto"
              />
            </div>

            {/* Center Title - Flexbox alignment to prevent merging */}
            <div className="hidden md:flex flex-1 items-center justify-center px-4">
              <div className="text-center">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
                  {isSuperAdmin ? (selectedTenant?.name || 'Select Client') : (user?.tenantName || 'Standard Solar')}
                </h1>
                <p className="text-sm md:text-base lg:text-lg text-gray-700 font-semibold mt-0.5 tracking-tight whitespace-nowrap">Issue Tracker</p>
              </div>
            </div>

            {/* Mobile Title - Visible only on small screens */}
            <div className="md:hidden flex-1 text-center px-2">
              <h1 className="text-sm font-bold text-gray-900 truncate tracking-tight">
                {isSuperAdmin ? (selectedTenant?.name || 'Select Client') : (user?.tenantName || 'Standard Solar')}
              </h1>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
              {/* Client Selector - For Super Admin OR Multi-tenant Users */}
              {(isSuperAdmin || (availableTenants && availableTenants.length > 1)) && (
                <div className="hidden lg:flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Client:</label>
                  <select
                    value={isSuperAdmin ? (selectedTenantId || '') : (user?.tenantId || '')}
                    onChange={async (e) => {
                      const val = e.target.value
                      if (!val) return

                      if (isSuperAdmin) {
                        setSelectedTenantId(val)
                        // Wait for state to update, then invalidate queries
                        setTimeout(async () => {
                          await queryClient.resetQueries()
                          await queryClient.invalidateQueries()
                          toast.success('Client switched')
                        }, 100)
                      } else {
                        switchTenant(val)
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs sm:text-sm font-medium text-gray-900 min-w-[120px] sm:min-w-[180px]"
                    disabled={isSuperAdmin ? tenantsLoading : false}
                  >
                    {isSuperAdmin ? (
                      tenantsLoading ? (
                        <option>Loading...</option>
                      ) : tenants.length === 0 ? (
                        <option>No clients available</option>
                      ) : (
                        <>
                          <option value="">Select a client</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.tenant_id} value={tenant.tenant_id}>
                              {tenant.name}
                            </option>
                          ))}
                        </>
                      )
                    ) : (
                      <>
                        {availableTenants.map((tenant) => (
                          <option key={tenant.tenantId} value={tenant.tenantId}>
                            {tenant.tenantName}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* User Info - Simplified on mobile */}
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0" style={{ backgroundColor: '#f0f9f0', borderColor: '#76ab3f' }}>
                  <span className="font-bold text-xs sm:text-base" style={{ color: '#76ab3f' }}>
                    {(user?.fullName || user?.email || 'A')[0].toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight truncate">{user?.fullName || 'Admin'}</p>
                  <p className="text-xs text-gray-600 capitalize leading-tight">{user?.role?.replace('_', ' ') || 'administrator'}</p>
                </div>
              </div>

              {/* Admin Panel Button - Hidden on small screens */}
              {(user?.role === 'tenant_admin' || user?.role === 'super_admin') && (
                <Link
                  to="/admin"
                  className="hidden sm:block px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-white rounded-lg transition-colors font-medium shadow-sm hover:opacity-90 whitespace-nowrap text-xs sm:text-sm"
                  style={{ backgroundColor: '#76ab3f' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5f8a32'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#76ab3f'}
                >
                  <span className="hidden md:inline">Admin Panel</span>
                  <span className="md:hidden">Admin</span>
                </Link>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-sm whitespace-nowrap text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Out</span>
              </button>

              {/* Current Hour - Hidden on small screens */}
              <div className="hidden md:block px-2 sm:px-3 py-1.5 sm:py-2 text-white rounded-lg font-semibold whitespace-nowrap text-xs sm:text-sm" style={{ backgroundColor: '#76ab3f' }}>
                Hour {getCurrentHourEST()}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar - Desktop */}
        <nav className="hidden md:block px-6" style={{ backgroundColor: '#76ab3f' }}>
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/' && location.pathname === '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="px-4 lg:px-6 py-3 text-white font-medium transition-colors relative hover:opacity-80 whitespace-nowrap text-sm lg:text-base"
                  style={{
                    backgroundColor: isActive ? '#5f8a32' : 'transparent'
                  }}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden px-4 py-2" style={{ backgroundColor: '#76ab3f' }}>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path === '/' && location.pathname === '/')
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 text-white font-medium transition-colors rounded-lg"
                    style={{
                      backgroundColor: isActive ? '#5f8a32' : 'transparent'
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
              {/* Mobile Client Selector */}
              {(isSuperAdmin || (availableTenants && availableTenants.length > 1)) && (
                <div className="px-4 py-2.5">
                  <label className="block text-xs text-white mb-1">Client:</label>
                  <select
                    value={isSuperAdmin ? (selectedTenantId || '') : (user?.tenantId || '')}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!val) return

                      if (isSuperAdmin) {
                        setSelectedTenantId(val)
                        setTimeout(async () => {
                          await queryClient.resetQueries()
                          await queryClient.invalidateQueries()
                          toast.success('Client switched')
                        }, 100)
                      } else {
                        switchTenant(val)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium text-gray-900"
                    disabled={isSuperAdmin ? tenantsLoading : false}
                  >
                    {isSuperAdmin ? (
                      tenantsLoading ? (
                        <option>Loading...</option>
                      ) : tenants.length === 0 ? (
                        <option>No clients available</option>
                      ) : (
                        <>
                          <option value="">Select a client</option>
                          {tenants.map((tenant) => (
                            <option key={tenant.tenant_id} value={tenant.tenant_id}>
                              {tenant.name}
                            </option>
                          ))}
                        </>
                      )
                    ) : (
                      <>
                        {availableTenants.map((tenant) => (
                          <option key={tenant.tenantId} value={tenant.tenantId}>
                            {tenant.tenantName}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <Outlet />
      </main>
      <ScrollToTop />
    </div>
  )
}

export default MainLayout
