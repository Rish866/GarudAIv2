import React, { useState } from 'react';
import DataGridWrapper from './DataGridWrapper';
import { Trip, Customer, Vehicle, Driver } from '../types';
import { 
  ChevronRight, 
  HelpCircle, 
  FileText, 
  Calendar, 
  Truck, 
  Layers, 
  Clipboard, 
  Anchor, 
  Navigation, 
  Download, 
  FileCheck, 
  TrendingUp, 
  Lock, 
  DollarSign,
  X,
  Plus,
  Compass
} from 'lucide-react';

interface JobsOperationsManagerProps {
  companyId: string;
  trips: Trip[];
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onUpdateTrips: (items: Trip[]) => void;
}

export default function JobsOperationsManager({
  companyId,
  trips,
  customers,
  vehicles,
  drivers,
  onUpdateTrips
}: JobsOperationsManagerProps) {
  // Map active sub-tabs to the exact 14 pipeline stages
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Operational states for all 14 phases
  const [enquiries, setEnquiries] = useState<any[]>([
    { id: 'enq-1', customer_name: 'Tata Steel Processing Ltd', route: 'Delhi to Mumbai Expressway', material: 'Steel Coils', target_rate: 2600, status: 'OPEN' },
    { id: 'enq-2', customer_name: 'Ambuja Cements Warehouse', route: 'Pune to Hyderabad Corridor', material: 'Cement Bags', target_rate: 1300, status: 'QUOTED' }
  ]);
  const [quotations, setQuotations] = useState<any[]>([
    { id: 'quo-1', enquiry_id: 'enq-2', customer_name: 'Ambuja Cements Warehouse', quoted_rate: 1350, validity: '2026-12-31', approved: 'YES' }
  ]);
  const [placements, setPlacements] = useState<any[]>([
    { id: 'plc-1', booking_id: 'trip-1', vehicle_reg: 'HR-55-AJ-9021', driver_name: 'Karan Singh', reporting_time: '2026-07-05 08:00', status: 'PLACED' }
  ]);
  const [dispatches, setDispatches] = useState<any[]>([
    { id: 'disp-1', lr_number: 'LR-2026-00284', vehicle_reg: 'HR-55-AJ-9021', dispatch_date: '2026-07-05 10:30', seal_number: 'SEAL-83921', status: 'DISPATCHED' }
  ]);
  const [loadings, setLoadings] = useState<any[]>([
    { id: 'load-1', booking_id: 'trip-1', gross_weight_tons: 28.5, tare_weight_tons: 10.2, net_weight_tons: 18.3, supervisor: 'Ramesh Yadav' }
  ]);
  const [inTransits, setInTransits] = useState<any[]>([
    { id: 'it-1', vehicle_reg: 'HR-55-AJ-9021', speed: 52, last_checkpoint: 'Udaipur Bypass', eta: '12 Hours' }
  ]);
  const [unloadings, setUnloadings] = useState<any[]>([
    { id: 'unl-1', vehicle_reg: 'GJ-01-XX-4930', unloading_date: '2026-07-04', received_by: 'Vijay Kumar', damage_reported: 'NIL' }
  ]);
  const [invoiceRequests, setInvoiceRequests] = useState<any[]>([
    { id: 'ir-1', customer_name: 'Tata Steel Processing Ltd', amount: 48000, lr_attached: 'YES', status: 'PENDING_APPROVAL' }
  ]);
  const [vendorSettlements, setVendorSettlements] = useState<any[]>([
    { id: 'vs-1', vendor_name: 'Shergill Roadlines Pvt Ltd', trip_amount: 32000, advance_paid: 15000, balance_due: 17000, status: 'UNSETTLED' }
  ]);

  // Chevrons representing the sequential pipeline flow
  const pipelineSteps = [
    { id: 'enquiry', label: 'Enquiry', icon: HelpCircle },
    { id: 'quotation', label: 'Quotation', icon: FileText },
    { id: 'booking', label: 'Booking', icon: Calendar },
    { id: 'placement', label: 'Placement', icon: Truck },
    { id: 'lr_creation', label: 'LR / Bilty', icon: Clipboard },
    { id: 'trip_sheet', label: 'Trip Sheet', icon: Anchor },
    { id: 'dispatch', label: 'Dispatch', icon: Navigation },
    { id: 'loading', label: 'Loading', icon: Layers },
    { id: 'in_transit', label: 'In Transit', icon: Compass },
    { id: 'unloading', label: 'Unloading', icon: Download },
    { id: 'pod_upload', label: 'POD Upload', icon: FileCheck },
    { id: 'trip_closure', label: 'Trip Closure', icon: Lock },
    { id: 'invoice_request', label: 'Invoice Req', icon: TrendingUp },
    { id: 'vendor_settlement', label: 'Vendor Sett.', icon: DollarSign }
  ];

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormFields({});
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setFormFields({ ...item });
    setShowAddEditModal(true);
  };

  const handleDelete = (item: any) => {
    if (!confirm('Are you sure you want to delete this operations record?')) return;
    
    switch (activeTab) {
      case 'booking':
      case 'lr_creation':
      case 'trip_sheet':
      case 'pod_upload':
      case 'trip_closure':
        onUpdateTrips(trips.filter(t => t.id !== item.id));
        break;
      case 'enquiry': setEnquiries(enquiries.filter(e => e.id !== item.id)); break;
      case 'quotation': setQuotations(quotations.filter(q => q.id !== item.id)); break;
      case 'placement': setPlacements(placements.filter(p => p.id !== item.id)); break;
      case 'dispatch': setDispatches(dispatches.filter(d => d.id !== item.id)); break;
      case 'loading': setLoadings(loadings.filter(l => l.id !== item.id)); break;
      case 'in_transit': setInTransits(inTransits.filter(i => i.id !== item.id)); break;
      case 'unloading': setUnloadings(unloadings.filter(u => u.id !== item.id)); break;
      case 'invoice_request': setInvoiceRequests(invoiceRequests.filter(i => i.id !== item.id)); break;
      case 'vendor_settlement': setVendorSettlements(vendorSettlements.filter(v => v.id !== item.id)); break;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'op-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      switch (activeTab) {
        case 'booking':
        case 'lr_creation':
        case 'trip_sheet':
        case 'pod_upload':
        case 'trip_closure':
          onUpdateTrips(trips.map(t => t.id === itemId ? { ...t, ...payload } : t));
          break;
        case 'enquiry': setEnquiries(enquiries.map(en => en.id === itemId ? { ...en, ...payload } : en)); break;
        case 'quotation': setQuotations(quotations.map(q => q.id === itemId ? { ...q, ...payload } : q)); break;
        case 'placement': setPlacements(placements.map(p => p.id === itemId ? { ...p, ...payload } : p)); break;
        case 'dispatch': setDispatches(dispatches.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'loading': setLoadings(loadings.map(l => l.id === itemId ? { ...l, ...payload } : l)); break;
        case 'in_transit': setInTransits(inTransits.map(it => it.id === itemId ? { ...it, ...payload } : it)); break;
        case 'unloading': setUnloadings(unloadings.map(un => un.id === itemId ? { ...un, ...payload } : un)); break;
        case 'invoice_request': setInvoiceRequests(invoiceRequests.map(i => i.id === itemId ? { ...i, ...payload } : i)); break;
        case 'vendor_settlement': setVendorSettlements(vendorSettlements.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
      }
    } else {
      switch (activeTab) {
        case 'booking':
        case 'lr_creation':
        case 'trip_sheet':
        case 'pod_upload':
        case 'trip_closure':
          onUpdateTrips([payload as Trip, ...trips]);
          break;
        case 'enquiry': setEnquiries([payload, ...enquiries]); break;
        case 'quotation': setQuotations([payload, ...quotations]); break;
        case 'placement': setPlacements([payload, ...placements]); break;
        case 'dispatch': setDispatches([payload, ...dispatches]); break;
        case 'loading': setLoadings([payload, ...loadings]); break;
        case 'in_transit': setInTransits([payload, ...inTransits]); break;
        case 'unloading': setUnloadings([payload, ...unloadings]); break;
        case 'invoice_request': setInvoiceRequests([payload, ...invoiceRequests]); break;
        case 'vendor_settlement': setVendorSettlements([payload, ...vendorSettlements]); break;
      }
    }

    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* 14 Stage Transport Lifecycle Visualizer pipeline */}
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl overflow-x-auto">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
          Logistics Pipeline Corridors
        </h3>

        <div className="flex items-center min-w-[1200px] gap-1 pb-2">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => { setActiveTab(step.id); setShowAddEditModal(false); }}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all relative shrink-0 ${
                    isActive 
                      ? 'bg-cyan-500 text-slate-950 font-black scale-105 shadow-md shadow-cyan-500/10' 
                      : 'text-slate-400 hover:text-white bg-slate-950/40 border border-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                </button>
                {idx < pipelineSteps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE LIFECYCLE STEP TABLES */}
      {activeTab === 'enquiry' && (
        <DataGridWrapper<any>
          title="Customer Logistics Enquiries"
          items={enquiries}
          searchKeys={['customer_name', 'route', 'material']}
          templateHeaders={['Customer Name', 'Route Corridor', 'Material Commodity', 'Target Rate per Ton']}
          templateSampleRow={['Sample Cargo Ltd', 'Delhi to Pune Expressway', 'Coils', '2500']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'customer_name', label: 'Corporate Lead' },
            { key: 'route', label: 'Route Corridor' },
            { key: 'material', label: 'Commodity' },
            { key: 'target_rate', label: 'Target Rate (₹/Ton)' },
            { key: 'status', label: 'Enquiry Status' }
          ]}
          onImport={(items) => setEnquiries([...items, ...enquiries])}
        />
      )}

      {activeTab === 'quotation' && (
        <DataGridWrapper<any>
          title="Active Corporate Quotations"
          items={quotations}
          searchKeys={['customer_name']}
          templateHeaders={['Enquiry ID', 'Customer Name', 'Quoted Rate', 'Contract Validity']}
          templateSampleRow={['enq-102', 'Shergill Industrial', '1400', '2026-12-31']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'customer_name', label: 'Corporate Lead' },
            { key: 'quoted_rate', label: 'Quoted Bid (₹/Ton)' },
            { key: 'validity', label: 'Contract Expiry' },
            { key: 'approved', label: 'Bid Approved' }
          ]}
          onImport={(items) => setQuotations([...items, ...quotations])}
        />
      )}

      {activeTab === 'booking' && (
        <DataGridWrapper<any>
          title="Active Booking Orders"
          items={trips}
          searchKeys={['booking_number', 'customer_name', 'route']}
          templateHeaders={['Booking Number', 'Customer Name', 'Route Name', 'Freight Amount', 'Trip Status']}
          templateSampleRow={['BKN-00284', 'Tata Steel Ltd', 'Delhi to Mumbai Expressway', '48000', 'assigned']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'booking_number', label: 'Booking Code' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'route', label: 'Transport Route' },
            { key: 'freight_amount', label: 'Freight (₹)' },
            { 
              key: 'status', 
              label: 'Lifecycle Stage',
              render: (t) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  t.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-cyan-950 text-cyan-400'
                }`}>
                  {t.status.replace(/_/g, ' ')}
                </span>
              )
            }
          ]}
          onImport={(items) => {
            onUpdateTrips([...items.map(it => ({
              id: 'trip-' + Date.now() + Math.random(),
              company_id: companyId,
              booking_number: it.booking_number || 'BKN-' + Math.floor(Math.random() * 9000 + 1000),
              customer_name: it.customer_name || 'Spot Load Party',
              route: it.route_name || 'Mumbai Port Delivery',
              freight_amount: Number(it.freight_amount) || 28000,
              status: 'assigned',
              vehicle_reg: 'HR-55-AJ-9021',
              driver_name: 'Karan Singh',
              advance_paid: 0,
              balance_due: Number(it.freight_amount) || 28000,
              created_at: new Date().toISOString().split('T')[0]
            } as any)), ...trips]);
          }}
        />
      )}

      {activeTab === 'placement' && (
        <DataGridWrapper<any>
          title="Vehicle Placement Requirements"
          items={placements}
          searchKeys={['vehicle_reg', 'driver_name']}
          templateHeaders={['Booking ID', 'Placed Vehicle Registration', 'Reporting Driver Name', 'Reporting Schedule']}
          templateSampleRow={['trip-1', 'MH-43-AA-9020', 'Prem Singh', '2026-07-05 08:00']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Placed Vehicle' },
            { key: 'driver_name', label: 'Driver Assigned' },
            { key: 'reporting_time', label: 'Reporting Schedule' },
            { key: 'status', label: 'Placement Status' }
          ]}
          onImport={(items) => setPlacements([...items, ...placements])}
        />
      )}

      {activeTab === 'lr_creation' && (
        <DataGridWrapper<any>
          title="LR / Bilty Legal Registry"
          items={trips}
          searchKeys={['lr_number', 'booking_number', 'customer_name']}
          templateHeaders={['LR Number', 'Booking Number', 'Consignor', 'Consignee', 'LR Date']}
          templateSampleRow={['LR-2026-00284', 'BKN-8320', 'Tata Steel', 'Balaji Stockyard', '2026-07-05']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'lr_number', label: 'LR Bilty No' },
            { key: 'booking_number', label: 'Booking Code' },
            { key: 'customer_name', label: 'Shipper/Corporate' },
            { 
              key: 'consignee', 
              label: 'Consignee Site',
              render: () => <span>Balaji Steel Depot Chennai</span>
            },
            { 
              key: 'lr_date', 
              label: 'LR Creation Date',
              render: (t) => <span>{t.created_at || '2026-07-05'}</span>
            }
          ]}
          onImport={(items) => {
            onUpdateTrips([...items.map(it => ({
              id: 'trip-' + Date.now() + Math.random(),
              company_id: companyId,
              booking_number: it.booking_number || 'BKN-TEMP',
              lr_number: it.lr_number || 'LR-' + Math.floor(Math.random() * 90000 + 10000),
              customer_name: 'Tata Steel Processing Ltd',
              route: 'Delhi to Mumbai Expressway',
              freight_amount: 48000,
              status: 'loading',
              vehicle_reg: 'HR-55-AJ-9021',
              driver_name: 'Karan Singh',
              advance_paid: 0,
              balance_due: 48000,
              created_at: new Date().toISOString().split('T')[0]
            } as any)), ...trips]);
          }}
        />
      )}

      {activeTab === 'trip_sheet' && (
        <DataGridWrapper<any>
          title="Operational Trip Sheets"
          items={trips}
          searchKeys={['booking_number', 'vehicle_reg', 'driver_name']}
          templateHeaders={['Booking ID', 'Vehicle', 'Driver', 'Opening Odometer', 'Route Path']}
          templateSampleRow={['trip-1', 'HR-55-AJ-9021', 'Karan Singh', '124000', 'Delhi to Mumbai Expressway']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'booking_number', label: 'Trip ID' },
            { key: 'vehicle_reg', label: 'Dispatched Truck' },
            { key: 'driver_name', label: 'Assigned Driver' },
            { 
              key: 'opening_odo', 
              label: 'Opening Odo (KM)',
              render: () => <span className="font-mono">142,000</span>
            },
            { key: 'route', label: 'Assigned Corridor' }
          ]}
          onImport={(items) => {
            onUpdateTrips([...items.map(it => ({
              id: 'trip-' + Date.now() + Math.random(),
              company_id: companyId,
              booking_number: it.booking_id || 'BKN-SHEET',
              customer_name: 'Balaji Industrial',
              route: it.route_path || 'Corridor Delivery',
              freight_amount: 32000,
              status: 'loading',
              vehicle_reg: it.vehicle || 'HR-55-AJ-9021',
              driver_name: it.driver || 'Spot Driver',
              advance_paid: 0,
              balance_due: 32000,
              created_at: new Date().toISOString().split('T')[0]
            } as any)), ...trips]);
          }}
        />
      )}

      {activeTab === 'dispatch' && (
        <DataGridWrapper<any>
          title="Dispatch Clearance Registry"
          items={dispatches}
          searchKeys={['lr_number', 'vehicle_reg']}
          templateHeaders={['LR Number', 'Vehicle', 'Dispatch Timestamp', 'Container Seal No']}
          templateSampleRow={['LR-00284', 'HR-55-AJ-9021', '2026-07-05 10:30', 'SEAL-0982']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'lr_number', label: 'LR No' },
            { key: 'vehicle_reg', label: 'Vehicle Placed' },
            { key: 'dispatch_date', label: 'Cleared Timestamp' },
            { key: 'seal_number', label: 'Container Seal No' },
            { key: 'status', label: 'Clearance Status' }
          ]}
          onImport={(items) => setDispatches([...items, ...dispatches])}
        />
      )}

      {activeTab === 'loading' && (
        <DataGridWrapper<any>
          title="Loading Weights & Weighbridge slips"
          items={loadings}
          searchKeys={['booking_id', 'supervisor']}
          templateHeaders={['Booking ID', 'Gross Weight Tons', 'Tare Weight Tons', 'Supervisor Name']}
          templateSampleRow={['trip-1', '28.5', '10.2', 'Amit Singh']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'booking_id', label: 'Trip ID' },
            { key: 'gross_weight_tons', label: 'Gross Weight (Tons)' },
            { key: 'tare_weight_tons', label: 'Tare Weight (Tons)' },
            { key: 'net_weight_tons', label: 'Cargo Payload Net weight' },
            { key: 'supervisor', label: 'Loading Supervisor' }
          ]}
          onImport={(items) => setLoadings([...items, ...loadings])}
        />
      )}

      {activeTab === 'in_transit' && (
        <DataGridWrapper<any>
          title="In Transit GPS Telemetry corridor"
          items={inTransits}
          searchKeys={['vehicle_reg', 'last_checkpoint']}
          templateHeaders={['Vehicle', 'Speed KMH', 'Last Known Toll Checkpoint', 'ETA']}
          templateSampleRow={['HR-55-AJ-9021', '55', 'Udaipur Highway Toll', '8 Hours']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Truck Registry' },
            { key: 'speed', label: 'Current Speed (km/h)' },
            { key: 'last_checkpoint', label: 'Last Logged Toll plaza' },
            { key: 'eta', label: 'Dest ETA' }
          ]}
          onImport={(items) => setInTransits([...items, ...inTransits])}
        />
      )}

      {activeTab === 'unloading' && (
        <DataGridWrapper<any>
          title="Unloading Verification Records"
          items={unloadings}
          searchKeys={['vehicle_reg', 'received_by']}
          templateHeaders={['Vehicle', 'Unloading Date', 'Site Manager Received By', 'Damage Reported']}
          templateSampleRow={['HR-55-AJ-9021', '2026-07-05', 'Narender Yadav', 'NIL']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Placed' },
            { key: 'unloading_date', label: 'Unloading Date' },
            { key: 'received_by', label: 'Site Unloading Lead' },
            { key: 'damage_reported', label: 'Damage/Shortage Check' }
          ]}
          onImport={(items) => setUnloadings([...items, ...unloadings])}
        />
      )}

      {activeTab === 'pod_upload' && (
        <DataGridWrapper<any>
          title="POD (Proof Of Delivery) Upload Center"
          items={trips}
          searchKeys={['booking_number', 'vehicle_reg', 'customer_name']}
          templateHeaders={['Booking Number', 'Vehicle', 'POD Submitted Date', 'POD File Name']}
          templateSampleRow={['BKN-00284', 'HR-55-AJ-9021', '2026-07-05', 'Signed_Bilty_8392.pdf']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'booking_number', label: 'Booking Code' },
            { key: 'vehicle_reg', label: 'Truck Registry' },
            { key: 'customer_name', label: 'Billing Corporate' },
            { 
              key: 'pod_status', 
              label: 'POD Attachment Link',
              render: (t) => (
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    t.pod_url ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {t.pod_url ? '✓ VERIFIED SIGNED POD' : '⚠ PENDING BILLING POD'}
                  </span>
                </div>
              )
            }
          ]}
          onImport={(items) => {
            onUpdateTrips([...items.map(it => ({
              id: 'trip-' + Date.now() + Math.random(),
              company_id: companyId,
              booking_number: it.booking_number || 'BKN-POD',
              customer_name: 'Tata Steel Processing Ltd',
              route: 'Delhi to Mumbai Expressway',
              freight_amount: 48000,
              status: 'pod_pending',
              vehicle_reg: 'HR-55-AJ-9021',
              driver_name: 'Karan Singh',
              advance_paid: 0,
              balance_due: 48000,
              pod_url: 'https://supabase.co/pod.pdf',
              created_at: new Date().toISOString().split('T')[0]
            } as any)), ...trips]);
          }}
        />
      )}

      {activeTab === 'trip_closure' && (
        <DataGridWrapper<any>
          title="Legal Operational Trip Closure"
          items={trips}
          searchKeys={['booking_number', 'vehicle_reg', 'driver_name']}
          templateHeaders={['Booking Number', 'Vehicle', 'Closure Date', 'Trip Profit Margin %']}
          templateSampleRow={['BKN-00284', 'HR-55-AJ-9021', '2026-07-05', '24']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'booking_number', label: 'Booking Code' },
            { key: 'vehicle_reg', label: 'Vehicle Placed' },
            { key: 'driver_name', label: 'Responsible Driver' },
            { 
              key: 'trip_closure_status', 
              label: 'Audit & Closure State',
              render: (t) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  t.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                }`}>
                  {t.status === 'completed' ? 'CLOSED & BALANCED' : 'PENDING AUDIT CHECKS'}
                </span>
              )
            }
          ]}
          onImport={(items) => {
            onUpdateTrips([...items.map(it => ({
              id: 'trip-' + Date.now() + Math.random(),
              company_id: companyId,
              booking_number: it.booking_number || 'BKN-CLOSE',
              customer_name: 'Tata Steel Processing Ltd',
              route: 'Delhi to Mumbai Expressway',
              freight_amount: 48000,
              status: 'completed',
              vehicle_reg: 'HR-55-AJ-9021',
              driver_name: 'Karan Singh',
              advance_paid: 0,
              balance_due: 0,
              created_at: new Date().toISOString().split('T')[0]
            } as any)), ...trips]);
          }}
        />
      )}

      {activeTab === 'invoice_request' && (
        <DataGridWrapper<any>
          title="Customer Invoice Requests"
          items={invoiceRequests}
          searchKeys={['customer_name']}
          templateHeaders={['Customer Corporate Name', 'Billing Amount', 'LR Attached Match', 'Approval Status']}
          templateSampleRow={['Tata Steel Processing', '48000', 'YES', 'APPROVED']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'customer_name', label: 'Shipper/Customer' },
            { key: 'amount', label: 'Billed Amount (₹)' },
            { key: 'lr_attached', label: 'LR Bilty Attached' },
            { key: 'status', label: 'Billing Approval' }
          ]}
          onImport={(items) => setInvoiceRequests([...items, ...invoiceRequests])}
        />
      )}

      {activeTab === 'vendor_settlement' && (
        <DataGridWrapper<any>
          title="Vendor & Attendant Settlements"
          items={vendorSettlements}
          searchKeys={['vendor_name']}
          templateHeaders={['Vendor Name', 'Trip Gross Amount', 'Advance Deducted', 'Balance Outstanding Payment']}
          templateSampleRow={['Shergill Roadlines Pvt Ltd', '32000', '15000', '17000']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vendor_name', label: 'Market Vendor' },
            { key: 'trip_amount', label: 'Gross Freight (₹)' },
            { key: 'advance_paid', label: 'Lorry Advance Deducted (₹)' },
            { key: 'balance_due', label: 'Outstanding Balance (₹)' },
            { key: 'status', label: 'Payment Status' }
          ]}
          onImport={(items) => setVendorSettlements([...items, ...vendorSettlements])}
        />
      )}

      {/* OPERATIONAL DYNAMIC MODAL FOR DATA ENTRY */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowAddEditModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <Plus className="w-4.5 h-4.5 text-cyan-400" />
              {editItem ? 'Edit Lifecycle Entry' : 'Log Operational Stage Node'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Corporate Client / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Steel Processing Ltd"
                  value={formFields.customer_name || ''}
                  onChange={(e) => setFormFields({ ...formFields, customer_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Assigned Route Corridor *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi to Mumbai Expressway"
                  value={formFields.route || ''}
                  onChange={(e) => setFormFields({ ...formFields, route: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Primary Freight Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="48000"
                  value={formFields.freight_amount || formFields.amount || ''}
                  onChange={(e) => setFormFields({ ...formFields, freight_amount: Number(e.target.value), amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {editItem ? 'Update Operational Entry' : 'Publish Pipeline Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
