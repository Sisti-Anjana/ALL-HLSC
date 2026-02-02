import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import toast from 'react-hot-toast'
import ScrollToTop from '../common/ScrollToTop'
import { getESTHour } from '../../utils/timezone'

import Sidebar from './Sidebar'
import UserProfileDrawer from './UserProfileDrawer'

const MainLayout: React.FC = () => {
  const queryClient = useQueryClient()
  // const [currentHour, setCurrentHour] = useState(getESTHour()) - Removed as moved to Dashboard
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  // useEffect(() => { ... }) - Removed hour interval

  const { user, logout } = useAuth() // availableTenants, switchTenant removed from here
  const { selectedTenant } = useTenant() // Only need selectedTenant for Title
  const navigate = useNavigate()
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* User Profile Drawer Component */}
      <UserProfileDrawer
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Info Modal */}
      {infoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setInfoOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#87bb44] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">About HLSC</h3>
              <button
                onClick={() => setInfoOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 leading-relaxed text-sm">
                The <span className="font-semibold text-gray-900">High Level System Check (HLSC)</span> application is designed for comprehensive portfolio monitoring and performance analytics.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-gray-600">Monitor system performance across multiple portfolios and clients.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-gray-600">Track and log issues with detailed hourly breakdowns.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-gray-600">Analyze user coverage and operational efficiency.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setInfoOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Green Background */}
        <header className="shadow-sm relative z-10 flex-shrink-0" style={{ backgroundColor: '#87bb44' }}>
          <div className="px-4 py-2 flex items-center justify-between">
            {/* Left Side: Mobile Toggle (Visible only on mobile) */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Left spacer for desktop centering balance */}
              <div className="hidden md:block w-10"></div>
            </div>

            {/* Center Title */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight whitespace-nowrap drop-shadow-sm">
                {isSuperAdmin ? (selectedTenant?.name || 'Select Client') : (user?.tenantName || 'Standard Solar')} - HLSC
              </h1>
              <p className="text-xs md:text-sm text-white/90 font-medium mt-0.5 tracking-tight whitespace-nowrap">
                (High Level System Check)
              </p>
            </div>

            {/* Right Side: Icons & Logo */}
            <div className="flex items-center justify-end gap-2">
              {/* Info Icon */}
              <button
                onClick={() => setInfoOpen(true)}
                className="p-1 md:p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors mr-2"
                title="About Application"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Company Logo Trigger */}
              <button
                onClick={() => setProfileOpen(true)}
                className="focus:outline-none transition-transform active:scale-95"
              >
                <img
                  src="/navbar.png"
                  alt="Profile"
                  className="h-12 md:h-16 w-auto object-contain rounded transition-colors"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ScrollToTop />
    </div>
  )
}

export default MainLayout

