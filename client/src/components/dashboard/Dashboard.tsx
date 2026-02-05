import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import toast from 'react-hot-toast'
import QuickPortfolioReference from './QuickPortfolioReference'
import HourlyCoverageAnalysis from './HourlyCoverageAnalysis'
import IssueDetailsTable from './IssueDetailsTable'
import IssueLoggingSidebar from './IssueLoggingSidebar'

import { getESTHour } from '../../utils/timezone'

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const { user, availableTenants, switchTenant } = useAuth()
  const { selectedTenantId, setSelectedTenantId, tenants, isLoading: tenantsLoading } = useTenant()
  const isSuperAdmin = user?.role === 'super_admin'

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number>(getESTHour())

  useEffect(() => {
    const timer = setInterval(() => {
      const freshHour = getESTHour()
      if (freshHour !== selectedHour) {
        setSelectedHour(freshHour)
      }
    }, 1000) // Update every 1 second
    return () => clearInterval(timer)
  }, [selectedHour])

  const [sidebarOpen, setSidebarOpen] = useState(false)


  const handlePortfolioSelected = (portfolioId: string, hour: number) => {
    console.log('Dashboard: Portfolio selected:', { portfolioId, hour })
    setSelectedPortfolioId(portfolioId)
    setSelectedHour(hour)
    // Use setTimeout to ensure state is updated before opening sidebar
    setTimeout(() => {
      setSidebarOpen(true)
    }, 0)
  }

  return (
    <div className="flex w-full relative transition-all duration-300 gap-4">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-primary">Portfolio Monitoring</h1>

          <div className="flex items-center gap-3">
            {/* Hour Indicator */}
            <div className="px-3 py-1.5 text-white rounded-lg font-semibold text-sm" style={{ backgroundColor: '#76ab3f' }}>
              Hour {selectedHour}
            </div>

            {/* Client Selector */}
            {(isSuperAdmin || (availableTenants && availableTenants.length > 1)) && (
              <div className="flex items-center gap-2">
                <select
                  value={isSuperAdmin ? (selectedTenantId || '') : (user?.tenantId || '')}
                  onChange={async (e) => {
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
                  className="px-2 py-1.5 border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm font-medium text-primary transition-colors"
                  disabled={isSuperAdmin ? tenantsLoading : false}
                >
                  {isSuperAdmin ? (
                    tenantsLoading ? <option>Loading...</option> : tenants.length === 0 ? <option>No clients</option> : (
                      <>
                        <option value="">Select Client</option>
                        {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name}</option>)}
                      </>
                    )
                  ) : (
                    availableTenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.tenantName}</option>)
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        <div id="quick-portfolio" className="scroll-mt-24">
          <QuickPortfolioReference
            onPortfolioSelected={handlePortfolioSelected}
            selectedHour={selectedHour}
          />
        </div>
        <div id="hourly-analysis" className="scroll-mt-24">
          <HourlyCoverageAnalysis />
        </div>
        <IssueDetailsTable />
      </div>

      {/* Issue Logging Sidebar */}
      {sidebarOpen && (
        <div className="w-96 flex-shrink-0 transition-all duration-300">
          <IssueLoggingSidebar
            isOpen={sidebarOpen}
            onClose={() => {
              setSidebarOpen(false)
              setSelectedPortfolioId(null)
            }}
            portfolioId={selectedPortfolioId}
            hour={selectedHour}
          />
        </div>
      )}
    </div>
  )
}

export default Dashboard
