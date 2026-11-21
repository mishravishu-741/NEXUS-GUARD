import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/helpers'
import toast from 'react-hot-toast'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaToken, setMfaToken] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

  const onSubmit = async (data) => {
    // Convert remember_me from string "on" to boolean, or default to false
    const processedData = {
      email: data.email,
      password: data.password,
      remember_me: data.remember_me === true || data.remember_me === 'on' ? true : false,
      mfa_token: data.mfa_token || undefined,
    }
    setIsLoading(true)
    try {
      const result = await login(processedData)
      if (result.mfaRequired) {
        toast.success('Enter your MFA token to continue')
      } else {
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    } catch (error) {
      // Convert structured FastAPI validation error to readable string
      let message = 'Invalid credentials'
      if (error.response?.data) {
        const errorData = error.response.data
        // Handle structured validation error: {type, loc, msg, input, ctx}
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          if (errorData.msg) {
            message = errorData.msg
          } else if (errorData.detail) {
            message = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
          } else {
            message = JSON.stringify(errorData)
          }
        } else if (typeof errorData === 'string') {
          message = errorData
        }
      }
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    if (!mfaToken || mfaToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      const { verifyMfa } = useAuth()
      await verifyMfa(mfaToken)
      toast.success('MFA verified successfully!')
      navigate('/dashboard')
    } catch (error) {
      // Convert structured FastAPI validation error to readable string
      let message = 'Invalid MFA token'
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          if (errorData.msg) {
            message = errorData.msg
          } else if (errorData.detail) {
            message = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
          } else {
            message = JSON.stringify(errorData)
          }
        } else if (typeof errorData === 'string') {
          message = errorData
        }
      }
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
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

        {/* Login Card */}
        <div className="card glass-strong p-8 animate-in">
          {mfaToken ? (
            // MFA Verification
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
                <p className="text-dark-400 mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="input text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || mfaToken.length !== 6}
                  className="btn-primary w-full btn-lg"
                >
                  {isLoading ? (
                    <>
                      <svg className="spinner-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setMfaToken('')}
                  className="text-sm text-dark-400 hover:text-white transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          ) : (
            // Login Form
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white">Sign in to your account</h2>
                <p className="text-dark-400 mt-1">Use your credentials to access the dashboard</p>
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
                    placeholder="admin@nexusguard.local"
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
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden="true" />
                  <input
                    {...register('password', { required: 'Password is required' })}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={cn('input pl-10 pr-10', errors.password && 'input-error')}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    {...register('remember_me')}
                    type="checkbox"
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-dark-300">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>

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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-dark-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
          <p className="text-xs text-dark-500 text-center mb-2">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-dark-900 p-2 rounded font-mono text-dark-300">admin@nexusguard.com</div>
            <div className="bg-dark-900 p-2 rounded font-mono text-dark-300">Admin123</div>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-dark-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
            <span>End-to-End Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
            <span>Zero Trust Architecture</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
            <span>MFA Enforced</span>
          </div>
        </div>
      </div>
    </div>
  )
}