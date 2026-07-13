import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { MapPin, Plus, Bell, Shield, X, Circle as CircleIcon, Warehouse, Users, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';

type GeofenceType = 'loading_point' | 'unloading_point' | 'depot' | 'restricted' | 'customer';

interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  lat: number;
  lng: number;
  radius: number;
  status: 'active' | 'inactive';
  alerts_count: number;
}

interface GeofenceAlert {
  id: string;
  vehicle_reg: string;
  zone_name: string;
  event: 'entry' | 'exit';
  timestamp: string;
}


const seedAlerts: GeofenceAlert[] = [];

function getGeofenceColor(type: GeofenceType): string {
  switch (type) {
    case 'depot': return '#22c55e';
    case 'customer': return '#3b82f6';
    case 'restricted': return '#ef4444';
    case 'loading_point': return '#f59e0b';
    case 'unloading_point': return '#8b5cf6';
    default: return '#6b7280';
  }
}

function getTypeLabel(type: GeofenceType): string {
  switch (type) {
    case 'loading_point': return 'Loading Point';
    case 'unloading_point': return 'Unloading Point';
    case 'depot': return 'Depot';
    case 'restricted': return 'Restricted';
    case 'customer': return 'Customer';
    default: return type;
  }
}

function getTypeIcon(type: GeofenceType) {
  switch (type) {
    case 'depot': return <Warehouse className="w-4 h-4" />;
    case 'customer': return <Users className="w-4 h-4" />;
    case 'restricted': return <AlertTriangle className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
}

export default function GeofencingModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: geofences, create: createGeofence, remove: removeGeofence, loading: geofencesLoading } = useModuleData<Geofence>('geofences');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGeofence, setNewGeofence] = useState<{ name: string; type: GeofenceType; lat: string; lng: string; radius: string }>({
    name: '',
    type: 'depot',
    lat: '',
    lng: '',
    radius: '1000',
  });

  const vehiclesWithLocation = vehicles.filter(
    (v) =>
      v != null &&
      v.lat != null &&
      v.lng != null &&
      Number.isFinite(Number(v.lat)) &&
      Number.isFinite(Number(v.lng))
  );
  const geofencesWithLocation = geofences.filter(
    (gf) =>
      gf != null &&
      gf.lat != null &&
      gf.lng != null &&
      Number.isFinite(Number(gf.lat)) &&
      Number.isFinite(Number(gf.lng))
  );

  const handleAddGeofence = () => {
    if (!newGeofence.name || !newGeofence.lat || !newGeofence.lng) return;
    const gf: Geofence = {
      id: 'gf_' + Date.now(),
      name: newGeofence.name,
      type: newGeofence.type,
      lat: parseFloat(newGeofence.lat),
      lng: parseFloat(newGeofence.lng),
      radius: parseInt(newGeofence.radius) || 1000,
      status: 'active',
      alerts_count: 0,
    };
    createGeofence(gf);
    setNewGeofence({ name: '', type: 'depot', lat: '', lng: '', radius: '1000' });
    setShowAddModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Geofencing</h1>
          <p className="text-slate-500 mt-1">Define virtual boundaries and get alerts on entry/exit</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Geofence
        </button>
      </div>

      {/* Geofence List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Geofence Zones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {geofences.map((gf) => (
            <div
              key={gf.id}
              className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: getGeofenceColor(gf.type) + '20', color: getGeofenceColor(gf.type) }}
                  >
                    {getTypeIcon(gf.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm">{gf.name}</h3>
                    <p className="text-xs text-slate-500">{getTypeLabel(gf.type)}</p>
                  </div>
                </div>
                <span
                  className={classNames(
                    'px-2 py-0.5 text-xs rounded-full font-medium',
                    gf.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  )}
                >
                  {gf.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Radius: {gf.radius}m</span>
                <span className="flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {gf.alerts_count} alerts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Zone Map</h2>
        <div className="h-[400px] rounded-xl overflow-hidden border border-slate-200">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geofencesWithLocation.filter((gf) => gf.status === 'active').map((gf) => (
              <Circle
                key={gf.id}
                center={[Number(gf.lat), Number(gf.lng)]}
                radius={gf.radius}
                pathOptions={{ color: getGeofenceColor(gf.type), fillColor: getGeofenceColor(gf.type), fillOpacity: 0.2 }}
              />
            ))}
            {vehiclesWithLocation.map((v) => (
              <Marker key={v.id} position={[Number(v.lat), Number(v.lng)]}>
                <Popup>
                  <div className="text-sm">
                    <strong>{v.reg_number}</strong>
                    <br />
                    {v.last_location}
                    <br />
                    Speed: {v.speed} km/h
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {seedAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={classNames(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  alert.event === 'entry' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                )}>
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {alert.vehicle_reg} {alert.event === 'entry' ? 'entered' : 'exited'} {alert.zone_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(alert.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
              <span className={classNames(
                'px-2 py-1 text-xs rounded-full font-medium',
                alert.event === 'entry' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              )}>
                {alert.event}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Geofence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Geofence</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newGeofence.name}
                  onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Mumbai Warehouse"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newGeofence.type}
                  onChange={(e) => setNewGeofence({ ...newGeofence, type: e.target.value as GeofenceType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="depot">Depot</option>
                  <option value="loading_point">Loading Point</option>
                  <option value="unloading_point">Unloading Point</option>
                  <option value="customer">Customer</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newGeofence.lat}
                    onChange={(e) => setNewGeofence({ ...newGeofence, lat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="18.520"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newGeofence.lng}
                    onChange={(e) => setNewGeofence({ ...newGeofence, lng: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="73.856"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  value={newGeofence.radius}
                  onChange={(e) => setNewGeofence({ ...newGeofence, radius: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGeofence}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Add Zone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
