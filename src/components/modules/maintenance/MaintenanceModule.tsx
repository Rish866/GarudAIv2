import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import type { MaintenanceRecord } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames } from '../../../lib/utils';
import { showToast } from '../../ui/Toast';

export default function MaintenanceModule() {
  const { data: maintenance, create: addMaintenance, update: updateMaintenance, remove: removeMaintenance } = useModuleData<any>('maintenance');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  // Summary calculations
  const activeJobs = maintenance.filter((m) => m.status === 'scheduled' || m.status === 'in_progress').length;
  const completedJobs = maintenance.filter((m) => m.status === 'completed').length;
  const totalCost = maintenance.reduce((sum, m) => sum + m.cost, 0);

  // Form state
  const [form, setForm] = useState({
    vehicle_id: editingRecord?.vehicle_id || '',
    type: (editingRecord?.type || 'preventive') as MaintenanceRecord['type'],
    description: editingRecord?.description || '',
    date: editingRecord?.date || new Date().toISOString().split('T')[0],
    odometer: editingRecord?.odometer || 0,
    cost: editingRecord?.cost || 0,
    vendor: editingRecord?.vendor || '',
  });

  const handleSubmit = async () => {
    if (!form.vehicle_id) { showToast('error', 'Select a vehicle'); return; }
    if (!form.description.trim()) { showToast('error', 'Description is required'); return; }
    if (form.cost < 0) { showToast('error', 'Cost cannot be negative'); return; }
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    const data = {
      vehicle_id: form.vehicle_id,
      vehicle_reg: vehicle?.reg_number || '',
      type: form.type,
      description: form.description.trim(),
      date: form.date,
      odometer: form.odometer,
      cost: form.cost,
      vendor: form.vendor,
    };
    if (editingRecord) {
      await updateMaintenance(editingRecord.id, data);
      showToast('success', 'Maintenance record updated');
    } else {
      await addMaintenance({ ...data, status: 'scheduled' });
      showToast('success', 'Maintenance scheduled');
    }
    setShowModal(false);
    setEditingRecord(null);
    setForm({ vehicle_id: '', type: 'preventive', description: '', date: new Date().toISOString().split('T')[0], odometer: 0, cost: 0, vendor: '' });
  };


  const typeColors: Record<string, string> = {
    preventive: 'bg-blue-100 text-blue-800',
    repair: 'bg-orange-100 text-orange-800',
    breakdown: 'bg-red-100 text-red-800',
    tyre: 'bg-purple-100 text-purple-800',
    inspection: 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Maintenance</h2>
        <button onClick={() => { setEditingRecord(null); setForm({ vehicle_id: '', type: 'preventive', description: '', date: new Date().toISOString().split('T')[0], odometer: 0, cost: 0, vendor: '' }); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">
          Schedule Maintenance
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Active Jobs</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{activeJobs}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedJobs}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalCost)}</p>
        </div>
      </div>


      {/* Maintenance List (cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {maintenance.map((record) => (
          <div key={record.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{record.vehicle_reg}</p>
                <span className={classNames('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium', typeColors[record.type] || 'bg-gray-100 text-gray-800')}>
                  {record.type}
                </span>
              </div>
              <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(record.status))}>
                {record.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-700 mb-2">{record.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>
                <span className="font-medium">Date:</span> {formatDate(record.date)}
              </div>
              <div>
                <span className="font-medium">Cost:</span> {formatCurrency(record.cost)}
              </div>
              <div>
                <span className="font-medium">Vendor:</span> {record.vendor}
              </div>
              <div>
                <span className="font-medium">Odometer:</span> {record.odometer.toLocaleString()} km
              </div>
              {record.next_due_date && (
                <div>
                  <span className="font-medium">Next Due:</span> {formatDate(record.next_due_date)}
                </div>
              )}
              {record.next_due_km && (
                <div>
                  <span className="font-medium">Next Due KM:</span> {record.next_due_km.toLocaleString()} km
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => { setEditingRecord(record); setForm({ vehicle_id: record.vehicle_id, type: record.type, description: record.description, date: record.date, odometer: record.odometer, cost: record.cost, vendor: record.vendor }); setShowModal(true); }} className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50">Edit</button>
              {record.status === 'scheduled' && (
                <button onClick={() => { updateMaintenance(record.id, { status: 'in_progress' }); showToast('success', 'Started'); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Start</button>
              )}
              {record.status === 'in_progress' && (
                <button onClick={() => { updateMaintenance(record.id, { status: 'completed' }); showToast('success', 'Completed'); }} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Complete</button>
              )}
              <button onClick={() => { removeMaintenance(record.id); showToast('success', 'Deleted'); }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium ml-auto">Delete</button>
            </div>
          </div>
        ))}
      </div>


      {/* Schedule Maintenance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{editingRecord ? 'Edit Maintenance' : 'Schedule Maintenance'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle</label>
                  <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceRecord['type'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="preventive">Preventive</option>
                    <option value="repair">Repair</option>
                    <option value="breakdown">Breakdown</option>
                    <option value="tyre">Tyre</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the maintenance work" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Odometer (km)</label>
                  <input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost (₹)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor</label>
                  <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Vendor name" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
