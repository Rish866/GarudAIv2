// GARUD AI ERP - Mock Data Generator and Local Persistence Manager
// Generates fully interlinked initial records for multiple transportation niches

import {
  Customer,
  Vehicle,
  Driver,
  Enquiry,
  Quotation,
  ContractRate,
  Trip,
  MarketVehicleHire,
  Invoice,
  PaymentCollection,
  Expense,
  MaintenanceLog,
  FuelLog,
  TyreLog,
  DriverSalaryLog,
  SystemAlert,
  Branch,
  ERPUser
} from './types';

// Branches seed
export const INITIAL_BRANCHES: Branch[] = [
  { id: 'br-balaji-hq', company_id: 'tenant-balaji', name: 'Delhi HQ', code: 'DEL-HQ', city: 'New Delhi', address: 'Cargo Terminal 2, IGI Airport', manager_name: 'Rajesh Kumar', phone: '9810022334', status: 'active' },
  { id: 'br-balaji-mum', company_id: 'tenant-balaji', name: 'Mumbai Port Branch', code: 'MUM-PORT', city: 'Mumbai', address: 'Sector 5, Nhava Sheva, Navi Mumbai', manager_name: 'Suresh Patil', phone: '9820011223', status: 'active' },
  { id: 'br-hindustan-hq', company_id: 'tenant-hindustan', name: 'Dhanbad Mining HQ', code: 'DHN-HQ', city: 'Dhanbad', address: 'Quarry Road, Sector B', manager_name: 'Birendra Mahto', phone: '9431100223', status: 'active' },
  { id: 'br-polar-hq', company_id: 'tenant-polar', name: 'Bengaluru Cold HQ', code: 'BLR-HQ', city: 'Bengaluru', address: 'Whitefield Cold Storage Hub', manager_name: 'Kumar Swamy', phone: '9900112233', status: 'active' }
];

// Users seed
export const INITIAL_USERS: ERPUser[] = [
  // Shree Balaji Users
  { id: 'u-balaji-owner', company_id: 'tenant-balaji', email: 'admin@balaji.com', name: 'Rajesh Kumar', role: 'admin', status: 'active' },
  { id: 'u-balaji-ops', company_id: 'tenant-balaji', email: 'ops@balaji.com', name: 'Vikram Singh (Operations)', role: 'operations', status: 'active' },
  { id: 'u-balaji-fleet', company_id: 'tenant-balaji', email: 'fleet@balaji.com', name: 'Harpreet Singh (Fleet Mgr)', role: 'fleet_manager', status: 'active' },
  { id: 'u-balaji-acct', company_id: 'tenant-balaji', email: 'accounts@balaji.com', name: 'Neha Sharma (Accounts)', role: 'accounts', status: 'active' },
  { id: 'u-balaji-sales', company_id: 'tenant-balaji', email: 'sales@balaji.com', name: 'Aditya Roy (Sales)', role: 'sales', status: 'active' },
  { id: 'u-balaji-driver', company_id: 'tenant-balaji', email: 'driver@balaji.com', name: 'Satish Yadav (Driver)', role: 'driver', status: 'active' },
  { id: 'u-balaji-cust', company_id: 'tenant-balaji', email: 'customer@balaji.com', name: 'Client Portal (Tata Motors)', role: 'customer', status: 'active' },
  
  // Hindustan Mining Users
  { id: 'u-hindustan-owner', company_id: 'tenant-hindustan', email: 'admin@hindustan.com', name: 'Birendra Mahto', role: 'admin', status: 'active' },
  { id: 'u-hindustan-ops', company_id: 'tenant-hindustan', email: 'ops@hindustan.com', name: 'Ramlal Yadav', role: 'operations', status: 'active' },
  
  // Polar Cold Chain Users
  { id: 'u-polar-owner', company_id: 'tenant-polar', email: 'admin@polar.com', name: 'Kumar Swamy', role: 'admin', status: 'active' }
];

