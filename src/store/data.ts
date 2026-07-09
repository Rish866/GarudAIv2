// GARUD AI - Transport ERP - Seed Data Store
import { Vehicle, Driver, Customer, Trip, Invoice, Payment, Expense, FuelEntry, MaintenanceRecord, SystemAlert, Enquiry, Quotation, DashboardMetrics, Company, User } from '../types';

export const DEMO_COMPANY: Company = {
  id: 'comp-001',
  name: 'Shree Balaji Transport Co.',
  domain: 'balaji.garud.ai',
  industry: 'Logistics & Freight',
  address: '42, Transport Nagar, Sector 12, Gurgaon, Haryana 122001',
  gstin: '06AABCT1332Q1Z5',
  pan: 'AABCT1332Q',
  phone: '+91 98100-22334',
  email: 'admin@balajitransport.in',
  plan: 'professional',
  created_at: '2024-01-15',
};

export const DEMO_USER: User = {
  id: 'user-001',
  company_id: 'comp-001',
  email: 'admin@balajitransport.in',
  name: 'Rajesh Kumar',
  role: 'admin',
  phone: '+91 98100-22334',
  status: 'active',
  created_at: '2024-01-15',
};


export const VEHICLES: Vehicle[] = [
  { id: 'v-001', company_id: 'comp-001', reg_number: 'HR-55-AJ-9021', vehicle_type: 'trailer', make: 'Ashok Leyland', model: 'U-3718', year: 2022, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 35, fitness_expiry: '2027-03-15', insurance_expiry: '2026-11-20', puc_expiry: '2026-09-05', permit_expiry: '2028-05-10', driver_id: 'd-001', driver_name: 'Manpreet Singh', gps_device_id: 'GPS-001', current_speed: 62, last_location: 'NH-48, Near Udaipur Bypass', last_gps_update: '2 min ago', ignition: true, status: 'on_trip', odometer: 142850, created_at: '2024-02-10' },
  { id: 'v-002', company_id: 'comp-001', reg_number: 'MH-43-QQ-1102', vehicle_type: 'container', make: 'Tata', model: 'Prima 4928', year: 2023, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 28, fitness_expiry: '2027-06-20', insurance_expiry: '2026-08-14', puc_expiry: '2026-07-28', permit_expiry: '2027-12-18', driver_id: 'd-002', driver_name: 'Satish Yadav', gps_device_id: 'GPS-002', current_speed: 0, last_location: 'Pune Logistics Hub, Yard 3', last_gps_update: '5 min ago', ignition: false, status: 'available', odometer: 89420, created_at: '2024-03-05' },
  { id: 'v-003', company_id: 'comp-001', reg_number: 'GJ-12-BY-8843', vehicle_type: 'trailer', make: 'BharatBenz', model: '4228R', year: 2021, ownership_type: 'attached', owner_name: 'Gill Transport Pvt Ltd', owner_phone: '+91 98150-11222', capacity_tons: 40, fitness_expiry: '2026-09-12', insurance_expiry: '2026-07-30', puc_expiry: '2026-08-01', permit_expiry: '2027-10-12', driver_id: 'd-003', driver_name: 'Gurpreet Singh', gps_device_id: 'GPS-003', current_speed: 78, last_location: 'NH-8, Ahmedabad-Jaipur Corridor', last_gps_update: 'Just now', ignition: true, status: 'on_trip', odometer: 198300, created_at: '2024-01-20' },
  { id: 'v-004', company_id: 'comp-001', reg_number: 'RJ-14-TC-5567', vehicle_type: 'truck', make: 'Eicher', model: 'Pro 6037', year: 2023, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 25, fitness_expiry: '2027-11-08', insurance_expiry: '2027-02-14', puc_expiry: '2026-12-20', permit_expiry: '2028-08-22', driver_id: 'd-004', driver_name: 'Ramesh Choudhary', gps_device_id: 'GPS-004', current_speed: 0, last_location: 'Workshop Bay 2, Gurgaon Depot', last_gps_update: '1 hour ago', ignition: false, status: 'maintenance', odometer: 67200, created_at: '2024-04-12' },
  { id: 'v-005', company_id: 'comp-001', reg_number: 'DL-01-LP-9934', vehicle_type: 'container', make: 'Ashok Leyland', model: 'Captain 4019', year: 2022, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 20, fitness_expiry: '2027-01-25', insurance_expiry: '2026-10-15', puc_expiry: '2026-11-30', permit_expiry: '2028-02-28', driver_id: 'd-005', driver_name: 'Ajay Sharma', gps_device_id: 'GPS-005', current_speed: 45, last_location: 'GT Karnal Road, Delhi', last_gps_update: 'Just now', ignition: true, status: 'on_trip', odometer: 115600, created_at: '2024-02-28' },
  { id: 'v-006', company_id: 'comp-001', reg_number: 'HR-38-XY-2201', vehicle_type: 'tanker', make: 'Tata', model: 'Signa 3518', year: 2024, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 22, fitness_expiry: '2028-04-10', insurance_expiry: '2027-06-15', puc_expiry: '2027-03-18', permit_expiry: '2029-01-05', status: 'available', odometer: 12400, created_at: '2024-08-20' },
  { id: 'v-007', company_id: 'comp-001', reg_number: 'UP-32-AT-7788', vehicle_type: 'trailer', make: 'Mahindra', model: 'Blazo X 46', year: 2022, ownership_type: 'market', owner_name: 'Verma Roadlines', owner_phone: '+91 94150-33445', capacity_tons: 42, fitness_expiry: '2026-12-05', insurance_expiry: '2026-09-22', puc_expiry: '2026-08-15', permit_expiry: '2027-07-30', driver_name: 'External Driver', status: 'on_trip', odometer: 220100, created_at: '2024-06-15' },
  { id: 'v-008', company_id: 'comp-001', reg_number: 'MP-09-KA-4456', vehicle_type: 'truck', make: 'BharatBenz', model: '1617R', year: 2023, ownership_type: 'owned', owner_name: 'Shree Balaji Transport', capacity_tons: 16, fitness_expiry: '2027-08-20', insurance_expiry: '2027-01-10', puc_expiry: '2026-12-05', permit_expiry: '2028-06-15', driver_id: 'd-006', driver_name: 'Sunil Kumar', status: 'available', odometer: 54800, created_at: '2024-05-10' },
];


