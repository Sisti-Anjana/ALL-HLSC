import React, { useState } from 'react'
import QuickPortfolioReference from './QuickPortfolioReference'
import HourlyCoverageAnalysis from './HourlyCoverageAnalysis'
import IssueDetailsTable from './IssueDetailsTable'
import IssueLoggingSidebar from './IssueLoggingSidebar'

const Dashboard: React.FC = () => {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours())
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
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Monitoring</h1>
        </div>

        <QuickPortfolioReference
          onPortfolioSelected={handlePortfolioSelected}
          selectedHour={selectedHour}
        />
        <HourlyCoverageAnalysis />
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