// Customers seed
export const INITIAL_CUSTOMERS: Customer[] = [
  // Balaji Logistics
  {
    id: 'c-balaji-tata',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    name: 'Tata Motors Ltd',
    contact_person: 'Mr. Anurag Sen',
    phone: '9811002233',
    email: 'dispatch@tatamotors.com',
    gstin: '09AAACT1029K1Z4',
    billing_address: 'A-1, Industrial Area, Pimpri, Pune, MH',
    loading_locations: ['Pune Plant', 'Pantnagar Plant', 'Sanand Hub'],
    unloading_locations: ['Chennai Yard', 'Gurugram Yard', 'Kolkata Depot'],
    contract_type: 'contract',
    credit_period_days: 30,
    outstanding_balance: 450000,
    status: 'active'
  },
  {
    id: 'c-balaji-reliance',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    name: 'Reliance Industries Ltd',
    contact_person: 'Mr. Sameer Vyas',
    phone: '9822114455',
    email: 'logistics@ril.com',
    gstin: '24AAACR8829C1Z0',
    billing_address: 'Jamnagar Refinery, Moti Khavdi, Jamnagar, GJ',
    loading_locations: ['Jamnagar Refinery', 'Hazira Petrochem'],
    unloading_locations: ['Mumbai Nhava Sheva Port', 'Delhi Cargo Depot'],
    contract_type: 'contract',
    credit_period_days: 45,
    outstanding_balance: 1200000,
    status: 'active'
  },

  // Hindustan Tipper
  {
    id: 'c-hindustan-sail',
    company_id: 'tenant-hindustan',
    branch_id: 'br-hindustan-hq',
    name: 'Steel Authority of India (SAIL)',
    contact_person: 'NK Mahapatra',
    phone: '9437128833',
    email: 'procurement@sail.in',
    gstin: '20AAACS0012A1Z1',
    billing_address: 'Bokaro Steel City, Jharkhand',
    loading_locations: ['Quarry Pit 4', 'Quarry Pit 9'],
    unloading_locations: ['Bokaro Blast Furnace 3', 'Thermal Power Plant Coal Silo'],
    contract_type: 'fixed-monthly',
    credit_period_days: 60,
    outstanding_balance: 2400000,
    status: 'active'
  },

  // Polar Cold Chain
  {
    id: 'c-polar-amul',
    company_id: 'tenant-polar',
    branch_id: 'br-polar-hq',
    name: 'Amul Dairy Co-op',
    contact_person: 'Sandeep Varma',
    phone: '9944332211',
    email: 'dispatch@amul.coop',
    gstin: '24AAACA1290D2ZM',
    billing_address: 'Anand Dairy Hub, Anand, GJ',
    loading_locations: ['Anand Plant', 'Mehsana Cold Storage'],
    unloading_locations: ['Bengaluru Depot', 'Chennai Ice Cream Depot'],
    contract_type: 'contract',
    credit_period_days: 15,
    outstanding_balance: 180000,
    status: 'active'
  }
];

