import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { FileText, Plus, X, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

interface EWayBillRecord {
  id: string;
  ewb_number: string;
  trip_id: string;
  trip_number: string;
  lr_number: string;
  customer_name: string;
  origin: string;
  destination: string;
  distance_km: number;
  vehicle_reg: string;
  transporter_id: string;
  hsn_code: string;
  goods_description: string;
  goods_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_value: number;
  generated_date: string;
  valid_until: string;
  status: 'active' | 'expired' | 'cancelled' | 'extended';
  part_b_updated: boolean;
}


export default function EWayBillModule() {
  const { company } = useStore();
  const { data: trips } = useModuleData<any>('trips');
  const { data: vehicles } = useModuleData<any>('vehicles');
    const { data: bills, create: createBill, loading: billsLoading } = useModuleData<EWayBillRecord>('eway_bills');

  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');


  const [form, setForm] = useState({
    trip_id: '',
    hsn_code: '9965',
    goods_description: '',
    goods_value: '',
    gst_rate: '5',
  });

  const filteredBills = filter === 'all' ? bills : bills.filter(b => b.status === filter);
  const activeBills = bills.filter(b => b.status === 'active').length;
  const expiredBills = bills.filter(b => b.status === 'expired').length;
  const totalGoodsValue = bills.reduce((s, b) => s + b.goods_value, 0);

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'expired') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      extended: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleGenerate = () => {
    const trip = trips.find(t => t.id === form.trip_id);
    if (!trip || !form.goods_value) return;
    const gstRate = parseFloat(form.gst_rate) / 100;
    const goodsVal = parseFloat(form.goods_value);
    const igst = Math.round(goodsVal * gstRate);
    const validDays = trip.distance_km > 1000 ? 5 : trip.distance_km > 500 ? 3 : 1;
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + validDays);

    const newBill: EWayBillRecord = {
      id: 'ewb_' + generateId(),
      ewb_number: `3714 ${Math.floor(1000+Math.random()*9000)} ${Math.floor(1000+Math.random()*9000)}`,
      trip_id: trip.id,
      trip_number: trip.trip_number,
      lr_number: trip.lr_number,
      customer_name: trip.customer_name,
      origin: trip.origin,
      destination: trip.destination,
      distance_km: trip.distance_km,
      vehicle_reg: trip.vehicle_reg,
      transporter_id: company.gstin,
      hsn_code: form.hsn_code,
      goods_description: form.goods_description || trip.material,
      goods_value: goodsVal,
      cgst: 0,
      sgst: 0,
      igst: igst,
      total_value: goodsVal + igst,
      generated_date: new Date().toISOString().split('T')[0],
      valid_until: validDate.toISOString().split('T')[0],
      status: 'active',
      part_b_updated: true,
    };
    createBill(newBill);
    setShowModal(false);
    setForm({ trip_id: '', hsn_code: '9965', goods_description: '', goods_value: '', gst_rate: '5' });
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>E-Way Bill Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Generate, track & manage GST e-way bills for all consignments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Bulk Upload
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Generate E-Way Bill
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Bills</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{bills.length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{activeBills}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Expired</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{expiredBills}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Goods Value</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalGoodsValue)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'expired', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={classNames('px-3 py-1.5 text-sm rounded-lg font-medium transition-colors', filter === f ? 'bg-blue-600 text-white' : '')} style={filter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>


      {/* E-Way Bill Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>EWB Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trip / LR</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Vehicle</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Goods Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Valid Until</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Part-B</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr key={bill.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{bill.ewb_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bill.trip_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{bill.lr_number}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{bill.customer_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{bill.origin}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>→ {bill.destination}</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{bill.distance_km} km</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{bill.vehicle_reg}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(bill.goods_value)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(bill.valid_until)}</td>
                  <td className="px-4 py-3">
                    {bill.part_b_updated ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                  </td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(bill.status))}>{bill.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Generate E-Way Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate E-Way Bill</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Link to Trip</label>
                <select value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">Select Trip</option>
                  {trips.filter(t => ['booked','in_transit','loading','assigned'].includes(t.status)).map(t => (
                    <option key={t.id} value={t.id}>{t.trip_number} — {t.origin} → {t.destination}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>HSN/SAC Code</label>
                  <input type="text" value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="9965 (Transport)" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>GST Rate %</label>
                  <select value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Goods Description</label>
                <input type="text" value={form.goods_description} onChange={(e) => setForm({ ...form, goods_description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Auto-filled from trip material" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Goods Value (₹)</label>
                <input type="number" value={form.goods_value} onChange={(e) => setForm({ ...form, goods_value: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Total taxable value of goods" />
              </div>
              <button onClick={handleGenerate} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Generate E-Way Bill</button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUpload
          title="Bulk Upload E-Way Bills"
          description="Import existing e-way bill records"
          sampleFields={['ewb_number', 'trip_number', 'customer_name', 'origin', 'destination', 'goods_value', 'valid_until', 'status']}
          onUpload={(data) => {
            data.forEach(row => {
              createBill({
                id: 'ewb_' + generateId(),
                ewb_number: row.ewb_number || '',
                trip_id: '',
                trip_number: row.trip_number || '',
                lr_number: row.lr_number || '',
                customer_name: row.customer_name || '',
                origin: row.origin || '',
                destination: row.destination || '',
                distance_km: Number(row.distance_km) || 0,
                vehicle_reg: row.vehicle_reg || '',
                transporter_id: company.gstin,
                hsn_code: row.hsn_code || '9965',
                goods_description: row.goods_description || '',
                goods_value: Number(row.goods_value) || 0,
                cgst: 0, sgst: 0, igst: 0,
                total_value: Number(row.goods_value) || 0,
                generated_date: row.generated_date || new Date().toISOString().split('T')[0],
                valid_until: row.valid_until || '',
                status: (row.status as any) || 'active',
                part_b_updated: true,
              });
            });
          }}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}
