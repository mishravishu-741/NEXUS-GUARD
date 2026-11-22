import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Plus,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Shield,
  AlertTriangle,
  MoreVertical,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Server,
  Cpu,
  HelpCircle,
  X,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime, getDeviceStatusColor, getTrustScoreColor, getRiskScoreColor } from '../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'trusted', label: 'Trusted' },
  { value: 'untrusted', label: 'Untrusted' },
  { value: 'pending', label: 'Pending' },
  { value: 'revoked', label: 'Revoked' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'server', label: 'Server' },
  { value: 'iot', label: 'IoT' },
  { value: 'unknown', label: 'Unknown' },
]

export function DevicesPage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', device_type: '' })
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState(null)
  const [deletingDevice, setDeletingDevice] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      device_type: 'unknown',
      status: 'pending',
    }
  })

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...filters,
      }

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await api.get('/devices', { params })
      setDevices(response.data.devices)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [pagination.page, filters])

  const handleRegister = async (data) => {
    try {
      // Generate a device ID based on fingerprint
      const deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      await api.post('/devices', { ...data, device_id: deviceId })
      toast.success('Device registered successfully')
      setShowRegisterModal(false)
      reset()
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register device')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await api.patch(`/devices/${editingDevice.id}`, data)
      toast.success('Device updated successfully')
      setEditingDevice(null)
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update device')
    }
  }

  const handleApprove = async (deviceId, approve) => {
    try {
      await api.post(`/devices/${deviceId}/approve`, { approve })
      toast.success(approve ? 'Device approved' : 'Device rejected')
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update device')
    }
  }

  const handleRevoke = async (deviceId) => {
    if (!confirm('Are you sure you want to revoke this device? This will terminate all active sessions.')) return
    try {
      await api.post(`/devices/${deviceId}/revoke`)
      toast.success('Device revoked')
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to revoke device')
    }
  }

  const handleDelete = async (deviceId) => {
    if (!confirm('Are you sure you want to delete this device?')) return
    try {
      await api.delete(`/devices/${deviceId}`)
      toast.success('Device deleted')
      fetchDevices()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete device')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      trusted: 'badge-success',
      untrusted: 'badge-danger',
      pending: 'badge-warning',
      revoked: 'badge-info',
    }
    const labels = {
      trusted: 'Trusted',
      untrusted: 'Untrusted',
      pending: 'Pending',
      revoked: 'Revoked',
    }
    return (
      <span className={cn('badge', badges[status])}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const icons = {
      desktop: <Monitor className="w-3 h-3" />,
      laptop: <Laptop className="w-3 h-3" />,
      mobile: <Smartphone className="w-3 h-3" />,
      tablet: <Tablet className="w-3 h-3" />,
      server: <Server className="w-3 h-3" />,
      iot: <Cpu className="w-3 h-3" />,
      unknown: <HelpCircle className="w-3 h-3" />,
    }
    return (
      <span className="badge-info flex items-center gap-1">
        {icons[type] || icons.unknown}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  // Removed dynamic import of icons

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Devices</h1>
          <p className="text-dark-400">Manage and monitor registered devices</p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.device_type}
            onChange={(e) => setFilters(prev => ({ ...prev, device_type: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Status</th>
                <th>Trust / Risk</th>
                <th>Owner</th>
                <th>Last Seen</th>
                <th>IP / Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-dark-400">No devices found</td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id}>
                    <td>
                      <div>
                        <p className="font-medium text-white">{device.name}</p>
                        <p className="text-xs text-dark-400 font-mono">{device.device_id}</p>
                      </div>
                    </td>
                    <td>{getTypeBadge(device.device_type)}</td>
                    <td>{getStatusBadge(device.status)}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium', getTrustScoreColor(device.trust_score))}>
                            Trust: {device.trust_score.toFixed(0)}
                          </span>
                          <div className="h-1.5 w-24 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${device.trust_score}%`,
                                backgroundColor: device.trust_score >= 80 ? '#22c55e' :
                                  device.trust_score >= 60 ? '#0ea5e9' :
                                  device.trust_score >= 40 ? '#f59e0b' :
                                  device.trust_score >= 20 ? '#f97316' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium', getRiskScoreColor(device.risk_score))}>
                            Risk: {device.risk_score.toFixed(0)}
                          </span>
                          <div className="h-1.5 w-24 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${device.risk_score}%`,
                                backgroundColor: device.risk_score >= 80 ? '#ef4444' :
                                  device.risk_score >= 60 ? '#f97316' :
                                  device.risk_score >= 40 ? '#f59e0b' :
                                  device.risk_score >= 20 ? '#0ea5e9' : '#22c55e'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-dark-300">{device.owner_id ? `User #${device.owner_id}` : 'Unknown'}</td>
                    <td className="text-dark-400 text-sm">{formatRelativeTime(device.last_seen)}</td>
                    <td className="text-dark-400 text-sm">
                      <div>{device.ip_address || '-'}</div>
                      {device.location && <div className="text-xs">{device.location}</div>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDevice(device)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {device.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(device.id, true)}
                              className="p-2 rounded-lg text-success-400 hover:bg-success-500/10 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApprove(device.id, false)}
                              className="p-2 rounded-lg text-danger-400 hover:bg-danger-500/10 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {device.status === 'trusted' && (
                          <button
                            onClick={() => handleRevoke(device.id)}
                            className="p-2 rounded-lg text-warning-400 hover:bg-warning-500/10 transition-colors"
                            title="Revoke"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingDevice(device)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="p-2 rounded-lg text-danger-400 hover:bg-danger-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Register New Device</h2>
            <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="label">Device Name</label>
                <input
                  {...register('name', { required: 'Device name is required' })}
                  id="name"
                  type="text"
                  className={cn('input', errors.name && 'input-error')}
                  placeholder="John's MacBook Pro"
                />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="device_type" className="label">Device Type</label>
                <select
                  {...register('device_type')}
                  id="device_type"
                  className="input"
                >
                  {TYPE_OPTIONS.filter(o => o.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowRegisterModal(false); reset(); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Edit Device</h2>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="edit_name" className="label">Device Name</label>
                <input
                  {...register('name')}
                  id="edit_name"
                  type="text"
                  defaultValue={editingDevice.name}
                  className="input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_status" className="label">Status</label>
                <select
                  {...register('status')}
                  id="edit_status"
                  defaultValue={editingDevice.status}
                  className="input"
                >
                  {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_type" className="label">Device Type</label>
                <select
                  {...register('device_type')}
                  id="edit_type"
                  defaultValue={editingDevice.device_type}
                  className="input"
                >
                  {TYPE_OPTIONS.filter(o => o.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Device Details</h2>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Device ID</p>
                <p className="font-mono text-sm text-white">{selectedDevice.device_id}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Name</p>
                <p className="text-white">{selectedDevice.name}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Type</p>
                <p className="text-white capitalize">{selectedDevice.device_type}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Status</p>
                <p className={cn('font-medium', getDeviceStatusColor(selectedDevice.status))}>
                  {selectedDevice.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Trust Score</p>
                <p className={cn('font-medium', getTrustScoreColor(selectedDevice.trust_score))}>
                  {selectedDevice.trust_score.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Score</p>
                <p className={cn('font-medium', getRiskScoreColor(selectedDevice.risk_score))}>
                  {selectedDevice.risk_score.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">OS</p>
                <p className="text-white">{selectedDevice.os_name || 'Unknown'} {selectedDevice.os_version || ''}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Browser</p>
                <p className="text-white">{selectedDevice.browser_name || 'Unknown'} {selectedDevice.browser_version || ''}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">IP Address</p>
                <p className="font-mono text-sm text-white">{selectedDevice.ip_address || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Location</p>
                <p className="text-white">{selectedDevice.location || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">First Seen</p>
                <p className="text-white">{formatDate(selectedDevice.first_seen)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Last Seen</p>
                <p className="text-white">{formatDate(selectedDevice.last_seen)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Owner</p>
                <p className="text-white">User #${selectedDevice.owner_id || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}