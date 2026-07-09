import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the sheet
 */
export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Auto-size columns
  const maxWidth = data.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const len = String(row[key] || '').length;
      acc[i] = Math.max((acc[i] as number) || 10, len + 2, key.length + 2);
    });
    return acc;
  }, {} as Record<number, number>);
  
  worksheet['!cols'] = Object.values(maxWidth).map(w => ({ wch: Math.min(w as number, 40) }));
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export vehicles to Excel
 */
export function exportVehicles(vehicles: any[]) {
  const data = vehicles.map(v => ({
    'Reg Number': v.reg_number,
    'Type': v.vehicle_type,
    'Make': v.make,
    'Model': v.model,
    'Year': v.year,
    'Capacity (T)': v.capacity_tons,
    'Owner': v.owner_name,
    'Driver': v.driver_name || 'Unassigned',
    'Status': v.status,
    'Odometer': v.odometer,
    'Fitness Expiry': v.fitness_expiry,
    'Insurance Expiry': v.insurance_expiry,
  }));
  exportToExcel(data, `vehicles_${new Date().toISOString().split('T')[0]}`, 'Vehicles');
}

/**
 * Export trips to Excel
 */
export function exportTrips(trips: any[]) {
  const data = trips.map(t => ({
    'Trip #': t.trip_number,
    'LR': t.lr_number,
    'Customer': t.customer_name,
    'Origin': t.origin,
    'Destination': t.destination,
    'Vehicle': t.vehicle_reg,
    'Driver': t.driver_name,
    'Material': t.material,
    'Weight (T)': t.weight_tons,
    'Distance (km)': t.distance_km,
    'Freight': t.freight_amount,
    'Advance': t.advance_amount,
    'Total': t.total_amount,
    'Status': t.status,
    'Booking Date': t.booking_date,
  }));
  exportToExcel(data, `trips_${new Date().toISOString().split('T')[0]}`, 'Trips');
}

/**
 * Export invoices to Excel
 */
export function exportInvoices(invoices: any[]) {
  const data = invoices.map(inv => ({
    'Invoice #': inv.invoice_number,
    'Customer': inv.customer_name,
    'Date': inv.invoice_date,
    'Due Date': inv.due_date,
    'Freight': inv.freight_total,
    'GST': inv.gst_amount,
    'TDS': inv.tds_amount,
    'Total': inv.total_amount,
    'Paid': inv.paid_amount,
    'Balance': inv.balance_amount,
    'Status': inv.status,
  }));
  exportToExcel(data, `invoices_${new Date().toISOString().split('T')[0]}`, 'Invoices');
}

/**
 * Export customers to Excel
 */
export function exportCustomers(customers: any[]) {
  const data = customers.map(c => ({
    'Company': c.name,
    'Contact Person': c.contact_person,
    'Phone': c.phone,
    'Email': c.email,
    'GSTIN': c.gstin,
    'Address': c.billing_address,
    'Credit Limit': c.credit_limit,
    'Credit Days': c.credit_days,
    'Outstanding': c.outstanding,
    'Total Business': c.total_business,
    'Status': c.status,
  }));
  exportToExcel(data, `customers_${new Date().toISOString().split('T')[0]}`, 'Customers');
}

/**
 * Export expenses to Excel
 */
export function exportExpenses(expenses: any[]) {
  const data = expenses.map(e => ({
    'Date': e.date,
    'Category': e.category,
    'Description': e.description,
    'Vehicle': e.vehicle_reg || '-',
    'Paid To': e.paid_to,
    'Amount': e.amount,
    'Mode': e.payment_mode,
  }));
  exportToExcel(data, `expenses_${new Date().toISOString().split('T')[0]}`, 'Expenses');
}

/**
 * Export drivers to Excel
 */
export function exportDrivers(drivers: any[]) {
  const data = drivers.map(d => ({
    'Name': d.name,
    'Phone': d.phone,
    'License #': d.license_number,
    'License Expiry': d.license_expiry,
    'Salary Type': d.salary_type,
    'Base Salary': d.base_salary,
    'Safety Score': d.safety_score,
    'Total Trips': d.total_trips,
    'Total KM': d.total_km,
    'Status': d.status,
    'Vehicle': d.assigned_vehicle_reg || 'Unassigned',
  }));
  exportToExcel(data, `drivers_${new Date().toISOString().split('T')[0]}`, 'Drivers');
}