export const DRIVERS: Driver[] = [
  { id: 'd-001', company_id: 'comp-001', name: 'Manpreet Singh', phone: '+91 98100-11223', license_number: 'HR-0420190018', license_type: 'HMV', license_expiry: '2030-05-20', aadhar_number: '1234-5678-9012', address: 'Village Dharampur, Sirsa, Haryana', emergency_contact: 'Sunita Kaur', emergency_phone: '+91 98100-11224', date_of_joining: '2022-03-15', assigned_vehicle_id: 'v-001', assigned_vehicle_reg: 'HR-55-AJ-9021', salary_type: 'monthly', base_salary: 25000, status: 'on_trip', safety_score: 94, total_trips: 342, total_km: 128500, created_at: '2022-03-15' },
  { id: 'd-002', company_id: 'comp-001', name: 'Satish Yadav', phone: '+91 98200-22334', license_number: 'MH-1220180122', license_type: 'HMV', license_expiry: '2029-11-15', address: 'Hadapsar, Pune, Maharashtra', emergency_contact: 'Ram Yadav', emergency_phone: '+91 98200-22335', date_of_joining: '2023-01-10', assigned_vehicle_id: 'v-002', assigned_vehicle_reg: 'MH-43-QQ-1102', salary_type: 'per_trip', base_salary: 18000, status: 'available', safety_score: 88, total_trips: 198, total_km: 76200, created_at: '2023-01-10' },
  { id: 'd-003', company_id: 'comp-001', name: 'Gurpreet Singh', phone: '+91 98150-44556', license_number: 'PB-1020210889', license_type: 'HMV', license_expiry: '2031-01-10', address: 'Amritsar, Punjab', emergency_contact: 'Sukhwinder Singh', emergency_phone: '+91 98150-44557', date_of_joining: '2021-06-20', assigned_vehicle_id: 'v-003', assigned_vehicle_reg: 'GJ-12-BY-8843', salary_type: 'monthly', base_salary: 28000, status: 'on_trip', safety_score: 82, total_trips: 456, total_km: 195800, created_at: '2021-06-20' },
  { id: 'd-004', company_id: 'comp-001', name: 'Ramesh Choudhary', phone: '+91 94140-55667', license_number: 'RJ-1420200445', license_type: 'HMV', license_expiry: '2028-08-12', address: 'Jaipur, Rajasthan', emergency_contact: 'Sita Devi', emergency_phone: '+91 94140-55668', date_of_joining: '2023-04-01', assigned_vehicle_id: 'v-004', assigned_vehicle_reg: 'RJ-14-TC-5567', salary_type: 'monthly', base_salary: 22000, status: 'available', safety_score: 91, total_trips: 156, total_km: 58400, created_at: '2023-04-01' },
  { id: 'd-005', company_id: 'comp-001', name: 'Ajay Sharma', phone: '+91 99100-66778', license_number: 'DL-0520180223', license_type: 'HMV', license_expiry: '2029-03-25', address: 'Rohini, Delhi', emergency_contact: 'Priya Sharma', emergency_phone: '+91 99100-66779', date_of_joining: '2022-08-15', assigned_vehicle_id: 'v-005', assigned_vehicle_reg: 'DL-01-LP-9934', salary_type: 'monthly', base_salary: 24000, status: 'on_trip', safety_score: 96, total_trips: 278, total_km: 104200, created_at: '2022-08-15' },
  { id: 'd-006', company_id: 'comp-001', name: 'Sunil Kumar', phone: '+91 94250-77889', license_number: 'MP-0920190556', license_type: 'HMV', license_expiry: '2029-09-18', address: 'Indore, Madhya Pradesh', emergency_contact: 'Kavita Kumar', emergency_phone: '+91 94250-77890', date_of_joining: '2024-01-08', assigned_vehicle_id: 'v-008', assigned_vehicle_reg: 'MP-09-KA-4456', salary_type: 'per_trip', base_salary: 20000, status: 'available', safety_score: 90, total_trips: 89, total_km: 34500, created_at: '2024-01-08' },
];


