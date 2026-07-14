import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import type { Invoice, Payment, Expense, ExpenseCategory } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames, generateInvoiceNumber } from '../../../lib/utils';
import { generateInvoicePDF } from '../../../lib/pdf';
import { exportInvoices, exportExpenses } from '../../../lib/excel';
import { showToast } from '../../ui/Toast';

type BillingTab = 'invoices' | 'payments' | 'expenses';

export default function BillingModule() {
  const { company } = useStore();
  const { data: invoices, create: addInvoice, update: updateInvoice, remove: removeInvoice } = useModuleData<any>('invoices');
  const { data: payments, create: addPayment, update: updatePayment } = useModuleData<any>('payments');
  const { data: expenses, create: addExpense, update: updateExpense, remove: removeExpense } = useModuleData<any>('expenses');
  const { data: customers } = useModuleData<any>('customers');
  const { data: trips } = useModuleData<any>('trips');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const [activeTab, setActiveTab] = useState<BillingTab>('invoices');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Summary calculations
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance_amount, 0);
  const receivedThisMonth = payments
    .filter((p) => {
      const d = new Date(p.payment_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Invoice form state
  const [invForm, setInvForm] = useState({
    customer_id: '',
    trip_id: '',
    freight_total: 0,
    detention_total: 0,
    other_charges: 0,
    gst_percent: 5,
  });


  // Payment form state
  const [payForm, setPayForm] = useState({
    customer_id: '',
    invoice_id: '',
    amount: 0,
    payment_mode: 'bank_transfer' as Payment['payment_mode'],
    reference_number: '',
    tds_amount: 0,
  });

  // Expense form state
  const [expForm, setExpForm] = useState({
    category: 'diesel' as ExpenseCategory,
    amount: 0,
    description: '',
    paid_to: '',
    vehicle_id: '',
    trip_id: '',
    payment_mode: 'cash' as Expense['payment_mode'],
    date: new Date().toISOString().split('T')[0],
  });

  const handleCreateInvoice = () => {
    const customer = customers.find((c) => c.id === invForm.customer_id);
    if (!customer) return;
    const subtotal = invForm.freight_total + invForm.detention_total + invForm.other_charges;
    const gst_amount = Math.round(subtotal * invForm.gst_percent / 100);
    const tds_amount = Math.round(subtotal * 0.02);
    const total_amount = subtotal + gst_amount - tds_amount;
    addInvoice({
      invoice_number: generateInvoiceNumber(),
      customer_id: customer.id,
      customer_name: customer.name,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + (customer.credit_days || 30) * 86400000).toISOString().split('T')[0],
      trip_ids: invForm.trip_id ? [invForm.trip_id] : [],
      freight_total: invForm.freight_total,
      detention_total: invForm.detention_total,
      other_charges: invForm.other_charges,
      subtotal,
      gst_percent: invForm.gst_percent,
      gst_amount,
      tds_amount,
      total_amount,
      paid_amount: 0,
      balance_amount: total_amount,
      status: 'draft',
    });
    showToast('success', 'Invoice created');
    setShowInvoiceModal(false);
    setInvForm({ customer_id: '', trip_id: '', freight_total: 0, detention_total: 0, other_charges: 0, gst_percent: 5 });
  };


  const handleRecordPayment = () => {
    const customer = customers.find((c) => c.id === payForm.customer_id);
    if (!customer) return;
    addPayment({
      invoice_id: payForm.invoice_id || null,
      customer_id: customer.id,
      customer_name: customer.name,
      amount: payForm.amount,
      payment_mode: payForm.payment_mode,
      reference_number: payForm.reference_number,
      payment_date: new Date().toISOString().split('T')[0],
      tds_amount: payForm.tds_amount,
      status: 'received',
    });
    showToast('success', 'Payment recorded');
    setShowPaymentModal(false);
    setPayForm({ customer_id: '', invoice_id: '', amount: 0, payment_mode: 'bank_transfer', reference_number: '', tds_amount: 0 });
  };

  const handleAddExpense = () => {
    const vehicle = vehicles.find((v) => v.id === expForm.vehicle_id);
    addExpense({
      trip_id: expForm.trip_id || null,
      vehicle_id: vehicle?.id || null,
      vehicle_reg: vehicle?.reg_number || '',
      category: expForm.category,
      amount: expForm.amount,
      date: expForm.date,
      description: expForm.description,
      paid_to: expForm.paid_to,
      payment_mode: expForm.payment_mode,
      approved: false,
    });
    showToast('success', 'Expense added');
    setShowExpenseModal(false);
    setExpForm({ category: 'diesel', amount: 0, description: '', paid_to: '', vehicle_id: '', trip_id: '', payment_mode: 'cash', date: new Date().toISOString().split('T')[0] });
  };

  const tabs: { key: BillingTab; label: string }[] = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'payments', label: 'Payments' },
    { key: 'expenses', label: 'Expenses' },
  ];


  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={classNames(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'invoices' && (
            <>
              <button onClick={() => exportInvoices(invoices)} className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Export</button>
              <button onClick={() => setShowInvoiceModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Create Invoice</button>
            </>
          )}
          {activeTab === 'payments' && (
            <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Record Payment</button>
          )}
          {activeTab === 'expenses' && (
            <>
              <button onClick={() => exportExpenses(expenses)} className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Export</button>
              <button onClick={() => setShowExpenseModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Add Expense</button>
            </>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Received This Month</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(receivedThisMonth)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Credit Limit Warnings */}
      {customers.filter(c => c.outstanding > c.credit_limit * 0.8).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠️ Credit Limit Alerts</h3>
          <div className="space-y-2">
            {customers.filter(c => c.outstanding > c.credit_limit * 0.8).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">{c.name}</span>
                <span className="font-medium text-amber-900">
                  Outstanding: {formatCurrency(c.outstanding)} / Limit: {formatCurrency(c.credit_limit)}
                  {c.outstanding > c.credit_limit && <span className="ml-2 text-red-600 font-bold">EXCEEDED</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Invoice #</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Date</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Total</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Balance</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-[11px] uppercase font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">{formatCurrency(inv.balance_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(inv.status))}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => generateInvoicePDF(inv, company, trips)}
                      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Print Invoice PDF"
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Reference</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Date</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-700">{pay.reference_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{pay.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(pay.payment_date)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right font-semibold">{formatCurrency(pay.amount)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{pay.payment_mode.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Description</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase font-semibold text-slate-500">Vehicle</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase font-semibold text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(exp.category))}>{exp.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{exp.description}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{exp.vehicle_reg || '—'}</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right font-semibold">{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer</label>
                <select value={invForm.customer_id} onChange={(e) => setInvForm({ ...invForm, customer_id: e.target.value, trip_id: '' })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trip (auto-fills amounts)</label>
                <select value={invForm.trip_id} onChange={(e) => {
                  const tripId = e.target.value;
                  const trip = trips.find(t => t.id === tripId);
                  if (trip) {
                    setInvForm({
                      ...invForm,
                      trip_id: tripId,
                      customer_id: trip.customer_id,
                      freight_total: trip.freight_amount,
                      detention_total: trip.detention_charges,
                      other_charges: trip.other_charges,
                    });
                  } else {
                    setInvForm({ ...invForm, trip_id: '' });
                  }
                }} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select trip</option>
                  {trips.filter(t => !invForm.customer_id || t.customer_id === invForm.customer_id).filter(t => ['completed', 'pod_pending', 'reached'].includes(t.status) || t.status === 'in_transit').map((t) => (
                    <option key={t.id} value={t.id}>{t.trip_number} • {t.lr_number} • {t.origin}→{t.destination} • ₹{t.freight_amount.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              {/* Trip Details (auto-filled) */}
              {invForm.trip_id && (() => {
                const trip = trips.find(t => t.id === invForm.trip_id);
                return trip ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                    <p className="font-semibold text-blue-800">📋 Trip Details (auto-fetched)</p>
                    <div className="grid grid-cols-2 gap-2 text-blue-700">
                      <span>LR: <b>{trip.lr_number}</b></span>
                      <span>Vehicle: <b>{trip.vehicle_reg}</b></span>
                      <span>Route: <b>{trip.origin} → {trip.destination}</b></span>
                      <span>Distance: <b>{trip.distance_km} km</b></span>
                      <span>Material: <b>{trip.material}</b></span>
                      <span>Weight: <b>{trip.weight_tons} T</b></span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Freight (₹)</label>
                  <input type="number" value={invForm.freight_total} onChange={(e) => setInvForm({ ...invForm, freight_total: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Detention (₹)</label>
                  <input type="number" value={invForm.detention_total} onChange={(e) => setInvForm({ ...invForm, detention_total: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Other (₹)</label>
                  <input type="number" value={invForm.other_charges} onChange={(e) => setInvForm({ ...invForm, other_charges: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST %</label>
                  <select value={invForm.gst_percent} onChange={(e) => setInvForm({ ...invForm, gst_percent: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={5}>5% (GTA - Forward Charge)</option>
                    <option value={12}>12% (GTA - With ITC)</option>
                    <option value={18}>18% (Other Services)</option>
                    <option value={0}>0% (Exempt / RCM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">TDS Applicable</label>
                  <select value={invForm.gst_percent === 0 ? 'no' : 'yes'} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <option value="yes">Yes (2% u/s 194C)</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              {/* Auto-calculated Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-medium">₹{(invForm.freight_total + invForm.detention_total + invForm.other_charges).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">GST ({invForm.gst_percent}%)</span><span className="font-medium">₹{Math.round((invForm.freight_total + invForm.detention_total + invForm.other_charges) * invForm.gst_percent / 100).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">TDS (2%)</span><span className="font-medium text-red-600">- ₹{Math.round((invForm.freight_total + invForm.detention_total + invForm.other_charges) * 0.02).toLocaleString()}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-semibold text-slate-900">Total Payable</span><span className="font-bold text-lg text-slate-900">₹{Math.round((invForm.freight_total + invForm.detention_total + invForm.other_charges) * (1 + invForm.gst_percent / 100) - (invForm.freight_total + invForm.detention_total + invForm.other_charges) * 0.02).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateInvoice} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Create Invoice</button>
            </div>
          </div>
        </div>
      )}


      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer</label>
                <select value={payForm.customer_id} onChange={(e) => setPayForm({ ...payForm, customer_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice (optional)</label>
                <select value={payForm.invoice_id} onChange={(e) => setPayForm({ ...payForm, invoice_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select invoice</option>
                  {invoices.filter((i) => i.customer_id === payForm.customer_id).map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode</label>
                  <select value={payForm.payment_mode} onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value as Payment['payment_mode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference Number</label>
                <input type="text" value={payForm.reference_number} onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleRecordPayment} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Record</button>
            </div>
          </div>
        </div>
      )}


      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Expense</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value as ExpenseCategory })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="diesel">Diesel</option>
                    <option value="toll">Toll</option>
                    <option value="driver_bata">Driver Bata</option>
                    <option value="loading">Loading</option>
                    <option value="unloading">Unloading</option>
                    <option value="repair">Repair</option>
                    <option value="tyre">Tyre</option>
                    <option value="insurance">Insurance</option>
                    <option value="emi">EMI</option>
                    <option value="salary">Salary</option>
                    <option value="office">Office</option>
                    <option value="misc">Misc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input type="text" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid To</label>
                  <input type="text" value={expForm.paid_to} onChange={(e) => setExpForm({ ...expForm, paid_to: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle</label>
                  <select value={expForm.vehicle_id} onChange={(e) => setExpForm({ ...expForm, vehicle_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
                  <select value={expForm.payment_mode} onChange={(e) => setExpForm({ ...expForm, payment_mode: e.target.value as Expense['payment_mode'] })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="fuel_card">Fuel Card</option>
                    <option value="fastag">FASTag</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Link to Trip (optional)</label>
                <select value={expForm.trip_id} onChange={(e) => setExpForm({ ...expForm, trip_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No trip</option>
                  {trips.filter(t => ['in_transit', 'loading', 'assigned'].includes(t.status)).map(t => (
                    <option key={t.id} value={t.id}>{t.trip_number} - {t.vehicle_reg}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddExpense} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
