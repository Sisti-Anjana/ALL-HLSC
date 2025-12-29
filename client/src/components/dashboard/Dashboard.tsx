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
    <div className="space-y-6 w-full">
      <QuickPortfolioReference 
        onPortfolioSelected={handlePortfolioSelected}
      />
      <HourlyCoverageAnalysis />
      <IssueDetailsTable />
      
      {/* Issue Logging Sidebar */}
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
  )
}

export default Dashboard
