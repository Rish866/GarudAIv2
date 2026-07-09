import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import type { Vehicle, VehicleType, VehicleStatus, OwnershipType } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, getDaysUntil, classNames } from '../../../lib/utils';
import { exportVehicles } from '../../../lib/excel';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


const VEHICLE_TYPES: VehicleType[] = ['trailer', 'container', 'truck', 'tanker', 'tipper', 'reefer', 'lcv'];
const OWNERSHIP_TYPES: OwnershipType[] = ['owned', 'attached', 'market'];
const STATUS_FILTERS: { label: string; value: VehicleStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'On Trip', value: 'on_trip' },
  { label: 'Maintenance', value: 'maintenance' },
];

interface VehicleForm {
  reg_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  ownership_type: OwnershipType;
  owner_name: string;
  owner_phone: string;
  capacity_tons: number;
  fitness_expiry: string;
  insurance_expiry: string;
  puc_expiry: string;
  permit_expiry: string;
}

const emptyForm: VehicleForm = {
  reg_number: '',
  vehicle_type: 'truck',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  ownership_type: 'owned',
  owner_name: '',
  owner_phone: '',
  capacity_tons: 0,
  fitness_expiry: '',
  insurance_expiry: '',
  puc_expiry: '',
  permit_expiry: '',
};


