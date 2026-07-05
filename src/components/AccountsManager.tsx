import React, { useState } from 'react';
import { Invoice, PaymentCollection, Expense, Trip, Customer, ExpenseCategory } from '../types';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Briefcase,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Percent
} from 'lucide-react';

interface AccountsManagerProps {
  companyId: string;
  invoices: Invoice[];
  payments: PaymentCollection[];
  expenses: Expense[];
  trips: Trip[];
  customers: Customer[];
  onUpdateInvoices: (items: Invoice[]) => void;
  onUpdatePayments: (items: PaymentCollection[]) => void;
  onUpdateExpenses: (items: Expense[]) => void;
  onUpdateTrips: (items: Trip[]) => void;
  onUpdateCustomers: (items: Customer[]) => void;
  userRole: string;
}

export default function AccountsManager({
  companyId,
  invoices,
  payments,
  expenses,
  trips,
  customers,
  onUpdateInvoices,
  onUpdatePayments,
  onUpdateExpenses,
  onUpdateTrips,
  onUpdateCustomers,
  userRole
}: AccountsManagerProps) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'expenses'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states
  const [newInv, setNewInv] = useState<Partial<Invoice>>({
    customer_id: '', linked_trip_ids: [], detention_charges: 0, loading_unloading_charges: 0, due_date: ''
  });
  const [newPay, setNewPay] = useState<Partial<PaymentCollection>>({
    invoice_id: '', amount_received: 0, payment_mode: 'bank_transfer', reference_number: '', tds_deducted: 0
  });
  const [newExp, setNewExp] = useState<Partial<Expense>>({
    trip_id: '', vehicle_id: '', category: 'diesel', amount: 0, description: '', paid_to: '', payment_mode: 'cash'
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const custObj = customers.find(c => c.id === newInv.customer_id);
    const selectedTrips = trips.filter(t => (newInv.linked_trip_ids || []).includes(t.id));
    
    // Calculate total cargo weight / base freight
    const baseFreight = selectedTrips.reduce((acc, t) => acc + t.freight_amount, 0);
    const detChg = Number(newInv.detention_charges) || 0;
    const loadChg = Number(newInv.loading_unloading_charges) || 0;
    const taxableAmount = baseFreight + detChg + loadChg;

    const gstAmt = taxableAmount * 0.18; // 18% standard GST
    const tdsAmt = taxableAmount * 0.02; // 2% standard TDS deduction
    const totalAmt = taxableAmount + gstAmt - tdsAmt;

    const invoiceIdStr = 'inv-' + Date.now();
    const invNumStr = 'INV-GARUD-2026-' + Math.floor(Math.random() * 9000 + 1000);

    const created: Invoice = {
      id: invoiceIdStr,
      company_id: companyId,
      branch_id: selectedTrips[0]?.branch_id || 'br-balaji-hq',
      invoice_number: invNumStr,
      customer_id: newInv.customer_id || '',
      customer_name: custObj ? custObj.name : 'Unknown Customer',
      linked_trip_ids: newInv.linked_trip_ids || [],
      freight_amount: baseFreight,
      detention_charges: detChg,
      loading_unloading_charges: loadChg,
      gst_amount: gstAmt,
      tds_deduction: tdsAmt,
      total_amount: totalAmt,
      paid_amount: 0,
      outstanding_amount: totalAmt,
      due_date: newInv.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      status: 'sent',
      created_at: new Date().toISOString().split('T')[0]
    };

    onUpdateInvoices([created, ...invoices]);

    // Update matching trips to status = 'billed'
    const updatedTrips = trips.map(t => 
      (newInv.linked_trip_ids || []).includes(t.id) ? { ...t, status: 'billed' as const } : t
    );
    onUpdateTrips(updatedTrips);

    // Update customer outstanding balance
    if (custObj) {
      const updatedCusts = customers.map(c => 
        c.id === custObj.id ? { ...c, outstanding_balance: c.outstanding_balance + totalAmt } : c
      );
      onUpdateCustomers(updatedCusts);
    }

    setShowInvoiceModal(false);
    setNewInv({ customer_id: '', linked_trip_ids: [], detention_charges: 0, loading_unloading_charges: 0 });
    alert(`Tax Invoice ${invNumStr} generated successfully for ₹${totalAmt.toFixed(2)} (GST 18%, TDS 2% calculated).`);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const invObj = invoices.find(i => i.id === newPay.invoice_id);
    if (!invObj) return;

    const amt = Number(newPay.amount_received) || 0;
    const tds = Number(newPay.tds_deducted) || 0;
    const totalReduction = amt + tds;

    const updatedInvoices = invoices.map(i => {
      if (i.id === invObj.id) {
        const outstanding = Math.max(0, i.outstanding_amount - totalReduction);
        const st = outstanding <= 0 ? 'paid' as const : 'sent' as const;
        return {
          ...i,
          paid_amount: i.paid_amount + amt,
          outstanding_amount: outstanding,
          status: st
        };
      }
      return i;
    });

    onUpdateInvoices(updatedInvoices);

    const createdPay: PaymentCollection = {
      id: 'pay-' + Date.now(),
      company_id: companyId,
      customer_id: invObj.customer_id,
      customer_name: invObj.customer_name,
      invoice_id: invObj.id,
      invoice_number: invObj.invoice_number,
      amount_received: amt,
      payment_mode: newPay.payment_mode as any,
      tds_deducted: tds,
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: newPay.reference_number || ('TXN-' + Math.floor(Math.random() * 900000 + 100000))
    };

    onUpdatePayments([createdPay, ...payments]);

    // Reduce customer outstanding balance
    const updatedCusts = customers.map(c => 
      c.id === invObj.customer_id ? { ...c, outstanding_balance: Math.max(0, c.outstanding_balance - totalReduction) } : c
    );
    onUpdateCustomers(updatedCusts);

    setShowPaymentModal(false);
    setNewPay({ invoice_id: '', amount_received: 0, tds_deducted: 0, reference_number: '' });
    alert(`Payment recorded successfully! Invoice ${invObj.invoice_number} balance adjusted.`);
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const matchingTrip = trips.find(t => t.id === newExp.trip_id);
    
    const created: Expense = {
      id: 'exp-' + Date.now(),
      company_id: companyId,
      branch_id: matchingTrip?.branch_id || 'br-balaji-hq',
      trip_id: newExp.trip_id || undefined,
      vehicle_id: newExp.vehicle_id || matchingTrip?.vehicle_id || '',
      vehicle_reg: matchingTrip ? matchingTrip.vehicle_reg : 'Fleet-Wide',
      category: newExp.category as ExpenseCategory,
      amount: Number(newExp.amount) || 0,
      expense_date: new Date().toISOString().split('T')[0],
      description: newExp.description || '',
      paid_to: newExp.paid_to || '',
      payment_mode: newExp.payment_mode as any
    };

    onUpdateExpenses([created, ...expenses]);
    setShowExpenseModal(false);
    setNewExp({ trip_id: '', vehicle_id: '', category: 'diesel', amount: 0, description: '' });
  };

  const filteredInvoices = invoices.filter(i =>
    i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpenses = expenses.filter(e =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-black">Gross Receivable</div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-1">
              ₹{invoices.reduce((acc, i) => acc + i.outstanding_amount, 0).toLocaleString('en-IN')}
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-cyan-500 bg-cyan-500/10 p-1.5 rounded-lg" />
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-black">Total Collected (MTD)</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              ₹{payments.reduce((acc, p) => acc + p.amount_received, 0).toLocaleString('en-IN')}
            </div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg" />
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-black">Trip Expenses (MTD)</div>
            <div className="text-xl font-black text-red-400 font-mono mt-1">
              ₹{expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString('en-IN')}
            </div>
          </div>
          <TrendingDown className="w-8 h-8 text-red-500 bg-red-500/10 p-1.5 rounded-lg" />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('invoices'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'invoices' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoices Master ({invoices.length})
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'payments' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Receipt Transactions ({payments.length})
          </button>
          <button
            onClick={() => { setActiveTab('expenses'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'expenses' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Field Expenses ({expenses.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'invoices' && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Generate Invoice
            </button>
          )}
          {activeTab === 'payments' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          )}
          {activeTab === 'expenses' && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Log Expense
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* DATA VIEWING PANELS */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No invoices generated. Choose a completed trip to create billing.
            </div>
          ) : (
            filteredInvoices.map(i => (
              <div key={i.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono">{i.invoice_number}</span>
                    <h4 className="text-xs font-black text-slate-200">{i.customer_name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Billed Base: <strong className="text-slate-300">₹{i.freight_amount.toLocaleString('en-IN')}</strong> | GST +18%: <strong>₹{i.gst_amount.toLocaleString('en-IN')}</strong> | TDS -2%: <strong className="text-red-400">₹{i.tds_deduction.toLocaleString('en-IN')}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Due on: <span className="text-slate-400 font-mono">{i.due_date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Outstanding balance</div>
                    <div className="text-sm font-extrabold text-red-400">₹{i.outstanding_amount.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Billed total: ₹{i.total_amount.toLocaleString('en-IN')}</div>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                      i.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                    }`}>
                      {i.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Receipt Ledger</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-850">
                <tr>
                  <th className="p-3 pl-5">Customer Name</th>
                  <th className="p-3">Invoice / TXN</th>
                  <th className="p-3">Txn Date</th>
                  <th className="p-3 text-right">Amount Received (₹)</th>
                  <th className="p-3 text-right">TDS Deducted (₹)</th>
                  <th className="p-3">Payment Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No payment settlements recorded.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="p-3 pl-5 font-bold text-white">{p.customer_name}</td>
                      <td className="p-3 font-mono">
                        <div className="text-slate-300">{p.invoice_number}</div>
                        <div className="text-[10px] text-slate-500">Ref: {p.reference_number}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{p.payment_date}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-black">₹{p.amount_received.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-amber-500 font-bold">₹{p.tds_deducted.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-400 uppercase font-mono">
                          {p.payment_mode.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExpenses.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No expenses recorded yet. Create fuel, toll, or driver cash vouchers to log.
            </div>
          ) : (
            filteredExpenses.map(e => (
              <div key={e.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${
                      e.category === 'diesel' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      e.category === 'toll' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {e.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{e.expense_date}</span>
                  </div>

                  <p className="text-xs text-white font-bold mb-1">{e.description}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Vehicle: <strong className="text-slate-300 font-sans uppercase">{e.vehicle_reg}</strong> | Paid to: <strong>{e.paid_to}</strong>
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Mode: <strong className="text-slate-400 uppercase">{e.payment_mode}</strong></span>
                  <div className="text-sm font-extrabold text-red-400 font-mono">₹{e.amount.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================= GENERATE INVOICE MODAL ======================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowInvoiceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Generate Customer Tax Invoice</h3>
            
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Billing Customer *</label>
                <select required value={newInv.customer_id} onChange={(e) => setNewInv({ ...newInv, customer_id: e.target.value, linked_trip_ids: [] })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Party --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {newInv.customer_id && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Completed POD Trips to Bill *</label>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1.5 max-h-32 overflow-y-auto">
                    {trips.filter(t => t.customer_id === newInv.customer_id && t.status !== 'billed').map(t => (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                        <input type="checkbox" checked={(newInv.linked_trip_ids || []).includes(t.id)} onChange={(e) => {
                          const current = newInv.linked_trip_ids || [];
                          const updated = e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id);
                          setNewInv({ ...newInv, linked_trip_ids: updated });
                        }} className="rounded bg-slate-900 border-slate-850 text-cyan-500" />
                        <span>{t.trip_id_label} ({t.origin} → {t.destination}) - ₹{t.freight_amount.toLocaleString('en-IN')}</span>
                      </label>
                    ))}
                    {trips.filter(t => t.customer_id === newInv.customer_id && t.status !== 'billed').length === 0 && (
                      <div className="text-[11px] text-slate-500 italic">No completed/unbilled trips found for this customer.</div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Detention / Extra Charges (₹)</label>
                  <input type="number" placeholder="0" value={newInv.detention_charges} onChange={(e) => setNewInv({ ...newInv, detention_charges: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Loading/Unloading fees (₹)</label>
                  <input type="number" placeholder="0" value={newInv.loading_unloading_charges} onChange={(e) => setNewInv({ ...newInv, loading_unloading_charges: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Due Date</label>
                <input type="date" required value={newInv.due_date} onChange={(e) => setNewInv({ ...newInv, due_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg text-[10px] text-slate-500 leading-normal space-y-1">
                <span className="font-bold text-slate-400 block uppercase mb-1">Garud AI Billing Engine:</span>
                <p>• Standard GST (18%) will be added to the total taxable amount.</p>
                <p>• TDS Deduction (2%) will be withheld on the total invoice amount.</p>
              </div>

              <button type="submit" disabled={!(newInv.linked_trip_ids || []).length} className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                (newInv.linked_trip_ids || []).length ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}>
                Approve & Dispatch Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= RECORD PAYMENT COLLECTION MODAL ======================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Record Payment / Ledger Adjustment</h3>
            
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Outstanding Invoice *</label>
                <select required value={newPay.invoice_id} onChange={(e) => {
                  const inv = invoices.find(i => i.id === e.target.value);
                  setNewPay({ ...newPay, invoice_id: e.target.value, amount_received: inv ? inv.outstanding_amount : 0 });
                }} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Invoice --</option>
                  {invoices.filter(i => i.status !== 'paid').map(i => (
                    <option key={i.id} value={i.id}>{i.invoice_number} - {i.customer_name} (O/S: ₹{i.outstanding_amount.toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Settlement Net Amount (₹) *</label>
                  <input type="number" required value={newPay.amount_received} onChange={(e) => setNewPay({ ...newPay, amount_received: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">TDS Withholding Certificate (₹)</label>
                  <input type="number" placeholder="0" value={newPay.tds_deducted} onChange={(e) => setNewPay({ ...newPay, tds_deducted: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payment Mode</label>
                  <select value={newPay.payment_mode} onChange={(e) => setNewPay({ ...newPay, payment_mode: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="bank_transfer">Bank NEFT/RTGS</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="cash">Direct Cash / Petty</option>
                    <option value="cheque">Bank Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Bank Reference TXN Ref</label>
                  <input type="text" placeholder="e.g. UTIB002849" value={newPay.reference_number} onChange={(e) => setNewPay({ ...newPay, reference_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono uppercase" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Receipt Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= LOG FIELD EXPENSE MODAL ======================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowExpenseModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Log Field / Trip Expense Voucher</h3>
            
            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Active Trip (Optional)</label>
                <select value={newExp.trip_id} onChange={(e) => setNewExp({ ...newExp, trip_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Trip (to link expense) --</option>
                  {trips.filter(t => t.status !== 'billed').map(t => (
                    <option key={t.id} value={t.id}>{t.trip_id_label} ({t.vehicle_reg} - {t.destination})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Expense Category *</label>
                  <select required value={newExp.category} onChange={(e) => setNewExp({ ...newExp, category: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="diesel">Diesel Fuel</option>
                    <option value="toll">Toll Roads / Fastag</option>
                    <option value="driver_allowance">Driver Allowance</option>
                    <option value="repair">Maintenance / Repair</option>
                    <option value="rto_fine">RTO Penalty / Fine</option>
                    <option value="brokerage">Brokerage / Comm</option>
                    <option value="other">Other / Misc</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Expense Amount (₹) *</label>
                  <input type="number" required placeholder="1200" value={newExp.amount} onChange={(e) => setNewExp({ ...newExp, amount: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Paid To / Recipient</label>
                  <input type="text" placeholder="e.g. Indian Oil Pump" value={newExp.paid_to} onChange={(e) => setNewExp({ ...newExp, paid_to: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payment Mode</label>
                  <select value={newExp.payment_mode} onChange={(e) => setNewExp({ ...newExp, payment_mode: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="cash">Spot Cash</option>
                    <option value="fastag">Fastag Account</option>
                    <option value="fuel_card">IOCL / HPCL Fuel Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Brief Description *</label>
                <textarea required rows={2} placeholder="Overnight highway stay / tire puncture fixing..." value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Submit Expense Voucher
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
