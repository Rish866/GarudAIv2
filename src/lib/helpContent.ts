// Help content for each module - displayed in the HelpButton tooltip
import type { ModuleName } from '../types';

interface HelpInfo {
  title: string;
  content: string;
  steps?: string[];
}

export const MODULE_HELP: Record<ModuleName, HelpInfo> = {
  dashboard: {
    title: 'Dashboard Overview',
    content: 'Your command center showing real-time KPIs — active trips, fleet status, revenue, and alerts at a glance.',
    steps: ['Review today\'s active trips and pending deliveries', 'Check fleet utilization percentage', 'Click any card to navigate to that module', 'Use branch selector (top) to filter by branch'],
  },
  fleet: {
    title: 'Fleet Management',
    content: 'Manage all your vehicles — owned, attached, and market. Track documents, insurance expiry, and GPS status.',
    steps: ['Click "Add Vehicle" to register a new vehicle', 'Fill registration, make, model, capacity details', 'Upload documents (RC, Insurance, Fitness, Permit)', 'Use bulk upload (CSV) for multiple vehicles at once', 'Export to Excel for reporting'],
  },
  trips: {
    title: 'Trip Management',
    content: 'Create and track trips from booking to settlement. Full lifecycle: Booked → Assigned → Loading → In Transit → Delivered → POD → Billed → Settled.',
    steps: ['Click "New Trip" to create a booking', 'Select customer, vehicle, and driver', 'Enter origin & destination (KM auto-calculates)', 'Set freight amount and advance', 'Track status updates as trip progresses', 'Upload POD when delivered, then generate invoice'],
  },
  drivers: {
    title: 'Driver Management',
    content: 'Manage driver profiles, license details, salary, and performance tracking.',
    steps: ['Click "Add Driver" to register a new driver', 'Enter license number, expiry, and contact details', 'Set salary type: monthly, per-trip, or per-km', 'Assign to a vehicle from Fleet module', 'Monitor safety score and trip history'],
  },
  customers: {
    title: 'Customer Management',
    content: 'Manage customer profiles, credit limits, GST details, and track outstanding balances.',
    steps: ['Click "Add Customer" to create a new customer', 'Enter company name, GSTIN, billing address', 'Set credit limit and credit days', 'Outstanding auto-updates as invoices are generated', 'Use "Credit Control" module to block overdue customers'],
  },
  billing: {
    title: 'Billing & Invoices',
    content: 'Generate GST invoices for completed trips. Auto-calculates freight, detention, GST, and TDS.',
    steps: ['Select completed trips to bill', 'Invoice auto-generates with GST calculation', 'Download PDF or email to customer', 'Record payments when received', 'Track outstanding via aging report'],
  },
  fuel: {
    title: 'Fuel Management',
    content: 'Track diesel/fuel fills, calculate mileage (km/litre), and monitor fuel expenses per vehicle.',
    steps: ['Click "Add Fuel Entry" for each fill', 'Enter litres, rate, station, and odometer reading', 'System calculates mileage automatically', 'Compare mileage across vehicles to detect issues', 'Export for expense reconciliation'],
  },
  maintenance: {
    title: 'Maintenance',
    content: 'Schedule preventive maintenance, log repairs, and track costs per vehicle.',
    steps: ['Click "Schedule Maintenance" to create a job', 'Select vehicle, type (preventive/repair/breakdown)', 'Enter vendor, cost, and odometer reading', 'Update status as work progresses', 'Track total maintenance cost per vehicle'],
  },
  reports: {
    title: 'Reports & Analytics',
    content: 'Comprehensive reports on trips, revenue, expenses, fleet utilization, and customer performance.',
    steps: ['Select report type from the dropdown', 'Set date range and filters', 'View charts and data tables', 'Export to PDF or Excel', 'Schedule recurring reports (coming soon)'],
  },
  settings: {
    title: 'Settings',
    content: 'Configure company profile, manage users & roles, and check database connection status.',
    steps: ['Company Profile: Update name, GSTIN, address', 'User Management: Add/remove users and assign roles', 'Roles & Permissions: View module access for each role', 'Database: Check Supabase connection status'],
  },
  notifications: {
    title: 'Notifications',
    content: 'All system alerts in one place — trip updates, payment received, document expiry, and maintenance due.',
    steps: ['View all notifications grouped by type', 'Click a notification to navigate to the related module', 'Mark as read or mark all as read', 'Filter by type: trips, payments, documents, system'],
  },
  enquiries: {
    title: 'Enquiries',
    content: 'Capture customer transport enquiries and convert them to quotations, then to trips.',
    steps: ['Click "Add Enquiry" when customer calls', 'Enter origin, destination, material, target rate', 'Convert to Quotation once rate is discussed', 'Send quotation to customer for approval', 'Convert accepted quotation to Trip'],
  },
  tyres: {
    title: 'Tyre Management',
    content: 'Track tyre lifecycle — purchase, fitment, KM run, retreading, and scrap. Calculate cost per KM.',
    steps: ['Click "Add Tyre" to register a new tyre', 'Enter serial number, vehicle, position (FL/FR/RL/RR)', 'System tracks KM as vehicle moves', 'Log retreading when tyre is re-used', 'Mark as scrapped when no longer usable'],
  },
  payroll: {
    title: 'Payroll',
    content: 'Calculate driver and staff salaries — supports monthly, per-trip, and per-km salary types.',
    steps: ['View payroll period (monthly)', 'System auto-calculates based on salary type', 'Deduct advances given during month', 'Add bonus or deductions if any', 'Generate pay slip PDF'],
  },
  contracts: {
    title: 'Contract Rate Master',
    content: 'Define rate agreements with customers — per ton, per trip, or per km rates for specific routes.',
    steps: ['Click "Add Contract" to create rate agreement', 'Select customer and define validity period', 'Set rates for specific origin-destination pairs', 'System auto-applies rates when creating trips', 'Track contract utilization'],
  },
  market: {
    title: 'Market / Hire Vehicles',
    content: 'Manage hired vehicles from market — hire slips, advances, freight bills, and settlement.',
    steps: ['Register market vehicle with owner details', 'Create hire slip with agreed rate', 'Track advance given and balance', 'Generate freight bill for settlement', 'Record payment to owner'],
  },
  documents: {
    title: 'Document Vault',
    content: 'All vehicle and driver documents in one place with automatic expiry alerts.',
    steps: ['Documents auto-populate from Fleet & Driver modules', 'View expiry dates at a glance', 'Get alerts 30/15/7 days before expiry', 'Filter by type: Insurance, Fitness, Permit, License', 'Upload renewal documents when ready'],
  },
  gps: {
    title: 'GPS Integration',
    content: 'Connect your GPS provider API to get real-time vehicle tracking on the map.',
    steps: ['Enter your GPS provider API URL and key', 'Map your vehicle IDs with GPS device IDs', 'System auto-fetches location every 30 seconds', 'View live map with all vehicles', 'Configure speed alerts and stoppages'],
  },
  accounts: {
    title: 'Cash & Bank Book',
    content: 'Track all cash and bank transactions — payments received, expenses paid, and daily balance.',
    steps: ['View cash book for daily transactions', 'View bank book for bank statements', 'Add manual entries for cash/cheque receipts', 'Reconcile bank balance monthly', 'Export for accountant/CA'],
  },
  purchases: {
    title: 'Purchases',
    content: 'Record all business purchases — diesel, spares, tyres, office supplies with GST input tracking.',
    steps: ['Click "Add Purchase" to record a buy', 'Enter vendor, items, GST amount', 'Link to vehicle if applicable', 'Track pending payments to vendors', 'Use for GSTR-3B ITC calculation'],
  },
  sales: {
    title: 'Sales',
    content: 'Track all sales revenue — auto-feeds from invoice generation. View revenue by customer/route.',
    steps: ['Sales auto-populate from Billing module', 'View revenue breakdown by customer', 'Filter by date range', 'Track GST collected', 'Export for GST filing'],
  },
  inventory: {
    title: 'Inventory',
    content: 'Track spare parts, tyres, oil, and consumables stock across warehouses/branches.',
    steps: ['Add items with opening stock', 'Record stock-in (purchase) and stock-out (usage)', 'Set minimum stock alerts', 'View stock value report', 'Transfer stock between branches'],
  },
  geofencing: {
    title: 'Geofencing',
    content: 'Create virtual boundaries around locations. Get alerts when vehicles enter or exit these zones.',
    steps: ['Click "Add Geofence" to draw a boundary', 'Name it (e.g., "Mumbai Port Zone")', 'Set radius in meters', 'Choose alert type: entry, exit, or both', 'View entry/exit event log'],
  },
  sla: {
    title: 'SLA Monitoring',
    content: 'Set delivery time targets and monitor compliance. Get alerted when SLA is at risk of breach.',
    steps: ['Define SLA per customer or route', 'Set expected delivery hours/days', 'System monitors active trips against SLA', 'Get alerts when trip is delayed', 'View SLA compliance % report'],
  },
  dashcam: {
    title: 'AI Dashcam',
    content: 'Camera-based driver monitoring — detects drowsiness, phone usage, smoking, and harsh events.',
    steps: ['Connect dashcam device to vehicle', 'Configure alert thresholds in settings', 'View live feed (when device supports)', 'Review flagged events with video clips', 'Use for driver safety scoring'],
  },
  fueltheft: {
    title: 'Fuel Theft Alerts',
    content: 'Detect abnormal fuel consumption patterns that indicate possible siphoning or theft.',
    steps: ['System monitors fuel level from sensor data', 'Compares actual vs expected consumption', 'Alerts when sudden drops detected', 'Review alert details with timestamp & location', 'Take action and record resolution'],
  },
  challans: {
    title: 'Challans & Fines',
    content: 'Track traffic fines and penalties for all vehicles. Assign to drivers for salary deduction.',
    steps: ['Click "Add Challan" when fine is received', 'Enter challan number, amount, and offence', 'Assign to the driver responsible', 'Mark as paid or deducted from salary', 'View vehicle-wise and driver-wise reports'],
  },
  workorders: {
    title: 'Work Orders',
    content: 'Create repair/service work orders for internal garage or external vendor. Track progress.',
    steps: ['Click "Create Work Order" for a job', 'Select vehicle and describe the issue', 'Assign to internal mechanic or external garage', 'Track parts used and labor hours', 'Close work order and update costs'],
  },
  ewaybill: {
    title: 'E-Way Bill',
    content: 'Generate and manage GST e-way bills for consignments. Auto-links to trips with Part-B update.',
    steps: ['Click "Generate E-Way Bill" to create new', 'Select trip — details auto-fill', 'Enter HSN code and goods value', 'System calculates GST and validity period', 'Update Part-B when transporter changes'],
  },
  audittrail: {
    title: 'Audit Trail',
    content: 'Complete activity log showing who did what, when. Required for compliance and dispute resolution.',
    steps: ['View all system actions chronologically', 'Filter by user, entity type, or date', 'Search for specific activities', 'Export to CSV for compliance audits', 'Auto-logs all add/edit/delete operations'],
  },
  portal: {
    title: 'Customer Portal',
    content: 'Give customers self-service access to track shipments, download invoices & PODs, and request bookings.',
    steps: ['Select a customer to preview their portal view', 'Customers see: Live tracking, Invoice history, POD downloads', 'They can submit new booking requests', 'Share portal URL with customer (after deployment)', 'No admin access — customers see only their own data'],
  },
  pnl: {
    title: 'Profit & Loss / Balance Sheet',
    content: 'Auto-generated financial statements from your operations data. Revenue vs Expenses = Net Profit.',
    steps: ['Select period: This Month / Quarter / FY / All Time', 'Revenue auto-calculates from invoices', 'Expenses pull from all expense entries + fuel + maintenance', 'View category-wise expense breakdown', 'Export CSV for your CA/accountant'],
  },
  gstreports: {
    title: 'GST Reports',
    content: 'Ready-to-file GSTR-1 (outward supplies), GSTR-3B (summary), and HSN summary reports.',
    steps: ['Select the filing month', 'View GSTR-1: Invoice-wise details with GSTIN', 'View GSTR-3B: Tax liability summary', 'View HSN Summary: SAC code wise aggregation', 'Export CSV and upload to GST Portal'],
  },
  vendors: {
    title: 'Vendor / Supplier Master',
    content: 'Manage all your suppliers — vehicle owners, fuel stations, tyre dealers, garages, and brokers.',
    steps: ['Click "Add Vendor" to register a supplier', 'Select type: Vehicle Owner / Fuel / Tyre / Garage / Broker', 'Enter GSTIN, PAN, and bank details for payment', 'Track total paid and outstanding', 'Use for vendor payment reconciliation'],
  },
  routes: {
    title: 'Route Master',
    content: 'Pre-defined routes with standard KM, transit time, tolls, and fuel estimates. Track route profitability.',
    steps: ['Click "Add Route" to define a new corridor', 'Enter origin, destination, standard KM and hours', 'Add toll points count and estimated toll cost', 'System auto-calculates profitability per route', 'Use for rate-setting and route planning'],
  },
  indents: {
    title: 'Indent / Order Management',
    content: 'Receive customer orders (indents), allocate vehicles, and convert to trips. Full order lifecycle.',
    steps: ['Click "New Indent" when customer places order', 'Enter origin, destination, material, rate', 'Allocate an available vehicle from dropdown', 'Click "Convert to Trip" to create the trip', 'Track indent status: Pending → Allocated → In Progress → Completed'],
  },
  attendance: {
    title: 'Attendance & Leave',
    content: 'Track daily attendance of drivers and staff. Manage leave requests with approve/reject workflow.',
    steps: ['Daily Attendance: Mark present/absent for each employee', 'Change status for on-trip or half-day', 'Leave Requests: Apply leave for an employee', 'Approve or reject pending requests', 'Monthly Summary: View leave balance per person'],
  },
  creditblock: {
    title: 'Customer Credit Control',
    content: 'Monitor credit utilization and automatically flag/block customers who exceed limits or have overdue invoices.',
    steps: ['View all customers with credit utilization %', 'System auto-detects "At Risk" customers', 'Click Lock icon to manually block a customer', 'Blocked customers cannot have new trips created', 'Click Unlock to re-enable after payment'],
  },
  transfers: {
    title: 'Inter-Branch Transfers',
    content: 'Move vehicles, drivers, or inventory between your branches with full tracking.',
    steps: ['Click "New Transfer" to initiate', 'Select type: Vehicle / Driver / Inventory', 'Choose From Branch and To Branch', 'Click "Mark In Transit" when item leaves', 'Click "Mark Received" when received at destination'],
  },
  restapi: {
    title: 'REST API & Integrations',
    content: 'Connect third-party systems via API. Generate API keys, configure webhooks for event notifications.',
    steps: ['Endpoints tab: View all 22 available API endpoints', 'API Keys tab: Generate keys for external apps', 'Webhooks tab: Set up URLs to receive event notifications', 'Copy endpoint paths and integrate with GPS/ERP', 'Revoke keys if compromised'],
  },
  predictive: {
    title: 'Predictive AI Analytics',
    content: 'AI-powered predictions using your historical data — ETA forecasting, maintenance alerts, and demand planning.',
    steps: ['ETA: View predicted arrival times for active trips', 'Maintenance: See which vehicles need service soon', 'Demand: View next-week trip predictions per route', 'Insights: Get actionable AI recommendations', 'Higher confidence % = more reliable prediction'],
  },
  mobileapp: {
    title: 'Mobile App Manager',
    content: 'Deploy and manage the driver mobile app — monitor devices, configure features, and view driver activity.',
    steps: ['Overview: See online/offline drivers with QR download', 'Driver Devices: Monitor app version, GPS, battery', 'App Config: Set GPS interval, speed alerts, SOS toggle', 'Activity: View driver app actions (POD uploads, trips accepted)', 'Share QR code with drivers to download the app'],
  },
  approvals: {
    title: 'Approvals (Maker-Checker)',
    content: 'Review and approve/reject requests that exceed defined thresholds. Ensures financial control.',
    steps: ['View pending approvals ordered by urgency', 'Check request details, amount, and who requested', 'Click Approve or Reject (with reason)', 'Approval rules auto-trigger for expenses >₹10K, rate changes, credit limits >₹5L', 'All decisions are logged in audit trail'],
  },
  trackinglinks: {
    title: 'Customer Tracking Links',
    content: 'Generate shareable URLs for customers to track their shipment live — no login needed.',
    steps: ['Find the active trip you want to share', 'Click "Copy Link" to get the tracking URL', 'Click "WhatsApp" to share directly with customer', 'Customer opens link — sees live status, vehicle, ETA', 'Link auto-expires when trip is delivered'],
  },
  expiry: {
    title: 'Document Expiry Dashboard',
    content: 'Monitor all vehicle and driver document expiry dates with color-coded urgency alerts.',
    steps: ['Red = Expired (action needed immediately)', 'Orange = Expiring within 7 days', 'Yellow = Expiring within 30 days', 'Green = Valid for 30+ days', 'Click "Renew Now" or "Set Reminder" to take action', 'Export report for compliance audits'],
  },
};
