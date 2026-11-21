import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions)
}

export function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString, { hour: undefined, minute: undefined })
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export function getSeverityColor(severity) {
  const colors = {
    info: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    low: 'text-success-400 bg-success-500/10 border-success-500/20',
    medium: 'text-warning-400 bg-warning-500/10 border-warning-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    critical: 'text-danger-400 bg-danger-500/10 border-danger-500/20',
  }
  return colors[severity?.toLowerCase()] || colors.info
}

export function getSeverityBadge(severity) {
  const badges = {
    info: 'badge-info',
    low: 'badge-success',
    medium: 'badge-warning',
    high: 'badge bg-orange-500/20 text-orange-300 border-orange-500/30',
    critical: 'badge-danger',
  }
  return badges[severity?.toLowerCase()] || badges.info
}

export function getDecisionColor(decision) {
  const colors = {
    allow: 'text-success-400 bg-success-500/10 border-success-500/20',
    deny: 'text-danger-400 bg-danger-500/10 border-danger-500/20',
    challenge: 'text-warning-400 bg-warning-500/10 border-warning-500/20',
    monitor: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  }
  return colors[decision?.toLowerCase()] || colors.monitor
}

export function getDeviceStatusColor(status) {
  const colors = {
    trusted: 'text-success-400 bg-success-500/10 border-success-500/20',
    untrusted: 'text-danger-400 bg-danger-500/10 border-danger-500/20',
    pending: 'text-warning-400 bg-warning-500/10 border-warning-500/20',
    revoked: 'text-dark-400 bg-dark-500/10 border-dark-500/20',
  }
  return colors[status?.toLowerCase()] || colors.pending
}

export function getTrustScoreColor(score) {
  if (score >= 80) return 'text-success-400'
  if (score >= 60) return 'text-primary-400'
  if (score >= 40) return 'text-warning-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-danger-400'
}

export function getRiskScoreColor(score) {
  if (score >= 80) return 'text-danger-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-warning-400'
  if (score >= 20) return 'text-primary-400'
  return 'text-success-400'
}

export function truncate(str, length = 50) {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

export function isTokenExpired(token) {
  const decoded = parseJwt(token)
  if (!decoded || !decoded.exp) return true
  return Date.now() >= decoded.exp * 1000
}