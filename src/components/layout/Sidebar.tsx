import React from 'react';
import { ModuleName } from '../../types';
import { LayoutDashboard, Truck, Route, Users, Receipt, Fuel, Wrench, UserCircle, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeModule: ModuleName;
  onModuleChange: (module: ModuleName) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { id: ModuleName; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'fuel', label: 'Fuel', icon: Fuel },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeModule, onModuleChange, collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-40 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-blue-600/20">
            G
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Garud AI</h1>
              <p className="text-[10px] text-slate-400 font-medium">Transport ERP</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