// Vehicles seed
export const INITIAL_VEHICLES: Vehicle[] = [
  // Balaji Trailers
  {
    id: 'balaji-v1',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    reg_number: 'HR-55-AJ-9021',
    vehicle_type: 'container',
    ownership_type: 'owned',
    owner_name: 'Shree Balaji Logistics',
    driver_id: 'd-balaji-1',
    driver_name: 'Rajesh Kumar',
    capacity_tons: 32,
    gps_device_id: 'GPS-BALAJI-001',
    cameras_active: 4,
    fitness_expiry: '2027-02-15',
    insurance_expiry: '2026-11-20',
    puc_expiry: '2026-09-05',
    permit_expiry: '2028-05-10',
    status: 'on_trip',
    current_location: 'NH-48 Corridor, Near Jaipur Bypass',
    last_gps_update: 'Just now',
    speed: 68,
    ignition: true
  },
  {
    id: 'balaji-v2',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    reg_number: 'MH-43-QQ-1102',
    vehicle_type: 'trailer',
    ownership_type: 'owned',
    owner_name: 'Shree Balaji Logistics',
    driver_id: 'd-balaji-2',
    driver_name: 'Satish Yadav',
    capacity_tons: 40,
    gps_device_id: 'GPS-BALAJI-002',
    cameras_active: 4,
    fitness_expiry: '2026-12-01',
    insurance_expiry: '2026-08-14',
    puc_expiry: '2026-07-28',
    permit_expiry: '2027-04-18',
    status: 'available',
    current_location: 'Pune Logistics Hub Yard 3',
    last_gps_update: '2 mins ago',
    speed: 0,
    ignition: false
  },
  {
    id: 'balaji-v3',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    reg_number: 'GJ-12-BY-8843',
    vehicle_type: 'trailer',
    ownership_type: 'attached',
    owner_name: 'Gill Transport Ltd',
    driver_id: 'd-balaji-3',
    driver_name: 'Gurpreet Singh',
    capacity_tons: 45,
    gps_device_id: 'GPS-BALAJI-003',
    cameras_active: 4,
    fitness_expiry: '2026-09-12',
    insurance_expiry: '2026-07-30',
    puc_expiry: '2026-08-01',
    permit_expiry: '2027-10-12',
    status: 'on_trip',
    current_location: 'NH-48 Near Udaipur',
    last_gps_update: '10 sec ago',
    speed: 82,
    ignition: true
  },

  // Hindustan Tippers
  {
    id: 'hindustan-v1',
    company_id: 'tenant-hindustan',
    branch_id: 'br-hindustan-hq',
    reg_number: 'JH-02-ZZ-8822',
    vehicle_type: 'tipper',
    ownership_type: 'owned',
    owner_name: 'Hindustan Tipper & Mining Corp',
    driver_id: 'd-hindustan-1',
    driver_name: 'Birendra Mahto',
    capacity_tons: 25,
    gps_device_id: 'GPS-HIND-001',
    cameras_active: 3,
    fitness_expiry: '2027-01-10',
    insurance_expiry: '2026-09-30',
    puc_expiry: '2026-08-12',
    permit_expiry: '2029-12-15',
    status: 'on_trip',
    current_location: 'Dhanbad Quarry Pit 4 Outer Gate',
    last_gps_update: 'Just now',
    speed: 28,
    ignition: true
  },
  {
    id: 'hindustan-v2',
    company_id: 'tenant-hindustan',
    branch_id: 'br-hindustan-hq',
    reg_number: 'JH-09-AA-5561',
    vehicle_type: 'hywa',
    ownership_type: 'owned',
    owner_name: 'Hindustan Tipper & Mining Corp',
    driver_id: 'd-hindustan-2',
    driver_name: 'Suraj Hansda',
    capacity_tons: 35,
    gps_device_id: 'GPS-HIND-002',
    cameras_active: 3,
    fitness_expiry: '2026-10-05',
    insurance_expiry: '2026-08-25',
    puc_expiry: '2026-07-20',
    permit_expiry: '2028-11-20',
    status: 'maintenance',
    current_location: 'Workshop Shed 2',
    last_gps_update: '1 min ago',
    speed: 0,
    ignition: false
  },

  // Polar Reefers
  {
    id: 'polar-v1',
    company_id: 'tenant-polar',
    branch_id: 'br-polar-hq',
    reg_number: 'KA-51-MM-4491',
    vehicle_type: 'reefer',
    ownership_type: 'owned',
    owner_name: 'Polar Cold Chain',
    driver_id: 'd-polar-1',
    driver_name: 'Kumar Swamy',
    capacity_tons: 15,
    gps_device_id: 'GPS-POLAR-001',
    cameras_active: 4,
    fitness_expiry: '2027-04-18',
    insurance_expiry: '2026-12-05',
    puc_expiry: '2026-10-10',
    permit_expiry: '2029-05-15',
    status: 'on_trip',
    current_location: 'NH-4 Bengaluru Outer Ring Rd',
    last_gps_update: 'Just now',
    speed: 55,
    ignition: true
  }
];

