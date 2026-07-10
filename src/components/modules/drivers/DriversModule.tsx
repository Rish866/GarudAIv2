import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { useBranchData } from '../../../hooks/useBranchData';
import type { Driver } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, getDaysUntil, classNames } from '../../../lib/utils';
import { exportDrivers } from '../../../lib/excel';
import { Plus, Search, Phone, Shield, MapPin, Calendar, X, AlertTriangle } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

export default function DriversModule() {
  const { addDriver } = useStore();
  const { drivers } = useBranchData();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const filteredDrivers = drivers.filter((driver) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      driver.name.toLowerCase().includes(query) ||
      driver.phone.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Driver Management</h1>
          <p className="text-sm text-slate-500 mt-1">{drivers.length} total drivers</p>
        </div>
        <button
          onClick={() => setShowBulkUpload(true)}
          className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          Bulk Upload
        </button>
        <button
          onClick={() => exportDrivers(drivers)}
          className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          Export
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredDrivers.map((driver) => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No drivers found matching your search.
        </div>
      )}

      {showBulkUpload && (
        <BulkUpload
          title="Bulk Upload Drivers"
          description="Import drivers from a CSV file"
          sampleFields={['name', 'phone', 'license_number', 'license_expiry', 'address', 'emergency_contact', 'emergency_phone', 'salary_type', 'base_salary', 'date_of_joining']}
          onUpload={(data) => {
            data.forEach(row => {
              addDriver({
                id: generateId(),
                company_id: 'comp_garud_001',
                name: row.name || '',
                phone: row.phone || '',
                license_number: row.license_number || '',
                license_expiry: row.license_expiry || '',
                address: row.address || '',
                emergency_contact: row.emergency_contact || '',
                emergency_phone: row.emergency_phone || '',
                salary_type: (row.salary_type as any) || 'monthly',
                base_salary: Number(row.base_salary) || 0,
                date_of_joining: row.date_of_joining || new Date().toISOString().split('T')[0],
                status: 'available',
                safety_score: 85,
                total_trips: 0,
                total_km: 0,
                created_at: new Date().toISOString(),
              });
            });
          }}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      {/* Add Driver Modal */}
      {showModal && <AddDriverModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function DriverCard({ driver }: { key?: string; driver: Driver }) {
  const licenseExpDays = getDaysUntil(driver.license_expiry);
  const isLicenseExpiring = licenseExpDays <= 30;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatKm = (km: number) => {
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
    return km.toString();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      {/* Top: Avatar + Name + Status */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {getInitials(driver.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">{driver.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Phone size={12} className="text-slate-400" />
            <span className="text-sm text-slate-500">{driver.phone}</span>
          </div>
        </div>
        <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', getStatusColor(driver.status))}>
          {driver.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Assigned Vehicle */}
      {driver.assigned_vehicle_reg && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-lg">
          <MapPin size={14} className="text-blue-500" />
          <span className="text-sm text-slate-700 font-medium">{driver.assigned_vehicle_reg}</span>
        </div>
      )}

      {/* License */}
      <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs text-slate-600">{driver.license_number}</span>
        </div>
        <span className={classNames('text-xs font-medium', isLicenseExpiring ? 'text-red-600' : 'text-slate-500')}>
          {isLicenseExpiring && <AlertTriangle size={12} className="inline mr-1" />}
          Exp: {formatDate(driver.license_expiry)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Shield size={12} className="text-green-500" />
            <span className="text-sm font-bold text-slate-900">{driver.safety_score}</span>
          </div>
          <span className="text-xs text-slate-400">Safety</span>
        </div>
        <div className="text-center">
          <span className="text-sm font-bold text-slate-900">{driver.total_trips}</span>
          <br />
          <span className="text-xs text-slate-400">Trips</span>
        </div>
        <div className="text-center">
          <span className="text-sm font-bold text-slate-900">{formatKm(driver.total_km)}</span>
          <br />
          <span className="text-xs text-slate-400">KM</span>
        </div>
      </div>

      {/* Salary */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500 capitalize">{driver.salary_type.replace(/_/g, ' ')}</span>
        <span className="text-sm font-bold text-slate-900">{formatCurrency(driver.base_salary)}</span>
      </div>
    </div>
  );
}

function AddDriverModal({ onClose }: { onClose: () => void }) {
  const { addDriver } = useStore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    salary_type: 'monthly' as 'monthly' | 'per_trip' | 'per_km',
    base_salary: '',
    date_of_joining: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const driver: Driver = {
      id: generateId(),
      company_id: 'comp_garud_001',
      name: form.name,
      phone: form.phone,
      license_number: form.license_number,
      license_expiry: form.license_expiry,
      address: form.address,
      emergency_contact: form.emergency_contact,
      emergency_phone: form.emergency_phone,
      salary_type: form.salary_type,
      base_salary: Number(form.base_salary) || 0,
      date_of_joining: form.date_of_joining,
      status: 'available',
      safety_score: 85,
      total_trips: 0,
      total_km: 0,
      created_at: new Date().toISOString(),
    };

    addDriver(driver);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Add Driver</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
              <input type="text" name="license_number" value={form.license_number} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Expiry</label>
              <input type="date" name="license_expiry" value={form.license_expiry} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input type="text" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
              <input type="text" name="emergency_phone" value={form.emergency_phone} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary Type</label>
              <select name="salary_type" value={form.salary_type} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="monthly">Monthly</option>
                <option value="per_trip">Per Trip</option>
                <option value="per_km">Per KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary</label>
              <input type="number" name="base_salary" value={form.base_salary} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Joining</label>
            <input type="date" name="date_of_joining" value={form.date_of_joining} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
