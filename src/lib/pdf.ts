// PDF Generation for Transport ERP
// Uses browser's built-in print functionality with a styled HTML template
// No external library needed - works everywhere

import type { Invoice, Trip, Company } from '../types';
import { formatCurrency, formatDate } from './utils';

/**
 * Generates and opens a printable invoice PDF in a new window
 */
export function generateInvoicePDF(invoice: Invoice, company: Company, trips: Trip[]) {
  const linkedTrips = trips.filter(t => invoice.trip_ids.includes(t.id));
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
    .company-name { font-size: 22px; font-weight: 800; color: #2563eb; }
    .company-details { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .invoice-title .number { font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .meta-box { padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .meta-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
    .meta-box p { font-size: 12px; line-height: 1.8; color: #334155; }
    .meta-box .bold { font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .totals-row.grand { border-top: 2px solid #0f172a; border-bottom: none; padding-top: 12px; margin-top: 8px; }
    .totals-row.grand span { font-size: 16px; font-weight: 800; color: #0f172a; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
    .footer-section h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
    .footer-section p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge-sent { background: #dbeafe; color: #1d4ed8; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-overdue { background: #fee2e2; color: #991b1b; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="company-name">${company.name}</div>
      <div class="company-details">
        ${company.address}, ${company.city}, ${company.state}<br>
        GSTIN: ${company.gstin} | PAN: ${company.pan}<br>
        Phone: ${company.phone} | Email: ${company.email}
      </div>
    </div>
    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="number">${invoice.invoice_number}</div>
      <div style="margin-top: 8px;">
        <span class="badge badge-${invoice.status}">${invoice.status.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <h3>Bill To</h3>
      <p class="bold">${invoice.customer_name}</p>
      <p>Customer ID: ${invoice.customer_id}</p>
    </div>
    <div class="meta-box">
      <h3>Invoice Details</h3>
      <p><span class="bold">Date:</span> ${formatDate(invoice.invoice_date)}</p>
      <p><span class="bold">Due Date:</span> ${formatDate(invoice.due_date)}</p>
      <p><span class="bold">GST:</span> ${invoice.gst_percent}%</p>
    </div>
  </div>

  ${linkedTrips.length > 0 ? `
  <h3 style="font-size: 12px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Trip Details</h3>
  <table>
    <thead>
      <tr>
        <th>Trip #</th>
        <th>LR Number</th>
        <th>Route</th>
        <th>Material</th>
        <th>Weight</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${linkedTrips.map(t => `
      <tr>
        <td style="font-weight: 600;">${t.trip_number}</td>
        <td>${t.lr_number}</td>
        <td>${t.origin} → ${t.destination}</td>
        <td>${t.material}</td>
        <td>${t.weight_tons} T</td>
        <td class="text-right" style="font-weight: 600;">${formatCurrency(t.freight_amount)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="totals">
    <div class="totals-row">
      <span>Freight Total</span>
      <span style="font-weight: 600;">${formatCurrency(invoice.freight_total)}</span>
    </div>
    ${invoice.detention_total > 0 ? `
    <div class="totals-row">
      <span>Detention Charges</span>
      <span style="font-weight: 600;">${formatCurrency(invoice.detention_total)}</span>
    </div>
    ` : ''}
    ${invoice.other_charges > 0 ? `
    <div class="totals-row">
      <span>Other Charges</span>
      <span style="font-weight: 600;">${formatCurrency(invoice.other_charges)}</span>
    </div>
    ` : ''}
    <div class="totals-row">
      <span>Subtotal</span>
      <span style="font-weight: 600;">${formatCurrency(invoice.subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>GST (${invoice.gst_percent}%)</span>
      <span style="font-weight: 600;">${formatCurrency(invoice.gst_amount)}</span>
    </div>
    <div class="totals-row">
      <span>TDS Deduction</span>
      <span style="font-weight: 600; color: #dc2626;">- ${formatCurrency(invoice.tds_amount)}</span>
    </div>
    <div class="totals-row grand">
      <span>Total Amount</span>
      <span>${formatCurrency(invoice.total_amount)}</span>
    </div>
    ${invoice.paid_amount > 0 ? `
    <div class="totals-row">
      <span style="color: #16a34a;">Paid Amount</span>
      <span style="font-weight: 600; color: #16a34a;">${formatCurrency(invoice.paid_amount)}</span>
    </div>
    <div class="totals-row">
      <span style="color: #dc2626;">Balance Due</span>
      <span style="font-weight: 700; color: #dc2626;">${formatCurrency(invoice.balance_amount)}</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <div class="footer-section">
      <h4>Payment Terms</h4>
      <p>Payment due within credit period from invoice date.<br>
      Bank: State Bank of India<br>
      A/C: 39876543210 | IFSC: SBIN0001234</p>
    </div>
    <div class="footer-section" style="text-align: right;">
      <h4>Authorized Signatory</h4>
      <p style="margin-top: 40px; border-top: 1px solid #94a3b8; padding-top: 8px;">
        For ${company.name}
      </p>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Generates and opens a printable LR (Lorry Receipt) in a new window
 */
export function generateLRPDF(trip: Trip, company: Company) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>LR - ${trip.lr_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0f172a; }
    .company-name { font-size: 20px; font-weight: 800; color: #0f172a; }
    .company-details { font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .lr-title { text-align: right; }
    .lr-title h1 { font-size: 24px; font-weight: 800; color: #0f172a; }
    .lr-title .number { font-size: 16px; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .field { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
    .field-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .route-section { margin: 24px 0; padding: 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; }
    .route-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0369a1; margin-bottom: 12px; }
    .route-arrow { display: flex; align-items: center; gap: 12px; }
    .route-point { font-size: 14px; font-weight: 700; color: #0f172a; }
    .route-line { flex: 1; height: 2px; background: repeating-linear-gradient(90deg, #0ea5e9 0, #0ea5e9 8px, transparent 8px, transparent 12px); }
    .terms { margin-top: 32px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; }
    .terms h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; margin-bottom: 8px; }
    .terms p { font-size: 10px; color: #78716c; line-height: 1.8; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; }
    .sig-box { text-align: center; padding-top: 48px; border-top: 1px solid #cbd5e1; }
    .sig-box p { font-size: 10px; color: #64748b; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #0f172a; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="company-name">${company.name}</div>
      <div class="company-details">
        ${company.address}, ${company.city}, ${company.state}<br>
        GSTIN: ${company.gstin} | Phone: ${company.phone}
      </div>
    </div>
    <div class="lr-title">
      <h1>LORRY RECEIPT</h1>
      <div class="number">${trip.lr_number}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Trip: ${trip.trip_number}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="field">
      <div class="field-label">Consignor / Customer</div>
      <div class="field-value">${trip.customer_name}</div>
    </div>
    <div class="field">
      <div class="field-label">Booking Date</div>
      <div class="field-value">${formatDate(trip.booking_date)}</div>
    </div>
  </div>

  <div class="route-section">
    <h3>Route</h3>
    <div class="route-arrow">
      <div class="route-point">📍 ${trip.origin}</div>
      <div class="route-line"></div>
      <div class="route-point">🏁 ${trip.destination}</div>
    </div>
    <div style="margin-top: 8px; font-size: 11px; color: #64748b;">Distance: ${trip.distance_km} km</div>
  </div>

  <div class="grid-3">
    <div class="field">
      <div class="field-label">Vehicle Number</div>
      <div class="field-value">${trip.vehicle_reg || 'Not Assigned'}</div>
    </div>
    <div class="field">
      <div class="field-label">Driver Name</div>
      <div class="field-value">${trip.driver_name || 'Not Assigned'}</div>
    </div>
    <div class="field">
      <div class="field-label">Driver Phone</div>
      <div class="field-value">${trip.driver_phone || '—'}</div>
    </div>
  </div>

  <div class="grid-3">
    <div class="field">
      <div class="field-label">Material</div>
      <div class="field-value">${trip.material}</div>
    </div>
    <div class="field">
      <div class="field-label">Weight</div>
      <div class="field-value">${trip.weight_tons} Tons</div>
    </div>
    <div class="field">
      <div class="field-label">Packages</div>
      <div class="field-value">${trip.num_packages || '—'}</div>
    </div>
  </div>

  <div class="grid-3">
    <div class="field">
      <div class="field-label">Freight Amount</div>
      <div class="field-value">${formatCurrency(trip.freight_amount)}</div>
    </div>
    <div class="field">
      <div class="field-label">Advance Paid</div>
      <div class="field-value">${formatCurrency(trip.advance_amount)}</div>
    </div>
    <div class="field">
      <div class="field-label">Balance</div>
      <div class="field-value">${formatCurrency(trip.balance_amount)}</div>
    </div>
  </div>

  ${trip.eway_bill ? `
  <div class="field" style="margin-bottom: 20px;">
    <div class="field-label">E-Way Bill Number</div>
    <div class="field-value">${trip.eway_bill}</div>
  </div>
  ` : ''}

  <div class="terms">
    <h4>Terms & Conditions</h4>
    <p>
      1. Goods are carried at owner's risk. Company is not responsible for damage/pilferage during transit.<br>
      2. Delivery will be made to consignee or authorized representative only.<br>
      3. Detention charges applicable after 24 hours of arrival at destination.<br>
      4. All disputes subject to ${company.city} jurisdiction.
    </p>
  </div>

  <div class="signatures">
    <div class="sig-box"><p>Consignor's Signature</p></div>
    <div class="sig-box"><p>Driver's Signature</p></div>
    <div class="sig-box"><p>For ${company.name}</p></div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Generates a trip summary report PDF
 */
export function generateTripReportPDF(trips: Trip[], company: Company, title: string = 'Trip Report') {
  const totalFreight = trips.reduce((s, t) => s + t.freight_amount, 0);
  const totalAmount = trips.reduce((s, t) => s + t.total_amount, 0);
  const totalKm = trips.reduce((s, t) => s + t.distance_km, 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${company.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11px; color: #1e293b; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
    .company-name { font-size: 18px; font-weight: 800; color: #2563eb; }
    h1 { font-size: 20px; font-weight: 800; color: #0f172a; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; }
    .summary-card .value { font-size: 18px; font-weight: 800; color: #0f172a; }
    .summary-card .label { font-size: 9px; text-transform: uppercase; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print</button>

  <div class="header">
    <div class="company-name">${company.name}</div>
    <h1>${title}</h1>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="value">${trips.length}</div>
      <div class="label">Total Trips</div>
    </div>
    <div class="summary-card">
      <div class="value">${formatCurrency(totalFreight)}</div>
      <div class="label">Total Freight</div>
    </div>
    <div class="summary-card">
      <div class="value">${formatCurrency(totalAmount)}</div>
      <div class="label">Total Revenue</div>
    </div>
    <div class="summary-card">
      <div class="value">${totalKm.toLocaleString()} km</div>
      <div class="label">Total Distance</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Trip #</th>
        <th>LR</th>
        <th>Customer</th>
        <th>Route</th>
        <th>Vehicle</th>
        <th>Material</th>
        <th class="text-right">Weight</th>
        <th class="text-right">Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${trips.map(t => `
      <tr>
        <td style="font-weight: 600;">${t.trip_number}</td>
        <td>${t.lr_number}</td>
        <td>${t.customer_name}</td>
        <td>${t.origin.split(',')[0]} → ${t.destination.split(',')[0]}</td>
        <td>${t.vehicle_reg}</td>
        <td>${t.material}</td>
        <td class="text-right">${t.weight_tons}T</td>
        <td class="text-right" style="font-weight: 600;">${formatCurrency(t.total_amount)}</td>
        <td><span class="badge" style="background: #e2e8f0;">${t.status.replace('_', ' ')}</span></td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="margin-top: 24px; text-align: right; font-size: 10px; color: #64748b;">
    Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}


/**
 * Generates and opens a printable Quotation PDF in a new window
 */
export function generateQuotationPDF(quotation: { quotation_number: string; customer_name: string; origin: string; destination: string; vehicle_type: string; material: string; weight_tons: number; rate_type: string; rate: number; total_amount: number; gst_percent: number; validity_days: number; terms?: string; created_at: string; }, company: { name: string; address: string; city: string; state: string; gstin: string; pan: string; phone: string; email: string; }) {
  const gstAmount = Math.round(quotation.rate * quotation.gst_percent / 100);
  const grandTotal = quotation.rate + gstAmount;
  const validUntil = new Date(new Date(quotation.created_at).getTime() + quotation.validity_days * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Quotation ${quotation.quotation_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #4f46e5; }
    .company-name { font-size: 22px; font-weight: 800; color: #4f46e5; }
    .company-details { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .quote-title { text-align: right; }
    .quote-title h1 { font-size: 28px; font-weight: 800; color: #0f172a; }
    .quote-title .number { font-size: 14px; font-weight: 600; color: #4f46e5; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .meta-box { padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .meta-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
    .meta-box p { font-size: 12px; line-height: 1.8; color: #334155; }
    .meta-box .bold { font-weight: 600; color: #0f172a; }
    .route-box { padding: 20px; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe; margin-bottom: 24px; }
    .route-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #4338ca; font-weight: 700; margin-bottom: 12px; }
    .route { display: flex; align-items: center; gap: 12px; }
    .route-point { font-size: 14px; font-weight: 700; color: #0f172a; }
    .route-line { flex: 1; height: 2px; background: repeating-linear-gradient(90deg, #4f46e5 0, #4f46e5 8px, transparent 8px, transparent 12px); }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
    .totals { margin-left: auto; width: 300px; margin-top: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .totals-row.grand { border-top: 2px solid #0f172a; border-bottom: none; padding-top: 12px; margin-top: 8px; }
    .totals-row.grand span { font-size: 16px; font-weight: 800; color: #0f172a; }
    .validity { margin-top: 24px; padding: 12px 16px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; font-size: 11px; color: #92400e; font-weight: 600; }
    .terms { margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .terms h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
    .terms p { font-size: 11px; color: #64748b; line-height: 1.8; }
    .footer { margin-top: 48px; display: flex; justify-content: space-between; }
    .footer-section h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
    .footer-section p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #4338ca; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="company-name">${company.name}</div>
      <div class="company-details">
        ${company.address}, ${company.city}, ${company.state}<br>
        GSTIN: ${company.gstin} | PAN: ${company.pan}<br>
        Phone: ${company.phone} | Email: ${company.email}
      </div>
    </div>
    <div class="quote-title">
      <h1>QUOTATION</h1>
      <div class="number">${quotation.quotation_number}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <h3>Quotation To</h3>
      <p class="bold">${quotation.customer_name}</p>
    </div>
    <div class="meta-box">
      <h3>Quotation Details</h3>
      <p><span class="bold">Date:</span> ${new Date(quotation.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <p><span class="bold">Valid Until:</span> ${validUntil}</p>
      <p><span class="bold">Vehicle Type:</span> ${quotation.vehicle_type}</p>
    </div>
  </div>

  <div class="route-box">
    <h3>Route</h3>
    <div class="route">
      <div class="route-point">${quotation.origin}</div>
      <div class="route-line"></div>
      <div class="route-point">${quotation.destination}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Material</th>
        <th>Weight</th>
        <th>Rate Type</th>
        <th style="text-align:right">Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600">Freight Charges</td>
        <td>${quotation.material}</td>
        <td>${quotation.weight_tons} Tons</td>
        <td style="text-transform:capitalize">${quotation.rate_type.replace('_', ' ')}</td>
        <td style="text-align:right; font-weight:600">₹${quotation.rate.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span style="font-weight:600">₹${quotation.rate.toLocaleString('en-IN')}</span>
    </div>
    <div class="totals-row">
      <span>GST (${quotation.gst_percent}%)</span>
      <span style="font-weight:600">₹${gstAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="totals-row grand">
      <span>Total Amount</span>
      <span>₹${grandTotal.toLocaleString('en-IN')}</span>
    </div>
  </div>

  <div class="validity">
    ⏰ This quotation is valid for ${quotation.validity_days} days from the date of issue (until ${validUntil})
  </div>

  ${quotation.terms ? `
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <p>${quotation.terms}</p>
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-section">
      <h4>Notes</h4>
      <p>- Rates are subject to fuel price variation clause<br>
      - Loading/unloading at party's scope unless specified<br>
      - Transit insurance not included unless requested</p>
    </div>
    <div class="footer-section" style="text-align: right;">
      <h4>Authorized Signatory</h4>
      <p style="margin-top: 40px; border-top: 1px solid #94a3b8; padding-top: 8px;">
        For ${company.name}
      </p>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