export const CUSTOMERS: Customer[] = [
  { id: 'c-001', company_id: 'comp-001', name: 'Tata Motors Ltd', contact_person: 'Anurag Sen', phone: '+91 98110-02233', email: 'dispatch@tatamotors.com', gstin: '27AAACT1029K1Z4', billing_address: 'A-1 Industrial Area, Pimpri, Pune 411018', credit_limit: 2000000, credit_days: 30, outstanding_balance: 485000, total_business: 12400000, contract_type: 'contract', status: 'active', created_at: '2023-06-15' },
  { id: 'c-002', company_id: 'comp-001', name: 'Reliance Industries Ltd', contact_person: 'Sameer Vyas', phone: '+91 98221-14455', email: 'logistics@ril.com', gstin: '24AAACR8829C1Z0', billing_address: 'Jamnagar Refinery, Moti Khavdi, Gujarat', credit_limit: 5000000, credit_days: 45, outstanding_balance: 1250000, total_business: 28500000, contract_type: 'contract', status: 'active', created_at: '2022-11-20' },
  { id: 'c-003', company_id: 'comp-001', name: 'Asian Paints Ltd', contact_person: 'Vikram Reddy', phone: '+91 98330-55667', email: 'supply@asianpaints.com', gstin: '27AAACA8749F1Z5', billing_address: '6A, Shantinagar, Santacruz, Mumbai 400055', credit_limit: 1500000, credit_days: 21, outstanding_balance: 320000, total_business: 8900000, contract_type: 'contract', status: 'active', created_at: '2023-02-10' },
  { id: 'c-004', company_id: 'comp-001', name: 'Ultratech Cement', contact_person: 'Prakash Jain', phone: '+91 94140-88990', email: 'transport@ultratechcement.com', gstin: '08AAACG5885R1Z2', billing_address: 'Cement Works, Kotputli, Rajasthan', credit_limit: 3000000, credit_days: 30, outstanding_balance: 890000, total_business: 15600000, contract_type: 'contract', status: 'active', created_at: '2023-04-05' },
  { id: 'c-005', company_id: 'comp-001', name: 'Maruti Suzuki India', contact_person: 'Deepak Malhotra', phone: '+91 98100-11990', email: 'logistics@maruti.co.in', gstin: '06AAACM5765D1Z8', billing_address: 'Plot 1, Nelson Mandela Marg, Vasant Kunj, Delhi', credit_limit: 2500000, credit_days: 30, outstanding_balance: 0, total_business: 6200000, contract_type: 'spot', status: 'active', created_at: '2024-01-20' },
];


