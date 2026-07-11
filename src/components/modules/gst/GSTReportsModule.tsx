import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { FileText, Download, Calendar, Filter, AlertTriangle } from 'lucide-react';

type GSTView = 'gstr1' | 'gstr3b' | 'hsn';
type MonthFilter = string; // 'YYYY-MM'

interface GSTR1Row {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  gstin: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  total_invoice: number;
}

interface HSNRow {
  hsn_code: string;
  description: string;
  quantity: number;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  total_tax: number;
}


export default function GSTReportsModule() {
  const { company } = useStore();
  const { data: invoices } = useModuleData<any>('invoices');
  const { data: customers } = useModuleData<any>('customers');
  const [view, setView] = useState<GSTView>('gstr1');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // Filter invoices by month
  const monthInvoices = useMemo(() => {
    return invoices.filter(inv => inv.invoice_date.startsWith(selectedMonth));
  }, [invoices, selectedMonth]);

  // GSTR-1 data (outward supplies)
  const gstr1Data: GSTR1Row[] = useMemo(() => {
    return monthInvoices.map(inv => {
      const customer = customers.find(c => c.id === inv.customer_id);
      const isInterState = true; // Simplified — assume inter-state for transport
      const taxableValue = inv.subtotal;
      const igst = isInterState ? inv.gst_amount : 0;
      const cgst = !isInterState ? Math.round(inv.gst_amount / 2) : 0;
      const sgst = !isInterState ? Math.round(inv.gst_amount / 2) : 0;
      return {
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        customer_name: inv.customer_name,
        gstin: customer?.gstin || 'URP',
        taxable_value: taxableValue,
        igst, cgst, sgst,
        total_tax: inv.gst_amount,
        total_invoice: inv.total_amount,
      };
    });
  }, [monthInvoices, customers]);


  // GSTR-3B summary
  const gstr3bSummary = useMemo(() => {
    const totalTaxable = monthInvoices.reduce((s, i) => s + i.subtotal, 0);
    const totalIGST = monthInvoices.reduce((s, i) => s + i.gst_amount, 0);
    const totalCGST = 0; // All inter-state for transport
    const totalSGST = 0;
    const tdsDeducted = monthInvoices.reduce((s, i) => s + i.tds_amount, 0);
    const netPayable = totalIGST - 0; // No ITC claimed in simplified view
    return { totalTaxable, totalIGST, totalCGST, totalSGST, tdsDeducted, netPayable, invoiceCount: monthInvoices.length };
  }, [monthInvoices]);

  // HSN Summary
  const hsnData: HSNRow[] = useMemo(() => {
    // Transport services = SAC 9965
    const transportValue = monthInvoices.reduce((s, i) => s + i.freight_total, 0);
    const transportTax = monthInvoices.reduce((s, i) => s + i.gst_amount, 0);
    const detentionValue = monthInvoices.reduce((s, i) => s + i.detention_total, 0);
    const rows: HSNRow[] = [];
    if (transportValue > 0) {
      rows.push({
        hsn_code: '9965',
        description: 'Goods Transport Services (GTA)',
        quantity: monthInvoices.length,
        taxable_value: transportValue,
        igst: transportTax,
        cgst: 0, sgst: 0,
        total_tax: transportTax,
      });
    }
    if (detentionValue > 0) {
      rows.push({
        hsn_code: '9967',
        description: 'Detention & Demurrage Charges',
        quantity: monthInvoices.filter(i => i.detention_total > 0).length,
        taxable_value: detentionValue,
        igst: Math.round(detentionValue * 0.05),
        cgst: 0, sgst: 0,
        total_tax: Math.round(detentionValue * 0.05),
      });
    }
    return rows;
  }, [monthInvoices]);


  const exportGSTR1 = () => {
    const headers = ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total Tax', 'Invoice Value'];
    const rows = gstr1Data.map(r => [r.invoice_number, r.invoice_date, r.customer_name, r.gstin, r.taxable_value, r.igst, r.cgst, r.sgst, r.total_tax, r.total_invoice]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csv, `GSTR1-${selectedMonth}.csv`);
  };

  const exportGSTR3B = () => {
    const csv = `GSTR-3B Summary for ${selectedMonth}\n\nParticulars,Amount\nTotal Taxable Value,${gstr3bSummary.totalTaxable}\nIGST Payable,${gstr3bSummary.totalIGST}\nCGST Payable,${gstr3bSummary.totalCGST}\nSGST Payable,${gstr3bSummary.totalSGST}\nTDS Deducted by Customers,${gstr3bSummary.tdsDeducted}\nNet GST Payable,${gstr3bSummary.netPayable}\nNumber of Invoices,${gstr3bSummary.invoiceCount}`;
    downloadCSV(csv, `GSTR3B-${selectedMonth}.csv`);
  };

  const exportHSN = () => {
    const headers = ['HSN/SAC', 'Description', 'Qty', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Total Tax'];
    const rows = hsnData.map(r => [r.hsn_code, r.description, r.quantity, r.taxable_value, r.igst, r.cgst, r.sgst, r.total_tax]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    downloadCSV(csv, `HSN-Summary-${selectedMonth}.csv`);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Month selector options (last 12 months)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label });
    }
    return opts;
  }, []);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>GST Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>GSTR-1, GSTR-3B & HSN Summary — Ready for filing</p>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
          GSTIN: {company.gstin}
        </div>
      </div>

      {/* Tabs & Month Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {([
            { id: 'gstr1', label: 'GSTR-1 (Outward)' },
            { id: 'gstr3b', label: 'GSTR-3B (Summary)' },
            { id: 'hsn', label: 'HSN Summary' },
          ] as { id: GSTView; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium', view === tab.id ? 'bg-blue-600 text-white' : '')} style={view !== tab.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>


      {/* GSTR-1 View */}
      {view === 'gstr1' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{gstr1Data.length} invoices for {selectedMonth}</p>
            <button onClick={exportGSTR1} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <Download className="w-4 h-4" /> Export GSTR-1
            </button>
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>GSTIN</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Taxable</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>IGST</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1Data.map(row => (
                    <tr key={row.invoice_number} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.invoice_number}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(row.invoice_date)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.customer_name}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{row.gstin}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.taxable_value)}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.igst)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.total_invoice)}</td>
                    </tr>
                  ))}
                  {gstr1Data.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No invoices for this month</td></tr>
                  )}
                </tbody>
                {gstr1Data.length > 0 && (
                  <tfoot style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <tr className="font-bold">
                      <td colSpan={4} className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>TOTAL</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr1Data.reduce((s, r) => s + r.taxable_value, 0))}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr1Data.reduce((s, r) => s + r.igst, 0))}</td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr1Data.reduce((s, r) => s + r.total_invoice, 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}


      {/* GSTR-3B View */}
      {view === 'gstr3b' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportGSTR3B} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <Download className="w-4 h-4" /> Export GSTR-3B
            </button>
          </div>
          <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>GSTR-3B Summary — {selectedMonth}</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs font-medium uppercase mb-3" style={{ color: 'var(--text-tertiary)' }}>3.1 Outward Supplies</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Taxable Value</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr3bSummary.totalTaxable)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>IGST</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(gstr3bSummary.totalIGST)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>CGST</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr3bSummary.totalCGST)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>SGST</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr3bSummary.totalSGST)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs font-medium uppercase mb-3" style={{ color: 'var(--text-tertiary)' }}>5. Tax Liability & Payment</p>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Tax Liability (IGST)</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(gstr3bSummary.totalIGST)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Less: Input Tax Credit (ITC)</span>
                    <span className="text-sm font-medium text-green-600">- ₹0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Less: TDS Deducted by Customers</span>
                    <span className="text-sm font-medium text-green-600">- {formatCurrency(gstr3bSummary.tdsDeducted)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold">
                    <span style={{ color: 'var(--text-primary)' }}>Net GST Payable</span>
                    <span className="text-blue-600">{formatCurrency(gstr3bSummary.netPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This is an auto-generated summary. Please verify with your CA before filing on GST Portal.</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* HSN Summary View */}
      {view === 'hsn' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportHSN} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <Download className="w-4 h-4" /> Export HSN
            </button>
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>HSN/SAC</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Description</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Taxable</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>IGST</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {hsnData.map(row => (
                  <tr key={row.hsn_code} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: 'var(--accent)' }}>{row.hsn_code}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.description}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{row.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.taxable_value)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.igst)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.total_tax)}</td>
                  </tr>
                ))}
                {hsnData.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No data for this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
