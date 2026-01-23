import React from 'react'
import { Portfolio } from '../../types/portfolio.types'
import Badge from '../common/Badge'
import { Link } from 'react-router-dom'
import { formatTime } from '../../utils/dateUtils'

interface PortfolioCardProps {
  portfolio: Portfolio
  onDelete?: (id: string) => void
  onEdit?: (portfolio: Portfolio) => void
  onLogIssue?: (portfolioId: string) => void
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ portfolio, onDelete, onEdit, onLogIssue }) => {
  // const navigate = useNavigate()

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
      className={`bg-white rounded-lg shadow-sm p-2 border-2 ${getBorderColor()} hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-[150px] flex flex-col group overflow-hidden relative`}
    >
      {/* Header - REVERTED - NAME ONLY */}
      <div className="flex items-start justify-between mb-1 h-12 overflow-hidden">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-black leading-tight">
            {portfolio.name}
          </h3>
          {portfolio.subtitle && (
            <p className="text-gray-600 text-[12px] font-medium truncate mt-0.5">
              🏷️ {portfolio.subtitle}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 scale-75 transform origin-top-right translate-y-[-2px]">
          {getStatusBadge()}
        </div>
      </div>

      {/* Y/H Badge - Top Right Corner - RESTORED BLUE-600 "Y 14" */}
      {(portfolio.all_sites_checked === 'Yes' || portfolio.all_sites_checked === 'No') && (
        <div className="absolute top-1 right-1 bg-blue-600 text-white p-0 rounded-sm shadow-sm z-30 border border-blue-500/10">
          <span className="text-[12px] font-black leading-none block px-1.5 py-1">
            {portfolio.all_sites_checked_hour !== undefined && portfolio.all_sites_checked_hour !== null
              ? `H ${portfolio.all_sites_checked_hour}`
              : `Y ${portfolio.all_sites_checked_date ? '0' : '0'}`}
          </span>
        </div>
      )}

      {/* Hover Site Range Overlay - RESTORED HOVER ONLY */}
      {portfolio.site_range && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 bg-white/95 flex items-center justify-center p-2 z-20 text-center pointer-events-none border-b">
          <p className="text-blue-700 text-xs font-bold">
            📍 {portfolio.site_range}
          </p>
        </div>
      )}

      {/* Status Info - Ultra condensed */}
      <div className="mb-1 p-1 bg-gray-50 rounded border border-gray-100 text-[10px] leading-tight">
        {portfolio.is_locked ? (
          <div className="flex justify-between items-center text-orange-600">
            <span className="font-bold truncate max-w-[80px]">🔒 {portfolio.locked_by || 'Locked'}</span>
            {portfolio.locked_at && (
              <span>⏱️{Math.floor((Date.now() - new Date(portfolio.locked_at).getTime()) / 60000)}m</span>
            )}
          </div>
        ) : (portfolio.all_sites_checked === 'Yes' || portfolio.all_sites_checked === 'No') ? (
          <div className="flex items-center gap-2">
            <span className={portfolio.all_sites_checked === 'Yes' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {portfolio.all_sites_checked === 'Yes' ? '✅ PASS' : '❌ ISSUE'}
            </span>
            <span className="text-gray-400 truncate flex-1 text-[9px]">{portfolio.all_sites_checked_by}</span>
          </div>
        ) : (
          <span className="text-yellow-600 italic font-medium">⏳ Pending Check</span>
        )}
      </div>

      {/* Actions - Tightened */}
      <div className="mt-auto pt-1 flex flex-col gap-1 text-[10px]">
        <button
          disabled={portfolio.is_locked}
          onClick={() => !portfolio.is_locked && onLogIssue?.(portfolio.id)}
          className={`w-full py-0.5 rounded transition-colors font-bold ${portfolio.is_locked
            ? 'bg-gray-50 text-gray-300'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {portfolio.is_locked ? 'LOCKED' : '➕ LOG'}
        </button>
        <div className="flex gap-1">
          <Link
            to={`/portfolios/${portfolio.id}`}
            className="flex-1 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-center font-bold"
          >
            VIEW
          </Link>
          {onEdit && (
            <button
              onClick={() => onEdit(portfolio)}
              className="flex-1 py-0.5 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 font-bold border border-gray-100"
            >
              EDIT
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PortfolioCard
