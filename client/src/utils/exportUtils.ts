import { Issue } from '../types/issue.types'

export const exportToCSV = (issues: Issue[], filename: string = 'issues.csv'): void => {
  const headers = ['Portfolio', 'Site', 'Hour', 'Description', 'Severity', 'Status', 'Created At']
  const rows = issues.map((issue) => [
    issue.portfolio?.name || 'N/A',
    issue.site_name,
    issue.issue_hour.toString(),
    issue.description,
    issue.severity,
    issue.status,
    new Date(issue.created_at).toLocaleString(),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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
}

export const exportToExcel = async (issues: Issue[], filename: string = 'issues.xlsx'): Promise<void> => {
  // For now, export as CSV. Can be enhanced with xlsx library later
  exportToCSV(issues, filename.replace('.xlsx', '.csv'))
}

