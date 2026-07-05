import React, { useState } from 'react';
import DataGridWrapper from './DataGridWrapper';
import { 
  Droplet, 
  Wallet, 
  CreditCard, 
  Building2, 
  Zap, 
  User, 
  AlertTriangle, 
  TrendingUp,
  X,
  Plus
} from 'lucide-react';

export default function FuelManagement() {
  const [activeTab, setActiveTab] = useState<string>('fuel_entry');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Operational fuel datasets
  const [fuelEntries, setFuelEntries] = useState<any[]>([
    { id: 'fe-1', vehicle_reg: 'HR-55-AJ-9021', date: '2026-07-04', litres: 150, amount: 13500, station: 'Indian Oil Highway', odo: 124100, mileage: 4.2 },
    { id: 'fe-2', vehicle_reg: 'GJ-01-XX-4930', date: '2026-07-03', litres: 220, amount: 19800, station: 'BPCL Bypass Hub', odo: 89400, mileage: 3.8 }
  ]);
  const [dieselAdvances, setDieselAdvances] = useState<any[]>([
    { id: 'da-1', driver_name: 'Karan Singh', trip_no: 'trip-1', advance_amount: 5000, voucher_date: '2026-07-04', status: 'PAID' }
  ]);
  const [fuelCards, setFuelCards] = useState<any[]>([
    { id: 'fc-1', card_number: 'HPCL-RFID-839210', vehicle_reg: 'HR-55-AJ-9021', vendor_partner: 'HPCL Power', card_balance: 14800, status: 'ACTIVE' }
  ]);
  const [stationLedgers, setStationLedgers] = useState<any[]>([
    { id: 'sl-1', station_name: 'Indian Oil Highway Station', credit_limit: 100000, outstanding_balance: 42000, term: '15 Days Credit' }
  ]);
  const [mileages, setMileages] = useState<any[]>([
    { id: 'mil-1', vehicle_reg: 'HR-55-AJ-9021', target_kmpl: 4.5, actual_kmpl: 4.2, variance: -0.3, assessment: 'ACCEPTABLE_CORRIDOR' },
    { id: 'mil-2', vehicle_reg: 'GJ-01-XX-4930', target_kmpl: 4.0, actual_kmpl: 3.8, variance: -0.2, assessment: 'ACCEPTABLE_CORRIDOR' }
  ]);
  const [driverReports, setDriverReports] = useState<any[]>([
    { id: 'df-1', driver_name: 'Karan Singh', trips_run: 4, total_diesel_litres: 580, average_kmpl: 4.3, incentive_earned: 1500 }
  ]);
  const [theftAlerts, setTheftAlerts] = useState<any[]>([
    { id: 'ta-1', vehicle_reg: 'MH-43-BB-8022', date: '2026-07-02', event_type: 'Sudden Fuel Drop Warning', litres_lost: 42, location: 'NH-48 Corridor parking', status: 'UNDER_INVESTIGATION' }
  ]);

  const fuelTabs = [
    { id: 'fuel_entry', label: 'Fuel Entry Logs', icon: Droplet },
    { id: 'diesel_advance', label: 'Diesel Advances', icon: Wallet },
    { id: 'fuel_card', label: 'RFID Fuel Cards', icon: CreditCard },
    { id: 'station_ledger', label: 'Fuel Station Ledger', icon: Building2 },
    { id: 'mileage', label: 'Vehicle Mileage KMPL', icon: Zap },
    { id: 'driver_report', label: 'Driver Fuel Reports', icon: User },
    { id: 'theft_alerts', label: 'Theft / Low Mileage Alerts', icon: AlertTriangle }
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
    if (!confirm('Are you sure you want to delete this fuel record?')) return;
    
    switch (activeTab) {
      case 'fuel_entry': setFuelEntries(fuelEntries.filter(v => v.id !== item.id)); break;
      case 'diesel_advance': setDieselAdvances(dieselAdvances.filter(d => d.id !== item.id)); break;
      case 'fuel_card': setFuelCards(fuelCards.filter(c => c.id !== item.id)); break;
      case 'station_ledger': setStationLedgers(stationLedgers.filter(s => s.id !== item.id)); break;
      case 'mileage': setMileages(mileages.filter(m => m.id !== item.id)); break;
      case 'driver_report': setDriverReports(driverReports.filter(d => d.id !== item.id)); break;
      case 'theft_alerts': setTheftAlerts(theftAlerts.filter(t => t.id !== item.id)); break;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'fuel-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      switch (activeTab) {
        case 'fuel_entry': setFuelEntries(fuelEntries.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
        case 'diesel_advance': setDieselAdvances(dieselAdvances.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'fuel_card': setFuelCards(fuelCards.map(c => c.id === itemId ? { ...c, ...payload } : c)); break;
        case 'station_ledger': setStationLedgers(stationLedgers.map(s => s.id === itemId ? { ...s, ...payload } : s)); break;
        case 'mileage': setMileages(mileages.map(m => m.id === itemId ? { ...m, ...payload } : m)); break;
        case 'driver_report': setDriverReports(driverReports.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'theft_alerts': setTheftAlerts(theftAlerts.map(t => t.id === itemId ? { ...t, ...payload } : t)); break;
      }
    } else {
      switch (activeTab) {
        case 'fuel_entry': setFuelEntries([payload, ...fuelEntries]); break;
        case 'diesel_advance': setDieselAdvances([payload, ...dieselAdvances]); break;
        case 'fuel_card': setFuelCards([payload, ...fuelCards]); break;
        case 'station_ledger': setStationLedgers([payload, ...stationLedgers]); break;
        case 'mileage': setMileages([payload, ...mileages]); break;
        case 'driver_report': setDriverReports([payload, ...driverReports]); break;
        case 'theft_alerts': setTheftAlerts([payload, ...theftAlerts]); break;
      }
    }

    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Sub tabs selector */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        {fuelTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowAddEditModal(false); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-slate-400 hover:text-white bg-slate-950/30 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE SUB MODULE TABLES */}
      {activeTab === 'fuel_entry' && (
        <DataGridWrapper<any>
          title="Diesel Refueling Entry Logs"
          items={fuelEntries}
          searchKeys={['vehicle_reg', 'station']}
          templateHeaders={['Vehicle Registration', 'Fuel Refill Date', 'Liters Filled', 'Amount Paid', 'Station Pump Name']}
          templateSampleRow={['MH-43-AA-9020', '2026-07-04', '150', '13500', 'BPCL Highway pump']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Registration' },
            { key: 'date', label: 'Refueling Date' },
            { key: 'litres', label: 'Fuel Refill (Liters)' },
            { key: 'amount', label: 'Total Paid (₹)' },
            { key: 'station', label: 'Highway Fuel Station' },
            { key: 'odo', label: 'Odometer (KM)' },
            { key: 'mileage', label: 'Est Mileage (KMPL)' }
          ]}
          onImport={(items) => setFuelEntries([...items, ...fuelEntries])}
        />
      )}

      {activeTab === 'diesel_advance' && (
        <DataGridWrapper<any>
          title="Lorry Diesel Advances"
          items={dieselAdvances}
          searchKeys={['driver_name', 'trip_no']}
          templateHeaders={['Driver Name', 'Trip Booking No', 'Advance Cash Amount', 'Voucher Date']}
          templateSampleRow={['Karan Singh', 'trip-1', '5000', '2026-07-04']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'driver_name', label: 'Responsible Driver' },
            { key: 'trip_no', label: 'Trip ID' },
            { key: 'advance_amount', label: 'Diesel Advance (₹)' },
            { key: 'voucher_date', label: 'Voucher Date' },
            { key: 'status', label: 'Cash status' }
          ]}
          onImport={(items) => setDieselAdvances([...items, ...dieselAdvances])}
        />
      )}

      {activeTab === 'fuel_card' && (
        <DataGridWrapper<any>
          title="RFID Fuel Cards Registry"
          items={fuelCards}
          searchKeys={['card_number', 'vehicle_reg']}
          templateHeaders={['Card RFID Number', 'Vehicle Reg', 'Fuel Vendor Partner', 'Card Balance Amount']}
          templateSampleRow={['HPCL-RFID-832948', 'HR-55-AJ-9021', 'HPCL Power', '15000']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'card_number', label: 'RFID Card Number' },
            { key: 'vehicle_reg', label: 'Associated Truck' },
            { key: 'vendor_partner', label: 'RFID Fuel Partner' },
            { key: 'card_balance', label: 'Available Balance (₹)' },
            { key: 'status', label: 'Card Status' }
          ]}
          onImport={(items) => setFuelCards([...items, ...fuelCards])}
        />
      )}

      {activeTab === 'station_ledger' && (
        <DataGridWrapper<any>
          title="Fuel Pump Credit Ledgers"
          items={stationLedgers}
          searchKeys={['station_name']}
          templateHeaders={['Fuel Station Name', 'Corporate Credit Limit', 'Outstanding Billing Balance', 'Payment Terms']}
          templateSampleRow={['Indian Oil Bypass', '100000', '42000', '15 Days Credit']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'station_name', label: 'Fuel Station Vendor' },
            { key: 'credit_limit', label: 'Credit Limit (₹)' },
            { key: 'outstanding_balance', label: 'Outstanding Balance (₹)' },
            { key: 'term', label: 'Credit Term Validity' }
          ]}
          onImport={(items) => setStationLedgers([...items, ...stationLedgers])}
        />
      )}

      {activeTab === 'mileage' && (
        <DataGridWrapper<any>
          title="Vehicle Mileage KMPL Telemetry"
          items={mileages}
          searchKeys={['vehicle_reg']}
          templateHeaders={['Vehicle', 'Target standard KMPL', 'Actual GPS KMPL', 'Variance']}
          templateSampleRow={['HR-55-AJ-9021', '4.5', '4.2', '-0.3']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Registration' },
            { key: 'target_kmpl', label: 'Target KMPL' },
            { key: 'actual_kmpl', label: 'Actual GPS KMPL' },
            { key: 'variance', label: 'Performance Variance' },
            { key: 'assessment', label: 'Assessment' }
          ]}
          onImport={(items) => setMileages([...items, ...mileages])}
        />
      )}

      {activeTab === 'driver_report' && (
        <DataGridWrapper<any>
          title="Driver Fuel Conservation Performance"
          items={driverReports}
          searchKeys={['driver_name']}
          templateHeaders={['Driver Name', 'Total Trips Run', 'Diesel Liters Consumed', 'Average Trip KMPL']}
          templateSampleRow={['Karan Singh', '4', '580', '4.3']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'driver_name', label: 'Driver Name' },
            { key: 'trips_run', label: 'Trips Handled' },
            { key: 'total_diesel_litres', label: 'Liters Consumed (L)' },
            { key: 'average_kmpl', label: 'Average Efficiency' },
            { key: 'incentive_earned', label: 'Conservation Reward (₹)' }
          ]}
          onImport={(items) => setDriverReports([...items, ...driverReports])}
        />
      )}

      {activeTab === 'theft_alerts' && (
        <DataGridWrapper<any>
          title="GPS Fuel Theft Anomaly Alerts"
          items={theftAlerts}
          searchKeys={['vehicle_reg']}
          templateHeaders={['Vehicle Registration', 'Alert Logged Date', 'Sudden Fuel Loss Liters', 'Highway Location']}
          templateSampleRow={['HR-55-AJ-9021', '2026-07-02', '42', 'NH-48 Corridor parking']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Registration' },
            { key: 'date', label: 'Incident Date' },
            { key: 'event_type', label: 'Telemetry Incident Category' },
            { key: 'litres_lost', label: 'Sudden Drop (Liters)' },
            { key: 'location', label: 'Highway Location' },
            { key: 'status', label: 'Investigation state' }
          ]}
          onImport={(items) => setTheftAlerts([...items, ...theftAlerts])}
        />
      )}

      {/* ADD / EDIT DIESEL WORKFLOWS MODAL */}
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
              {editItem ? 'Edit Fuel Record' : 'Record Fuel Transaction'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Registration / Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR-55-AJ-9021 / Karan Singh"
                  value={formFields.vehicle_reg || formFields.driver_name || formFields.station_name || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (activeTab === 'station_ledger') {
                      setFormFields({ ...formFields, station_name: e.target.value });
                    } else if (activeTab === 'diesel_advance' || activeTab === 'driver_report') {
                      setFormFields({ ...formFields, driver_name: e.target.value });
                    } else {
                      setFormFields({ ...formFields, vehicle_reg: val });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Fuel Pump Station / Card Number / Trip *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indian Oil NH-48 / HPCL RFID card / trip-1"
                  value={formFields.station || formFields.trip_no || formFields.card_number || ''}
                  onChange={(e) => {
                    if (activeTab === 'diesel_advance') {
                      setFormFields({ ...formFields, trip_no: e.target.value });
                    } else if (activeTab === 'fuel_card') {
                      setFormFields({ ...formFields, card_number: e.target.value.toUpperCase() });
                    } else {
                      setFormFields({ ...formFields, station: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Liters Filled / Card Balance *</label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={formFields.litres || formFields.card_balance || formFields.credit_limit || ''}
                    onChange={(e) => {
                      if (activeTab === 'fuel_card') {
                        setFormFields({ ...formFields, card_balance: Number(e.target.value) });
                      } else if (activeTab === 'station_ledger') {
                        setFormFields({ ...formFields, credit_limit: Number(e.target.value) });
                      } else {
                        setFormFields({ ...formFields, litres: Number(e.target.value) });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Voucher Cost Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="13500"
                    value={formFields.amount || formFields.advance_amount || ''}
                    onChange={(e) => {
                      if (activeTab === 'diesel_advance') {
                        setFormFields({ ...formFields, advance_amount: Number(e.target.value) });
                      } else {
                        setFormFields({ ...formFields, amount: Number(e.target.value) });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {editItem ? 'Save Fuel Changes' : 'Record Fuel Node'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
