import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/helpers'
import toast from 'react-hot-toast'

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await registerUser(data)
      toast.success('Account created successfully!')
      navigate('/login')
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

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

  const strength = getPasswordStrength(password)

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">NEXUS GUARD</h1>
          <p className="text-dark-400 mt-2">Zero Trust Network Security System</p>
        </div>

        {/* Register Card */}
        <div className="card glass-strong p-8 animate-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white">Create your account</h2>
              <p className="text-dark-400 mt-1">Join NEXUS GUARD to secure your network</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="label">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                    maxLength: { value: 100, message: 'Username too long' },
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message: 'Only letters, numbers, underscores and hyphens allowed',
                    },
                  })}
                  id="username"
                  type="text"
                  className={cn('input pl-10', errors.username && 'input-error')}
                  placeholder="johndoe"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  id="email"
                  type="email"
                  className={cn('input pl-10', errors.email && 'input-error')}
                  placeholder="john@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="full_name" className="label">Full Name (Optional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                <input
                  {...register('full_name', { maxLength: { value: 255, message: 'Name too long' } })}
                  id="full_name"
                  type="text"
                  className="input pl-10"
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    validate: {
                      uppercase: (v) => /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                      lowercase: (v) => /[a-z]/.test(v) || 'Must contain at least one lowercase letter',
                      number: (v) => /[0-9]/.test(v) || 'Must contain at least one number',
                      special: (v) => /[^A-Za-z0-9]/.test(v) || 'Must contain at least one special character',
                    },
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={cn('input pl-10 pr-10', errors.password && 'input-error')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="flex-1 rounded transition-colors"
                        style={{
                          backgroundColor: level <= strength.score ? strength.color : '#1e293b',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-dark-400 mt-1 text-right">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm_password" className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                <input
                  {...register('confirm_password', {
                    required: 'Please confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  className={cn('input pl-10', errors.confirm_password && 'input-error')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
              {errors.confirm_password && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                {...register('terms', { required: 'You must accept the terms' })}
                id="terms"
                type="checkbox"
                className="w-4 h-4 mt-0.5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-dark-300">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-400 hover:text-primary-300">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-400 hover:text-primary-300">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && (
              <p className="form-error flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.terms.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full btn-lg"
            >
              {isLoading ? (
                <>
                  <svg className="spinner-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-dark-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security features */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-success-500 mx-auto mb-2" />
            <p className="text-xs text-dark-400">MFA Ready</p>
          </div>
          <div className="p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-success-500 mx-auto mb-2" />
            <p className="text-xs text-dark-400">Encrypted</p>
          </div>
          <div className="p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-success-500 mx-auto mb-2" />
            <p className="text-xs text-dark-400">Zero Trust</p>
          </div>
        </div>
      </div>
    </div>
  )
}