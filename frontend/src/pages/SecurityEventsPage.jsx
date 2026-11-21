import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Activity,
  Shield,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime, getSeverityColor, getSeverityBadge } from '../utils/helpers'
import toast from 'react-hot-toast'

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'login_success', label: 'Login Success' },
  { value: 'login_failure', label: 'Login Failure' },
  { value: 'login_mfa_success', label: 'MFA Success' },
  { value: 'login_mfa_failure', label: 'MFA Failure' },
  { value: 'logout', label: 'Logout' },
  { value: 'session_expired', label: 'Session Expired' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'mfa_enabled', label: 'MFA Enabled' },
  { value: 'mfa_disabled', label: 'MFA Disabled' },
  { value: 'device_registered', label: 'Device Registered' },
  { value: 'device_approved', label: 'Device Approved' },
  { value: 'device_revoked', label: 'Device Revoked' },
  { value: 'device_trust_changed', label: 'Device Trust Changed' },
  { value: 'policy_created', label: 'Policy Created' },
  { value: 'policy_updated', label: 'Policy Updated' },
  { value: 'policy_deleted', label: 'Policy Deleted' },
  { value: 'policy_evaluated', label: 'Policy Evaluated' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'access_denied', label: 'Access Denied' },
  { value: 'access_challenged', label: 'Access Challenged' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
  { value: 'threat_detected', label: 'Threat Detected' },
  { value: 'network_anomaly', label: 'Network Anomaly' },
  { value: 'config_changed', label: 'Config Changed' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function SecurityEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', event_type: '', severity: '', is_resolved: '' })
  const [selectedEvent, setSelectedEvent] = useState(null)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
      }
      if (filters.is_resolved !== '') {
        params.is_resolved = filters.is_resolved === 'true'
      }
      const response = await api.get('/security-events', { params })
      setEvents(response.data.events)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load security events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [pagination.page, filters])

  const handleResolve = async (eventId) => {
    if (!confirm('Mark this event as resolved?')) return
    try {
      await api.post(`/security-events/${eventId}/resolve`)
      toast.success('Event marked as resolved')
      fetchEvents()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resolve event')
    }
  }

  const getTypeLabel = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Events</h1>
          <p className="text-dark-400">Monitor and investigate security events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.event_type}
            onChange={(e) => setFilters(prev => ({ ...prev, event_type: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.is_resolved}
            onChange={(e) => setFilters(prev => ({ ...prev, is_resolved: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            <option value="">All</option>
            <option value="true">Resolved</option>
            <option value="false">Unresolved</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Severity</th>
                <th>User</th>
                <th>Device</th>
                <th>IP Address</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-dark-400">No security events found</td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id}>
                    <td className="text-dark-400 text-sm font-mono">{formatRelativeTime(event.created_at)}</td>
                    <td>
                      <div>
                        <p className="font-medium text-white">{getTypeLabel(event.event_type)}</p>
                        {event.title && <p className="text-xs text-dark-400">{event.title}</p>}
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge', getSeverityBadge(event.severity))}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="text-dark-300">{event.user_id ? `User #${event.user_id}` : '-'}</td>
                    <td className="text-dark-300">{event.device_id ? `Device #${event.device_id}` : '-'}</td>
                    <td className="font-mono text-xs text-dark-300">{event.ip_address || '-'}</td>
                    <td className={cn('text-xs font-medium', getSeverityColor(event.severity))}>
                      {event.risk_score}%
                    </td>
                    <td>
                      <span className={cn('badge', event.is_resolved ? 'badge-success' : 'badge-warning')}>
                        {event.is_resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!event.is_resolved && (
                          <button
                            onClick={() => handleResolve(event.id)}
                            className="p-2 rounded-lg text-success-400 hover:bg-success-500/10 transition-colors"
                            title="Resolve"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Event Details</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className={cn('badge', getSeverityBadge(selectedEvent.severity))}>
                  {selectedEvent.severity}
                </span>
                <span className="badge-primary">{getTypeLabel(selectedEvent.event_type)}</span>
                <span className={cn('badge', selectedEvent.is_resolved ? 'badge-success' : 'badge-warning')}>
                  {selectedEvent.is_resolved ? 'Resolved' : 'Open'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Event ID</p>
                  <p className="font-mono text-sm text-white">#{selectedEvent.id}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Title</p>
                  <p className="text-white">{selectedEvent.title || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{selectedEvent.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-white">{selectedEvent.user_id ? `User #${selectedEvent.user_id}` : 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Device</p>
                  <p className="text-white">{selectedEvent.device_id ? `Device #${selectedEvent.device_id}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="font-mono text-sm text-white">{selectedEvent.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Location</p>
                  <p className="text-white">{selectedEvent.location || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Score</p>
                  <p className={cn('font-medium', getSeverityColor(selectedEvent.severity))}>
                    {selectedEvent.risk_score}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-white">{formatDate(selectedEvent.created_at)}</p>
                </div>
                {selectedEvent.resolved_at && (
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resolved</p>
                    <p className="text-white">{formatDate(selectedEvent.resolved_at)}</p>
                  </div>
                )}
                {selectedEvent.resolved_by && (
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resolved By</p>
                    <p className="text-white">User #${selectedEvent.resolved_by}</p>
                  </div>
                )}
              </div>

              {selectedEvent.resolution_notes && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Resolution Notes</h3>
                  <p className="text-dark-300">{selectedEvent.resolution_notes}</p>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Metadata</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
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