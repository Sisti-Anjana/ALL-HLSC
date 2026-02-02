import React, { useState, useEffect } from 'react'
import Card from '../common/Card'
import { Bar } from 'react-chartjs-2'
import Modal from '../common/Modal'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { analyticsService } from '../../services/analyticsService'
import { HourlyCoverage } from '../../types/analytics.types'
import toast from 'react-hot-toast'
import { getESTHour, getESTDateString } from '../../utils/timezone'
import { useTenant } from '../../context/TenantContext'
import { useTheme } from '../../context/ThemeContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const HourlyCoverageAnalysis: React.FC = () => {
  const { selectedTenantId } = useTenant()
  const { theme } = useTheme()
  const [startDate, setStartDate] = useState(getESTDateString())
  const [endDate, setEndDate] = useState(getESTDateString())
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'month'>('today')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedHourDetails, setSelectedHourDetails] = useState<{
    hour: number;
    portfolios: string[];
  } | null>(null)

  // Use React Query for data fetching
  const { data: coverageData = [], isLoading: loading, error } = useQuery<HourlyCoverage[]>({
    queryKey: ['hourly-coverage', startDate, endDate, selectedTenantId],
    queryFn: () => analyticsService.getHourlyCoverageWithDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 30000, // 30 seconds
    refetchInterval: 120000, // 2 minutes auto-refresh
  })

  // Show error toast if fetching fails
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch hourly coverage:', error)
      toast.error('Failed to load hourly coverage data')
    }
  }, [error])

  // AUTO-REFRESH ON HOUR CHANGE
  const queryClient = useQueryClient()
  const [lastCheckedHour, setLastCheckedHour] = useState(getESTHour())

  useEffect(() => {
    // Check every 30 seconds if the hour has changed
    const intervalId = setInterval(() => {
      const currentHour = getESTHour()
      if (currentHour !== lastCheckedHour) {
        console.log('⏰ HourlyCoverageAnalysis - Hour changed from', lastCheckedHour, 'to', currentHour, '- Refreshing data...')
        setLastCheckedHour(currentHour)
        // Force refetch
        queryClient.invalidateQueries({ queryKey: ['hourly-coverage'] })
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [lastCheckedHour, queryClient])

  // Get total portfolios from first data point (all should have same total)
  const totalPortfolios = coverageData.length > 0 ? coverageData[0].totalPortfolios : 26

  // Color coding function based on coverage percentage
  const getBarColor = (coverage: number) => {
    if (coverage === 0) return '#ef4444' // Red
    if (coverage < 50) return '#f59e0b' // Orange
    return '#76AB3F' // Green
  }

  // Ensure we have data for all 24 hours, filling missing hours with 0
  const currentESTHour = getESTHour()
  const isViewingToday = startDate === getESTDateString() && endDate === getESTDateString()

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const existingData = coverageData.find(item => item.hour === hour)

    // IF viewing Today, mask future hours to 0 to avoid "random" data from different timezones
    if (isViewingToday && hour > currentESTHour) {
      return {
        hour,
        coverage: 0,
        portfoliosChecked: 0,
        totalPortfolios: totalPortfolios,
        totalIssues: 0,
        checkedPortfolioNames: [],
        isFuture: true
      }
    }

    return existingData || {
      hour,
      coverage: 0,
      portfoliosChecked: 0,
      totalPortfolios: totalPortfolios,
      totalIssues: 0,
      checkedPortfolioNames: []
    }
  })

  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Coverage %',
        data: hourlyData.map(item => item.coverage),
        backgroundColor: hourlyData.map(item => getBarColor(item.coverage)),
        borderColor: hourlyData.map(item => getBarColor(item.coverage)),
        borderWidth: 1,
      },
    ],
  }

  const isDarkMode = theme === 'dark'

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index
        const data = hourlyData[dataIndex]

        if (data && data.portfoliosChecked > 0) {
          setSelectedHourDetails({
            hour: data.hour,
            portfolios: data.checkedPortfolioNames || []
          })
          setIsModalOpen(true)
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.98)',
        titleColor: isDarkMode ? '#f8fafc' : '#000',
        bodyColor: isDarkMode ? '#cbd5e1' : '#000',
        borderColor: '#76ab3f',
        borderWidth: 2,
        padding: 14,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        boxPadding: 8,
        cornerRadius: 8,
        callbacks: {
          afterBody: (context: any) => {
            return '\nClick to see portfolios'
          },
          label: (context: any) => {
            const dataIndex = context.dataIndex
            const data = hourlyData[dataIndex]
            if (!data) return ''
            return [
              `Coverage: ${data.coverage}%`,
              `Portfolios: ${data.portfoliosChecked}/${data.totalPortfolios}`,
              `Total Count: ${data.totalIssues}`,
            ]
          },
          title: (context: any) => {
            return context[0].label
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 60,
        ticks: {
          stepSize: 15,
          color: isDarkMode ? '#94a3b8' : '#64748b',
          callback: function (value: any) {
            return value
          },
        },
        grid: {
          color: isDarkMode ? '#334155' : '#e2e8f0',
        },
        border: {
          display: false,
        },
        title: {
          display: true,
          text: 'Coverage %',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        border: {
          display: false,
        },
      },
    },
  }

  const handleRangeClick = (range: 'today' | 'week' | 'month') => {
    setSelectedRange(range)
    const today = new Date()
    if (range === 'today') {
      const todayStr = getESTDateString()
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (range === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      const todayStr = getESTDateString()
      setStartDate(weekAgoStr)
      setEndDate(todayStr)
    } else if (range === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      const monthAgoStr = monthAgo.toISOString().split('T')[0]
      const todayStr = getESTDateString()
      setStartDate(monthAgoStr)
      setEndDate(todayStr)
    }
  }

  return (
    <Card className="mb-6 transition-colors duration-300">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">Hourly Coverage Analysis</h2>
        <p className="text-secondary text-xs sm:text-sm">
          Portfolio risk distribution analysis based on temporal coverage theory.
        </p>
      </div>

      {/* Date Controls - Unified Single Line */}
      <div className="mb-4 sm:mb-8 bg-main/50 p-4 rounded-xl border border-subtle">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary whitespace-nowrap">From:</span>
            <div className="relative w-40">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 bg-main text-primary shadow-sm transition-all"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary whitespace-nowrap">To:</span>
            <div className="relative w-40">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green/50 bg-main text-primary shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-subtle hidden sm:block"></div>

          {/* Quick Range */}
          <div className="flex items-center gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => handleRangeClick(range.id as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${selectedRange === range.id
                  ? 'text-white shadow-md'
                  : 'bg-card text-secondary hover:bg-subtle border border-subtle shadow-sm'
                  }`}
                style={selectedRange === range.id ? { backgroundColor: '#76ab3f' } : {}}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-secondary">
        Showing data for: <span className="font-semibold text-primary">{startDate || new Date().toISOString().split('T')[0]}</span>
      </p>

      {/* Chart Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-primary mb-2">
          Portfolio Risk Distribution by Hour
        </h3>
        <p className="text-sm text-secondary mb-4">
          Visual representation of systemic risk concentration across the 24-hour cycle. Coverage percentage shows unique portfolios checked per hour.
        </p>
        {/* Color Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="font-medium text-secondary">Legend:</span>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <div className="w-4 h-4 rounded bg-[#ef4444] dark:opacity-80"></div>
            <span>0% coverage</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <div className="w-4 h-4 rounded bg-[#f59e0b] dark:opacity-80"></div>
            <span>&lt; 50% coverage</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <div className="w-4 h-4 rounded bg-[#76AB3F] dark:opacity-80"></div>
            <span>≥ 50% coverage</span>
          </div>
        </div>
        <div className="bg-main border border-subtle rounded-lg p-3 sm:p-4 h-[200px] sm:h-[250px] md:h-[300px] min-h-[200px] sm:min-h-[250px] md:min-h-[300px] transition-colors" style={{ position: 'relative' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-accent-green"></div>
                <p className="mt-3 text-secondary font-medium">Loading chart data...</p>
              </div>
            </div>
          ) : (
            <Bar
              data={chartData}
              options={chartOptions}
            />
          )}
        </div>
      </div>

      {/* Portfolio Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedHourDetails ? `Portfolios Checked at ${selectedHourDetails.hour}:00` : 'Portfolios Checked'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            The following portfolios were marked as checked during this hour.
          </p>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {selectedHourDetails && selectedHourDetails.portfolios.length > 0 ? (
              <ul className="divide-y divide-subtle border border-subtle rounded-lg overflow-hidden">
                {selectedHourDetails.portfolios.map((name, index) => (
                  <li key={index} className="px-4 py-3 bg-card hover:bg-main flex items-center gap-3 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-[#76ab3f]"></div>
                    <span className="text-sm font-medium text-primary">{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 bg-main rounded-lg border border-dashed border-subtle text-secondary text-sm">
                No portfolios recorded for this hour.
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-subtle">
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-subtle text-primary rounded-lg font-semibold hover:opacity-80 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

export default HourlyCoverageAnalysis
