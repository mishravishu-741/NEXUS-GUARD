import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  User,
  UserCheck,
  UserX,
  Shield,
  MoreVertical,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatDate, formatRelativeTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
]

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ search: '', role: '', is_active: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'user',
      is_active: true,
    }
  })

  const fetchUsers = async () => {
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
      const response = await api.get('/users', { params })
      setUsers(response.data)
      setPagination(prev => ({
        ...prev,
        total: response.data.length, // API doesn't return pagination for users yet
        total_pages: 1,
      }))
    } catch (error) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, filters])

  const handleCreate = async (data) => {
    try {
      await api.post('/users', data)
      toast.success('User created successfully')
      setShowCreateModal(false)
      reset()
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await api.patch(`/users/${editingUser.id}`, data)
      toast.success('User updated successfully')
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleActivate = async (userId) => {
    try {
      await api.post(`/users/${userId}/activate`)
      toast.success('User activated')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate user')
    }
  }

  const handleDeactivate = async (userId) => {
    try {
      await api.post(`/users/${userId}/deactivate`)
      toast.success('User deactivated')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate user')
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api.delete(`/users/${userId}`)
      toast.success('User deleted')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'badge-danger',
      user: 'badge-info',
    }
    return (
      <span className={cn('badge', badges[role])}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  const getStatusBadge = (isActive) => {
    return (
      <span className={cn('badge', isActive ? 'badge-success' : 'badge-danger')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-dark-400">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value, page: 1 }))}
            className="input max-w-xs"
          >
            {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email</th>
                <th>Last Login</th>
                <th>Failed Attempts</th>
                <th>Created</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-dark-400">No users found</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.username}</p>
                          {user.full_name && <p className="text-xs text-dark-400">{user.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getStatusBadge(user.is_active)}</td>
                    <td className="text-dark-300">{user.email}</td>
                    <td className="text-dark-400 text-sm">
                      {user.last_login ? formatRelativeTime(user.last_login) : 'Never'}
                    </td>
                    <td className={cn('font-mono text-sm', user.failed_login_attempts > 0 ? 'text-danger-400' : 'text-dark-300')}>
                      {user.failed_login_attempts}
                    </td>
                    <td className="text-dark-400 text-sm">{formatRelativeTime(user.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.is_active ? (
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            className="p-2 rounded-lg text-warning-400 hover:bg-warning-500/10 transition-colors"
                            title="Deactivate"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user.id)}
                            className="p-2 rounded-lg text-success-400 hover:bg-success-500/10 transition-colors"
                            title="Activate"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
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
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Create User</h2>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="label">Username *</label>
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                    pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Only letters, numbers, underscores and hyphens' },
                  })}
                  id="username"
                  type="text"
                  className={cn('input', errors.username && 'input-error')}
                  placeholder="johndoe"
                />
                {errors.username && <p className="form-error">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="label">Email *</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
                  })}
                  id="email"
                  type="email"
                  className={cn('input', errors.email && 'input-error')}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="full_name" className="label">Full Name</label>
                <input
                  {...register('full_name', { maxLength: { value: 255, message: 'Name too long' } })}
                  id="full_name"
                  type="text"
                  className="input"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="label">Password *</label>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    validate: {
                      uppercase: (v) => /[A-Z]/.test(v) || 'Must contain uppercase',
                      lowercase: (v) => /[a-z]/.test(v) || 'Must contain lowercase',
                      number: (v) => /[0-9]/.test(v) || 'Must contain number',
                      special: (v) => /[^A-Za-z0-9]/.test(v) || 'Must contain special char',
                    },
                  })}
                  id="password"
                  type="password"
                  className={cn('input', errors.password && 'input-error')}
                  placeholder="••••••••"
                />
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="role" className="label">Role</label>
                  <select
                    {...register('role')}
                    id="role"
                    className="input"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Status</label>
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      id="is_active"
                      type="checkbox"
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      defaultChecked={true}
                    />
                    <span className="ml-2 text-sm text-dark-300">Active</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); reset(); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Edit User</h2>
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
              <input type="hidden" {...register('id')} defaultValue={editingUser.id} />

              <div className="space-y-2">
                <label htmlFor="edit_username" className="label">Username</label>
                <input
                  {...register('username')}
                  id="edit_username"
                  type="text"
                  defaultValue={editingUser.username}
                  className="input"
                  disabled
                />
                <p className="text-xs text-dark-500">Username cannot be changed</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_email" className="label">Email</label>
                <input
                  {...register('email', { pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })}
                  id="edit_email"
                  type="email"
                  defaultValue={editingUser.email}
                  className={cn('input', errors.email && 'input-error')}
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="edit_full_name" className="label">Full Name</label>
                <input
                  {...register('full_name')}
                  id="edit_full_name"
                  type="text"
                  defaultValue={editingUser.full_name}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit_role" className="label">Role</label>
                  <select
                    {...register('role')}
                    id="edit_role"
                    defaultValue={editingUser.role}
                    className="input"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label">Status</label>
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      id="edit_is_active"
                      type="checkbox"
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      defaultChecked={editingUser.is_active}
                    />
                    <span className="ml-2 text-sm text-dark-300">Active</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
          <div className="card w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{selectedUser.username}</p>
                  <p className="text-dark-400">{selectedUser.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {getRoleBadge(selectedUser.role)}
                {getStatusBadge(selectedUser.is_active)}
              </div>

              <div className="border-t border-dark-700 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">User ID</p>
                    <p className="font-mono text-sm text-white">#{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-white">{selectedUser.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Failed Attempts</p>
                    <p className={cn('font-mono text-sm', selectedUser.failed_login_attempts > 0 ? 'text-danger-400' : 'text-success-400')}>
                      {selectedUser.failed_login_attempts}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Verified</p>
                    <p className={cn('font-medium', selectedUser.is_verified ? 'text-success-400' : 'text-warning-400')}>
                      {selectedUser.is_verified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Last Login</p>
                    <p className="text-white">{selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-white">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mb-1">Updated</p>
                    <p className="text-white">{formatDate(selectedUser.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { X } from 'lucide-react'