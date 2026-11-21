import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  FileText,
  Download,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'approve', label: 'Approve' },
  { value: 'revoke', label: 'Revoke' },
  { value: 'enable', label: 'Enable' },
  { value: 'disable', label: 'Disable' },
]

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'user', label: 'User' },
  { value: 'device', label: 'Device' },
  { value: 'policy', label: 'Policy' },
  { value: 'security_event', label: 'Security Event' },
  { value: 'threat_alert', label: 'Threat Alert' },
  { value: 'audit_log', label: 'Audit Log' },
  { value: 'session', label: 'Session' },
  { value: 'mfa', label: 'MFA' },
  { value: 'config', label: 'Config' },
  { value: 'report', label: 'Report' },
]

export function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', action: '', resource_type: '', success: '' })
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
      }
      // Convert boolean filter
      if (filters.success !== '') {
        params.success = filters.success === 'true'
      }
      const response = await api.get('/audit-logs', { params })
      setLogs(response.data.logs)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, filters])

  const handleExport = async () => {
    try {
      const response = await api.get('/audit-logs/export', {
        params: filters,
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Audit logs exported successfully')
    } catch (error) {
      toast.error('Failed to export audit logs')
    }
  }

  const getActionBadge = (action) => {
    const badges = {
      create: 'badge-success',
      read: 'badge-info',
      update: 'badge-warning',
      delete: 'badge-danger',
      login: 'badge-primary',
      logout: 'badge-info',
      export: 'badge-warning',
      import: 'badge-primary',
      approve: 'badge-success',
      revoke: 'badge-danger',
      enable: 'badge-success',
      disable: 'badge-warning',
    }
    return (
      <span className={cn('badge', badges[action])}>
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </span>
    )
  }

  const getResourceBadge = (resource) => {
    return (
      <span className="badge-primary text-xs">{resource.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-dark-400">System audit trail and compliance logs</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {ACTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.resource_type}
            onChange={(e) => setFilters(prev => ({ ...prev, resource_type: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {RESOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.success}
            onChange={(e) => setFilters(prev => ({ ...prev, success: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            <option value="">All Results</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Resource ID</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Result</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-dark-400">No audit logs found</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-dark-400 text-sm font-mono">{formatRelativeTime(log.created_at)}</td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>{getResourceBadge(log.resource_type)}</td>
                    <td className="font-mono text-xs text-dark-300">{log.resource_id || '-'}</td>
                    <td className="text-dark-300">{log.user_id ? `User #${log.user_id}` : 'System'}</td>
                    <td className="font-mono text-xs text-dark-300">{log.ip_address || '-'}</td>
                    <td>
                      <span className={cn('badge', log.success ? 'badge-success' : 'badge-danger')}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {log.description && (
                          <span className="text-xs text-dark-400 truncate max-w-xs">{log.description}</span>
                        )}
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {getActionBadge(selectedLog.action)}
                {getResourceBadge(selectedLog.resource_type)}
                <span className={cn('badge', selectedLog.success ? 'badge-success' : 'badge-danger')}>
                  {selectedLog.success ? 'Success' : 'Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Log ID</p>
                  <p className="font-mono text-sm text-white">#{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Correlation ID</p>
                  <p className="font-mono text-sm text-white">{selectedLog.correlation_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Action</p>
                  <p className="text-white capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resource</p>
                  <p className="text-white">{selectedLog.resource_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resource Name</p>
                  <p className="text-white">{selectedLog.resource_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-white">{selectedLog.user_id ? `User #${selectedLog.user_id}` : 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="font-mono text-sm text-white">{selectedLog.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-white">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Result</p>
                  <p className={cn('font-medium', selectedLog.success ? 'text-success-400' : 'text-danger-400')}>
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </p>
                </div>
              </div>

              {selectedLog.description && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-dark-300">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Error Message</h3>
                  <p className="text-danger-300">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Previous Values</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">New Values</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Changed Fields</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.changed_fields.map((field, index) => (
                      <span key={index} className="badge-info text-xs">{field}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Metadata</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
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