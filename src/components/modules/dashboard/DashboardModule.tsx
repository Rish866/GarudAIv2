import { useStore, getDashboardMetrics } from '../../../store/useStore';
import { useBranchData } from '../../../hooks/useBranchData';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Truck,
  Route,
  IndianRupee,
  Clock,
  Users,
  AlertTriangle,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Package,
  Calendar,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Compact currency formatter (Indian notation)
function formatCompact(amount: number): string {
  if (amount >= 10000000) {
    return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
  }
  if (amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(1) + ' L';
  }
  if (amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(1) + 'K';
  }
  return '₹' + amount.toString();
}

// Revenue vs Expenses chart data — derived from actual invoices/expenses
// Shows last 6 months of real data, or empty if no data exists
function getRevenueExpenseChartData(invoices: any[], expenses: any[], fuelEntries: any[]) {
  const months: { month: string; revenue: number; expenses: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthRevenue = invoices
      .filter(inv => inv.invoice_date?.startsWith(yearMonth))
      .reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
    const monthExpenses = expenses
      .filter(exp => exp.date?.startsWith(yearMonth))
      .reduce((s: number, exp: any) => s + (exp.amount || 0), 0)
      + fuelEntries
      .filter(f => f.date?.startsWith(yearMonth))
      .reduce((s: number, f: any) => s + (f.amount || 0), 0);
    months.push({ month: monthStr, revenue: monthRevenue, expenses: monthExpenses });
  }
  return months;
}

// Pie chart colors
const PIE_COLORS = ['#22c55e', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// Notification type icon mapping
function getNotificationIcon(type: string) {
  switch (type) {
    case 'trip_update':
      return <Route className="w-4 h-4 text-blue-500" />;
    case 'payment_received':
      return <IndianRupee className="w-4 h-4 text-green-500" />;
    case 'document_expiry':
      return <Calendar className="w-4 h-4 text-orange-500" />;
    case 'maintenance_due':
      return <Truck className="w-4 h-4 text-yellow-500" />;
    case 'pod_received':
      return <Package className="w-4 h-4 text-purple-500" />;
    case 'invoice_generated':
      return <IndianRupee className="w-4 h-4 text-indigo-500" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardModule() {
  const state = useStore();
  const branchData = useBranchData();
  // Use branch-filtered data for KPIs
  const metrics = getDashboardMetrics({ ...state, vehicles: branchData.vehicles, trips: branchData.trips, invoices: branchData.invoices, payments: branchData.payments, expenses: branchData.expenses, drivers: branchData.drivers, alerts: branchData.alerts });
  const { vehicles, trips, alerts, notifications, user } = { ...state, vehicles: branchData.vehicles, trips: branchData.trips, alerts: branchData.alerts };

  const vehiclesWithLocation = vehicles.filter(
    (v) => v.lat !== undefined && v.lng !== undefined
  );
  const onlineVehicles = vehicles.filter(
    (v) => v.status === 'on_trip' && v.lat !== undefined
  );

  const activeTrips = trips.filter((t) =>
    ['in_transit', 'loading', 'assigned'].includes(t.status)
  );

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  // Dynamic chart data from actual store data
  const revenueExpenseChartData = getRevenueExpenseChartData(state.invoices, state.expenses, state.fuelEntries);
  const hasChartData = revenueExpenseChartData.some(d => d.revenue > 0 || d.expenses > 0);

  const recentNotifications = [...notifications]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Trip status distribution for pie chart
  const tripStatusCounts = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(tripStatusCounts).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
  }));

  // KPI Cards
  const kpiCards = [
    {
      label: 'Total Fleet',
      value: metrics.totalVehicles.toString(),
      icon: Truck,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: '+2',
      trendUp: true,
    },
    {
      label: 'Active Trips',
      value: metrics.activeTrips.toString(),
      icon: Route,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Monthly Revenue',
      value: formatCompact(metrics.totalRevenue),
      icon: IndianRupee,
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      trend: '+18%',
      trendUp: true,
    },
    {
      label: 'Outstanding',
      value: formatCompact(metrics.totalOutstanding),
      icon: Clock,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: '-5%',
      trendUp: false,
    },
    {
      label: 'Available Drivers',
      value: `${metrics.availableDrivers}/${metrics.totalDrivers}`,
      icon: Users,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      trend: '+1',
      trendUp: true,
    },
    {
      label: 'Unread Alerts',
      value: metrics.unreadAlerts.toString(),
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      trend: '-3',
      trendUp: false,
    },
  ];

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {greeting}, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Here&apos;s what&apos;s happening with your fleet today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-sm">
            New Trip
          </button>
          <button className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors shadow-sm">
            Add Vehicle
          </button>
        </div>
      </motion.div>

      {/* 2. KPI Cards Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              variants={itemVariants}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full ${card.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {card.value}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <span
                  className={`flex items-center text-xs font-medium ${
                    card.trendUp
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {card.trendUp ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {card.trend}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* 3. Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
      >
        {/* Revenue vs Expenses Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Revenue vs Expenses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last 6 months overview
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-500 dark:text-slate-400">Revenue</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-slate-500 dark:text-slate-400">Expenses</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueExpenseChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(v: number) =>
                  v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v}`
                }
              />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trip Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Trip Status Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current trip breakdown
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {pieData.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="capitalize">{entry.name}</span>
                <span className="font-medium">({entry.value})</span>
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. Live Fleet Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Live Fleet Tracking
          </h2>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {onlineVehicles.length} vehicles online
            </span>
          </div>
        </div>
        <div className="h-[350px]">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vehiclesWithLocation.map((vehicle) => (
              <Marker
                key={vehicle.id}
                position={[vehicle.lat!, vehicle.lng!]}
              >
                <Popup>
                  <div className="text-sm space-y-1 min-w-[180px]">
                    <p className="font-bold text-slate-800">
                      {vehicle.reg_number}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium">Driver:</span>{' '}
                      {vehicle.driver_name || 'Unassigned'}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium">Speed:</span>{' '}
                      {vehicle.speed ?? 0} km/h
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium">Status:</span>{' '}
                      <span className="capitalize">
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium">Location:</span>{' '}
                      {vehicle.last_location || 'Unknown'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </motion.div>

      {/* 5. Bottom Grid — 3 columns */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Col 1: Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentNotifications.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No recent activity
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: Active Trips */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-500" />
              Active Trips
            </h3>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {activeTrips.length} active
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[360px] overflow-y-auto">
            {activeTrips.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No active trips
              </div>
            ) : (
              activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {trip.trip_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}
                    >
                      {trip.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[100px]">{trip.origin.split(',')[0]}</span>
                    <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-400" />
                    <span className="truncate max-w-[100px]">{trip.destination.split(',')[0]}</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {trip.vehicle_reg} • {trip.customer_name}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Alerts
            </h3>
            {unreadAlerts.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadAlerts.length} new
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[360px] overflow-y-auto">
            {unreadAlerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No unread alerts
              </div>
            ) : (
              unreadAlerts.map((alert) => {
                const severityDot =
                  alert.severity === 'critical'
                    ? 'bg-red-500'
                    : alert.severity === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500';
                return (
                  <div
                    key={alert.id}
                    className="px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${severityDot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
