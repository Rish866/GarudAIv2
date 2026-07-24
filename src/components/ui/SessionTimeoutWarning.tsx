// Session Timeout Warning Modal
// Displays when user has been idle and is about to be logged out

import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { performLogout } from '../../lib/auth';
import { useStore } from '../../store/useStore';

interface SessionTimeoutWarningProps {
  secondsRemaining: number;
  onExtend: () => void;
}

export default function SessionTimeoutWarning({ secondsRemaining, onExtend }: SessionTimeoutWarningProps) {
  const { logout } = useStore();

  const handleLogout = async () => {
    await performLogout();
    logout();
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4 animate-scale-in"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Session Expiring
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              You will be logged out due to inactivity
            </p>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-3xl font-bold font-mono text-amber-600">{timeDisplay}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Click "Stay Logged In" to continue your session
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-medium transition-colors hover:bg-red-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <LogOut size={16} />
            Log Out
          </button>
          <button
            onClick={onExtend}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
