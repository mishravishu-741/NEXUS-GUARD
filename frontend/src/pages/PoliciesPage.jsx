import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Plus,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Shield,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'access', label: 'Access' },
  { value: 'device', label: 'Device' },
  { value: 'network', label: 'Network' },
  { value: 'threat', label: 'Threat' },
  { value: 'authentication', label: 'Authentication' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'monitor', label: 'Monitor' },
]

export function PoliciesPage() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', policy_type: '', is_active: '', action: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [selectedPolicy, setSelectedPolicy] = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      policy_type: 'access',
      action: 'monitor',
      priority: 100,
      is_active: true,
      conditions: {},
      min_risk_score: 0,
      max_risk_score: 100,
      min_trust_score: 0,
      max_trust_score: 100,
      applies_to_roles: [],
      applies_to_devices: [],
      applies_to_networks: [],
    }
  })

  const fetchPolicies = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) =>
            value !== '' && value !== null && value !== undefined
          )
        ),
      }
      const response = await api.get('/policies', { params })
      setPolicies(response.data.policies)
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        total_pages: response.data.total_pages,
      }))
    } catch (error) {
      toast.error('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [pagination.page, filters])

  const handleCreate = async (data) => {
    try {
      await api.post('/policies', data)
      toast.success('Policy created successfully')
      setShowCreateModal(false)
      reset()
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create policy')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await api.patch(`/policies/${editingPolicy.id}`, data)
      toast.success('Policy updated successfully')
      setEditingPolicy(null)
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update policy')
    }
  }

  const handleDelete = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) return
    try {
      await api.delete(`/policies/${policyId}`)
      toast.success('Policy deleted')
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete policy')
    }
  }

  const handleToggleActive = async (policy) => {
    try {
      await api.patch(`/policies/${policy.id}`, { is_active: !policy.is_active })
      toast.success(`Policy ${!policy.is_active ? 'activated' : 'deactivated'}`)
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to toggle policy')
    }
  }

  const getActionBadge = (action) => {
    const badges = {
      allow: 'badge-success',
      deny: 'badge-danger',
      challenge: 'badge-warning',
      monitor: 'badge-info',
    }
    return (
      <span className={cn('badge', badges[action])}>
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    return (
      <span className="badge-primary text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Policies</h1>
          <p className="text-dark-400">Manage Zero Trust access policies</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Policy
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.policy_type}
            onChange={(e) => setFilters(prev => ({ ...prev, policy_type: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {ACTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={filters.is_active}
            onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Policies Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Type</th>
                <th>Action</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Risk Range</th>
                <th>Trust Range</th>
                <th>Created</th>
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
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-dark-400">No policies found</td>
                </tr>
              ) : (
                policies.map(policy => (
                  <tr key={policy.id}>
                    <td>
                      <div>
                        <p className="font-medium text-white">{policy.name}</p>
                        {policy.description && (
                          <p className="text-xs text-dark-400 truncate max-w-xs">{policy.description}</p>
                        )}
                      </div>
                    </td>
                    <td>{getTypeBadge(policy.policy_type)}</td>
                    <td>{getActionBadge(policy.action)}</td>
                    <td className="font-mono text-sm text-dark-300">{policy.priority}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(policy)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          policy.is_active ? 'bg-primary-500' : 'bg-dark-600'
                        )}
                        role="switch"
                        aria-checked={policy.is_active}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            policy.is_active ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </td>
                    <td className="text-dark-300 text-sm">
                      {policy.min_risk_score}% - {policy.max_risk_score}%
                    </td>
                    <td className="text-dark-300 text-sm">
                      {policy.min_trust_score}% - {policy.max_trust_score}%
                    </td>
                    <td className="text-dark-400 text-sm">{formatRelativeTime(policy.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedPolicy(policy)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingPolicy(policy)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy.id)}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">Create Policy</h2>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="label">Name *</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    id="name"
                    type="text"
                    className={cn('input', errors.name && 'input-error')}
                    placeholder="Block high-risk access"
                  />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="policy_type" className="label">Type *</label>
                  <select
                    {...register('policy_type')}
                    id="policy_type"
                    className="input"
                  >
                    {TYPE_OPTIONS.filter(o => o.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={3}
                  className="input"
                  placeholder="Policy description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="action" className="label">Action *</label>
                  <select
                    {...register('action')}
                    id="action"
                    className="input"
                  >
                    {ACTION_OPTIONS.filter(o => o.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="priority" className="label">Priority</label>
                  <input
                    {...register('priority', { valueAsNumber: true })}
                    id="priority"
                    type="number"
                    min="1"
                    max="1000"
                    className="input"
                    defaultValue={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label">Active</label>
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      id="is_active"
                      type="checkbox"
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      defaultChecked={true}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="min_risk_score" className="label">Min Risk Score</label>
                  <input
                    {...register('min_risk_score', { valueAsNumber: true })}
                    id="min_risk_score"
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    defaultValue={0}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="max_risk_score" className="label">Max Risk Score</label>
                  <input
                    {...register('max_risk_score', { valueAsNumber: true })}
                    id="max_risk_score"
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    defaultValue={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="min_trust_score" className="label">Min Trust Score</label>
                  <input
                    {...register('min_trust_score', { valueAsNumber: true })}
                    id="min_trust_score"
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    defaultValue={0}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="max_trust_score" className="label">Max Trust Score</label>
                  <input
                    {...register('max_trust_score', { valueAsNumber: true })}
                    id="max_trust_score"
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    defaultValue={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="conditions" className="label">Conditions (JSON)</label>
                <textarea
                  {...register('conditions', {
                    valueAsString: true,
                    setValueAs: (v) => v ? JSON.parse(v) : {}
                  })}
                  id="conditions"
                  rows={4}
                  className="input font-mono text-sm"
                  placeholder='{"resource_type": "admin", "action": "write"}'
                  defaultValue="{}"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="applies_to_roles" className="label">Applies to Roles (comma-separated)</label>
                  <input
                    {...register('applies_to_roles', {
                      valueAsString: true,
                      setValueAs: (v) => v ? v.split(',').map(s => s.trim()) : []
                    })}
                    id="applies_to_roles"
                    type="text"
                    className="input"
                    placeholder="admin,user"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="applies_to_devices" className="label">Applies to Devices (comma-separated)</label>
                  <input
                    {...register('applies_to_devices', {
                      valueAsString: true,
                      setValueAs: (v) => v ? v.split(',').map(s => s.trim()) : []
                    })}
                    id="applies_to_devices"
                    type="text"
                    className="input"
                    placeholder="dev_123,dev_456 or 'all'"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="applies_to_networks" className="label">Applies to Networks (CIDR, comma-separated)</label>
                <input
                  {...register('applies_to_networks', {
                    valueAsString: true,
                    setValueAs: (v) => v ? v.split(',').map(s => s.trim()) : []
                  })}
                  id="applies_to_networks"
                  type="text"
                  className="input"
                  placeholder="192.168.1.0/24,10.0.0.0/8"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); reset(); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">Edit Policy</h2>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <input type="hidden" {...register('id')} defaultValue={editingPolicy.id} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_name" className="label">Name *</label>
                  <input
                    {...register('name')}
                    id="edit_name"
                    type="text"
                    defaultValue={editingPolicy.name}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_policy_type" className="label">Type *</label>
                  <select
                    {...register('policy_type')}
                    id="edit_policy_type"
                    defaultValue={editingPolicy.policy_type}
                    className="input"
                  >
                    {TYPE_OPTIONS.filter(o => o.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_description" className="label">Description</label>
                <textarea
                  {...register('description')}
                  id="edit_description"
                  rows={3}
                  defaultValue={editingPolicy.description}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_action" className="label">Action *</label>
                  <select
                    {...register('action')}
                    id="edit_action"
                    defaultValue={editingPolicy.action}
                    className="input"
                  >
                    {ACTION_OPTIONS.filter(o => o.value).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_priority" className="label">Priority</label>
                  <input
                    {...register('priority', { valueAsNumber: true })}
                    id="edit_priority"
                    type="number"
                    min="1"
                    max="1000"
                    defaultValue={editingPolicy.priority}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label">Active</label>
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      id="edit_is_active"
                      type="checkbox"
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      defaultChecked={editingPolicy.is_active}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_min_risk" className="label">Min Risk Score</label>
                  <input
                    {...register('min_risk_score', { valueAsNumber: true })}
                    id="edit_min_risk"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingPolicy.min_risk_score}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_max_risk" className="label">Max Risk Score</label>
                  <input
                    {...register('max_risk_score', { valueAsNumber: true })}
                    id="edit_max_risk"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingPolicy.max_risk_score}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_min_trust" className="label">Min Trust Score</label>
                  <input
                    {...register('min_trust_score', { valueAsNumber: true })}
                    id="edit_min_trust"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingPolicy.min_trust_score}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit_max_trust" className="label">Max Trust Score</label>
                  <input
                    {...register('max_trust_score', { valueAsNumber: true })}
                    id="edit_max_trust"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingPolicy.max_trust_score}
                    className="input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_conditions" className="label">Conditions (JSON)</label>
                <textarea
                  {...register('conditions', {
                    valueAsString: true,
                    setValueAs: (v) => v ? JSON.parse(v) : {}
                  })}
                  id="edit_conditions"
                  rows={4}
                  defaultValue={JSON.stringify(editingPolicy.conditions || {}, null, 2)}
                  className="input font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
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
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Policy Details</h2>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getTypeBadge(selectedPolicy.policy_type)}
                {getActionBadge(selectedPolicy.action)}
                <span className={cn('badge', selectedPolicy.is_active ? 'badge-success' : 'badge-info')}>
                  {selectedPolicy.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-white">{selectedPolicy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">ID</p>
                  <p className="font-mono text-sm text-white">#{selectedPolicy.id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{selectedPolicy.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Priority</p>
                  <p className="font-mono text-white">{selectedPolicy.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Risk Range</p>
                  <p className="text-white">{selectedPolicy.min_risk_score}% - {selectedPolicy.max_risk_score}%</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Trust Range</p>
                  <p className="text-white">{selectedPolicy.min_trust_score}% - {selectedPolicy.max_trust_score}%</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Applies to Roles</p>
                  <p className="text-white">{selectedPolicy.applies_to_roles?.join(', ') || 'All'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Applies to Devices</p>
                  <p className="text-white">{selectedPolicy.applies_to_devices?.join(', ') || 'All'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Applies to Networks</p>
                  <p className="text-white">{selectedPolicy.applies_to_networks?.join(', ') || 'All'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Created</p>
                  <p className="text-white">{formatDate(selectedPolicy.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Updated</p>
                  <p className="text-white">{formatDate(selectedPolicy.updated_at)}</p>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Conditions</p>
                <pre className="bg-dark-900 p-4 rounded-lg text-xs text-dark-300 overflow-x-auto max-h-64">
                  {JSON.stringify(selectedPolicy.conditions || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { X } from 'lucide-react'