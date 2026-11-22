import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime, getSeverityColor, getSeverityBadge } from '../utils/helpers'
import toast from 'react-hot-toast'

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'false_positive', label: 'False Positive' },
  { value: 'closed', label: 'Closed' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'credential_stuffing', label: 'Credential Stuffing' },
  { value: 'suspicious_login', label: 'Suspicious Login' },
  { value: 'impossible_travel', label: 'Impossible Travel' },
  { value: 'new_device', label: 'New Device' },
  { value: 'untrusted_device', label: 'Untrusted Device' },
  { value: 'high_risk_device', label: 'High Risk Device' },
  { value: 'suspicious_ip', label: 'Suspicious IP' },
  { value: 'tor_exit_node', label: 'Tor Exit Node' },
  { value: 'vpn_proxy', label: 'VPN/Proxy' },
  { value: 'anonymous_proxy', label: 'Anonymous Proxy' },
  { value: 'malicious_ip', label: 'Malicious IP' },
  { value: 'data_exfiltration', label: 'Data Exfiltration' },
  { value: 'privilege_escalation', label: 'Privilege Escalation' },
  { value: 'lateral_movement', label: 'Lateral Movement' },
  { value: 'anomalous_behavior', label: 'Anomalous Behavior' },
  { value: 'policy_violation', label: 'Policy Violation' },
]

