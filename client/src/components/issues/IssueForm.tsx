import React, { useEffect, useState } from 'react'
import { CreateIssueData } from '../../types/issue.types'
import { Portfolio } from '../../types/portfolio.types'
import { User } from '../../types/user.types'
import { useQuery } from '@tanstack/react-query'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../context/AuthContext'
import Input from '../common/Input'
import Button from '../common/Button'
import Modal from '../common/Modal'

interface IssueFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateIssueData) => void
  portfolios: Portfolio[]
  isLoading?: boolean
  defaultPortfolioId?: string
}

const IssueForm: React.FC<IssueFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  portfolios, 
  isLoading,
  defaultPortfolioId 
}) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<CreateIssueData>({
    portfolio_id: defaultPortfolioId || '',
    site_name: '',
    issue_hour: new Date().getHours(),
    description: '',
    severity: 'Medium',
    status: 'open',
    monitored_by: [],
    missed_by: [],
  })

  // Fetch users for dropdowns (instead of personnel)
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
    enabled: isOpen,
  })

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        portfolio_id: defaultPortfolioId || '',
        site_name: '',
        issue_hour: new Date().getHours(),
        description: '',
        severity: 'Medium',
        status: 'open',
        monitored_by: [],
        missed_by: [],
      })
    } else if (defaultPortfolioId) {
      setFormData(prev => ({ ...prev, portfolio_id: defaultPortfolioId }))
    }
  }, [isOpen, defaultPortfolioId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isOpen) {
        handleSubmit(e as any)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, formData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.portfolio_id || !formData.site_name || !formData.description) return
    onSubmit(formData)
  }

  const toggleUser = (email: string, field: 'monitored_by' | 'missed_by') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(email)
        ? prev[field]?.filter(e => e !== email) || []
        : [...(prev[field] || []), email]
    }))
  }

  const descriptionLength = formData.description.length
  const maxDescriptionLength = 500

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log New Issue" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Portfolio */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Portfolio * <span className="text-blue-500 text-xs">ℹ️ Select the portfolio you're working on</span>
          </label>
          <select
            value={formData.portfolio_id}
            onChange={(e) => setFormData({ ...formData, portfolio_id: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            required
          >
            <option value="">Select Portfolio</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                🏢 {p.name} - {p.subtitle || 'N/A'} {p.site_range ? `(${p.site_range})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Site Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Site *</label>
          <input
            type="text"
            value={formData.site_name}
            onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            placeholder="🌐 Site 15"
            required
          />
          <p className="text-xs text-gray-500 mt-1">💡 Tip: You can also type the site number</p>
        </div>

        {/* Issue Hour and Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Hour *</label>
            <div className="relative">
              <select
                value={formData.issue_hour}
                onChange={(e) => setFormData({ ...formData, issue_hour: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base appearance-none bg-white"
                required
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    🕐 {i} {i === new Date().getHours() ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Severity *</label>
            <div className="space-y-2">
              {(['Low', 'Medium', 'High', 'Critical'] as const).map((severity) => (
                <label key={severity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="severity"
                    value={severity}
                    checked={formData.severity === severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">
                    {severity === 'Low' && '🟢'}
                    {severity === 'Medium' && '🟡'}
                    {severity === 'High' && '🟠'}
                    {severity === 'Critical' && '🔴'} {severity}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            maxLength={maxDescriptionLength}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
              descriptionLength > maxDescriptionLength * 0.9
                ? 'border-red-300'
                : 'border-gray-300'
            }`}
            placeholder="Describe the issue..."
            required
          />
          <p className={`text-xs mt-1 ${
            descriptionLength > maxDescriptionLength * 0.9 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {descriptionLength} / {maxDescriptionLength} characters
          </p>
        </div>

        {/* Monitored By */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Monitored By (Who found this issue?) *
          </label>
          <select
            value={formData.monitored_by?.[0] || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              monitored_by: e.target.value ? [e.target.value] : [] 
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            required
          >
            <option value="">Select User</option>
            {user?.email && (
              <option value={user.email}>
                👤 {user.fullName || user.email} (You)
              </option>
            )}
            {users
              .filter(u => u.is_active && u.email !== user?.email)
              .map((u) => (
                <option key={u.id} value={u.email || ''}>
                  👤 {u.full_name || u.email}
                </option>
              ))}
          </select>
        </div>

        {/* Issues Missed By */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Issues Missed By (Optional - Who should have caught this?)
          </label>
          <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
            {users
              .filter(u => u.is_active)
              .map((u) => (
                <label key={u.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.missed_by?.includes(u.email || '') || false}
                    onChange={() => toggleUser(u.email || '', 'missed_by')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">
                    👤 {u.full_name || u.email}
                    {u.email === user?.email && ' (You)'}
                  </span>
                </label>
              ))}
          </div>
          {formData.missed_by && formData.missed_by.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{formData.missed_by.length} selected</p>
          )}
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📎 Attachments (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <p className="text-gray-600 mb-2">[+] Drop files here or click to upload</p>
            <p className="text-xs text-gray-500">Supported: JPG, PNG, PDF (Max 10MB each)</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Note: Portfolio will be locked for 30 minutes
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="flex-1"
            disabled={!formData.portfolio_id || !formData.site_name || !formData.description}
          >
            ✅ Submit Issue (Ctrl+Enter)
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default IssueForm
