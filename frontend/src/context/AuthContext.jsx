import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials)

    if (response.data.mfa_required) {
      setMfaRequired(true)
      // Store temporary token for MFA verification
      localStorage.setItem('temp_token', response.data.access_token)
      return { mfaRequired: true }
    }

    const { access_token, refresh_token, ...userData } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setMfaRequired(false)

    return { mfaRequired: false, user: userData }
  }

  const verifyMfa = async (token) => {
    const tempToken = localStorage.getItem('temp_token')
    if (!tempToken) throw new Error('No temporary token found')

    const response = await api.post('/auth/mfa/verify', { token }, {
      headers: { Authorization: `Bearer ${tempToken}` }
    })

    const { access_token, refresh_token, ...userData } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.removeItem('temp_token')
    setUser(userData)
    setMfaRequired(false)

    return userData
  }

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      localStorage.removeItem('temp_token')
      setUser(null)
    }
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
    localStorage.setItem('user', JSON.stringify({ ...user, ...userData }))
  }

  const value = {
    user,
    loading,
    mfaRequired,
    login,
    verifyMfa,
    register,
    logout,
    updateUser,
    fetchUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}