// Drivers seed
export const INITIAL_DRIVERS: Driver[] = [
  // Balaji Drivers
  {
    id: 'd-balaji-1',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    name: 'Rajesh Kumar',
    mobile: '9810011223',
    license_number: 'DL-04201900018',
    license_expiry: '2030-05-20',
    assigned_vehicle_id: 'balaji-v1',
    assigned_vehicle_reg: 'HR-55-AJ-9021',
    salary_type: 'fixed_plus_allowance',
    base_salary: 22000,
    kyc_documents: { aadhar: '1234-5678-9012', pan: 'ABCDE1234F', verified: true },
    emergency_contact: 'Sunita Devi (Wife) - 9810011224',
    status: 'on_trip',
    safety_score: 95
  },
  {
    id: 'd-balaji-2',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    name: 'Satish Yadav',
    mobile: '9820022334',
    license_number: 'MH-12201800122',
    license_expiry: '2029-11-15',
    assigned_vehicle_id: 'balaji-v2',
    assigned_vehicle_reg: 'MH-43-QQ-1102',
    salary_type: 'per_trip',
    base_salary: 18000,
    kyc_documents: { aadhar: '8877-6655-4433', pan: 'XYZWP8899K', verified: true },
    emergency_contact: 'Ram Yadav (Brother) - 9820022335',
    status: 'active',
    safety_score: 91
  },
  {
    id: 'd-balaji-3',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    name: 'Gurpreet Singh',
    mobile: '9815044556',
    license_number: 'PB-10202100889',
    license_expiry: '2031-01-10',
    assigned_vehicle_id: 'balaji-v3',
    assigned_vehicle_reg: 'GJ-12-BY-8843',
    salary_type: 'monthly',
    base_salary: 25000,
    kyc_documents: { aadhar: '5566-7788-9900', pan: 'LMNOP7766A', verified: true },
    emergency_contact: 'Sukhwinder Singh (Father) - 9815044557',
    status: 'on_trip',
    safety_score: 84
  },

  // Hindustan Drivers
  {
    id: 'd-hindustan-1',
    company_id: 'tenant-hindustan',
    branch_id: 'br-hindustan-hq',
    name: 'Birendra Mahto',
    mobile: '9431188776',
    license_number: 'JH-02201500329',
    license_expiry: '2028-10-15',
    assigned_vehicle_id: 'hindustan-v1',
    assigned_vehicle_reg: 'JH-02-ZZ-8822',
    salary_type: 'monthly',
    base_salary: 20000,
    kyc_documents: { aadhar: '4455-1122-8899', pan: 'PQRSM4433Z', verified: true },
    emergency_contact: 'Gayatri Devi (Wife) - 9431188777',
    status: 'on_trip',
    safety_score: 82
  },

  // Polar Drivers
  {
    id: 'd-polar-1',
    company_id: 'tenant-polar',
    branch_id: 'br-polar-hq',
    name: 'Kumar Swamy',
    mobile: '9900223344',
    license_number: 'KA-03201400210',
    license_expiry: '2027-12-20',
    assigned_vehicle_id: 'polar-v1',
    assigned_vehicle_reg: 'KA-51-MM-4491',
    salary_type: 'fixed_plus_allowance',
    base_salary: 21000,
    kyc_documents: { aadhar: '9988-7766-5544', pan: 'KLMNO9988C', verified: true },
    emergency_contact: 'Gauri Swamy (Wife) - 9900223345',
    status: 'on_trip',
    safety_score: 97
  }
];

// Enquiries seed
export const INITIAL_ENQUIRIES: Enquiry[] = [
  {
    id: 'enq-balaji-1',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    origin: 'Sanand Hub, Gujarat',
    destination: 'Chennai Yard, TN',
    material: 'Auto Components (Engine Gears)',
    vehicle_type: 'container',
    weight_tons: 16,
    expected_loading_date: '2026-07-10',
    target_rate: 68000,
    status: 'confirmed',
    remarks: 'High priority shipment for assembly line.',
    created_at: '2026-07-01'
  },
  {
    id: 'enq-balaji-2',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    customer_id: 'c-balaji-reliance',
    customer_name: 'Reliance Industries Ltd',
    origin: 'Jamnagar Refinery, GJ',
    destination: 'Delhi Cargo Depot',
    material: 'Plastic Granules (PP Bags)',
    vehicle_type: 'trailer',
    weight_tons: 28,
    expected_loading_date: '2026-07-12',
    target_rate: 85000,
    status: 'quoted',
    remarks: 'Quotation sent. Customer reviewing rate contract.',
    created_at: '2026-07-02'
  }
];

