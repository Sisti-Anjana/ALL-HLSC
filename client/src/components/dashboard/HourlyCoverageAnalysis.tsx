import React, { useState, useEffect } from 'react'
import Card from '../common/Card'
import { Bar } from 'react-chartjs-2'
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const HourlyCoverageAnalysis: React.FC = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'month'>('today')
  const [coverageData, setCoverageData] = useState<HourlyCoverage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHourlyCoverage = async (start?: string, end?: string) => {
    try {
      setLoading(true)
      const data = await analyticsService.getHourlyCoverageWithDateRange(start, end)
      console.log('Hourly coverage data received:', data)
      console.log('Hour 5 data:', data.find(item => item.hour === 5))
      setCoverageData(data)
    } catch (error: any) {
      console.error('Failed to fetch hourly coverage:', error)
      toast.error('Failed to load hourly coverage data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initialize with today's date
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
    fetchHourlyCoverage(today, today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (startDate && endDate && !loading) {
      fetchHourlyCoverage(startDate, endDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  // Get total portfolios from first data point (all should have same total)
  const totalPortfolios = coverageData.length > 0 ? coverageData[0].totalPortfolios : 26

  // Color coding function based on coverage percentage
  const getBarColor = (coverage: number) => {
    if (coverage === 0) return '#ef4444' // Red
    if (coverage < 50) return '#f59e0b' // Orange
    return '#76AB3F' // Green
  }

  // Ensure we have data for all 24 hours, filling missing hours with 0
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const existingData = coverageData.find(item => item.hour === hour)
    const result = existingData || {
      hour,
      coverage: 0,
      portfoliosChecked: 0,
      totalPortfolios: totalPortfolios,
      totalIssues: 0,
    }
    // Debug hour 5
    if (hour === 5) {
      console.log('Hour 5 chart data:', result, 'from coverageData:', existingData)
    }
    return result
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
          callback: function(value: any) {
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
      const todayStr = today.toISOString().split('T')[0]
      setStartDate(todayStr)
      setEndDate(todayStr)
      fetchHourlyCoverage(todayStr, todayStr)
    } else if (range === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]
      setStartDate(weekAgoStr)
      setEndDate(todayStr)
      fetchHourlyCoverage(weekAgoStr, todayStr)
    } else if (range === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      const monthAgoStr = monthAgo.toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]
      setStartDate(monthAgoStr)
      setEndDate(todayStr)
      fetchHourlyCoverage(monthAgoStr, todayStr)
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

      {/* Date Controls */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRangeClick('today')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                selectedRange === 'today'
                  ? 'text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md hover:scale-105'
              }`}
              style={selectedRange === 'today' ? { backgroundColor: '#76ab3f' } : {}}
            >
              Today
            </button>
            <button
              onClick={() => handleRangeClick('week')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                selectedRange === 'week'
                  ? 'text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md hover:scale-105'
              }`}
              style={selectedRange === 'week' ? { backgroundColor: '#76ab3f' } : {}}
            >
              Week
            </button>
            <button
              onClick={() => handleRangeClick('month')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                selectedRange === 'month'
                  ? 'text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md hover:scale-105'
              }`}
              style={selectedRange === 'month' ? { backgroundColor: '#76ab3f' } : {}}
            >
              Month
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Showing data for: {startDate || new Date().toISOString().split('T')[0]}
        </p>
      </div>

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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 h-[250px] sm:h-[350px] md:h-[450px] min-h-[250px] sm:min-h-[350px] md:min-h-[450px]" style={{ backgroundColor: '#f9fafb', position: 'relative' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="mt-3 text-gray-600 font-medium">Loading chart data...</p>
              </div>
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </Card>
  )
}

export default HourlyCoverageAnalysis

