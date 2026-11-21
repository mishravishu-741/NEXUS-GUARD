import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2,
  Shield,
  Key,
  Bell,
  Palette,
  Database,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { cn } from '../utils/helpers'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const { user, updateUser, fetchUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'mfa', label: 'Two-Factor Auth', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      full_name: user?.full_name || '',
    }
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors },
  } = useForm()

  const newPassword = watchPassword('new_password')

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    const levels = [
      { label: 'Very Weak', color: 'bg-danger-500' },
      { label: 'Weak', color: 'bg-danger-500' },
      { label: 'Fair', color: 'bg-warning-500' },
      { label: 'Good', color: 'bg-primary-500' },
      { label: 'Strong', color: 'bg-success-500' },
    ]
    return { score, ...levels[Math.min(score, 4)] }
  }

  const strength = getPasswordStrength(newPassword)

  const onSubmitProfile = async (data) => {
    setIsLoading(true)
    try {
      const response = await api.patch(`/users/${user.id}`, data)
      updateUser(response.data)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitPassword = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success('Password changed successfully')
      resetPasswordForm()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPasswordForm = () => {
    // Reset password form fields
  }

  const handleMfaSetup = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/auth/mfa/setup')
      // Show MFA setup modal with QR code
      // This would be a modal component
      toast.success('MFA setup initiated - check the modal')
      console.log('MFA Setup:', response.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to setup MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaDisable = async () => {
    if (!confirm('Are you sure you want to disable MFA?')) return
    setIsLoading(true)
    try {
      await api.post('/auth/mfa/disable')
      toast.success('MFA disabled')
      fetchUser()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disable MFA')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-dark-400">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div className="border-b border-dark-700 overflow-x-auto">
          <nav className="flex gap-1 px-4" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-white">Profile Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="label">Username</label>
                  <input
                    {...registerProfile('username', {
                      required: 'Username is required',
                      minLength: { value: 3, message: 'Username must be at least 3 characters' },
                      pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Only letters, numbers, underscores and hyphens' },
                    })}
                    id="username"
                    type="text"
                    className={cn('input', profileErrors.username && 'input-error')}
                    disabled
                  />
                  <p className="text-xs text-dark-500">Username cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="label">Email *</label>
                  <input
                    {...registerProfile('email', {
                      required: 'Email is required',
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
                    })}
                    id="email"
                    type="email"
                    className={cn('input', profileErrors.email && 'input-error')}
                  />
                  {profileErrors.email && <p className="form-error">{profileErrors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="full_name" className="label">Full Name</label>
                <input
                  {...registerProfile('full_name', { maxLength: { value: 255, message: 'Name too long' } })}
                  id="full_name"
                  type="text"
                  className="input"
                  placeholder="John Doe"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-700">
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-white">Change Password</h3>

              <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="current_password" className="label">Current Password</label>
                  <div className="relative">
                    <input
                      {...registerPassword('current_password', { required: 'Current password is required' })}
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={cn('input pr-10', passwordErrors.current_password && 'input-error')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.current_password && <p className="form-error">{passwordErrors.current_password.message}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="new_password" className="label">New Password</label>
                  <div className="relative">
                    <input
                      {...registerPassword('new_password', {
                        required: 'New password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                        validate: {
                          uppercase: (v) => /[A-Z]/.test(v) || 'Must contain uppercase',
                          lowercase: (v) => /[a-z]/.test(v) || 'Must contain lowercase',
                          number: (v) => /[0-9]/.test(v) || 'Must contain number',
                          special: (v) => /[^A-Za-z0-9]/.test(v) || 'Must contain special char',
                        },
                      })}
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      className={cn('input pr-10', passwordErrors.new_password && 'input-error')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.new_password && <p className="form-error">{passwordErrors.new_password.message}</p>}

                  {/* Password Strength */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className="flex-1 rounded transition-colors"
                            style={{ backgroundColor: level <= strength.score ? strength.color : '#1e293b' }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-dark-400 mt-1 text-right">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm_password" className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      {...registerPassword('confirm_password', {
                        required: 'Please confirm your password',
                        validate: (v) => v === newPassword || 'Passwords do not match',
                      })}
                      id="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={cn('input pr-10', passwordErrors.confirm_password && 'input-error')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && <p className="form-error">{passwordErrors.confirm_password.message}</p>}
                </div>

                <div className="flex justify-end pt-4 border-t border-dark-700">
                  <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MFA Tab */}
          {activeTab === 'mfa' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">Authenticator App</h4>
                    <p className="text-dark-400 text-sm">Use an authenticator app like Google Authenticator, Authy, or 1Password</p>
                  </div>
                  {user?.mfa_enabled ? (
                    <span className="badge-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Enabled
                    </span>
                  ) : (
                    <span className="badge-warning flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Disabled
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  {!user?.mfa_enabled ? (
                    <button
                      onClick={handleMfaSetup}
                      disabled={isLoading}
                      className="btn-primary"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          Set Up MFA
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleMfaDisable}
                      disabled={isLoading}
                      className="btn-danger"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Disable MFA
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <h4 className="font-semibold text-white mb-4">Backup Codes</h4>
                <p className="text-dark-400 text-sm mb-4">
                  Store these codes in a safe place. Each code can be used once if you lose access to your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="bg-dark-900 p-3 rounded-lg font-mono text-sm text-center text-white border border-dark-700">
                      ••••
                    </div>
                  ))}
                </div>
                <button className="btn-secondary mt-4">
                  <RefreshCw className="w-4 h-4" />
                  Generate New Codes
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>

              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Security Alerts</p>
                    <p className="text-dark-400 text-sm">Receive notifications for critical security events</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">New Device Login</p>
                    <p className="text-dark-400 text-sm">Notify when a new device accesses your account</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Policy Changes</p>
                    <p className="text-dark-400 text-sm">Notify when security policies are modified</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Weekly Security Report</p>
                    <p className="text-dark-400 text-sm">Receive a weekly summary of security activity</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-white">Appearance</h3>

              <div className="card p-6 space-y-4">
                <div>
                  <p className="font-medium text-white mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="p-4 rounded-lg border-2 border-dark-600 hover:border-primary-500 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-white/10 mx-auto mb-2" />
                      <p className="text-sm text-center text-dark-300">Light</p>
                    </button>
                    <button className="p-4 rounded-lg border-2 border-primary-500 bg-primary-500/10">
                      <div className="w-10 h-10 rounded-lg bg-dark-900 mx-auto mb-2" />
                      <p className="text-sm text-center text-white">Dark</p>
                    </button>
                    <button className="p-4 rounded-lg border-2 border-dark-600 hover:border-primary-500 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-white/10 to-dark-900 mx-auto mb-2" />
                      <p className="text-sm text-center text-dark-300">System</p>
                    </button>
                  </div>
                </div>

                <div className="border-t border-dark-700 pt-4">
                  <p className="font-medium text-white mb-3">Density</p>
                  <div className="flex gap-3">
                    <button className="btn-secondary">Comfortable</button>
                    <button className="btn-primary">Compact</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { X, RefreshCw, User } from 'lucide-react'