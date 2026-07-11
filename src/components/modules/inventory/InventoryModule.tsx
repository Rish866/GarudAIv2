import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { formatCurrency, classNames } from '../../../lib/utils';
import { Plus, X, Package, IndianRupee, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: 'Spare Parts' | 'Tyres' | 'Lubricants' | 'Consumables';
  qty: number;
  unit: string;
  rate: number;
  reorder_level: number;
}


export default function InventoryModule() {
    const { data: items, create: createItem, remove: removeItem, loading: itemsLoading } = useModuleData<InventoryItem>('inventory');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ item_code: '', name: '', category: 'Spare Parts' as InventoryItem['category'], qty: '', unit: 'Units', rate: '', reorder_level: '' });

  const totalItems = items.length;
  const totalStockValue = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const lowStockItems = items.filter((item) => item.qty <= item.reorder_level);


  const handleAdd = () => {
    if (!form.item_code || !form.name || !form.qty || !form.rate) return;
    const newItem: InventoryItem = {
      id: 'inv_' + Date.now().toString(36),
      item_code: form.item_code,
      name: form.name,
      category: form.category,
      qty: parseInt(form.qty),
      unit: form.unit,
      rate: parseFloat(form.rate),
      reorder_level: parseInt(form.reorder_level) || 5,
    };
    createItem(newItem);
    setShowModal(false);
    setForm({ item_code: '', name: '', category: 'Spare Parts', qty: '', unit: 'Units', rate: '', reorder_level: '' });
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'Spare Parts': 'bg-blue-100 text-blue-800',
      'Tyres': 'bg-purple-100 text-purple-800',
      'Lubricants': 'bg-amber-100 text-amber-800',
      'Consumables': 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory / Stock</h1>
          <p className="text-slate-500 mt-1">Manage spare parts, tyres, lubricants & consumables</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Items</p>
              <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Stock Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalStockValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Item Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Item Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Rate</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Stock Value</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reorder Lvl</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isLow = item.qty <= item.reorder_level;
                return (
                  <tr key={item.id} className={classNames('hover:bg-slate-50', isLow ? 'bg-red-50' : '')}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.item_code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', getCategoryBadge(item.category))}>{item.category}</span>
                    </td>
                    <td className={classNames('px-4 py-3 text-sm text-right font-medium', isLow ? 'text-red-600' : 'text-slate-900')}>{item.qty}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatCurrency(item.qty * item.rate)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500">{item.reorder_level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Inventory Item</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Code</label>
                <input type="text" value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. SP-006" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Radiator Hose" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryItem['category'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="Spare Parts">Spare Parts</option>
                  <option value="Tyres">Tyres</option>
                  <option value="Lubricants">Lubricants</option>
                  <option value="Consumables">Consumables</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="Units">Units</option>
                    <option value="Litres">Litres</option>
                    <option value="Sets">Sets</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rate (₹)</label>
                  <input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="5" />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
