import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'
import ScrollToTop from '../common/ScrollToTop'
import { getESTHour } from '../../utils/timezone'
/* ... rest of imports ... */

import Sidebar from './Sidebar'
import UserProfileDrawer from './UserProfileDrawer'
import HashScroller from '../common/HashScroller'

const MainLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  /* ... state ... */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  /* ... hooks ... */
  const { user, logout } = useAuth()
  const { selectedTenant } = useTenant()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'super_admin'

  /* ... handlers ... */
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
    <div className="flex h-screen bg-main overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* User Profile Drawer Component */}
      <UserProfileDrawer
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Info Modal */}
      {infoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setInfoOpen(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
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
              <p className="text-secondary leading-relaxed text-sm">
                The <span className="font-semibold text-primary">High Level System Check (HLSC)</span> application is designed for comprehensive portfolio monitoring and performance analytics.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-secondary">Monitor system performance across multiple portfolios and clients.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-secondary">Track and log issues with detailed hourly breakdowns.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 min-w-[4px] h-4 rounded-full bg-[#87bb44]"></div>
                  <p className="text-sm text-secondary">Analyze user coverage and operational efficiency.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setInfoOpen(false)}
                  className="px-4 py-2 bg-main text-secondary font-medium rounded-lg hover:bg-subtle transition-colors text-sm"
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
        <header className="shadow-sm relative z-10 flex-shrink-0" style={{ backgroundColor: 'var(--header-bg)' }}>
          <div className="relative flex items-center justify-center px-4 py-2 min-h-[64px]">
            {/* Left Side: Mobile Toggle (Absolute) */}
            <div className="absolute left-4 flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Center Title (Main flex item) */}
            <div
              className="flex flex-col items-center justify-center text-center max-w-[50%] md:max-w-[55%] transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(${window.innerWidth >= 768 ? (isCollapsed ? '-44px' : '-128px') : '0px'})`
              }}
            >
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight whitespace-nowrap drop-shadow-sm truncate">
                HLSC
              </h1>
              <p className="text-xs md:text-sm text-white/90 font-medium mt-0.5 tracking-tight whitespace-nowrap truncate">
                High Level System Check
              </p>
            </div>

            {/* Right Side: Icons & Logo (Absolute) */}
            <div className="absolute right-4 flex items-center gap-2">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-1 md:p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all duration-300"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {/* Info Icon */}
              <button
                onClick={() => setInfoOpen(true)}
                className="p-1 md:p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="About Application"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Company Logo Trigger */}
              <button
                onClick={() => setProfileOpen(true)}
                className="focus:outline-none transition-transform active:scale-95 ml-1"
              >
                <img
                  src="/navbar.png"
                  alt="Profile"
                  className="h-10 md:h-12 w-auto object-contain rounded transition-colors"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-main px-4 py-6 sm:px-6 lg:px-8 transition-colors duration-300">
          <Outlet />
        </main>
      </div>

      <ScrollToTop />
      <HashScroller />
    </div>
  )
}

export default MainLayout

