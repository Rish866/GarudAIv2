import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { useBranchData } from '../../../hooks/useBranchData';
import type { Customer } from '../../../types';
import { formatCurrency, getStatusColor, classNames } from '../../../lib/utils';
import { exportCustomers } from '../../../lib/excel';
import { Plus, Search, Users, IndianRupee, TrendingUp, X, ExternalLink, Upload } from 'lucide-react';
import CustomerTrackingPortal from '../tracking/CustomerTrackingPortal';
import BulkUpload from '../../ui/BulkUpload';

export default function CustomersModule() {
  const { addCustomer } = useStore();
  const { customers } = useBranchData();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTracking, setShowTracking] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  if (showTracking) {
    return (
      <div>
        <div className="flex items-center gap-3 p-6 pb-0">
          <button
            onClick={() => setShowTracking(false)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to Customers
          </button>
        </div>
        <CustomerTrackingPortal />
      </div>
    );
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.contact_person.toLowerCase().includes(query) ||
      customer.gstin.toLowerCase().includes(query)
    );
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const totalBusiness = customers.reduce((sum, c) => sum + c.total_business, 0);
  const activeCount = customers.filter((c) => c.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">{customers.length} total customers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Upload size={18} />
            Bulk Upload
          </button>
          <button
            onClick={() => exportCustomers(customers)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Export
          </button>
          <button
            onClick={() => setShowTracking(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <ExternalLink size={18} />
            Customer Portal
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <IndianRupee size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Outstanding</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Business</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBusiness)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Customers</p>
              <p className="text-xl font-bold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by company name, contact person, or GSTIN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Business</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{customer.gstin}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm text-slate-700">{customer.contact_person}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{customer.phone}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm text-slate-700">{formatCurrency(customer.credit_limit)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{customer.credit_days} days</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={classNames('text-sm font-semibold', customer.outstanding > 0 ? 'text-red-600' : 'text-slate-700')}>
                      {formatCurrency(customer.outstanding)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-medium text-slate-700">{formatCurrency(customer.total_business)}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(customer.status))}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No customers found matching your search.
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && <AddCustomerModal onClose={() => setShowModal(false)} />}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          title="Bulk Upload Customers"
          description="Import customers from a CSV file"
          sampleFields={['name', 'contact_person', 'phone', 'email', 'gstin', 'billing_address', 'credit_limit', 'credit_days']}
          onUpload={(data) => {
            data.forEach(row => {
              addCustomer({
                id: generateId(),
                company_id: 'comp_garud_001',
                name: row.name || '',
                contact_person: row.contact_person || '',
                phone: row.phone || '',
                email: row.email || '',
                gstin: row.gstin || '',
                billing_address: row.billing_address || '',
                credit_limit: Number(row.credit_limit) || 0,
                credit_days: Number(row.credit_days) || 30,
                outstanding: 0,
                total_business: 0,
                status: 'active',
                created_at: new Date().toISOString(),
              });
            });
          }}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const { addCustomer } = useStore();

  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    gstin: '',
    billing_address: '',
    credit_limit: '',
    credit_days: '30',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const customer: Customer = {
      id: generateId(),
      company_id: 'comp_garud_001',
      name: form.name,
      contact_person: form.contact_person,
      phone: form.phone,
      email: form.email,
      gstin: form.gstin,
      billing_address: form.billing_address,
      credit_limit: Number(form.credit_limit) || 0,
      credit_days: Number(form.credit_days) || 30,
      outstanding: 0,
      total_business: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    addCustomer(customer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Add Customer</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input type="text" name="contact_person" value={form.contact_person} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
            <input type="text" name="gstin" value={form.gstin} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
            <input type="text" name="billing_address" value={form.billing_address} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
              <input type="number" name="credit_limit" value={form.credit_limit} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label>
              <input type="number" name="credit_days" value={form.credit_days} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
