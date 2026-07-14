import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { showToast } from '../../ui/Toast';
import { Edit, Trash2, X } from 'lucide-react';
import { usePermission } from '../../../hooks/usePermission';

export default function FuelModule() {
  const { data: fuelEntries, create: addFuelEntry, update: updateFuelEntry, remove: removeFuelEntry } = useModuleData<any>('fuel_entries');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');
  const { can } = usePermission();
  const canCreate = can('fuel.create');
  const canEdit = can('fuel.update');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const totalFuelSpend = fuelEntries.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  const totalLitres = fuelEntries.reduce((sum: number, f: any) => sum + (f.litres || 0), 0);
  const entriesWithMileage = fuelEntries.filter((f: any) => f.mileage && f.mileage > 0);
  const avgMileage = entriesWithMileage.length > 0
    ? entriesWithMileage.reduce((sum: number, f: any) => sum + f.mileage, 0) / entriesWithMileage.length : 0;

  const handleDelete = async (id: string) => {
    const result = await removeFuelEntry(id);
    if (!result.error) showToast('success', 'Fuel entry deleted');
    setDeleteConfirmId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Fuel Management</h2>
        {canCreate && <button onClick={() => { setEditingEntry(null); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Add Fuel Entry</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Fuel Spend</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalFuelSpend)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Litres</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalLitres.toFixed(0)} L</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Avg Mileage</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{avgMileage > 0 ? avgMileage.toFixed(1) + ' km/l' : '\u2014'}</p>
        </div>
      </div>


      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Vehicle</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Driver</th>
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Litres</th>
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Rate</th>
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Amount</th>
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Odometer</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Station</th>
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fuelEntries.map((entry: any) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(entry.date)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{entry.vehicle_reg}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.driver_name || '\u2014'}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right">{entry.litres}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{'\u20B9'}{entry.rate}/L</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">{formatCurrency(entry.amount)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{(entry.odometer || 0).toLocaleString()} km</td>
                <td className="px-4 py-3 text-sm text-slate-600">{entry.station || '\u2014'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && <button onClick={() => { setEditingEntry(entry); setShowModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={14} /></button>}
                    {canEdit && (deleteConfirmId === entry.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(entry.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium">Yes</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded font-medium">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(entry.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fuelEntries.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No fuel entries yet</div>}
      </div>


      {showModal && (
        <FuelFormModal
          entry={editingEntry}
          vehicles={vehicles}
          drivers={drivers}
          allEntries={fuelEntries}
          onClose={() => { setShowModal(false); setEditingEntry(null); }}
          onSave={async (data) => {
            if (editingEntry) {
              const result = await updateFuelEntry(editingEntry.id, data);
              if (!result.error) showToast('success', 'Fuel entry updated');
              else showToast('error', result.error);
            } else {
              const result = await addFuelEntry(data);
              if (!result.error) showToast('success', 'Fuel entry added');
              else showToast('error', result.error);
            }
            setShowModal(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}


function FuelFormModal({ entry, vehicles, drivers, allEntries, onClose, onSave }: {
  entry: any | null; vehicles: any[]; drivers: any[]; allEntries: any[]; onClose: () => void; onSave: (data: any) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    vehicle_id: entry?.vehicle_id || '',
    driver_name: entry?.driver_name || '',
    driver_id: entry?.driver_id || '',
    date: entry?.date || new Date().toISOString().split('T')[0],
    litres: entry?.litres || 0,
    rate: entry?.rate || 0,
    odometer: entry?.odometer || 0,
    station: entry?.station || '',
  });

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v: any) => v.id === vehicleId);
    const driver = vehicle?.driver_id ? drivers.find((d: any) => d.id === vehicle.driver_id) : undefined;
    setForm({ ...form, vehicle_id: vehicleId, driver_id: driver?.id || '', driver_name: driver?.name || '', odometer: vehicle?.odometer || form.odometer });
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.vehicle_id) { setError('Select a vehicle'); return; }
    if (form.litres <= 0) { setError('Litres must be greater than 0'); return; }
    if (form.rate <= 0) { setError('Rate must be greater than 0'); return; }
    if (form.odometer <= 0) { setError('Odometer reading is required'); return; }
    if (!form.date) { setError('Date is required'); return; }

    // Odometer validation: must be greater than previous entry for this vehicle
    if (!entry) {
      const previousEntries = allEntries
        .filter((e: any) => e.vehicle_id === form.vehicle_id && e.id !== entry?.id)
        .sort((a: any, b: any) => (b.odometer || 0) - (a.odometer || 0));
      if (previousEntries.length > 0 && form.odometer <= previousEntries[0].odometer) {
        setError(`Odometer must be greater than last reading (${previousEntries[0].odometer.toLocaleString()} km)`);
        return;
      }
    }

    const vehicle = vehicles.find((v: any) => v.id === form.vehicle_id);
    setSaving(true);
    await onSave({
      vehicle_id: form.vehicle_id, vehicle_reg: vehicle?.reg_number || '',
      driver_id: form.driver_id || null, driver_name: form.driver_name,
      date: form.date, litres: form.litres, rate: form.rate,
      amount: Math.round(form.litres * form.rate), odometer: form.odometer, station: form.station,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{entry ? 'Edit Fuel Entry' : 'Add Fuel Entry'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle *</label>
            <select value={form.vehicle_id} onChange={(e) => handleVehicleChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select vehicle</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Driver</label>
            <input type="text" value={form.driver_name} onChange={(e) => setForm({...form, driver_name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Driver name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Odometer (km) *</label>
              <input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: Number(e.target.value) })} min="0" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Litres *</label>
              <input type="number" value={form.litres} onChange={(e) => setForm({ ...form, litres: Number(e.target.value) })} min="0" step="0.1" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rate/L *</label>
              <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} min="0" step="0.01" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
              <input type="number" value={Math.round(form.litres * form.rate)} readOnly className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Station</label>
            <input type="text" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Petrol pump name" />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : entry ? 'Update Entry' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
