import React, { useState } from 'react';
import { isDemoTenant } from '../../../lib/tenant';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Plus, X, BookOpen, Building2, Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface CashEntry {
  id: string;
  date: string;
  voucher_number: string;
  particulars: string;
  type: 'receipt' | 'payment';
  amount: number;
  narration: string;
}

interface BankEntry {
  id: string;
  date: string;
  voucher_number: string;
  particulars: string;
  type: 'receipt' | 'payment';
  amount: number;
  reference: string;
  narration: string;
}

interface LedgerAccount {
  id: string;
  name: string;
  group: 'Assets' | 'Liabilities' | 'Income' | 'Expense';
  balance: number;
  balance_type: 'Dr' | 'Cr';
}


export default function AccountsModule() {
  const [activeTab, setActiveTab] = useState<'cash' | 'bank' | 'ledger'>('cash');

  const [cashEntries, setCashEntries] = useState<CashEntry[]>(isDemoTenant() ? [
    { id: 'ce_001', date: '2025-07-01', voucher_number: 'CV-001', particulars: 'Received freight from Tata Motors', type: 'receipt', amount: 47000, narration: 'Trip TRP-2025-0142 freight' },
    { id: 'ce_002', date: '2025-07-02', voucher_number: 'CV-002', particulars: 'Paid driver salary - Suresh Kumar', type: 'payment', amount: 25000, narration: 'Monthly salary July' },
    { id: 'ce_003', date: '2025-07-03', voucher_number: 'CV-003', particulars: 'Paid diesel - HP Pump Lonavala', type: 'payment', amount: 12000, narration: 'Diesel for MH-12-AB-1234' },
    { id: 'ce_004', date: '2025-07-04', voucher_number: 'CV-004', particulars: 'Received local delivery charges', type: 'receipt', amount: 15000, narration: 'Cash delivery service' },
    { id: 'ce_005', date: '2025-07-05', voucher_number: 'CV-005', particulars: 'Paid toll charges', type: 'payment', amount: 4500, narration: 'Toll NH-44 Mumbai-Hyd' },
    { id: 'ce_006', date: '2025-07-06', voucher_number: 'CV-006', particulars: 'Paid office supplies', type: 'payment', amount: 3200, narration: 'Stationery & printer ink' },
    { id: 'ce_007', date: '2025-07-07', voucher_number: 'CV-007', particulars: 'Received container handling charges', type: 'receipt', amount: 8000, narration: 'Container handling at port' },
    { id: 'ce_008', date: '2025-07-08', voucher_number: 'CV-008', particulars: 'Paid vehicle repair advance', type: 'payment', amount: 10000, narration: 'Advance to Sharma Auto Works' },
  ] : []);


  const [bankEntries, setBankEntries] = useState<BankEntry[]>(isDemoTenant() ? [
    { id: 'be_001', date: '2025-07-01', voucher_number: 'BV-001', particulars: 'NEFT received from Reliance Industries', type: 'receipt', amount: 88500, reference: 'NEFT-20250701-56789', narration: 'Freight payment TRP-2025-0141' },
    { id: 'be_002', date: '2025-07-02', voucher_number: 'BV-002', particulars: 'Paid vehicle EMI - HDFC Bank', type: 'payment', amount: 35000, reference: 'EMI-AUTO-072025', narration: 'EMI for MH-14-EF-9012' },
    { id: 'be_003', date: '2025-07-03', voucher_number: 'BV-003', particulars: 'RTGS received from Maruti Suzuki', type: 'receipt', amount: 188490, reference: 'RTGS-20250703-12345', narration: 'Invoice INV-2025-0088 full payment' },
    { id: 'be_004', date: '2025-07-05', voucher_number: 'BV-004', particulars: 'Paid insurance premium - New India Assurance', type: 'payment', amount: 45000, reference: 'CHQ-445567', narration: 'Vehicle insurance RJ-14-JK-7890' },
    { id: 'be_005', date: '2025-07-07', voucher_number: 'BV-005', particulars: 'Paid driver salaries (bulk NEFT)', type: 'payment', amount: 125000, reference: 'NEFT-BULK-070725', narration: 'Monthly driver salaries July' },
    { id: 'be_006', date: '2025-07-08', voucher_number: 'BV-006', particulars: 'NEFT received from Asian Paints', type: 'receipt', amount: 50000, reference: 'NEFT-20250708-99012', narration: 'Part payment INV-2025-0087' },
  ] : []);


  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>(isDemoTenant() ? [
    { id: 'la_001', name: 'Cash', group: 'Assets', balance: 125300, balance_type: 'Dr' },
    { id: 'la_002', name: 'Bank (SBI Current A/c)', group: 'Assets', balance: 485000, balance_type: 'Dr' },
    { id: 'la_003', name: 'Sundry Debtors', group: 'Assets', balance: 2895000, balance_type: 'Dr' },
    { id: 'la_004', name: 'Sundry Creditors', group: 'Liabilities', balance: 320000, balance_type: 'Cr' },
    { id: 'la_005', name: 'Diesel Expense', group: 'Expense', balance: 245000, balance_type: 'Dr' },
    { id: 'la_006', name: 'Toll Expense', group: 'Expense', balance: 87000, balance_type: 'Dr' },
    { id: 'la_007', name: 'Salary', group: 'Expense', balance: 350000, balance_type: 'Dr' },
    { id: 'la_008', name: 'Freight Income', group: 'Income', balance: 1850000, balance_type: 'Cr' },
    { id: 'la_009', name: 'Vehicle Repairs', group: 'Expense', balance: 135000, balance_type: 'Dr' },
    { id: 'la_010', name: 'Office Expense', group: 'Expense', balance: 42000, balance_type: 'Dr' },
  ] : []);

  const [showCashModal, setShowCashModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);


  const [cashForm, setCashForm] = useState({ date: '', type: 'receipt' as 'receipt' | 'payment', amount: '', particulars: '', narration: '' });
  const [bankForm, setBankForm] = useState({ date: '', type: 'receipt' as 'receipt' | 'payment', amount: '', particulars: '', reference: '', narration: '' });
  const [ledgerForm, setLedgerForm] = useState({ name: '', group: 'Assets' as LedgerAccount['group'], balance: '', balance_type: 'Dr' as 'Dr' | 'Cr' });

  const openingCashBalance = 100000;
  const openingBankBalance = 350000;

  const computeCashRunning = () => {
    let balance = openingCashBalance;
    return cashEntries.map((entry) => {
      if (entry.type === 'receipt') balance += entry.amount;
      else balance -= entry.amount;
      return { ...entry, running_balance: balance };
    });
  };

  const computeBankRunning = () => {
    let balance = openingBankBalance;
    return bankEntries.map((entry) => {
      if (entry.type === 'receipt') balance += entry.amount;
      else balance -= entry.amount;
      return { ...entry, running_balance: balance };
    });
  };


  const handleAddCash = () => {
    if (!cashForm.date || !cashForm.amount || !cashForm.particulars) return;
    const newEntry: CashEntry = {
      id: 'ce_' + Date.now().toString(36),
      date: cashForm.date,
      voucher_number: `CV-${String(cashEntries.length + 1).padStart(3, '0')}`,
      particulars: cashForm.particulars,
      type: cashForm.type,
      amount: parseFloat(cashForm.amount),
      narration: cashForm.narration,
    };
    setCashEntries([...cashEntries, newEntry]);
    setShowCashModal(false);
    setCashForm({ date: '', type: 'receipt', amount: '', particulars: '', narration: '' });
  };

  const handleAddBank = () => {
    if (!bankForm.date || !bankForm.amount || !bankForm.particulars) return;
    const newEntry: BankEntry = {
      id: 'be_' + Date.now().toString(36),
      date: bankForm.date,
      voucher_number: `BV-${String(bankEntries.length + 1).padStart(3, '0')}`,
      particulars: bankForm.particulars,
      type: bankForm.type,
      amount: parseFloat(bankForm.amount),
      reference: bankForm.reference,
      narration: bankForm.narration,
    };
    setBankEntries([...bankEntries, newEntry]);
    setShowBankModal(false);
    setBankForm({ date: '', type: 'receipt', amount: '', particulars: '', reference: '', narration: '' });
  };


  const handleAddLedger = () => {
    if (!ledgerForm.name || !ledgerForm.balance) return;
    const newAccount: LedgerAccount = {
      id: 'la_' + Date.now().toString(36),
      name: ledgerForm.name,
      group: ledgerForm.group,
      balance: parseFloat(ledgerForm.balance),
      balance_type: ledgerForm.balance_type,
    };
    setLedgerAccounts([...ledgerAccounts, newAccount]);
    setShowLedgerModal(false);
    setLedgerForm({ name: '', group: 'Assets', balance: '', balance_type: 'Dr' });
  };

  const cashRunning = computeCashRunning();
  const bankRunning = computeBankRunning();

  const groupedLedger = {
    Assets: ledgerAccounts.filter((a) => a.group === 'Assets'),
    Liabilities: ledgerAccounts.filter((a) => a.group === 'Liabilities'),
    Income: ledgerAccounts.filter((a) => a.group === 'Income'),
    Expense: ledgerAccounts.filter((a) => a.group === 'Expense'),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash & Bank / Ledger</h1>
          <p className="text-slate-500 mt-1">Tally-style cash book, bank book & ledger accounts</p>
        </div>
      </div>


      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['cash', 'bank', 'ledger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {tab === 'cash' ? 'Cash Book' : tab === 'bank' ? 'Bank Book' : 'Ledger'}
          </button>
        ))}
      </div>

      {/* Cash Book */}
      {activeTab === 'cash' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Opening Balance</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(openingCashBalance)}</p>
              </div>
            </div>
            <button onClick={() => setShowCashModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          </div>


          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Voucher#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Particulars</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Receipt (Dr)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Payment (Cr)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashRunning.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.voucher_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{entry.particulars}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {entry.type === 'receipt' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        {entry.type === 'payment' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">{formatCurrency(entry.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Bank Book */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Opening Balance (SBI Current A/c)</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(openingBankBalance)}</p>
              </div>
            </div>
            <button onClick={() => setShowBankModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Voucher#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Particulars</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Chq/Ref</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Receipt (Dr)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Payment (Cr)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankRunning.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.voucher_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{entry.particulars}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{entry.reference}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {entry.type === 'receipt' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        {entry.type === 'payment' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">{formatCurrency(entry.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Landmark className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Chart of Accounts</p>
                <p className="text-lg font-bold text-slate-900">{ledgerAccounts.length} Accounts</p>
              </div>
            </div>
            <button onClick={() => setShowLedgerModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>

          {Object.entries(groupedLedger).map(([group, accounts]) => (
            <div key={group} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{group}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <div key={account.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-500">{account.group}</p>
                    </div>
                    <div className="text-right">
                      <p className={classNames('text-sm font-bold', account.balance_type === 'Dr' ? 'text-blue-700' : 'text-orange-700')}>
                        {formatCurrency(account.balance)} {account.balance_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Cash Entry Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCashModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">New Cash Entry</h2>
              <button onClick={() => setShowCashModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={cashForm.date} onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={cashForm.type} onChange={(e) => setCashForm({ ...cashForm, type: e.target.value as 'receipt' | 'payment' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="receipt">Receipt</option>
                  <option value="payment">Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Particulars</label>
                <input type="text" value={cashForm.particulars} onChange={(e) => setCashForm({ ...cashForm, particulars: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Received from / Paid to" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Narration</label>
                <input type="text" value={cashForm.narration} onChange={(e) => setCashForm({ ...cashForm, narration: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Description" />
              </div>
              <button onClick={handleAddCash} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Entry</button>
            </div>
          </div>
        </div>
      )}


      {/* Bank Entry Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBankModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">New Bank Entry</h2>
              <button onClick={() => setShowBankModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={bankForm.date} onChange={(e) => setBankForm({ ...bankForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={bankForm.type} onChange={(e) => setBankForm({ ...bankForm, type: e.target.value as 'receipt' | 'payment' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="receipt">Receipt</option>
                  <option value="payment">Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" value={bankForm.amount} onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Particulars</label>
                <input type="text" value={bankForm.particulars} onChange={(e) => setBankForm({ ...bankForm, particulars: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="NEFT/RTGS from / Paid to" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cheque/Reference No.</label>
                <input type="text" value={bankForm.reference} onChange={(e) => setBankForm({ ...bankForm, reference: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="NEFT-xxxx / CHQ-xxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Narration</label>
                <input type="text" value={bankForm.narration} onChange={(e) => setBankForm({ ...bankForm, narration: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Description" />
              </div>
              <button onClick={handleAddBank} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Entry</button>
            </div>
          </div>
        </div>
      )}


      {/* Add Ledger Account Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLedgerModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Ledger Account</h2>
              <button onClick={() => setShowLedgerModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input type="text" value={ledgerForm.name} onChange={(e) => setLedgerForm({ ...ledgerForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Rent Expense" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                <select value={ledgerForm.group} onChange={(e) => setLedgerForm({ ...ledgerForm, group: e.target.value as LedgerAccount['group'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="Assets">Assets</option>
                  <option value="Liabilities">Liabilities</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (₹)</label>
                <input type="number" value={ledgerForm.balance} onChange={(e) => setLedgerForm({ ...ledgerForm, balance: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Balance Type</label>
                <select value={ledgerForm.balance_type} onChange={(e) => setLedgerForm({ ...ledgerForm, balance_type: e.target.value as 'Dr' | 'Cr' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="Dr">Debit (Dr)</option>
                  <option value="Cr">Credit (Cr)</option>
                </select>
              </div>
              <button onClick={handleAddLedger} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
