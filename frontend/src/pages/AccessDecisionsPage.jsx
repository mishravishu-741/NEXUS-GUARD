import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Clock,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime, getDecisionColor } from '../utils/helpers'
import toast from 'react-hot-toast'

const DECISION_OPTIONS = [
  { value: '', label: 'All Decisions' },
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'monitor', label: 'Monitor' },
]

export function AccessDecisionsPage() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', decision: '' })
  const [selectedDecision, setSelectedDecision] = useState(null)

  const fetchDecisions = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
      }
      const response = await api.get('/access-decisions', { params })
      setDecisions(response.data.decisions)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load access decisions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDecisions()
  }, [pagination.page, filters])

  const getDecisionBadge = (decision) => {
    const badges = {
      allow: 'badge-success',
      deny: 'badge-danger',
      challenge: 'badge-warning',
      monitor: 'badge-info',
    }
    const icons = {
      allow: <ShieldCheck className="w-3 h-3" />,
      deny: <XCircle className="w-3 h-3" />,
      challenge: <AlertCircle className="w-3 h-3" />,
      monitor: <Clock className="w-3 h-3" />,
    }
    return (
      <span className={cn('badge flex items-center gap-1', badges[decision])}>
        {icons[decision]}
        {decision.charAt(0).toUpperCase() + decision.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Decisions</h1>
          <p className="text-dark-400">Zero Trust access control decisions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.decision}
            onChange={(e) => setFilters(prev => ({ ...prev, decision: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {DECISION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Decisions Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Decision</th>
                <th>User</th>
                <th>Device</th>
                <th>Resource</th>
                <th>Action</th>
                <th>Risk / Trust</th>
                <th>MFA</th>
                <th>IP / Location</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : decisions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-dark-400">No access decisions found</td>
                </tr>
              ) : (
                decisions.map(decision => (
                  <tr key={decision.id}>
                    <td>{getDecisionBadge(decision.decision)}</td>
                    <td className="text-dark-300">{decision.user_id ? `User #${decision.user_id}` : '-'}</td>
                    <td className="text-dark-300">{decision.device_id ? `Device #${decision.device_id}` : '-'}</td>
                    <td>
                      <div className="text-sm">
                        {decision.resource_type && <span className="badge-info text-xs">{decision.resource_type}</span>}
                        {decision.resource_id && <span className="font-mono text-xs ml-1">#{decision.resource_id}</span>}
                      </div>
                    </td>
                    <td className="text-dark-300 text-sm">{decision.action || '-'}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={cn('text-xs font-medium', getDecisionColor(decision.risk_score >= 50 ? 'deny' : 'allow'))}>
                          Risk: {decision.risk_score.toFixed(0)}%
                        </span>
                        <span className={cn('text-xs font-medium', getDecisionColor(decision.trust_score >= 50 ? 'allow' : 'deny'))}>
                          Trust: {decision.trust_score.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {decision.mfa_required && (
                        <span className={cn('badge flex items-center gap-1', decision.mfa_verified ? 'badge-success' : 'badge-warning')}>
                          {decision.mfa_verified ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {decision.mfa_verified ? 'Verified' : 'Required'}
                        </span>
                      )}
                      {!decision.mfa_required && <span className="text-dark-400 text-xs">Not required</span>}
                    </td>
                    <td className="text-dark-400 text-sm">
                      <div className="font-mono">{decision.ip_address || '-'}</div>
                      {decision.location && <div className="text-xs">{decision.location}</div>}
                    </td>
                    <td className="text-dark-400 text-sm">{formatRelativeTime(decision.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedDecision(decision)}
                        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-sm text-dark-400">
              Showing {(pagination.page - 1) * pagination.page_size + 1} to{' '}
              {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary btn-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-dark-300 px-3">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.total_pages}
                className="btn-secondary btn-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Access Decision Details</h2>
              <button
                onClick={() => setSelectedDecision(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {getDecisionBadge(selectedDecision.decision)}
                {selectedDecision.mfa_required && (
                  <span className={cn('badge flex items-center gap-1', selectedDecision.mfa_verified ? 'badge-success' : 'badge-warning')}>
                    {selectedDecision.mfa_verified ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {selectedDecision.mfa_verified ? 'MFA Verified' : 'MFA Required'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Decision ID</p>
                  <p className="font-mono text-sm text-white">#{selectedDecision.id}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Correlation ID</p>
                  <p className="font-mono text-sm text-white">{selectedDecision.correlation_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-white">{selectedDecision.user_id ? `User #${selectedDecision.user_id}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Device</p>
                  <p className="text-white">{selectedDecision.device_id ? `Device #${selectedDecision.device_id}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resource</p>
                  <p className="text-white">{selectedDecision.resource_type || 'N/A'} {selectedDecision.resource_id ? `#${selectedDecision.resource_id}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Action</p>
                  <p className="text-white">{selectedDecision.action || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Score</p>
                  <p className={cn('font-medium', getDecisionColor(selectedDecision.risk_score >= 50 ? 'deny' : 'allow'))}>
                    {selectedDecision.risk_score.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Trust Score</p>
                  <p className={cn('font-medium', getDecisionColor(selectedDecision.trust_score >= 50 ? 'allow' : 'deny'))}>
                    {selectedDecision.trust_score.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">MFA Required</p>
                  <p className="text-white">{selectedDecision.mfa_required ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">MFA Verified</p>
                  <p className="text-white">{selectedDecision.mfa_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="font-mono text-sm text-white">{selectedDecision.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Location</p>
                  <p className="text-white">{selectedDecision.location || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-white">{formatDate(selectedDecision.created_at)}</p>
                </div>
              </div>

              {selectedDecision.matched_policies && selectedDecision.matched_policies.length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Matched Policies</h3>
                  <div className="space-y-2">
                    {selectedDecision.matched_policies.map((policy, index) => (
                      <div key={index} className="p-3 bg-dark-800 rounded-lg border border-dark-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{policy.name}</span>
                          {getActionBadge(policy.action)}
                        </div>
                        <p className="text-xs text-dark-400 mt-1">ID: {policy.id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDecision.metadata && Object.keys(selectedDecision.metadata).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Metadata</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedDecision.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { X } from 'lucide-react'