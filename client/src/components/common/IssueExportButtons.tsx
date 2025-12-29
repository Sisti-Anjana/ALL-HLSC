import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { issueService, IssueFilters } from '../../services/issueService'
import { Issue } from '../../types/issue.types'
import Button from './Button'
import toast from 'react-hot-toast'

interface IssueExportButtonsProps {
  filters?: IssueFilters
  className?: string
  startDate?: string
  endDate?: string
}

const IssueExportButtons: React.FC<IssueExportButtonsProps> = ({ filters = {}, className = '', startDate: propStartDate, endDate: propEndDate }) => {
  const [isExporting, setIsExporting] = useState(false)

  // Use provided dates or default to today
  const getDateRange = () => {
    if (propStartDate && propEndDate) {
      return { startDate: propStartDate, endDate: propEndDate }
    }
    // Default to today if no dates provided
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    return { startDate: todayStr, endDate: todayStr }
  }

  const exportToCSV = (issues: Issue[], filename: string) => {
    const headers = [
      'Date',
      'Portfolio',
      'Hour',
      'Issue',
      'Details',
      'Monitored By',
      'Missed By',
      'Notes'
    ]

    const rows = issues.map((issue) => [
      new Date(issue.created_at).toLocaleString(),
      issue.portfolio?.name || 'N/A',
      issue.issue_hour.toString(),
      issue.description || 'No issue',
      issue.description || '-',
      issue.monitored_by?.join(', ') || '-',
      issue.missed_by?.join(', ') || '-',
      issue.notes || '-',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async (type: 'active' | 'all') => {
    setIsExporting(true)
    try {
      const dateRangeResult = getDateRange()
      if (!dateRangeResult) {
        setIsExporting(false)
        return
      }

      const { startDate, endDate } = dateRangeResult

      // Build filters
      const exportFilters: IssueFilters = {
        ...filters,
      }

      // Fetch issues with date range
      const allIssues = await issueService.getAll(exportFilters)
      
      // Filter by date range
      let filteredIssues = allIssues.filter((issue) => {
        const issueDate = new Date(issue.created_at).toISOString().split('T')[0]
        return issueDate >= startDate && issueDate <= endDate
      })

      // Filter by active/all
      if (type === 'active') {
        filteredIssues = filteredIssues.filter(
          (issue) => issue.description && issue.description.toLowerCase() !== 'no issue'
        )
      }

      if (filteredIssues.length === 0) {
        toast.error('No issues found for the selected date range')
        setIsExporting(false)
        return
      }

      // Generate filename
      const dateStr = startDate === endDate ? startDate : `${startDate}_to_${endDate}`
      const typeStr = type === 'active' ? 'active_issues' : 'all_issues'
      const filename = `${typeStr}_${dateStr}_${new Date().toISOString().split('T')[0]}.csv`

      exportToCSV(filteredIssues, filename)
      toast.success(`Exported ${filteredIssues.length} ${type === 'active' ? 'active' : ''} issues successfully`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export issues')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Export Buttons - Simplified, no separate date range */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Export:</span>
        <Button
          onClick={() => handleExport('active')}
          disabled={isExporting}
          variant="primary"
          size="sm"
          className="shadow-sm"
        >
          {isExporting ? 'Exporting...' : 'Export All Active Issues'}
        </Button>
        <Button
          onClick={() => handleExport('all')}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="shadow-sm"
        >
          {isExporting ? 'Exporting...' : 'Export All Issues'}
        </Button>
      </div>
    </div>
  )
}

export default IssueExportButtons

