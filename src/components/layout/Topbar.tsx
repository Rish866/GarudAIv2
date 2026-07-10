import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  TruckIcon,
  CreditCard,
  FileWarning,
  Wrench,
  Package,
  FileText,
  Info,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ModuleName } from '../../types';
import HelpButton from '../ui/HelpButton';
import { MODULE_HELP } from '../../lib/helpContent';

const moduleLabels: Record<ModuleName, string> = {
  dashboard: 'Dashboard',
  fleet: 'Fleet Management',
  trips: 'Trip Management',
  drivers: 'Driver Management',
  customers: 'Customer Management',
  enquiries: 'Enquiries',
  billing: 'Billing & Invoices',
  fuel: 'Fuel Management',
  maintenance: 'Maintenance',
  reports: 'Reports & Analytics',
  settings: 'Settings',
  notifications: 'Notifications',
  tyres: 'Tyre Management',
  payroll: 'Payroll',
  contracts: 'Contract Rate Master',
  market: 'Market / Hire Vehicles',
  documents: 'Document Vault',
  gps: 'GPS Integration',
  accounts: 'Cash & Bank',
  purchases: 'Purchases',
  sales: 'Sales',
  inventory: 'Inventory',
  geofencing: 'Geofencing',
  sla: 'SLA Monitoring',
  dashcam: 'AI Dashcam',
  fueltheft: 'Fuel Alerts',
  challans: 'Challans & Fines',
  workorders: 'Work Orders',
  ewaybill: 'E-Way Bill',
  audittrail: 'Audit Trail',
  portal: 'Customer Portal',
  pnl: 'P&L / Balance Sheet',
  gstreports: 'GST Reports',
  vendors: 'Vendors',
  routes: 'Routes',
  indents: 'Indents / Orders',
  attendance: 'Attendance & Leave',
  creditblock: 'Credit Control',
  transfers: 'Branch Transfers',
  restapi: 'REST API',
  predictive: 'AI Analytics',
  mobileapp: 'Mobile App',
  approvals: 'Approvals',
  trackinglinks: 'Tracking Links',
  expiry: 'Doc Expiry',
};

const notificationIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trip_update: TruckIcon,
  payment_received: CreditCard,
  document_expiry: FileWarning,
  maintenance_due: Wrench,
  pod_received: Package,
  invoice_generated: FileText,
  system: Info,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Topbar() {
  const {
    activeModule,
    notifications,
    user,
    theme,
    vehicles,
    trips,
    customers,
    drivers,
    toggleSidebar,
    toggleTheme,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveModule,
    logout,
  } = useStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const recentNotifications = notifications.slice(0, 5);

  // Search logic
  const searchResults = searchQuery.length >= 2 ? [
    ...vehicles.filter(v => v.reg_number.toLowerCase().includes(searchQuery.toLowerCase()) || v.driver_name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(v => ({ type: 'Vehicle', title: v.reg_number, subtitle: `${v.make} ${v.model} • ${v.driver_name || 'No driver'}`, module: 'fleet' as ModuleName })),
    ...trips.filter(t => t.trip_number.toLowerCase().includes(searchQuery.toLowerCase()) || t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || t.lr_number.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(t => ({ type: 'Trip', title: t.trip_number, subtitle: `${t.origin} → ${t.destination} • ${t.customer_name}`, module: 'trips' as ModuleName })),
    ...customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.contact_person.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(c => ({ type: 'Customer', title: c.name, subtitle: `${c.contact_person} • ${c.phone}`, module: 'customers' as ModuleName })),
    ...drivers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery)).slice(0, 3).map(d => ({ type: 'Driver', title: d.name, subtitle: `${d.phone} • ${d.assigned_vehicle_reg || 'Unassigned'}`, module: 'drivers' as ModuleName })),
  ].slice(0, 8) : [];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-6 border-b sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <Menu size={20} style={{ color: 'var(--text-primary)' }} />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {moduleLabels[activeModule] || 'Dashboard'}
        </h2>
        <HelpButton
          title={MODULE_HELP[activeModule]?.title || 'Help'}
          content={MODULE_HELP[activeModule]?.content || 'No help available for this module yet.'}
          steps={MODULE_HELP[activeModule]?.steps}
        />
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
        <div
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search vehicles, trips, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs px-1.5 py-0.5 rounded hover:bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-tertiary)' }}>✕</button>
          )}
          {!searchQuery && (
            <kbd
              className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border"
              style={{
                color: 'var(--text-tertiary)',
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <span>&#8984;</span>K
            </kbd>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.length >= 2 && searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto animate-slide-in"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
          >
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveModule(result.module); setSearchQuery(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
              >
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {result.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{result.title}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{result.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl p-4 text-center animate-slide-in"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No results found</p>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUserOpen(false);
            }}
            className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse-dot">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--accent)' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        No notifications
                      </p>
                    </div>
                  ) : (
                    recentNotifications.map((notif) => {
                      const Icon = notificationIcons[notif.type] || Info;
                      return (
                        <button
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                          style={{
                            backgroundColor: notif.is_read ? 'transparent' : 'var(--accent-light)',
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <Icon size={14} style={{ color: 'var(--accent)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs ${notif.is_read ? 'font-medium' : 'font-semibold'}`}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {notif.title}
                            </p>
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                              {notif.message}
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                              {timeAgo(notif.created_at)}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setUserOpen(!userOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user.name.charAt(0)}</span>
            </div>
          </button>

          <AnimatePresence>
            {userOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* User Info */}
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {user.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {user.email}
                      </p>
                      <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--accent)' }}>
                        {user.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <UserIcon size={16} />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setUserOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>

                  <div className="my-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />

                  <button
                    onClick={() => {
                      logout();
                      setUserOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
