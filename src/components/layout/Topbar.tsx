import React from 'react';
import { Bell, Search, LogOut, Building2 } from 'lucide-react';
import { User, Company, SystemAlert } from '../../types';

interface TopbarProps {
  user: User;
  company: Company;
  alerts: SystemAlert[];
  onLogout: () => void;
}

export default function Topbar({ user, company, alerts, onLogout }: TopbarProps) {
  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search trips, vehicles, customers..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Company badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 max-w-[160px] truncate">{company.name}</span>
        </div>

        {/* Alerts */}
        <button className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