export function ThreatsPage() {
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', severity: '', status: '', threat_type: '' })
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [updatingThreat, setUpdatingThreat] = useState(null)

  const fetchThreats = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        ),
      }
      const response = await api.get('/threat-alerts', { params })
      setThreats(response.data.alerts)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load threats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreats()
  }, [pagination.page, filters])

  const handleUpdateStatus = async (threatId, status) => {
    setUpdatingThreat(threatId)
    try {
      await api.patch(`/threat-alerts/${threatId}`, { status })
      toast.success(`Threat status updated to ${status}`)
      fetchThreats()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update threat')
    } finally {
      setUpdatingThreat(null)
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      brute_force: 'Brute Force',
      credential_stuffing: 'Credential Stuffing',
      suspicious_login: 'Suspicious Login',
      impossible_travel: 'Impossible Travel',
      new_device: 'New Device',
      untrusted_device: 'Untrusted Device',
      high_risk_device: 'High Risk Device',
      suspicious_ip: 'Suspicious IP',
      tor_exit_node: 'Tor Exit Node',
      vpn_proxy: 'VPN/Proxy',
      anonymous_proxy: 'Anonymous Proxy',
      malicious_ip: 'Malicious IP',
      data_exfiltration: 'Data Exfiltration',
      privilege_escalation: 'Privilege Escalation',
      lateral_movement: 'Lateral Movement',
      anomalous_behavior: 'Anomalous Behavior',
      policy_violation: 'Policy Violation',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status) => {
    const badges = {
      open: 'badge-danger',
      investigating: 'badge-warning',
      mitigated: 'badge-success',
      false_positive: 'badge-info',
      closed: 'badge-info',
    }
    const labels = {
      open: 'Open',
      investigating: 'Investigating',
      mitigated: 'Mitigated',
      false_positive: 'False Positive',
      closed: 'Closed',
    }
    return (
      <span className={cn('badge', badges[status])}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Alerts</h1>
          <p className="text-dark-400">Monitor and manage security threats</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search threats..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.threat_type}
            onChange={(e) => setFilters(prev => ({ ...prev, threat_type: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Threats Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Threat</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>User / Device</th>
                <th>IP Address</th>
                <th>Risk / Confidence</th>
                <th>Detected</th>
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
              ) : threats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-dark-400">No threats found</td>
                </tr>
              ) : (
                threats.map(threat => (
                  <tr key={threat.id}>
                    <td>
                      <div>
                        <p className="font-medium text-white">{threat.title}</p>
                        {threat.description && (
                          <p className="text-xs text-dark-400 truncate max-w-xs">{threat.description}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge-info text-xs">{getTypeLabel(threat.threat_type)}</span>
                    </td>
                    <td>
                      <span className={cn('badge', getSeverityBadge(threat.severity))}>
                        {threat.severity.charAt(0).toUpperCase() + threat.severity.slice(1)}
                      </span>
                    </td>
                    <td>{getStatusBadge(threat.status)}</td>
                    <td className="text-dark-300">
                      {threat.user_id && <div>User #{threat.user_id}</div>}
                      {threat.device_id && <div className="text-xs">Device #{threat.device_id}</div>}
                      {!threat.user_id && !threat.device_id && <span className="text-dark-400">-</span>}
                    </td>
                    <td className="font-mono text-xs text-dark-300">{threat.ip_address || '-'}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={cn('text-xs font-medium', getRiskScoreColor(threat.risk_score))}>
                          Risk: {threat.risk_score.toFixed(0)}%
                        </span>
                        <span className="text-xs text-dark-400">
                          Confidence: {(threat.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-dark-400 text-sm">{formatRelativeTime(threat.first_detected)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedThreat(threat)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={threat.status}
                          onChange={(e) => handleUpdateStatus(threat.id, e.target.value)}
                          disabled={updatingThreat === threat.id}
                          className="input text-xs py-1 px-2 bg-dark-700"
                        >
                          {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
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
      {selectedThreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Threat Details</h2>
              <button
                onClick={() => setSelectedThreat(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className={cn('badge', getSeverityBadge(selectedThreat.severity))}>
                  {selectedThreat.severity}
                </span>
                {getStatusBadge(selectedThreat.status)}
                <span className="badge-info">{getTypeLabel(selectedThreat.threat_type)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Title</p>
                  <p className="text-white">{selectedThreat.title}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">ID</p>
                  <p className="font-mono text-sm text-white">#{selectedThreat.id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{selectedThreat.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Score</p>
                  <p className={cn('font-medium', getRiskScoreColor(selectedThreat.risk_score))}>
                    {selectedThreat.risk_score.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Confidence</p>
                  <p className="font-medium text-white">{(selectedThreat.confidence_score * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Detection Method</p>
                  <p className="text-white">{selectedThreat.detection_method || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-white">{selectedThreat.user_id ? `User #${selectedThreat.user_id}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Device</p>
                  <p className="text-white">{selectedThreat.device_id ? `Device #${selectedThreat.device_id}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="font-mono text-sm text-white">{selectedThreat.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">First Detected</p>
                  <p className="text-white">{formatDate(selectedThreat.first_detected)}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Last Detected</p>
                  <p className="text-white">{formatDate(selectedThreat.last_detected)}</p>
                </div>
                {selectedThreat.resolved_at && (
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Resolved</p>
                    <p className="text-white">{formatDate(selectedThreat.resolved_at)}</p>
                  </div>
                )}
                {selectedThreat.assigned_to && (
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Assigned To</p>
                    <p className="text-white">User #${selectedThreat.assigned_to}</p>
                  </div>
                )}
              </div>

              {selectedThreat.evidence && Object.keys(selectedThreat.evidence).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Evidence</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedThreat.evidence, null, 2)}
                  </pre>
                </div>
              )}

              {selectedThreat.indicators && Object.keys(selectedThreat.indicators).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Indicators of Compromise</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedThreat.indicators, null, 2)}
                  </pre>
                </div>
              )}

              {selectedThreat.resolution_notes && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Resolution Notes</h3>
                  <p className="text-dark-300">{selectedThreat.resolution_notes}</p>
                </div>
              )}

              {selectedThreat.mitigation_actions && Object.keys(selectedThreat.mitigation_actions).length > 0 && (
                <div className="border-t border-dark-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Mitigation Actions</h3>
                  <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                    {JSON.stringify(selectedThreat.mitigation_actions, null, 2)}
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