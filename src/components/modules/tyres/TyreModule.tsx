import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Circle, Plus, X, RotateCcw, Trash2, Truck } from 'lucide-react';

interface TyreRecord {
  id: string;
  serial_number: string;
  vehicle_id: string;
  vehicle_reg: string;
  position: 'FL' | 'FR' | 'RL' | 'RR' | 'Spare';
  make: 'MRF' | 'Apollo' | 'CEAT' | 'JK';
  km_run: number;
  status: 'active' | 'retreaded' | 'scrapped';
  retread_count: number;
  purchase_date: string;
  cost: number;
}

export default function TyreModule() {
  const { vehicles } = useStore();

  const [tyres, setTyres] = useState<TyreRecord[]>([
    { id: 'tyr_001', serial_number: 'MRF-2024-A1001', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', position: 'FL', make: 'MRF', km_run: 42000, status: 'active', retread_count: 0, purchase_date: '2024-03-15', cost: 18500 },
    { id: 'tyr_002', serial_number: 'MRF-2024-A1002', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', position: 'FR', make: 'MRF', km_run: 42000, status: 'active', retread_count: 0, purchase_date: '2024-03-15', cost: 18500 },
    { id: 'tyr_003', serial_number: 'APL-2023-B2001', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', position: 'RL', make: 'Apollo', km_run: 68000, status: 'retreaded', retread_count: 1, purchase_date: '2023-06-20', cost: 21000 },
    { id: 'tyr_004', serial_number: 'APL-2023-B2002', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', position: 'RR', make: 'Apollo', km_run: 68000, status: 'retreaded', retread_count: 1, purchase_date: '2023-06-20', cost: 21000 },
    { id: 'tyr_005', serial_number: 'CEAT-2024-C3001', vehicle_id: 'veh_003', vehicle_reg: 'MH-14-EF-9012', position: 'FL', make: 'CEAT', km_run: 25000, status: 'active', retread_count: 0, purchase_date: '2024-08-10', cost: 16800 },
    { id: 'tyr_006', serial_number: 'JK-2022-D4001', vehicle_id: 'veh_004', vehicle_reg: 'GJ-05-GH-3456', position: 'Spare', make: 'JK', km_run: 95000, status: 'scrapped', retread_count: 2, purchase_date: '2022-01-05', cost: 19200 },
    { id: 'tyr_007', serial_number: 'MRF-2024-A1003', vehicle_id: 'veh_005', vehicle_reg: 'RJ-14-JK-7890', position: 'RL', make: 'MRF', km_run: 55000, status: 'retreaded', retread_count: 1, purchase_date: '2023-11-12', cost: 20500 },
    { id: 'tyr_008', serial_number: 'CEAT-2025-C3002', vehicle_id: 'veh_006', vehicle_reg: 'KA-01-LM-2345', position: 'FR', make: 'CEAT', km_run: 12000, status: 'active', retread_count: 0, purchase_date: '2025-01-20', cost: 17200 },
    { id: 'tyr_009', serial_number: 'APL-2024-B2003', vehicle_id: 'veh_007', vehicle_reg: 'MP-09-NP-6789', position: 'FL', make: 'Apollo', km_run: 38000, status: 'active', retread_count: 0, purchase_date: '2024-05-08', cost: 19800 },
    { id: 'tyr_010', serial_number: 'JK-2024-D4002', vehicle_id: 'veh_008', vehicle_reg: 'TN-07-QR-4567', position: 'RR', make: 'JK', km_run: 8000, status: 'active', retread_count: 0, purchase_date: '2025-02-14', cost: 15500 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    serial_number: '',
    vehicle_id: '',
    position: 'FL' as TyreRecord['position'],
    make: 'MRF' as TyreRecord['make'],
    cost: '',
    purchase_date: '',
  });

  const activeTyres = tyres.filter((t) => t.status === 'active');
  const totalKm = activeTyres.reduce((sum, t) => sum + t.km_run, 0);
  const avgLife = activeTyres.length > 0 ? Math.round(totalKm / activeTyres.length) : 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTyreCost = tyres
    .filter((t) => {
      const d = new Date(t.purchase_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.cost, 0);

  const getCostPerKm = (tyre: TyreRecord) => {
    if (tyre.km_run === 0) return 0;
    return tyre.cost / tyre.km_run;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      retreaded: 'bg-yellow-100 text-yellow-800',
      scrapped: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getLifecycleLabel = (tyre: TyreRecord) => {
    if (tyre.status === 'scrapped') return 'Scrapped';
    if (tyre.retread_count === 0) return 'Original';
    return `Retreaded (${tyre.retread_count})`;
  };

  const handleAdd = () => {
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    if (!vehicle || !form.serial_number || !form.cost || !form.purchase_date) return;

    const newTyre: TyreRecord = {
      id: 'tyr_' + generateId(),
      serial_number: form.serial_number,
      vehicle_id: form.vehicle_id,
      vehicle_reg: vehicle.reg_number,
      position: form.position,
      make: form.make,
      km_run: 0,
      status: 'active',
      retread_count: 0,
      purchase_date: form.purchase_date,
      cost: parseFloat(form.cost),
    };

    setTyres([...tyres, newTyre]);
    setShowModal(false);
    setForm({ serial_number: '', vehicle_id: '', position: 'FL', make: 'MRF', cost: '', purchase_date: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tyre Management</h1>
          <p className="text-slate-500 mt-1">Track tyre lifecycle, costs and replacements</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tyre
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Circle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Tyres in Use</p>
              <p className="text-2xl font-bold text-slate-900">{activeTyres.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Life (km)</p>
              <p className="text-2xl font-bold text-slate-900">{avgLife.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Monthly Tyre Cost</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyTyreCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tyre Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Serial No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Position</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Make</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">KM Run</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Lifecycle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Purchase Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Cost/km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tyres.map((tyre) => (
                <tr key={tyre.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{tyre.serial_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{tyre.vehicle_reg}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{tyre.position}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{tyre.make}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{tyre.km_run.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{getLifecycleLabel(tyre)}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(tyre.status))}>
                      {tyre.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDate(tyre.purchase_date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatCurrency(tyre.cost)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">₹{getCostPerKm(tyre).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tyre Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Tyre</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., MRF-2025-A2001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.reg_number}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value as TyreRecord['position'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FL">FL (Front Left)</option>
                    <option value="FR">FR (Front Right)</option>
                    <option value="RL">RL (Rear Left)</option>
                    <option value="RR">RR (Rear Right)</option>
                    <option value="Spare">Spare</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                  <select
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value as TyreRecord['make'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MRF">MRF</option>
                    <option value="Apollo">Apollo</option>
                    <option value="CEAT">CEAT</option>
                    <option value="JK">JK</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (₹)</label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="18500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Tyre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
