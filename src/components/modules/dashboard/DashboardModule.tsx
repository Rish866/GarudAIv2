import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Truck,
  Route,
  IndianRupee,
  Clock,
  Users,
  AlertTriangle,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useStore, getDashboardMetrics } from '../../../store/useStore';
import type { Vehicle, Trip, SystemAlert } from '../../../types';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function formatCompact(amount: number): string {
  if (amount >= 10000000) {
    return '₹' + (amount / 10000000).toFixed(1) + 'Cr';
  }
  if (amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(1) + 'L';
  }
  if (amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(1) + 'K';
  }
  return '₹' + amount.toString();
}

export default function DashboardModule() {
  const state = useStore();
  const metrics = getDashboardMetrics(state);
  const vehicles: Vehicle[] = state.vehicles;
  const trips: Trip[] = state.trips;
  const alerts: SystemAlert[] = state.alerts;

  const vehiclesWithLocation = vehicles.filter(
    (v) => v.lat !== undefined && v.lng !== undefined
  );

  const recentTrips = [...trips]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  const inactiveVehicles = vehicles.filter(
    (v) => v.status === 'inactive'
  ).length;

  const kpiCards = [
    {
      label: 'Total Fleet',
      value: metrics.totalVehicles.toString(),
      icon: Truck,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Active Trips',
      value: metrics.activeTrips.toString(),
      icon: Route,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      label: 'Revenue',
      value: formatCompact(metrics.totalRevenue),
      icon: IndianRupee,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
    },
    {
      label: 'Outstanding',
      value: formatCompact(metrics.totalOutstanding),
      icon: Clock,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-100',
    },
    {
      label: 'Available Drivers',
      value: `${metrics.availableDrivers}/${metrics.totalDrivers}`,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Alerts',
      value: metrics.unreadAlerts.toString(),
      icon: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live Map */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            Live Fleet Tracking
          </h2>
          <span className="ml-auto text-sm text-slate-500">
            {vehiclesWithLocation.length} vehicles on map
          </span>
        </div>
        <div className="h-[400px] rounded-2xl overflow-hidden">
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
                  <div className="text-sm space-y-1">
                    <p className="font-bold text-slate-800">
                      {vehicle.reg_number}
                    </p>
                    <p className="text-slate-600">
                      Driver: {vehicle.driver_name || 'Unassigned'}
                    </p>
                    <p className="text-slate-600">
                      Speed: {vehicle.speed ?? 0} km/h
                    </p>
                    <p className="text-slate-600">
                      Status:{' '}
                      <span className="capitalize">
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Location: {vehicle.last_location || 'Unknown'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${card.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fleet Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Fleet Status
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {metrics.activeVehicles}
            </p>
            <p className="text-xs text-slate-500">On Trip</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {metrics.availableVehicles}
            </p>
            <p className="text-xs text-slate-500">Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {metrics.maintenanceVehicles}
            </p>
            <p className="text-xs text-slate-500">Maintenance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">
              {inactiveVehicles}
            </p>
            <p className="text-xs text-slate-500">Inactive</p>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">
              Recent Trips
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTrips.map((trip) => (
              <div
                key={trip.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">
                        {trip.trip_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}
                      >
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                      <span className="truncate">{trip.origin}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {trip.vehicle_reg}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(trip.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Alerts</h3>
            {unreadAlerts.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadAlerts.length} new
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
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
                    className="px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${severityDot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(alert.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
