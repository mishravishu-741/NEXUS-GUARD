import { useState, useEffect } from 'react'
import {
  Search,
  Loader2,
  RefreshCw,
  Eye,
  AlertTriangle,
  Server,
  Wifi,
  Network,
  HardDrive,
  Monitor,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import api from '../services/api'
import { cn, formatRelativeTime } from '../utils/helpers'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export function NetworkPage() {
  const [systemMetrics, setSystemMetrics] = useState(null)
  const [connections, setConnections] = useState([])
  const [networkStats, setNetworkStats] = useState(null)
  const [processes, setProcesses] = useState([])
  const [listeningPorts, setListeningPorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [metricsRes, connectionsRes, netStatsRes, processesRes, portsRes] = await Promise.all([
        api.get('/monitoring/metrics'),
        api.get('/monitoring/connections'),
        api.get('/monitoring/stats'),
        api.get('/monitoring/processes'),
        api.get('/monitoring/ports'),
      ])
      setSystemMetrics(metricsRes.data)
      setConnections(connectionsRes.data)
      setNetworkStats(netStatsRes.data)
      setProcesses(processesRes.data)
      setListeningPorts(portsRes.data)
    } catch (error) {
      toast.error('Failed to load network data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Network Monitoring</h1>
            <p className="text-dark-400">Real-time network and system monitoring</p>
          </div>
          <button onClick={fetchData} disabled={refreshing} className="btn-secondary">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 w-1/4 bg-dark-700 rounded mb-4" />
              <div className="h-8 w-1/2 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'connections', label: 'Connections', icon: Wifi },
    { id: 'processes', label: 'Processes', icon: Server },
    { id: 'ports', label: 'Listening Ports', icon: HardDrive },
    { id: 'interfaces', label: 'Interfaces', icon: Network },
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Monitoring</h1>
          <p className="text-dark-400">Real-time network and system monitoring</p>
        </div>
        <button onClick={fetchData} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* System Metrics Cards */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-hover p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400">CPU Usage</p>
                <p className="text-3xl font-bold text-white mt-1">{systemMetrics.cpu?.percent?.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <Activity className="w-6 h-6 text-primary-400" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.cpu?.percent || 0}%` }}
              />
            </div>
          </div>

          <div className="card-hover p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400">Memory Usage</p>
                <p className="text-3xl font-bold text-white mt-1">{systemMetrics.memory?.percent?.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-success-500/10 border border-success-500/20">
                <HardDrive className="w-6 h-6 text-success-400" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-success-500 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.memory?.percent || 0}%` }}
              />
            </div>
          </div>

          <div className="card-hover p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400">Disk Usage</p>
                <p className="text-3xl font-bold text-white mt-1">{systemMetrics.disk?.percent?.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20">
                <Monitor className="w-6 h-6 text-warning-400" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-warning-500 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics.disk?.percent || 0}%` }}
              />
            </div>
          </div>

          <div className="card-hover p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400">Active Connections</p>
                <p className="text-3xl font-bold text-white mt-1">{connections.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Wifi className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-dark-700 overflow-x-auto">
          <nav className="flex gap-1 px-4" aria-label="Network monitoring tabs">
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Network Traffic Chart */}
              {networkStats && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Network Traffic (bytes/sec)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ label: 'Current', sent: networkStats.interfaces ? Object.values(networkStats.interfaces).reduce((a, b) => a + (b.bytes_sent || 0), 0) : 0, recv: networkStats.interfaces ? Object.values(networkStats.interfaces).reduce((a, b) => a + (b.bytes_recv || 0), 0) : 0 }]}>
                        <defs>
                          <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="recvGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                        <YAxis tick={{ fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="sent" stroke="#0ea5e9" fill="url(#sentGradient)" name="Sent" />
                        <Area type="monotone" dataKey="recv" stroke="#22c55e" fill="url(#recvGradient)" name="Received" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Network Interfaces */}
              {networkStats?.interfaces && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Network Interfaces</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Interface</th>
                          <th>Bytes Sent</th>
                          <th>Bytes Received</th>
                          <th>Packets Sent</th>
                          <th>Packets Received</th>
                          <th>Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(networkStats.interfaces).map(([name, stats]) => (
                          <tr key={name}>
                            <td className="font-mono text-white">{name}</td>
                            <td className="text-dark-300">{(stats.bytes_sent / 1024 / 1024).toFixed(2)} MB</td>
                            <td className="text-dark-300">{(stats.bytes_recv / 1024 / 1024).toFixed(2)} MB</td>
                            <td className="text-dark-300">{stats.packets_sent?.toLocaleString() || '-'}</td>
                            <td className="text-dark-300">{stats.packets_recv?.toLocaleString() || '-'}</td>
                            <td className={cn('font-mono', (stats.errin + stats.errout) > 0 ? 'text-danger-400' : 'text-success-400')}>
                              {(stats.errin || 0) + (stats.errout || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Local Address</th>
                      <th>Remote Address</th>
                      <th>Status</th>
                      <th>Process</th>
                      <th>PID</th>
                      <th>Protocol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-dark-400">No active connections</td>
                      </tr>
                    ) : (
                      connections.slice(0, 50).map((conn, idx) => (
                        <tr key={idx}>
                          <td className="font-mono text-sm text-white">{conn.local_address}</td>
                          <td className="font-mono text-sm text-dark-300">{conn.remote_address}</td>
                          <td>
                            <span className={cn('badge', conn.status === 'ESTABLISHED' ? 'badge-success' : 'badge-info')}>
                              {conn.status}
                            </span>
                          </td>
                          <td className="text-dark-300">{conn.process_name}</td>
                          <td className="font-mono text-sm text-dark-300">{conn.pid || '-'}</td>
                          <td className="text-dark-300 text-capitalize">{conn.protocol?.toLowerCase()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {connections.length > 50 && (
                <p className="text-sm text-dark-400 mt-2 text-center">Showing 50 of {connections.length} connections</p>
              )}
            </div>
          )}

          {activeTab === 'processes' && (
            <div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Process</th>
                      <th>PID</th>
                      <th>User</th>
                      <th>CPU %</th>
                      <th>Memory %</th>
                      <th>Connections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-dark-400">No processes with network connections</td>
                      </tr>
                    ) : (
                      processes.slice(0, 50).map((proc, idx) => (
                        <tr key={idx}>
                          <td className="font-medium text-white">{proc.name}</td>
                          <td className="font-mono text-sm text-dark-300">{proc.pid}</td>
                          <td className="text-dark-300">{proc.username || '-'}</td>
                          <td className="text-dark-300">{proc.cpu_percent?.toFixed(1) || 0}%</td>
                          <td className="text-dark-300">{proc.memory_percent?.toFixed(1) || 0}%</td>
                          <td>
                            <span className="badge-info">{proc.network_connections || 0}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ports' && (
            <div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Process</th>
                      <th>PID</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listeningPorts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-dark-400">No listening ports found</td>
                      </tr>
                    ) : (
                      listeningPorts.map((port, idx) => {
                        const suspiciousPorts = [22, 23, 3389, 5900, 4444, 31337, 12345, 54321]
                        const portNum = parseInt(port.address.split(':').pop() || '0')
                        const isSuspicious = suspiciousPorts.includes(portNum)
                        return (
                          <tr key={idx}>
                            <td className="font-mono text-white">{port.address}</td>
                            <td className="text-dark-300">{port.process_name}</td>
                            <td className="font-mono text-sm text-dark-300">{port.pid || '-'}</td>
                            <td>
                              <span className={cn('badge', isSuspicious ? 'badge-danger' : 'badge-success')}>
                                {isSuspicious ? 'Suspicious' : 'Normal'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'interfaces' && networkStats && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(networkStats.interfaces).map(([name, stats]) => (
                  <div key={name} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">{name}</h4>
                      <span className="badge-success">Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-dark-400">Sent</p>
                        <p className="text-white font-mono">{(stats.bytes_sent / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div>
                        <p className="text-dark-400">Received</p>
                        <p className="text-white font-mono">{(stats.bytes_recv / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div>
                        <p className="text-dark-400">Pckts Sent</p>
                        <p className="text-white font-mono">{stats.packets_sent?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <p className="text-dark-400">Pckts Recv</p>
                        <p className="text-white font-mono">{stats.packets_recv?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <p className="text-dark-400">Errors In</p>
                        <p className={cn('font-mono', (stats.errin || 0) > 0 ? 'text-danger-400' : 'text-success-400')}>{stats.errin || 0}</p>
                      </div>
                      <div>
                        <p className="text-dark-400">Errors Out</p>
                        <p className={cn('font-mono', (stats.errout || 0) > 0 ? 'text-danger-400' : 'text-success-400')}>{stats.errout || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}