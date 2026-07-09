import React from 'react';
import { Truck, Route, IndianRupee, AlertTriangle, Clock, FileCheck, TrendingUp, TrendingDown, Users, Wrench, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardMetrics, Trip, SystemAlert, Vehicle } from '../../../types';

interface DashboardProps {
  metrics: DashboardMetrics;
  trips: Trip[];
  alerts: SystemAlert[];
  vehicles: Vehicle[];
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color }: { title: string; value: string; subtitle: string; icon: React.ElementType; trend?: string; trendUp?: boolean; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-0.5">{value}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <p className="text-[11px] text-slate-400 mt-1">{title}</p>
    </div>
  );
}

export default function Dashboard({ metrics, trips, alerts, vehicles }: DashboardProps) {
  const activeTrips = trips.filter(t => ['in_transit', 'loading', 'assigned'].includes(t.status));
  const recentTrips = trips.slice(0, 5);
  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of your transport operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Fleet" value={String(metrics.total_vehicles)} subtitle={`${metrics.available_vehicles} available`} icon={Truck} color="blue" trend="+2" trendUp={true} />
        <StatCard title="Active Trips" value={String(metrics.active_trips)} subtitle="In transit now" icon={Route} color="green" />
        <StatCard title="Monthly Revenue" value={`₹${(metrics.monthly_revenue / 100000).toFixed(1)}L`} subtitle="This month" icon={IndianRupee} color="indigo" trend="+12%" trendUp={true} />
        <StatCard title="Outstanding" value={`₹${(metrics.outstanding_receivables / 100000).toFixed(1)}L`} subtitle={`${metrics.overdue_invoices} overdue`} icon={Clock} color="orange" />
        <StatCard title="Pending POD" value={String(metrics.pending_pod)} subtitle="Awaiting receipt" icon={FileCheck} color="purple" />
        <StatCard title="Alerts" value={String(unreadAlerts.length)} subtitle="Require action" icon={AlertTriangle} color="red" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Trips */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Active Trips</h2>
            <span className="text-xs text-slate-400">{activeTrips.length} in progress</span>
          </div>
          <div className="divide-y divide-slate-50">
            {activeTrips.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No active trips</div>
            ) : (
              activeTrips.map((trip) => (
                <div key={trip.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Route className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{trip.trip_number}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{trip.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{trip.origin} → {trip.destination}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{trip.vehicle_reg}</p>
                    <p className="text-xs text-slate-400">{trip.driver_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Alerts</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{unreadAlerts.length} unread</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
            {unreadAlerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">All clear!</div>
            ) : (
              unreadAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fleet Status Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Fleet Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-emerald-600">{vehicles.filter(v => v.status === 'on_trip').length}</div>
            <p className="text-xs text-slate-500 mt-1">On Trip</p>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-blue-600">{vehicles.filter(v => v.status === 'available').length}</div>
            <p className="text-xs text-slate-500 mt-1">Available</p>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-amber-600">{vehicles.filter(v => v.status === 'maintenance').length}</div>
            <p className="text-xs text-slate-500 mt-1">Maintenance</p>
          </div>
          <div className="p-5 text-center">
            <div className="text-2xl font-bold text-slate-400">{vehicles.filter(v => v.status === 'inactive').length}</div>
            <p className="text-xs text-slate-500 mt-1">Inactive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