// Quotations seed
export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'q-balaji-1',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    enquiry_id: 'enq-balaji-1',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    route_origin: 'Sanand Hub, Gujarat',
    route_destination: 'Chennai Yard, TN',
    vehicle_type: 'container',
    rate_type: 'per_trip',
    rate: 70000,
    gst_percent: 18,
    validity_date: '2026-07-20',
    terms: 'Detention charges ₹2,500/day applicable after 24 hrs loading/unloading gap. Advance 60% before dispatch.',
    status: 'approved',
    created_at: '2026-07-02'
  },
  {
    id: 'q-balaji-2',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    enquiry_id: 'enq-balaji-2',
    customer_id: 'c-balaji-reliance',
    customer_name: 'Reliance Industries Ltd',
    route_origin: 'Jamnagar Refinery, GJ',
    route_destination: 'Delhi Cargo Depot',
    vehicle_type: 'trailer',
    rate_type: 'per_ton',
    rate: 3100,
    gst_percent: 18,
    validity_date: '2026-07-25',
    terms: 'Rate valid for minimum payload of 25 Tons. Fuel clause linked to PSU price.',
    status: 'sent',
    created_at: '2026-07-03'
  }
];

// Contracts seed
export const INITIAL_CONTRACT_RATES: ContractRate[] = [
  {
    id: 'cnt-balaji-tata-1',
    company_id: 'tenant-balaji',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    origin: 'Pune Plant',
    destination: 'Chennai Yard',
    vehicle_type: 'container',
    rate_type: 'per_trip',
    rate: 65000,
    min_guarantee_tons: 15,
    detention_charge_per_day: 3000,
    loading_unloading_charges: 1500,
    status: 'active'
  },
  {
    id: 'cnt-balaji-reliance-1',
    company_id: 'tenant-balaji',
    customer_id: 'c-balaji-reliance',
    customer_name: 'Reliance Industries Ltd',
    origin: 'Jamnagar Refinery',
    destination: 'Mumbai Nhava Sheva Port',
    vehicle_type: 'trailer',
    rate_type: 'per_ton',
    rate: 2200,
    min_guarantee_tons: 25,
    detention_charge_per_day: 4000,
    loading_unloading_charges: 0,
    status: 'active'
  }
];

