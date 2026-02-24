export interface Issue {
  id: string
  tenant_id: string
  portfolio_id: string
  portfolio?: {
    id: string
    name: string
    subtitle?: string
  }
  site_name: string
  issue_hour: number
  description: string
  issue_type?: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  monitored_by?: string[]
  missed_by?: string[]
  attachments?: any[]
  notes?: string
  resolved_at?: string
  resolved_by?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateIssueData {
  portfolio_id: string
  site_name: string
  issue_hour: number
  description: string
  issue_type?: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  monitored_by?: string[]
  missed_by?: string[]
  attachments?: any[]
  notes?: string
}

export interface UpdateIssueData {
  site_name?: string
  issue_hour?: number
  description?: string
  issue_type?: string
  severity?: 'Low' | 'Medium' | 'High' | 'Critical'
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  monitored_by?: string[]
  missed_by?: string[]
  attachments?: any[]
  notes?: string
}

