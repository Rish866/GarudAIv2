import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

// Global toast state
let toastListeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

export function showToast(type: ToastType, message: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  toasts = [{ id, type, message }, ...toasts].slice(0, 5);
  toastListeners.forEach(fn => fn([...toasts]));
  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(fn => fn([...toasts]));
  }, 4000);
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListeners.push(setItems);
    return () => { toastListeners = toastListeners.filter(fn => fn !== setItems); };
  }, []);

  const dismiss = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(fn => fn([...toasts]));
  };

  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const iconColors = { success: 'text-green-500', error: 'text-red-500', warning: 'text-yellow-500', info: 'text-blue-500' };

  if (items.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {items.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right-5 ${colors[toast.type]}`}>
            <Icon className={`w-5 h-5 shrink-0 ${iconColors[toast.type]}`} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="p-1 rounded hover:opacity-70 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