// Trips seed
export const INITIAL_TRIPS: Trip[] = [
  // Balaji active trips
  {
    id: 't-balaji-101',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id_label: 'TRIP-2026-0101',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    driver_id: 'd-balaji-1',
    driver_name: 'Rajesh Kumar',
    origin: 'Pune Plant',
    destination: 'Chennai Yard',
    loading_date_time: '2026-07-02 10:00:00',
    material: 'Automobile Axles',
    weight_tons: 20,
    freight_amount: 65000,
    advance_paid: 40000,
    diesel_advance: 25000,
    driver_cash: 5000,
    status: 'in_transit',
    pod_status: 'pending',
    lr_number: 'LR-BALAJI-10294',
    eway_bill_number: 'EWB-554210982234',
    remarks: 'Transit on track. Fastag auto-debited at Pune toll plaza.',
    created_at: '2026-07-02'
  },
  {
    id: 't-balaji-102',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id_label: 'TRIP-2026-0102',
    customer_id: 'c-balaji-reliance',
    customer_name: 'Reliance Industries Ltd',
    vehicle_id: 'balaji-v3',
    vehicle_reg: 'GJ-12-BY-8843',
    driver_id: 'd-balaji-3',
    driver_name: 'Gurpreet Singh',
    origin: 'Jamnagar Refinery',
    destination: 'Mumbai Nhava Sheva Port',
    loading_date_time: '2026-07-01 14:00:00',
    unloading_date_time: '2026-07-03 16:30:00',
    material: 'Polypropylene Pellets',
    weight_tons: 28,
    freight_amount: 61600, // 28 tons * 2200 per ton
    advance_paid: 35000,
    diesel_advance: 20000,
    driver_cash: 3000,
    status: 'pod_pending',
    pod_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    pod_status: 'submitted',
    lr_number: 'LR-BALAJI-10283',
    eway_bill_number: 'EWB-210948332194',
    remarks: 'Delivered at Nhava Sheva Yard 5. Waiting for client supervisor approval.',
    created_at: '2026-07-01'
  },
  {
    id: 't-balaji-103',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id_label: 'TRIP-2026-0103',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    vehicle_id: 'balaji-v2',
    vehicle_reg: 'MH-43-QQ-1102',
    driver_id: 'd-balaji-2',
    driver_name: 'Satish Yadav',
    origin: 'Pune Plant',
    destination: 'Chennai Yard',
    loading_date_time: '2026-06-25 09:00:00',
    unloading_date_time: '2026-06-27 18:00:00',
    material: 'Auto Components',
    weight_tons: 18,
    freight_amount: 65000,
    advance_paid: 40000,
    diesel_advance: 25000,
    driver_cash: 5000,
    status: 'billed',
    pod_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    pod_status: 'approved',
    lr_number: 'LR-BALAJI-09942',
    eway_bill_number: 'EWB-129384729110',
    remarks: 'Completed. Invoice #INV-BALAJI-001 raised.',
    created_at: '2026-06-25'
  },

  // Hindustan trips (Mine loop)
  {
    id: 't-hindustan-101',
    company_id: 'tenant-hindustan',
    branch_id: 'br-hindustan-hq',
    trip_id_label: 'TRIP-HIND-5501',
    customer_id: 'c-hindustan-sail',
    customer_name: 'Steel Authority of India (SAIL)',
    vehicle_id: 'hindustan-v1',
    vehicle_reg: 'JH-02-ZZ-8822',
    driver_id: 'd-hindustan-1',
    driver_name: 'Birendra Mahto',
    origin: 'Quarry Pit 4',
    destination: 'Bokaro Blast Furnace 3',
    loading_date_time: '2026-07-04 08:30:00',
    material: 'Raw Coal (Unwashed)',
    weight_tons: 24.5,
    freight_amount: 14700, // Monthly contract equivalent rate
    advance_paid: 1000,
    diesel_advance: 3000,
    driver_cash: 500,
    status: 'in_transit',
    pod_status: 'pending',
    lr_number: 'LR-HIND-8812',
    eway_bill_number: 'EWB-MINE-002931',
    remarks: 'Trip 3 of today. Mine descent ADAS warning triggered.',
    created_at: '2026-07-04'
  }
];

// Market vehicles hire agreements seed
export const INITIAL_MARKET_HIRES: MarketVehicleHire[] = [
  {
    id: 'm-hire-1',
    company_id: 'tenant-balaji',
    trip_id: 't-balaji-102',
    market_vehicle_reg: 'GJ-12-BY-8843',
    owner_name: 'Gill Transport Ltd',
    owner_mobile: '9815011222',
    agreed_hire_amount: 52000,
    advance_paid: 30000,
    balance_payable: 22000,
    commission: 9600, // Freight 61600 - Hire 52000 = 9600 Profit
    payment_status: 'partial'
  }
];

// Invoices seed
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-balaji-001',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    invoice_number: 'INV-BALAJI-2026-001',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    linked_trip_ids: ['t-balaji-103'],
    freight_amount: 65000,
    detention_charges: 0,
    loading_unloading_charges: 1500,
    gst_amount: 11970, // 18% of 66500
    tds_deduction: 1330, // 2% of 66500
    total_amount: 77140,
    paid_amount: 0,
    outstanding_amount: 77140,
    due_date: '2026-07-27',
    status: 'sent',
    created_at: '2026-06-27'
  }
];

// Payments seed
export const INITIAL_PAYMENTS: PaymentCollection[] = [
  {
    id: 'pay-balaji-001',
    company_id: 'tenant-balaji',
    customer_id: 'c-balaji-tata',
    customer_name: 'Tata Motors Ltd',
    invoice_id: 'inv-balaji-001',
    invoice_number: 'INV-BALAJI-2026-001',
    amount_received: 0,
    payment_mode: 'bank_transfer',
    tds_deducted: 0,
    payment_date: '2026-07-04',
    reference_number: 'TXN-TATA-8812904'
  }
];

