import React, { useState } from 'react';
import {
  LayoutDashboard,
  Truck,
  Route,
  Users,
  Building2,
  MessageSquare,
  Receipt,
  Fuel,
  Wrench,
  BarChart3,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  X,
  Circle,
  FileText,
  Satellite,
  DollarSign,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { canAccessModule } from '../../lib/rbac';
import type { ModuleName } from '../../types';

interface NavItem {
  id: ModuleName;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  separator?: boolean;
}

export default function Sidebar() {
  const {
    activeModule,
    sidebarCollapsed,
    theme,
    user,
    branches,
    activeBranch,
    alerts,
    setActiveModule,
    toggleSidebar,
    toggleTheme,
    setActiveBranch,
  } = useStore();

  const [branchOpen, setBranchOpen] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

  const navItems: NavItem[] = [
    // Overview
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    
    // Masters (Setup first)
    { id: 'fleet', label: 'Fleet', icon: Truck, separator: true },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'customers', label: 'Customers', icon: Building2 },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    
    // Operations (Daily workflow)
    { id: 'enquiries', label: 'Enquiries', icon: MessageSquare, separator: true },
    { id: 'trips', label: 'Trips', icon: Route },
    { id: 'market', label: 'Market Hire', icon: ShoppingCart },
    
    // Finance
    { id: 'billing', label: 'Billing', icon: Receipt, separator: true },
    { id: 'accounts', label: 'Cash & Bank', icon: DollarSign },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    
    // Fleet Operations
    { id: 'fuel', label: 'Fuel', icon: Fuel, separator: true },
    { id: 'tyres', label: 'Tyres', icon: Circle },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'documents', label: 'Documents', icon: FileText },
    
    // Intelligence
    { id: 'gps', label: 'GPS Tracking', icon: Satellite, separator: true },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
  ];

  const userRole = user.role;
  const filteredNavItems = navItems.filter(item => canAccessModule(userRole, item.id));

  const handleNavClick = (module: ModuleName) => {
    setActiveModule(module);
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'}
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 h-16 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <Truck size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Garud AI
                </h1>
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Transport ERP
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>

        {/* Separator */}
        <div className="mx-3 h-px" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Branch Selector */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 relative">
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="truncate">{activeBranch === 'all' ? 'All Branches' : branches.find(b => b.id === activeBranch)?.name || 'Select Branch'}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${branchOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {branchOpen && (
              <div
                className="absolute left-3 right-3 mt-1 rounded-lg shadow-lg border z-10 animate-slide-in"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <button
                  key="all"
                  onClick={() => {
                    setActiveBranch('all');
                    setBranchOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors first:rounded-t-lg
                    ${activeBranch === 'all' ? 'font-semibold' : ''}
                  `}
                  style={{
                    color: activeBranch === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: activeBranch === 'all' ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  All Branches
                </button>
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setActiveBranch(branch.id);
                      setBranchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors first:rounded-t-lg last:rounded-b-lg
                      ${activeBranch === branch.id ? 'font-semibold' : ''}
                    `}
                    style={{
                      color: activeBranch === branch.id ? 'var(--accent)' : 'var(--text-secondary)',
                      backgroundColor: activeBranch === branch.id ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    {branch.name} ({branch.code})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="mx-3 h-px" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.separator && (
                  <div className="mx-3 my-2 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
                )}
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                    ${isActive ? 'border-l-[3px]' : 'border-l-[3px] border-transparent'}
                  `}
                  style={{
                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  {!sidebarCollapsed && (
                    <span className="truncate animate-fade-in">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip for collapsed mode */}
                  {sidebarCollapsed && (
                    <div
                      className="absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.label}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="mx-3 h-px" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Bottom Section */}
        <div className="p-3 space-y-2 flex-shrink-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
            style={{ color: 'var(--text-secondary)' }}
            title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            <div className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            {!sidebarCollapsed && (
              <span className="animate-fade-in">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {/* User Card */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
              <span className="text-white text-xs font-bold">
                {user.name.charAt(0)}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden animate-fade-in">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {user.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
