import { useState, useEffect } from 'react'
import {
  Users,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { cn, formatNumber, formatRelativeTime, getSeverityColor, getSeverityBadge, getDecisionColor } from '../utils/helpers'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const [statsRes, chartsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/charts'),
        api.get('/dashboard/recent-activity?limit=10'),
      ])
      setStats(statsRes.data)
      setCharts(chartsRes.data)
      setRecentActivity(activityRes.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
      border: 'border-primary-500/20',
      trend: stats?.active_users ? `${stats.active_users} active` : null,
      trendUp: true,
    },
    {
      title: 'Devices',
      value: stats?.total_devices || 0,
      icon: HardDrive,
      color: 'text-success-400',
      bg: 'bg-success-500/10',
      border: 'border-success-500/20',
      trend: `${stats?.trusted_devices || 0} trusted, ${stats?.untrusted_devices || 0} untrusted`,
      trendUp: (stats?.trusted_devices || 0) > (stats?.untrusted_devices || 0),
    },
    {
      title: 'Security Events (24h)',
      value: stats?.security_events_24h || 0,
      icon: Activity,
      color: 'text-warning-400',
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/20',
      trend: stats?.critical_alerts ? `${stats.critical_alerts} critical` : null,
      trendUp: false,
    },
    {
      title: 'Threat Alerts',
      value: stats?.open_alerts || 0,
      icon: AlertTriangle,
      color: 'text-danger-400',
      bg: 'bg-danger-500/10',
      border: 'border-danger-500/20',
      trend: `${stats?.critical_alerts || 0} critical, ${stats?.high_alerts || 0} high`,
      trendUp: false,
    },
    {
      title: 'Access Decisions (24h)',
      value: stats?.access_decisions_24h || 0,
      icon: ShieldCheck,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      trend: `${stats?.allow_decisions || 0} allowed, ${stats?.deny_decisions || 0} denied`,
      trendUp: (stats?.allow_decisions || 0) > (stats?.deny_decisions || 0),
    },
    {
      title: 'Pending Devices',
      value: stats?.pending_devices || 0,
      icon: HardDrive,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      trend: 'Awaiting approval',
      trendUp: null,
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-dark-400">Security overview and system status</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="btn-secondary"
          >
            <Loader2 className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 w-1/4 bg-dark-700 rounded mb-4" />
              <div className="h-8 w-1/2 bg-dark-700 rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="card p-6 animate-pulse h-80">
            <div className="h-4 w-1/4 bg-dark-700 rounded mb-6" />
            <div className="h-full bg-dark-700 rounded" />
          </div>
          <div className="card p-6 animate-pulse h-80">
            <div className="h-4 w-1/4 bg-dark-700 rounded mb-6" />
            <div className="h-full bg-dark-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400">Security overview and system status</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="btn-secondary"
        >
          <Loader2 className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="card-hover p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{formatNumber(stat.value)}</p>
                {stat.trend && (
                  <p className={cn('text-xs mt-1 flex items-center gap-1', stat.trendUp === true ? 'text-success-400' : stat.trendUp === false ? 'text-danger-400' : 'text-dark-400')}>
                    {stat.trendUp !== null && (
                      stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.trend}
                  </p>
                )}
              </div>
              <div className={cn('p-3 rounded-xl', stat.bg, stat.border)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Events by Severity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            Security Events by Severity
          </h3>
          <div className="h-64">
            {charts?.events_by_severity?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.events_by_severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="label"
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {charts.events_by_severity.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatNumber(value), '']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>

        {/* Threat Alerts by Severity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-400" />
            Threat Alerts by Severity
          </h3>
          <div className="h-64">
            {charts?.alerts_by_severity?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.alerts_by_severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="label"
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {charts.alerts_by_severity.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatNumber(value), '']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Decisions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Access Decisions (24h)
          </h3>
          <div className="h-64">
            {charts?.access_decisions?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.access_decisions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="label" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                  <Tooltip
                    formatter={(value) => [formatNumber(value), '']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>

        {/* Device Trust Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-success-400" />
            Device Trust Distribution
          </h3>
          <div className="h-64">
            {charts?.device_trust_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.device_trust_distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="label" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                  <Tooltip
                    formatter={(value) => [formatNumber(value), ' devices']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    fill={
                      (props) => {
                        const index = charts.device_trust_distribution.findIndex(d => d.label === props.payload.label)
                        if (index >= 3) return '#22c55e'
                        if (index >= 1) return '#f59e0b'
                        return '#ef4444'
                      }
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Login Trends (7 days)
          </h3>
          <div className="h-64">
            {charts?.login_trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.login_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [formatNumber(value), ' logins']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#loginGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>

        {/* Threat Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-400" />
            Threat Detection Trends (7 days)
          </h3>
          <div className="h-64">
            {charts?.threat_trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.threat_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [formatNumber(value), ' threats']}
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            Recent Security Activity
          </h3>
          <button className="btn-secondary btn-sm">View All</button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Severity</th>
                <th>User</th>
                <th>Device</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dark-400">No recent activity</td>
                </tr>
              ) : (
                recentActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td className="text-dark-400 font-mono text-xs">{formatRelativeTime(activity.timestamp)}</td>
                    <td>
                      <div className="font-medium text-white">{activity.title}</div>
                      {activity.description && (
                        <div className="text-xs text-dark-400 truncate max-w-xs">{activity.description}</div>
                      )}
                    </td>
                    <td>
                      <span className={cn('badge', getSeverityBadge(activity.severity))}>
                        {activity.severity}
                      </span>
                    </td>
                    <td className="text-dark-300">{activity.user || '-'}</td>
                    <td className="text-dark-300">{activity.device || '-'}</td>
                    <td className="font-mono text-xs text-dark-400">{activity.ip || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}