// Expenses seed
export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-balaji-1',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id: 't-balaji-101',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    category: 'diesel',
    amount: 25000,
    expense_date: '2026-07-02',
    description: 'Diesel top-up Indian Oil, Pune Bypass',
    paid_to: 'IOCL Pump #42',
    payment_mode: 'fuel_card'
  },
  {
    id: 'exp-balaji-2',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id: 't-balaji-101',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    category: 'toll',
    amount: 4500,
    expense_date: '2026-07-02',
    description: 'NH-4 Fastag toll automatic gate charges',
    paid_to: 'NHAI Fastag Gate',
    payment_mode: 'fastag'
  },
  {
    id: 'exp-balaji-3',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    trip_id: 't-balaji-101',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    category: 'driver_allowance',
    amount: 3000,
    expense_date: '2026-07-02',
    description: 'Trip food & highway stay allowance',
    paid_to: 'Rajesh Kumar',
    payment_mode: 'cash'
  },
  {
    id: 'exp-balaji-4',
    company_id: 'tenant-balaji',
    branch_id: 'br-balaji-hq',
    vehicle_id: 'balaji-v2',
    vehicle_reg: 'MH-43-QQ-1102',
    category: 'repair',
    amount: 8500,
    expense_date: '2026-06-28',
    description: 'Brake pad replacement and grease overhaul',
    paid_to: 'Sardarni Motor Works, Pune',
    payment_mode: 'bank'
  }
];

// Maintenance logs seed
export const INITIAL_MAINTENANCE: MaintenanceLog[] = [
  {
    id: 'm-log-balaji-1',
    company_id: 'tenant-balaji',
    vehicle_id: 'balaji-v2',
    vehicle_reg: 'MH-43-QQ-1102',
    service_date: '2026-06-28',
    service_type: 'repair',
    odometer: 142100,
    cost: 8500,
    workshop_name: 'Sardarni Motor Works, Pune',
    next_service_due_date: '2026-09-28',
    notes: 'Replaced front braking pads, clutch check and engine oil top-up completed.'
  }
];

// Fuel logs seed
export const INITIAL_FUEL: FuelLog[] = [
  {
    id: 'f-log-balaji-1',
    company_id: 'tenant-balaji',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    driver_id: 'd-balaji-1',
    driver_name: 'Rajesh Kumar',
    trip_id: 't-balaji-101',
    litres: 280,
    amount: 25000,
    fuel_station: 'IOCL Bypass Pump, Pune',
    odometer: 88540,
    mileage_calculated: 3.8,
    date: '2026-07-02'
  }
];

// Tyre logs seed
export const INITIAL_TYRES: TyreLog[] = [
  {
    id: 'ty-log-balaji-1',
    company_id: 'tenant-balaji',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    tyre_number: 'TY-RADIAL-00124',
    position: 'front_left',
    purchase_date: '2025-10-01',
    cost: 16500,
    running_km: 24500,
    retread_status: 'original',
    replacement_date: '2026-12-01'
  },
  {
    id: 'ty-log-balaji-2',
    company_id: 'tenant-balaji',
    vehicle_id: 'balaji-v1',
    vehicle_reg: 'HR-55-AJ-9021',
    tyre_number: 'TY-RETREAD-0943',
    position: 'rear_left_outer',
    purchase_date: '2024-05-10',
    cost: 7200,
    running_km: 52000,
    retread_status: 'once_retreaded',
    replacement_date: '2026-08-15'
  }
];

// Driver Salary logs seed
export const INITIAL_SALARIES: DriverSalaryLog[] = [
  {
    id: 'sal-balaji-1',
    company_id: 'tenant-balaji',
    driver_id: 'd-balaji-1',
    driver_name: 'Rajesh Kumar',
    month_year: '06-2026',
    base_salary: 22000,
    trip_allowance: 8500,
    advance_deduction: 2000,
    other_deductions: 500,
    net_payable: 28000,
    payment_status: 'paid',
    payment_date: '2026-07-01'
  }
];

