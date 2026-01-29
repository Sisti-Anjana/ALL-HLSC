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
import { useQuery, useQueryClient } from '@tanstack/react-query'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const HourlyCoverageAnalysis: React.FC = () => {
  const { selectedTenantId } = useTenant()
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

  // Debug: Log first few hours to verify data
  console.log('Chart data sample (hours 0-6):', hourlyData.slice(0, 7).map(d => ({ hour: d.hour, coverage: d.coverage })))

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any) => {
      // Logic for double-click is slightly different but we can use simple click + check if element exists
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
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: '#76ab3f',
        borderWidth: 2,
        padding: 14,
        displayColors: false, // Hide the color box in tooltip
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        boxPadding: 8,
        cornerRadius: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowBlur: 12,
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        callbacks: {
          afterBody: (context: any) => {
            return '\nDouble-click to see portfolios'
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
            return context[0].label // Just show the hour like "5:00" or "11:00"
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 60, // Match screenshot - max is 60%
        ticks: {
          stepSize: 15, // Show ticks at 0, 15, 30, 45, 60
          callback: function (value: any) {
            return value
          },
        },
        grid: {
          color: '#e5e7eb', // Light gray grid lines
        },
        title: {
          display: true,
          text: 'Coverage %',
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          display: false, // No vertical grid lines
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
        },
        title: {
          display: false, // Hide x-axis title to match screenshot
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
    <Card className="mb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Hourly Coverage Analysis</h2>
        <p className="text-gray-600 text-xs sm:text-sm">
          Portfolio risk distribution analysis based on temporal coverage theory.
        </p>
      </div>

      {/* Date Controls - Unified Single Line */}
      <div className="mb-4 sm:mb-8 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">From:</span>
            <div className="relative w-40">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">To:</span>
            <div className="relative w-40">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

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
                  : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300 shadow-sm'
                  }`}
                style={selectedRange === range.id ? { backgroundColor: '#76ab3f' } : {}}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Showing data for: <span className="font-semibold text-gray-700">{startDate || new Date().toISOString().split('T')[0]}</span>
      </p>

      {/* Chart Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Portfolio Risk Distribution by Hour
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Visual representation of systemic risk concentration across the 24-hour cycle. Coverage percentage shows unique portfolios checked per hour.
        </p>
        {/* Color Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
            <span className="text-gray-600">0% coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
            <span className="text-gray-600">&lt; 50% coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#76AB3F]"></div>
            <span className="text-gray-600">≥ 50% coverage</span>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 h-[200px] sm:h-[250px] md:h-[300px] min-h-[200px] sm:min-h-[250px] md:min-h-[300px]" style={{ backgroundColor: '#f9fafb', position: 'relative' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="mt-3 text-gray-600 font-medium">Loading chart data...</p>
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
          <p className="text-sm text-gray-600">
            The following portfolios were marked as checked during this hour.
          </p>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {selectedHourDetails && selectedHourDetails.portfolios.length > 0 ? (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {selectedHourDetails.portfolios.map((name, index) => (
                  <li key={index} className="px-4 py-3 bg-white hover:bg-gray-50 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#76ab3f]"></div>
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500 text-sm">
                No portfolios recorded for this hour.
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </Card >
  )
}

export default HourlyCoverageAnalysis

