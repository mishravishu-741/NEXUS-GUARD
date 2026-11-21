import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Shield,
  Monitor,
  AlertTriangle,
  FileText,
  Settings,
  Users,
  HardDrive,
  Key,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Activity,
  Network,
  Database,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn, formatRelativeTime } from '../utils/helpers'
import toast from 'react-hot-toast'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/devices', icon: HardDrive },
  { name: 'Network', href: '/network', icon: Network },
  { name: 'Threats', href: '/threats', icon: AlertTriangle },
  { name: 'Policies', href: '/policies', icon: ShieldCheck },
  { name: 'Access Logs', href: '/access-decisions', icon: Key },
  { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
  { name: 'Security Events', href: '/security-events', icon: Activity },
]

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function MainLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Simulated notifications - in production, this would come from a WebSocket or polling
  useEffect(() => {
    const mockNotifications = [
      { id: 1, title: 'New device registered', message: 'MacBook Pro added to your devices', time: '2m ago', type: 'info' },
      { id: 2, title: 'Policy updated', message: 'Access policy for admin panel modified', time: '15m ago', type: 'warning' },
      { id: 3, title: 'Threat detected', message: 'Suspicious login from new location', time: '1h ago', type: 'danger' },
    ]
    setNotifications(mockNotifications)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'danger': return <AlertTriangle className="w-5 h-5 text-danger-400" />
      case 'warning': return <Bell className="w-5 h-5 text-warning-400" />
      default: return <Shield className="w-5 h-5 text-primary-400" />
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-dark-900 border-r border-dark-700 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-white tracking-tight">
                NEXUS GUARD
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  'sidebar-link',
                  isActive && 'sidebar-link-active',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
          })}

          {isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-dark-700">
                {sidebarOpen && (
                  <p className="px-3 text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
                    Administration
                  </p>
                )}
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) => cn(
                        'sidebar-link',
                        isActive && 'sidebar-link-active',
                        !sidebarOpen && 'justify-center px-2'
                      )}
                      title={sidebarOpen ? undefined : item.name}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      {sidebarOpen && <span>{item.name}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-dark-700">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary-400" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-dark-400 truncate capitalize">{user?.role || 'user'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex-1 btn btn-secondary btn-sm justify-center"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col min-w-0 lg:ml-64', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass-strong border-b border-dark-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-white hidden sm:block">
                {navigation.find(n => location.pathname === n.href || location.pathname.startsWith(n.href + '/'))?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 rounded-full text-xs font-medium flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl py-2 animate-in">
                    <div className="px-4 py-2 border-b border-dark-700 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Notifications</h3>
                      <button className="text-dark-400 hover:text-white text-sm">Mark all read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-dark-400">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className="px-4 py-3 hover:bg-dark-700/50 border-b border-dark-700/50 last:border-0"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-1.5 rounded-lg bg-dark-700 flex-shrink-0 mt-0.5">
                                {getNotificationIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{n.title}</p>
                                <p className="text-xs text-dark-400 mt-0.5">{n.message}</p>
                                <p className="text-xs text-dark-500 mt-1">{n.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">{user?.username}</p>
                    <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}