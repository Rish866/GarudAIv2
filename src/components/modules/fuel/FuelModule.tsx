import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore, generateId } from '../../../store/useStore';
import type { FuelEntry } from '../../../types';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';

export default function FuelModule() {
  const { company } = useStore();
  const { data: fuelEntries, create: addFuelEntry } = useModuleData<any>('fuel_entries');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');
  const [showModal, setShowModal] = useState(false);

  // Summary calculations
  const totalFuelSpend = fuelEntries.reduce((sum, f) => sum + f.amount, 0);
  const totalLitres = fuelEntries.reduce((sum, f) => sum + f.litres, 0);
  const avgMileage = fuelEntries.length > 0
    ? fuelEntries.reduce((sum, f) => sum + (f.mileage || 0), 0) / fuelEntries.filter((f) => f.mileage).length
    : 0;

  // Form state
  const [form, setForm] = useState({
    vehicle_id: '',
    driver_id: '',
    driver_name: '',
    date: new Date().toISOString().split('T')[0],
    litres: 0,
    rate: 0,
    odometer: 0,
    station: '',
  });

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const driver = vehicle?.driver_id ? drivers.find((d) => d.id === vehicle.driver_id) : undefined;
    setForm({
      ...form,
      vehicle_id: vehicleId,
      driver_id: driver?.id || '',
      driver_name: driver?.name || '',
      odometer: vehicle?.odometer || 0,
    });
  };


  const handleSubmit = () => {
    if (!form.vehicle_id) return;
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    const entry: FuelEntry = {
      id: generateId(),
      company_id: company.id,
      vehicle_id: form.vehicle_id,
      vehicle_reg: vehicle?.reg_number || '',
      driver_id: form.driver_id,
      driver_name: form.driver_name,
      date: form.date,
      litres: form.litres,
      rate: form.rate,
      amount: Math.round(form.litres * form.rate),
      odometer: form.odometer,
      station: form.station,
      mileage: undefined,
      created_at: new Date().toISOString(),
    };
    addFuelEntry(entry);
    setShowModal(false);
    setForm({ vehicle_id: '', driver_id: '', driver_name: '', date: new Date().toISOString().split('T')[0], litres: 0, rate: 0, odometer: 0, station: '' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Fuel Management</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">
          Add Fuel Entry
        </button>
      </div>

      {/* Summary Cards */}
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
          <p className="text-2xl font-bold text-green-600 mt-1">{avgMileage.toFixed(1)} km/l</p>
        </div>
      </div>


      {/* Fuel Log Table */}
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
              <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Mileage</th>
              <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Station</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fuelEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(entry.date)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{entry.vehicle_reg}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{entry.driver_name}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right">{entry.litres}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(entry.rate)}</td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">{formatCurrency(entry.amount)}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">{entry.odometer.toLocaleString()} km</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{entry.mileage ? `${entry.mileage} km/l` : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{entry.station}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Add Fuel Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Fuel Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle</label>
                <select value={form.vehicle_id} onChange={(e) => handleVehicleChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Driver</label>
                <input type="text" value={form.driver_name} readOnly className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600" placeholder="Auto-filled from vehicle" />
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Litres</label>
                  <input type="number" value={form.litres} onChange={(e) => setForm({ ...form, litres: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Rate (₹/L)</label>
                  <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input type="number" value={Math.round(form.litres * form.rate)} readOnly className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Station</label>
                <input type="text" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Petrol pump name" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Add Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
