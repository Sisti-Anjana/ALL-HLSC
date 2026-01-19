export interface DashboardStats {
  totalIssues: number
  openIssues: number
  resolvedIssues: number
  inProgressIssues: number
  portfoliosWithIssues: number
  sitesWithIssues: number
  totalPortfolios: number
  averageIssueHour: number
}

export interface HourlyCoverage {
  hour: number
  coverage: number // Coverage percentage (0-100)
  portfoliosChecked: number // Number of unique portfolios checked
  totalIssues: number // Total issues logged in this hour
  totalPortfolios: number // Total portfolios available
}

export interface IssuesOverTime {
  date: string
  total: number
  open: number
  resolved: number
}

export interface PortfolioHeatmap {
  portfolioId: string
  portfolioName: string
  totalIssues: number
  openIssues: number
  status: 'none' | 'resolved' | 'has_issues'
}

export interface CoverageMatrix {
  portfolios: Array<{ id: string; name: string }>
  matrix: { [portfolioId: string]: { [hour: number]: number } }
}

export interface PortfolioActivity {
  id: string
  name: string
  subtitle: string
  siteRange: string
  yValue: string // Format: "Y0", "Y1", "H0", "H1", etc.
  yValueNumber?: number // Numeric value for sorting
  status: 'no-activity' | '3h' | '2h' | '1h' | 'updated'
  lastUpdated: Date | null
  hoursSinceLastActivity: number | null
  allSitesChecked?: 'Yes' | 'No' | 'Pending'
  // Raw data from server for timezone-aware client-side calculation
  allSitesCheckedDate?: string | null // Format: "YYYY-MM-DD"
  allSitesCheckedHour?: number | null // Hour (0-23)
}

