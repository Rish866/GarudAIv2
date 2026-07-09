import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { classNames } from '../../../lib/utils';
import { Truck, IndianRupee, FileWarning, Wrench, Package, FileText, Info, Bell, CheckCheck } from 'lucide-react';
import type { Notification, ModuleName } from '../../../types';

type FilterTab = 'all' | 'unread' | 'trip_update' | 'payment_received' | 'document_expiry' | 'system';

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'trip_update':
      return <Truck className="w-5 h-5 text-blue-500" />;
    case 'payment_received':
      return <IndianRupee className="w-5 h-5 text-green-500" />;
    case 'document_expiry':
      return <FileWarning className="w-5 h-5 text-orange-500" />;
    case 'maintenance_due':
      return <Wrench className="w-5 h-5 text-yellow-500" />;
    case 'pod_received':
      return <Package className="w-5 h-5 text-purple-500" />;
    case 'invoice_generated':
      return <FileText className="w-5 h-5 text-indigo-500" />;
    case 'system':
      return <Info className="w-5 h-5 text-slate-500" />;
    default:
      return <Bell className="w-5 h-5 text-slate-400" />;
  }
}

export default function NotificationsModule() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const { notifications, markNotificationRead, markAllNotificationsRead, setActiveModule } = useStore();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'trip_update') return n.type === 'trip_update';
    if (filter === 'payment_received') return n.type === 'payment_received';
    if (filter === 'document_expiry') return n.type === 'document_expiry';
    if (filter === 'system') return n.type === 'system';
    return true;
  });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'trip_update', label: 'Trip Updates' },
    { key: 'payment_received', label: 'Payments' },
    { key: 'document_expiry', label: 'Documents' },
    { key: 'system', label: 'System' },
  ];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markNotificationRead(notification.id);
    }
    if (notification.link_module) {
      setActiveModule(notification.link_module as ModuleName);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              filter === tab.key
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No notifications matching this filter</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={classNames(
                'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-4 cursor-pointer hover:border-blue-200 dark:hover:border-blue-700 transition-colors',
                !notification.is_read && 'border-l-4 border-l-blue-500'
              )}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={classNames(
                  'text-sm text-slate-900 dark:text-white',
                  !notification.is_read ? 'font-bold' : 'font-medium'
                )}>
                  {notification.title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                  {getTimeAgo(notification.created_at)}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {!notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationRead(notification.id);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  >
                    Mark Read
                  </button>
                )}
                {notification.link_module && (
                  <div className="w-2 h-2 rounded-full bg-blue-400" title="Navigable" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
