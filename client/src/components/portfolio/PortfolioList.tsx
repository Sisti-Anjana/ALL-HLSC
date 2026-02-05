import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioService } from '../../services/portfolioService'
import { Portfolio, CreatePortfolioData, UpdatePortfolioData } from '../../types/portfolio.types'
import toast from 'react-hot-toast'
import PortfolioCard from './PortfolioCard'
import PortfolioForm from './PortfolioForm'
import EmptyState from '../common/EmptyState'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { useDebounce } from '../../hooks/useDebounce'
import { useTenant } from '../../context/TenantContext'

const PortfolioList: React.FC = () => {
  const { selectedTenant } = useTenant()
  const isSuspended = selectedTenant?.status === 'suspended'
  const isInactive = selectedTenant?.status === 'inactive'
  const isReadOnly = isSuspended || isInactive

  const [showModal, setShowModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const debouncedSearch = useDebounce(searchQuery, 300)

  const queryClient = useQueryClient()

  const { data: portfolios, isLoading } = useQuery<Portfolio[]>({
    queryKey: ['portfolios'],
    queryFn: portfolioService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: portfolioService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      toast.success('Portfolio created successfully')
      setShowModal(false)
      setEditingPortfolio(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create portfolio')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePortfolioData }) =>
      portfolioService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      toast.success('Portfolio updated successfully')
      setShowModal(false)
      setEditingPortfolio(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update portfolio')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: portfolioService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
      toast.success('Portfolio deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete portfolio')
    },
  })

  // Filter portfolios
  const filteredPortfolios = portfolios?.filter((p) => {
    const matchesSearch = !debouncedSearch ||
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.subtitle?.toLowerCase().includes(debouncedSearch.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'checked' && p.all_sites_checked === 'Yes') ||
      (statusFilter === 'issues' && p.all_sites_checked === 'No') ||
      (statusFilter === 'pending' && !p.all_sites_checked) ||
      (statusFilter === 'locked' && p.is_locked)

    return matchesSearch && matchesStatus
  }) || []

  // Pagination
  const totalPages = Math.ceil(filteredPortfolios.length / itemsPerPage)
  const paginatedPortfolios = filteredPortfolios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Suspension Warning */}
      {isReadOnly && (
        <div className={`p-4 rounded-lg flex items-center gap-3 border shadow-sm ${isSuspended ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}>
          <span className="text-xl">{isSuspended ? '🚫' : '⚠️'}</span>
          <div>
            <p className="font-bold">Client is {selectedTenant?.status}</p>
            <p className="text-sm opacity-90">
              This account is currently in read-only mode. You can view existing data, but adding or modifying portfolios is disabled until the account is reactivated.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Portfolios ({filteredPortfolios.length})
          </h1>
          <p className="text-gray-600 mt-1">Manage your solar site portfolios</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              ■■ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              ≡ List
            </button>
          </div>
          <Button
            onClick={() => {
              if (isReadOnly) return
              setEditingPortfolio(null)
              setShowModal(true)
            }}
            disabled={isReadOnly}
            className={isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}
          >
            + New
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search portfolios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="checked">✅ Checked</option>
              <option value="issues">🔴 Issues</option>
              <option value="pending">⏳ Pending</option>
              <option value="locked">🔒 Locked</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              <option>Name</option>
              <option>Status</option>
              <option>Date</option>
            </select>
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Portfolio Grid/List */}
      {filteredPortfolios.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No portfolios found"
          description={searchQuery || statusFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Create your first portfolio to start tracking issues'}
          action={{
            label: 'Create Portfolio',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <>
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {paginatedPortfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onDelete={(id) => {
                  if (window.confirm('Are you sure you want to delete this portfolio?')) {
                    deleteMutation.mutate(id)
                  }
                }}
                onEdit={(p) => {
                  setEditingPortfolio(p)
                  setShowModal(true)
                }}
                onLogIssue={(id) => {
                  // Navigate to issues page with portfolio pre-selected
                  window.location.href = `/issues?portfolio=${id}&action=log`
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPortfolios.length)} of {filteredPortfolios.length} portfolios
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                    if (page > totalPages) return null
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm ${currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <PortfolioForm
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingPortfolio(null)
        }}
        onSubmit={(data) => {
          if (editingPortfolio) {
            const updateData: UpdatePortfolioData = {
              name: data.name,
              subtitle: data.subtitle,
              site_range: data.site_range,
            }
            updateMutation.mutate({ id: editingPortfolio.id, data: updateData })
          } else {
            createMutation.mutate(data as CreatePortfolioData)
          }
        }}
        portfolio={editingPortfolio}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

export default PortfolioList
