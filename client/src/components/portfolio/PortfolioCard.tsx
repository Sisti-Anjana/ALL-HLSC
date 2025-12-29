import React from 'react'
import { Portfolio } from '../../types/portfolio.types'
import Badge from '../common/Badge'
import { Link, useNavigate } from 'react-router-dom'
import { formatTime } from '../../utils/dateUtils'

interface PortfolioCardProps {
  portfolio: Portfolio
  onDelete?: (id: string) => void
  onEdit?: (portfolio: Portfolio) => void
  onLogIssue?: (portfolioId: string) => void
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ portfolio, onDelete, onEdit, onLogIssue }) => {
  const navigate = useNavigate()
  
  const getStatusBadge = () => {
    if (portfolio.is_locked) {
      return (
        <Badge variant="warning" className="animate-pulse">
          🔒 Locked
        </Badge>
      )
    }
    if (portfolio.all_sites_checked === 'Yes') {
      return <Badge variant="success">🟢 All Sites ✓</Badge>
    }
    if (portfolio.all_sites_checked === 'No') {
      return <Badge variant="danger">🔴 Issues Found</Badge>
    }
    return <Badge variant="info">⚪ Not Checked</Badge>
  }

  const getBorderColor = () => {
    if (portfolio.is_locked) return 'border-yellow-400'
    if (portfolio.all_sites_checked === 'Yes') return 'border-green-400'
    if (portfolio.all_sites_checked === 'No') return 'border-red-400'
    return 'border-gray-300'
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 border-2 ${getBorderColor()} hover:shadow-xl transition-all duration-200 hover:scale-105 h-full flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{portfolio.name}</h3>
          {portfolio.subtitle && (
            <p className="text-gray-600 text-sm flex items-center gap-1">
              🏷️ {portfolio.subtitle}
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Site Range */}
      {portfolio.site_range && (
        <p className="text-gray-700 text-sm mb-4 flex items-center gap-1">
          <span className="font-semibold">📍</span> {portfolio.site_range}
        </p>
      )}

      {/* Status Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        {portfolio.is_locked ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">🔒 Locked by {portfolio.locked_by || 'User'}</p>
            {portfolio.locked_at && (
              <p className="text-xs text-gray-500">
                ⏱️ {Math.floor((Date.now() - new Date(portfolio.locked_at).getTime()) / 60000)} mins left
              </p>
            )}
          </div>
        ) : portfolio.all_sites_checked ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              Status: {portfolio.all_sites_checked === 'Yes' ? '✅ All Sites Checked' : '❌ Issues Found'}
            </p>
            {portfolio.all_sites_checked_hour !== undefined && (
              <p className="text-xs text-gray-500">⏰ Hour: {portfolio.all_sites_checked_hour}</p>
            )}
            {portfolio.all_sites_checked_by && (
              <p className="text-xs text-gray-500">👤 {portfolio.all_sites_checked_by}</p>
            )}
            {portfolio.all_sites_checked_date && (
              <p className="text-xs text-gray-500">
                Last: {formatTime(new Date(portfolio.all_sites_checked_date))}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">⏳ Not checked yet</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
        {portfolio.is_locked ? (
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
          >
            Waiting...
          </button>
        ) : (
          <button
            onClick={() => onLogIssue?.(portfolio.id)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
          >
            ➕ Log Issue
          </button>
        )}
        <div className="flex gap-2">
          <Link
            to={`/portfolios/${portfolio.id}`}
            className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center text-sm font-medium"
          >
            View
          </Link>
          {onEdit && (
            <button
              onClick={() => onEdit(portfolio)}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PortfolioCard