// Alerts seed
export const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: 'alt-balaji-1',
    company_id: 'tenant-balaji',
    type: 'document_expiry',
    title: 'PUC Certificate Expiry Alert',
    description: 'Vehicle MH-43-QQ-1102 PUC will expire in 24 hours. Renew immediately to avoid RTO penalty.',
    severity: 'critical',
    target_id: 'balaji-v2',
    created_at: '2026-07-04',
    is_read: false
  },
  {
    id: 'alt-balaji-2',
    company_id: 'tenant-balaji',
    type: 'pod_pending',
    title: 'Pending POD Approval',
    description: 'Trip TRIP-2026-0102 delivered at Nhava Sheva Port. Client uploaded POD. Review and Approve.',
    severity: 'warning',
    target_id: 't-balaji-102',
    created_at: '2026-07-03',
    is_read: false
  }
];

// Class definition to act as Database Store
export class GarudERPStore {
  companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
    this.initLocalStorage();
  }

  // Generic initializer
  private initLocalStorage() {
    const checkAndInit = (key: string, initial: any[]) => {
      const stored = localStorage.getItem(key);
      if (!stored) {
        localStorage.setItem(key, JSON.stringify(initial));
      }
    };

    checkAndInit('garud_branches', INITIAL_BRANCHES);
    checkAndInit('garud_erp_users', INITIAL_USERS);
    checkAndInit('garud_customers', INITIAL_CUSTOMERS);
    checkAndInit('garud_vehicles_erp', INITIAL_VEHICLES);
    checkAndInit('garud_drivers', INITIAL_DRIVERS);
    checkAndInit('garud_enquiries', INITIAL_ENQUIRIES);
    checkAndInit('garud_quotations', INITIAL_QUOTATIONS);
    checkAndInit('garud_contracts', INITIAL_CONTRACT_RATES);
    checkAndInit('garud_trips', INITIAL_TRIPS);
    checkAndInit('garud_market_hires', INITIAL_MARKET_HIRES);
    checkAndInit('garud_invoices', INITIAL_INVOICES);
    checkAndInit('garud_payments_col', INITIAL_PAYMENTS);
    checkAndInit('garud_expenses', INITIAL_EXPENSES);
    checkAndInit('garud_maintenance', INITIAL_MAINTENANCE);
    checkAndInit('garud_fuel_logs', INITIAL_FUEL);
    checkAndInit('garud_tyre_logs', INITIAL_TYRES);
    checkAndInit('garud_salaries', INITIAL_SALARIES);
    checkAndInit('garud_system_alerts', INITIAL_ALERTS);
  }

  // Getters (Strictly scoped by companyId/tenant_id)
  getItems<T extends { company_id: string }>(key: string): T[] {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const items = JSON.parse(raw) as T[];
      return items.filter(item => item.company_id === this.companyId);
    } catch {
      return [];
    }
  }

  // Setters
  saveItems<T extends { company_id: string }>(key: string, itemsToSave: T[]) {
    const raw = localStorage.getItem(key);
    let allItems: T[] = [];
    if (raw) {
      try {
        allItems = JSON.parse(raw) as T[];
      } catch {
        allItems = [];
      }
    }
    // Remove current company's items and insert new ones
    allItems = allItems.filter(item => item.company_id !== this.companyId);
    allItems.push(...itemsToSave);
    localStorage.setItem(key, JSON.stringify(allItems));
  }

  // Item CRUD
  upsertItem<T extends { id: string; company_id: string }>(key: string, item: T) {
    const raw = localStorage.getItem(key);
    let allItems: T[] = [];
    if (raw) {
      try {
        allItems = JSON.parse(raw) as T[];
      } catch {
        allItems = [];
      }
    }
    const idx = allItems.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      allItems[idx] = item;
    } else {
      allItems.push(item);
    }
    localStorage.setItem(key, JSON.stringify(allItems));
  }

  deleteItem<T extends { id: string; company_id: string }>(key: string, id: string) {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      let allItems = JSON.parse(raw) as T[];
      allItems = allItems.filter(item => item.id !== id);
      localStorage.setItem(key, JSON.stringify(allItems));
    } catch {}
  }
}
