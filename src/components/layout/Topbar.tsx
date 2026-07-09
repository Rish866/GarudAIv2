import { Search, Bell, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Topbar() {
  const user = useStore((s) => s.user);
  const company = useStore((s) => s.company);
  const alerts = useStore((s) => s.alerts);
  const logout = useStore((s) => s.logout);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
      {/* Left: Search */}
      <div className="relative w-80">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search vehicles, trips, customers..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Company badge */}
        <span className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
          {company.name}
        </span>

        {/* User avatar + name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
            {user.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-slate-700">{user.name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
