// Excel/CSV Export — No vulnerable dependencies
// Uses native CSV generation (opens in Excel, Google Sheets, etc.)

/**
 * Export data to CSV file (compatible with Excel)
 */
export function exportToExcel(data: Record<string, unknown>[], filename: string, _sheetName: string = 'Sheet1') {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = String(row[h] ?? '');
        // Escape values containing commas or quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    ),
  ];
  
  const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVehicles(vehicles: any[]) {
  const data = vehicles.map(v => ({
    'Reg Number': v.reg_number, 'Type': v.vehicle_type, 'Make': v.make, 'Model': v.model,
    'Year': v.year, 'Capacity (T)': v.capacity_tons, 'Owner': v.owner_name,
    'Driver': v.driver_name || 'Unassigned', 'Status': v.status, 'Odometer': v.odometer,
    'Fitness Expiry': v.fitness_expiry, 'Insurance Expiry': v.insurance_expiry,
  }));
  exportToExcel(data, `vehicles_${new Date().toISOString().split('T')[0]}`, 'Vehicles');
}

export function exportTrips(trips: any[]) {
  const data = trips.map(t => ({
    'Trip #': t.trip_number, 'LR': t.lr_number, 'Customer': t.customer_name,
    'Origin': t.origin, 'Destination': t.destination, 'Vehicle': t.vehicle_reg,
    'Driver': t.driver_name, 'Material': t.material, 'Weight (T)': t.weight_tons,
    'Distance (km)': t.distance_km, 'Freight': t.freight_amount, 'Advance': t.advance_amount,
    'Total': t.total_amount, 'Status': t.status, 'Booking Date': t.booking_date,
  }));
  exportToExcel(data, `trips_${new Date().toISOString().split('T')[0]}`, 'Trips');
}

export function exportInvoices(invoices: any[]) {
  const data = invoices.map(inv => ({
    'Invoice #': inv.invoice_number, 'Customer': inv.customer_name, 'Date': inv.invoice_date,
    'Due Date': inv.due_date, 'Freight': inv.freight_total, 'GST': inv.gst_amount,
    'TDS': inv.tds_amount, 'Total': inv.total_amount, 'Paid': inv.paid_amount,
    'Balance': inv.balance_amount, 'Status': inv.status,
  }));
  exportToExcel(data, `invoices_${new Date().toISOString().split('T')[0]}`, 'Invoices');
}

export function exportCustomers(customers: any[]) {
  const data = customers.map(c => ({
    'Company': c.name, 'Contact Person': c.contact_person, 'Phone': c.phone,
    'Email': c.email, 'GSTIN': c.gstin, 'Address': c.billing_address,
    'Credit Limit': c.credit_limit, 'Credit Days': c.credit_days,
    'Outstanding': c.outstanding, 'Total Business': c.total_business, 'Status': c.status,
  }));
  exportToExcel(data, `customers_${new Date().toISOString().split('T')[0]}`, 'Customers');
}

export function exportExpenses(expenses: any[]) {
  const data = expenses.map(e => ({
    'Date': e.date, 'Category': e.category, 'Description': e.description,
    'Vehicle': e.vehicle_reg || '-', 'Paid To': e.paid_to, 'Amount': e.amount, 'Mode': e.payment_mode,
  }));
  exportToExcel(data, `expenses_${new Date().toISOString().split('T')[0]}`, 'Expenses');
}

export function exportDrivers(drivers: any[]) {
  const data = drivers.map(d => ({
    'Name': d.name, 'Phone': d.phone, 'License #': d.license_number,
    'License Expiry': d.license_expiry, 'Salary Type': d.salary_type,
    'Base Salary': d.base_salary, 'Safety Score': d.safety_score,
    'Total Trips': d.total_trips, 'Total KM': d.total_km, 'Status': d.status,
    'Vehicle': d.assigned_vehicle_reg || 'Unassigned',
  }));
  exportToExcel(data, `drivers_${new Date().toISOString().split('T')[0]}`, 'Drivers');
}