export default function FleetModule() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.reg_number.toLowerCase().includes(search.toLowerCase()) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const vehiclesWithLocation = vehicles.filter((v) => v.lat && v.lng);


  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      reg_number: vehicle.reg_number,
      vehicle_type: vehicle.vehicle_type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      ownership_type: vehicle.ownership_type,
      owner_name: vehicle.owner_name,
      owner_phone: vehicle.owner_phone || '',
      capacity_tons: vehicle.capacity_tons,
      fitness_expiry: vehicle.fitness_expiry,
      insurance_expiry: vehicle.insurance_expiry,
      puc_expiry: vehicle.puc_expiry,
      permit_expiry: vehicle.permit_expiry,
    });
    setShowModal(true);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
      updateVehicle(editingVehicle.id, {
        reg_number: form.reg_number,
        vehicle_type: form.vehicle_type,
        make: form.make,
        model: form.model,
        year: form.year,
        ownership_type: form.ownership_type,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone || undefined,
        capacity_tons: form.capacity_tons,
        fitness_expiry: form.fitness_expiry,
        insurance_expiry: form.insurance_expiry,
        puc_expiry: form.puc_expiry,
        permit_expiry: form.permit_expiry,
      });
    } else {
      const newVehicle: Vehicle = {
        id: generateId(),
        company_id: 'comp_garud_001',
        reg_number: form.reg_number,
        vehicle_type: form.vehicle_type,
        make: form.make,
        model: form.model,
        year: form.year,
        ownership_type: form.ownership_type,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone || undefined,
        capacity_tons: form.capacity_tons,
        fitness_expiry: form.fitness_expiry,
        insurance_expiry: form.insurance_expiry,
        puc_expiry: form.puc_expiry,
        permit_expiry: form.permit_expiry,
        status: 'available',
        odometer: 0,
        created_at: new Date().toISOString(),
      };
      addVehicle(newVehicle);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteVehicle(id);
    setDeleteConfirm(null);
  };


  const getExpiryColor = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days < 30) return 'text-red-600 bg-red-50';
    if (days < 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500 mt-1">{vehicles.length} vehicles in fleet</p>
        </div>
        <button
          onClick={() => exportVehicles(vehicles)}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium"
        >
          Export Excel
        </button>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
        >
          + Add Vehicle
        </button>
      </div>


      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <input
          type="text"
          placeholder="Search by reg number or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                statusFilter === sf.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 ml-auto">
          <button
            onClick={() => setView('grid')}
            className={classNames(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={classNames(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            List
          </button>
        </div>
      </div>


      {/* Vehicle Grid */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200"
            >
              {/* Card Top */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{vehicle.reg_number}</h3>
                  <p className="text-slate-500 text-sm">{vehicle.make} {vehicle.model}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium capitalize">
                    {vehicle.vehicle_type}
                  </span>
                  <span className={classNames('px-2.5 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(vehicle.status))}>
                    {vehicle.status.replace('_', ' ')}
                  </span>
                </div>
              </div>


              {/* Info */}
              <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Capacity</p>
                  <p className="font-medium text-slate-700">{vehicle.capacity_tons}T</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Odometer</p>
                  <p className="font-medium text-slate-700">{vehicle.odometer.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Ownership</p>
                  <p className="font-medium text-slate-700 capitalize">{vehicle.ownership_type}</p>
                </div>
              </div>

              {/* Driver */}
              {vehicle.driver_name && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 text-xs font-bold">{vehicle.driver_name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{vehicle.driver_name}</span>
                </div>
              )}


              {/* GPS - On Trip */}
              {vehicle.status === 'on_trip' && vehicle.last_location && (
                <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-medium">{vehicle.speed} km/h</span>
                    <span className="text-blue-600 text-xs">{vehicle.last_location}</span>
                  </div>
                </div>
              )}

              {/* Document Expiry */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={classNames('px-2 py-1.5 rounded-lg text-center text-xs', getExpiryColor(vehicle.fitness_expiry))}>
                  <p className="font-medium">Fitness</p>
                  <p className="font-bold">{getDaysUntil(vehicle.fitness_expiry)}d</p>
                </div>
                <div className={classNames('px-2 py-1.5 rounded-lg text-center text-xs', getExpiryColor(vehicle.insurance_expiry))}>
                  <p className="font-medium">Insurance</p>
                  <p className="font-bold">{getDaysUntil(vehicle.insurance_expiry)}d</p>
                </div>
                <div className={classNames('px-2 py-1.5 rounded-lg text-center text-xs', getExpiryColor(vehicle.puc_expiry))}>
                  <p className="font-medium">PUC</p>
                  <p className="font-bold">{getDaysUntil(vehicle.puc_expiry)}d</p>
                </div>
              </div>


              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(vehicle)}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                {deleteConfirm === vehicle.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(vehicle.id)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Vehicle List (Table) */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Reg Number</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Make/Model</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Driver</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Location</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Odometer</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900">{vehicle.reg_number}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{vehicle.vehicle_type}</td>
                    <td className="px-5 py-3 text-slate-700">{vehicle.make} {vehicle.model}</td>
                    <td className="px-5 py-3 text-slate-600">{vehicle.driver_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={classNames('px-2.5 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(vehicle.status))}>
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{vehicle.last_location || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{vehicle.odometer.toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Map View */}
      {vehiclesWithLocation.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Vehicle Locations</h2>
          <div className="h-[300px] rounded-2xl overflow-hidden">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehiclesWithLocation.map((vehicle) => (
                <Marker key={vehicle.id} position={[vehicle.lat!, vehicle.lng!]}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{vehicle.reg_number}</p>
                      <p>{vehicle.make} {vehicle.model}</p>
                      {vehicle.driver_name && <p>Driver: {vehicle.driver_name}</p>}
                      {vehicle.speed !== undefined && <p>Speed: {vehicle.speed} km/h</p>}
                      {vehicle.last_location && <p>{vehicle.last_location}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}


      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
            <h2 className="text-xl font-bold text-slate-900 mb-5">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={form.reg_number}
                  onChange={(e) => setForm({ ...form, reg_number: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as VehicleType })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ownership</label>
                  <select
                    value={form.ownership_type}
                    onChange={(e) => setForm({ ...form, ownership_type: e.target.value as OwnershipType })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {OWNERSHIP_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>


              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>


              {(form.ownership_type === 'attached' || form.ownership_type === 'market') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
                    <input
                      type="text"
                      value={form.owner_name}
                      onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Owner Phone</label>
                    <input
                      type="text"
                      value={form.owner_phone}
                      onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity (Tons)</label>
                <input
                  type="number"
                  value={form.capacity_tons}
                  onChange={(e) => setForm({ ...form, capacity_tons: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fitness Expiry</label>
                  <input
                    type="date"
                    value={form.fitness_expiry}
                    onChange={(e) => setForm({ ...form, fitness_expiry: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={form.insurance_expiry}
                    onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PUC Expiry</label>
                  <input
                    type="date"
                    value={form.puc_expiry}
                    onChange={(e) => setForm({ ...form, puc_expiry: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Permit Expiry</label>
                  <input
                    type="date"
                    value={form.permit_expiry}
                    onChange={(e) => setForm({ ...form, permit_expiry: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>


              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
