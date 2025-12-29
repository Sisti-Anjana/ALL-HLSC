export interface Portfolio {
  id: string
  tenant_id: string
  name: string
  subtitle?: string
  site_range?: string
  all_sites_checked?: 'Yes' | 'No' | 'Pending'
  all_sites_checked_hour?: number
  all_sites_checked_date?: string
  all_sites_checked_by?: string
  sites_checked_details?: string
  is_locked?: boolean
  locked_by?: string
  locked_at?: string
  created_at: string
  updated_at: string
}

export interface CreatePortfolioData {
  name: string
  subtitle?: string
  site_range?: string
}

export interface UpdatePortfolioData {
  name?: string
  subtitle?: string
  site_range?: string
  all_sites_checked?: 'Yes' | 'No' | 'Pending'
  all_sites_checked_hour?: number
  all_sites_checked_date?: string
  all_sites_checked_by?: string
  sites_checked_details?: string
}