export const TRIPS: Trip[] = [
  { id: 't-001', company_id: 'comp-001', trip_number: 'TRP-2026-0451', lr_number: 'LR-BLJ-10294', eway_bill: 'EWB-554210982234', customer_id: 'c-001', customer_name: 'Tata Motors Ltd', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', driver_id: 'd-001', driver_name: 'Manpreet Singh', driver_phone: '+91 98100-11223', origin: 'Pune Plant, Pimpri', destination: 'Chennai Assembly Yard', distance_km: 1180, material: 'Auto Components (Axles & Gears)', weight_tons: 22, booking_date: '2026-07-05', loading_date: '2026-07-06', departure_date: '2026-07-06', expected_delivery: '2026-07-09', freight_amount: 72000, advance_amount: 45000, balance_amount: 27000, detention_charges: 0, other_charges: 1500, total_amount: 73500, status: 'in_transit', remarks: 'On schedule. Crossed Solapur toll.', created_at: '2026-07-05' },
  { id: 't-002', company_id: 'comp-001', trip_number: 'TRP-2026-0452', lr_number: 'LR-BLJ-10295', eway_bill: 'EWB-210948332194', customer_id: 'c-002', customer_name: 'Reliance Industries Ltd', vehicle_id: 'v-003', vehicle_reg: 'GJ-12-BY-8843', driver_id: 'd-003', driver_name: 'Gurpreet Singh', driver_phone: '+91 98150-44556', origin: 'Jamnagar Refinery', destination: 'Mumbai JNPT Port', distance_km: 680, material: 'Polypropylene Granules', weight_tons: 32, booking_date: '2026-07-04', loading_date: '2026-07-05', departure_date: '2026-07-05', expected_delivery: '2026-07-07', freight_amount: 86400, advance_amount: 50000, balance_amount: 36400, detention_charges: 0, other_charges: 0, total_amount: 86400, status: 'in_transit', created_at: '2026-07-04' },
  { id: 't-003', company_id: 'comp-001', trip_number: 'TRP-2026-0453', lr_number: 'LR-BLJ-10296', customer_id: 'c-003', customer_name: 'Asian Paints Ltd', vehicle_id: 'v-005', vehicle_reg: 'DL-01-LP-9934', driver_id: 'd-005', driver_name: 'Ajay Sharma', driver_phone: '+91 99100-66778', origin: 'Kasna Paint Factory, Greater Noida', destination: 'Jaipur Distribution Hub', distance_km: 290, material: 'Paint Drums (Premium Emulsion)', weight_tons: 14, booking_date: '2026-07-07', loading_date: '2026-07-08', departure_date: '2026-07-08', expected_delivery: '2026-07-08', freight_amount: 28000, advance_amount: 15000, balance_amount: 13000, detention_charges: 0, other_charges: 500, total_amount: 28500, status: 'in_transit', created_at: '2026-07-07' },
  { id: 't-004', company_id: 'comp-001', trip_number: 'TRP-2026-0448', lr_number: 'LR-BLJ-10290', customer_id: 'c-004', customer_name: 'Ultratech Cement', vehicle_id: 'v-007', vehicle_reg: 'UP-32-AT-7788', driver_id: 'd-003', driver_name: 'External Driver', driver_phone: '+91 94560-12345', origin: 'Kotputli Cement Works', destination: 'Lucknow Godown', distance_km: 520, material: 'Cement Bags (OPC 53 Grade)', weight_tons: 38, booking_date: '2026-07-02', loading_date: '2026-07-03', departure_date: '2026-07-03', expected_delivery: '2026-07-05', actual_delivery: '2026-07-05', freight_amount: 62000, advance_amount: 35000, balance_amount: 27000, detention_charges: 3000, other_charges: 0, total_amount: 65000, status: 'pod_pending', pod_date: '2026-07-05', created_at: '2026-07-02' },
  { id: 't-005', company_id: 'comp-001', trip_number: 'TRP-2026-0445', lr_number: 'LR-BLJ-10287', customer_id: 'c-001', customer_name: 'Tata Motors Ltd', vehicle_id: 'v-002', vehicle_reg: 'MH-43-QQ-1102', driver_id: 'd-002', driver_name: 'Satish Yadav', driver_phone: '+91 98200-22334', origin: 'Sanand Plant, Gujarat', destination: 'Gurgaon Showroom Yard', distance_km: 960, material: 'Finished Vehicles (Nexon EV)', weight_tons: 18, num_packages: 4, booking_date: '2026-06-28', loading_date: '2026-06-29', departure_date: '2026-06-29', expected_delivery: '2026-07-02', actual_delivery: '2026-07-01', freight_amount: 95000, advance_amount: 60000, balance_amount: 35000, detention_charges: 0, other_charges: 2000, total_amount: 97000, status: 'completed', pod_url: '/pod-sample.jpg', pod_date: '2026-07-01', created_at: '2026-06-28' },
  { id: 't-006', company_id: 'comp-001', trip_number: 'TRP-2026-0442', lr_number: 'LR-BLJ-10284', customer_id: 'c-002', customer_name: 'Reliance Industries Ltd', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', driver_id: 'd-001', driver_name: 'Manpreet Singh', driver_phone: '+91 98100-11223', origin: 'Hazira Petrochem Complex', destination: 'Delhi Cargo Terminal', distance_km: 1100, material: 'PVC Resin Bags', weight_tons: 28, booking_date: '2026-06-22', loading_date: '2026-06-23', departure_date: '2026-06-23', expected_delivery: '2026-06-26', actual_delivery: '2026-06-25', freight_amount: 78000, advance_amount: 45000, balance_amount: 33000, detention_charges: 0, other_charges: 0, total_amount: 78000, status: 'billed', pod_url: '/pod-sample.jpg', pod_date: '2026-06-25', created_at: '2026-06-22' },
];


export const INVOICES: Invoice[] = [
  { id: 'inv-001', company_id: 'comp-001', invoice_number: 'INV-2026-0089', customer_id: 'c-001', customer_name: 'Tata Motors Ltd', invoice_date: '2026-07-02', due_date: '2026-08-01', trip_ids: ['t-005'], freight_total: 95000, detention_total: 0, other_charges: 2000, subtotal: 97000, gst_amount: 17460, tds_deduction: 1940, total_amount: 112520, paid_amount: 0, balance_amount: 112520, status: 'sent', created_at: '2026-07-02' },
  { id: 'inv-002', company_id: 'comp-001', invoice_number: 'INV-2026-0088', customer_id: 'c-002', customer_name: 'Reliance Industries Ltd', invoice_date: '2026-06-28', due_date: '2026-08-12', trip_ids: ['t-006'], freight_total: 78000, detention_total: 0, other_charges: 0, subtotal: 78000, gst_amount: 14040, tds_deduction: 1560, total_amount: 90480, paid_amount: 90480, balance_amount: 0, status: 'paid', created_at: '2026-06-28' },
  { id: 'inv-003', company_id: 'comp-001', invoice_number: 'INV-2026-0085', customer_id: 'c-004', customer_name: 'Ultratech Cement', invoice_date: '2026-06-20', due_date: '2026-07-20', trip_ids: [], freight_total: 186000, detention_total: 6000, other_charges: 3500, subtotal: 195500, gst_amount: 35190, tds_deduction: 3910, total_amount: 226780, paid_amount: 150000, balance_amount: 76780, status: 'partial', created_at: '2026-06-20' },
  { id: 'inv-004', company_id: 'comp-001', invoice_number: 'INV-2026-0082', customer_id: 'c-003', customer_name: 'Asian Paints Ltd', invoice_date: '2026-06-10', due_date: '2026-07-01', trip_ids: [], freight_total: 142000, detention_total: 0, other_charges: 2500, subtotal: 144500, gst_amount: 26010, tds_deduction: 2890, total_amount: 167620, paid_amount: 0, balance_amount: 167620, status: 'overdue', created_at: '2026-06-10' },
];

export const PAYMENTS: Payment[] = [
  { id: 'pay-001', company_id: 'comp-001', invoice_id: 'inv-002', customer_id: 'c-002', customer_name: 'Reliance Industries Ltd', amount: 90480, payment_mode: 'bank_transfer', reference_number: 'NEFT-RIL-20260705-001', payment_date: '2026-07-05', tds_amount: 1560, status: 'cleared', created_at: '2026-07-05' },
  { id: 'pay-002', company_id: 'comp-001', invoice_id: 'inv-003', customer_id: 'c-004', customer_name: 'Ultratech Cement', amount: 150000, payment_mode: 'bank_transfer', reference_number: 'NEFT-UTC-20260701-002', payment_date: '2026-07-01', tds_amount: 3000, status: 'cleared', created_at: '2026-07-01' },
];

export const EXPENSES: Expense[] = [
  { id: 'exp-001', company_id: 'comp-001', trip_id: 't-001', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', category: 'diesel', amount: 32000, date: '2026-07-06', description: 'Full tank diesel - Pune bypass IOCL', paid_to: 'IOCL Pump #1842', payment_mode: 'fuel_card', approved: true, created_at: '2026-07-06' },
  { id: 'exp-002', company_id: 'comp-001', trip_id: 't-001', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', category: 'toll', amount: 5800, date: '2026-07-06', description: 'NH-48 Toll charges (FASTag)', paid_to: 'NHAI', payment_mode: 'fastag', approved: true, created_at: '2026-07-06' },
  { id: 'exp-003', company_id: 'comp-001', trip_id: 't-001', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', category: 'driver_bata', amount: 3500, date: '2026-07-06', description: 'Driver food & stay allowance', paid_to: 'Manpreet Singh', payment_mode: 'cash', approved: true, created_at: '2026-07-06' },
  { id: 'exp-004', company_id: 'comp-001', vehicle_id: 'v-004', vehicle_reg: 'RJ-14-TC-5567', category: 'repair', amount: 18500, date: '2026-07-04', description: 'Clutch plate replacement + labour', paid_to: 'Balaji Motor Works, Gurgaon', payment_mode: 'bank', approved: true, created_at: '2026-07-04' },
  { id: 'exp-005', company_id: 'comp-001', trip_id: 't-002', vehicle_id: 'v-003', vehicle_reg: 'GJ-12-BY-8843', category: 'diesel', amount: 28000, date: '2026-07-05', description: 'Diesel fill Ahmedabad HP station', paid_to: 'HPCL Station', payment_mode: 'fuel_card', approved: true, created_at: '2026-07-05' },
  { id: 'exp-006', company_id: 'comp-001', category: 'salary', amount: 175000, date: '2026-07-01', description: 'Monthly driver salaries (July)', paid_to: 'All Drivers', payment_mode: 'bank', approved: true, created_at: '2026-07-01' },
  { id: 'exp-007', company_id: 'comp-001', category: 'office', amount: 45000, date: '2026-07-01', description: 'Office rent + utilities', paid_to: 'Landlord - Mr. Sharma', payment_mode: 'bank', approved: true, created_at: '2026-07-01' },
];

export const FUEL_ENTRIES: FuelEntry[] = [
  { id: 'f-001', company_id: 'comp-001', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', driver_id: 'd-001', driver_name: 'Manpreet Singh', trip_id: 't-001', date: '2026-07-06', litres: 350, rate_per_litre: 91.43, amount: 32000, odometer: 142500, fuel_station: 'IOCL Pump #1842, Pune Bypass', mileage: 4.1, payment_mode: 'fuel_card', created_at: '2026-07-06' },
  { id: 'f-002', company_id: 'comp-001', vehicle_id: 'v-003', vehicle_reg: 'GJ-12-BY-8843', driver_id: 'd-003', driver_name: 'Gurpreet Singh', trip_id: 't-002', date: '2026-07-05', litres: 310, rate_per_litre: 90.32, amount: 28000, odometer: 198000, fuel_station: 'HPCL, Ahmedabad Ring Road', mileage: 3.8, payment_mode: 'fuel_card', created_at: '2026-07-05' },
  { id: 'f-003', company_id: 'comp-001', vehicle_id: 'v-005', vehicle_reg: 'DL-01-LP-9934', driver_id: 'd-005', driver_name: 'Ajay Sharma', trip_id: 't-003', date: '2026-07-08', litres: 180, rate_per_litre: 94.72, amount: 17050, odometer: 115400, fuel_station: 'BPCL, GT Road Delhi', mileage: 4.5, payment_mode: 'fuel_card', created_at: '2026-07-08' },
];

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'm-001', company_id: 'comp-001', vehicle_id: 'v-004', vehicle_reg: 'RJ-14-TC-5567', service_type: 'repair', description: 'Clutch plate worn out - replaced with OE part. Flywheel resurfaced.', date: '2026-07-04', odometer: 67200, cost: 18500, vendor_name: 'Balaji Motor Works, Gurgaon', next_due_date: '2026-10-04', status: 'in_progress', created_at: '2026-07-04' },
  { id: 'm-002', company_id: 'comp-001', vehicle_id: 'v-001', vehicle_reg: 'HR-55-AJ-9021', service_type: 'preventive', description: 'Scheduled service: Oil change, filter replacement, brake inspection', date: '2026-06-20', odometer: 140000, cost: 12500, vendor_name: 'Ashok Leyland Authorized, Gurgaon', next_due_date: '2026-09-20', next_due_km: 155000, status: 'completed', created_at: '2026-06-20' },
  { id: 'm-003', company_id: 'comp-001', vehicle_id: 'v-002', vehicle_reg: 'MH-43-QQ-1102', service_type: 'tyre', description: 'Rear left outer tyre replaced (worn below 3mm). Alignment done.', date: '2026-06-15', odometer: 88900, cost: 22000, vendor_name: 'MRF Tyre Zone, Pune', next_due_km: 130000, status: 'completed', created_at: '2026-06-15' },
];

export const ALERTS: SystemAlert[] = [
  { id: 'a-001', company_id: 'comp-001', type: 'document_expiry', title: 'PUC Expiry - GJ-12-BY-8843', description: 'PUC certificate expires on Aug 01, 2026. Renew within 24 days to avoid penalty.', severity: 'warning', entity_type: 'vehicle', entity_id: 'v-003', is_read: false, created_at: '2026-07-08' },
  { id: 'a-002', company_id: 'comp-001', type: 'payment_overdue', title: 'Overdue Invoice - Asian Paints', description: 'Invoice INV-2026-0082 of ₹1,67,620 is overdue by 8 days. Follow up immediately.', severity: 'critical', entity_type: 'invoice', entity_id: 'inv-004', is_read: false, created_at: '2026-07-09' },
  { id: 'a-003', company_id: 'comp-001', type: 'pod_pending', title: 'POD Pending - TRP-2026-0448', description: 'Trip delivered on Jul 05. POD not yet received from Ultratech Cement godown.', severity: 'warning', entity_type: 'trip', entity_id: 't-004', is_read: false, created_at: '2026-07-08' },
  { id: 'a-004', company_id: 'comp-001', type: 'maintenance_due', title: 'Service Due - MH-43-QQ-1102', description: 'Vehicle has crossed 89,000 km. Next scheduled service at 90,000 km.', severity: 'info', entity_type: 'vehicle', entity_id: 'v-002', is_read: true, created_at: '2026-07-07' },
  { id: 'a-005', company_id: 'comp-001', type: 'document_expiry', title: 'Insurance Expiry - GJ-12-BY-8843', description: 'Vehicle insurance expires on Jul 30, 2026. Renew to avoid legal issues.', severity: 'critical', entity_type: 'vehicle', entity_id: 'v-003', is_read: false, created_at: '2026-07-09' },
];

export const ENQUIRIES: Enquiry[] = [
  { id: 'enq-001', company_id: 'comp-001', customer_id: 'c-005', customer_name: 'Maruti Suzuki India', origin: 'Manesar Plant, Gurgaon', destination: 'Bengaluru Dealer Yard', material: 'Finished Vehicles (Swift)', vehicle_type: 'trailer', weight_tons: 16, loading_date: '2026-07-12', target_rate: 85000, status: 'new', remarks: 'Need car carrier trailer. 6 units.', created_at: '2026-07-08' },
  { id: 'enq-002', company_id: 'comp-001', customer_id: 'c-004', customer_name: 'Ultratech Cement', origin: 'Kotputli Works', destination: 'Patna Depot', material: 'Cement Bags (PPC)', vehicle_type: 'trailer', weight_tons: 35, loading_date: '2026-07-15', target_rate: 72000, status: 'quoted', created_at: '2026-07-07' },
];

export function getDashboardMetrics(): DashboardMetrics {
  const activeTrips = TRIPS.filter(t => ['in_transit', 'loading', 'assigned'].includes(t.status));
  const availableVehicles = VEHICLES.filter(v => v.status === 'available');
  const maintenanceVehicles = VEHICLES.filter(v => v.status === 'maintenance');
  const monthlyRevenue = TRIPS.filter(t => t.booking_date >= '2026-07-01').reduce((sum, t) => sum + t.total_amount, 0);
  const monthlyExpenses = EXPENSES.filter(e => e.date >= '2026-07-01').reduce((sum, e) => sum + e.amount, 0);
  const outstanding = INVOICES.reduce((sum, i) => sum + i.balance_amount, 0);
  const pendingPod = TRIPS.filter(t => t.status === 'pod_pending').length;
  const overdueInvoices = INVOICES.filter(i => i.status === 'overdue').length;

  return {
    total_vehicles: VEHICLES.length,
    active_trips: activeTrips.length,
    available_vehicles: availableVehicles.length,
    vehicles_in_maintenance: maintenanceVehicles.length,
    total_drivers: DRIVERS.length,
    available_drivers: DRIVERS.filter(d => d.status === 'available').length,
    monthly_revenue: monthlyRevenue,
    monthly_expenses: monthlyExpenses,
    outstanding_receivables: outstanding,
    pending_pod: pendingPod,
    overdue_invoices: overdueInvoices,
    expiring_documents: 3,
  };
}
