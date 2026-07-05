import React, { useState } from 'react';
import DataGridWrapper from './DataGridWrapper';
import { 
  Settings, 
  Layers, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  Wrench, 
  TrendingUp, 
  DollarSign,
  X,
  Plus
} from 'lucide-react';

export default function TyreManagement() {
  const [activeTab, setActiveTab] = useState<string>('tyre_inventory');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Tyre tracking datasets
  const [tyreInventory, setTyreInventory] = useState<any[]>([
    { id: 'ty-1', tyre_serial: 'TY-RADIAL-98210', brand: 'MRF Steel Muscle', size: '10.00R20 HGV', status: 'IN_STOCK', cost: 16200 },
    { id: 'ty-2', tyre_serial: 'TY-RADIAL-83921', brand: 'Apollo Amerosteel', size: '10.00R20 HGV', status: 'MOUNTED', cost: 15800 }
  ]);
  const [tyreAssignments, setTyreAssignments] = useState<any[]>([
    { id: 'ta-1', tyre_serial: 'TY-RADIAL-83921', vehicle_reg: 'HR-55-AJ-9021', position: 'Front-Left steering axle', mount_date: '2026-05-10', current_km: 12400 }
  ]);
  const [tyreRotations, setTyreRotations] = useState<any[]>([
    { id: 'tr-1', vehicle_reg: 'HR-55-AJ-9021', date: '2026-06-20', reason: 'Preventive tread wear balance', from_pos: 'Front-Left steering', to_pos: 'Rear-Left outer drive' }
  ]);
  const [tyreRetreads, setTyreRetreads] = useState<any[]>([
    { id: 'rt-1', tyre_serial: 'TY-RADIAL-12093', vendor: 'Balaji Cold Retreaders', cost: 3500, status: 'DONE_RESOLD_ONCE', retread_date: '2026-06-15' }
  ]);
  const [tyreDamages, setTyreDamages] = useState<any[]>([
    { id: 'td-1', tyre_serial: 'TY-RADIAL-88321', vehicle_reg: 'GJ-01-XX-4930', damage_type: 'Sidewall cut from highway debris', cost_implication: 15800, date: '2026-06-11' }
  ]);
  const [tyreScraps, setTyreScraps] = useState<any[]>([
    { id: 'ts-1', tyre_serial: 'TY-RADIAL-00329', scrap_reason: 'Tread worn out past safe limit', scrap_value_recovered: 800, scrap_date: '2026-06-01' }
  ]);

  const tyreTabs = [
    { id: 'tyre_inventory', label: 'Tyre Inventory', icon: Settings },
    { id: 'tyre_assignment', label: 'Tyre Assignment', icon: Layers },
    { id: 'tyre_rotation', label: 'Tyre Rotation', icon: RefreshCw },
    { id: 'tyre_retreading', label: 'Tyre Retreading', icon: Wrench },
    { id: 'tyre_damage', label: 'Tyre Damage Logs', icon: AlertTriangle },
    { id: 'tyre_scrap', label: 'Tyre Scrap Register', icon: Trash2 },
    { id: 'tyre_cost_report', label: 'Tyre Cost Summary', icon: TrendingUp }
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
    if (!confirm('Are you sure you want to delete this tyre log?')) return;
    
    switch (activeTab) {
      case 'tyre_inventory': setTyreInventory(tyreInventory.filter(v => v.id !== item.id)); break;
      case 'tyre_assignment': setTyreAssignments(tyreAssignments.filter(t => t.id !== item.id)); break;
      case 'tyre_rotation': setTyreRotations(tyreRotations.filter(t => t.id !== item.id)); break;
      case 'tyre_retreading': setTyreRetreads(tyreRetreads.filter(t => t.id !== item.id)); break;
      case 'tyre_damage': setTyreDamages(tyreDamages.filter(t => t.id !== item.id)); break;
      case 'tyre_scrap': setTyreScraps(tyreScraps.filter(t => t.id !== item.id)); break;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'tyre-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      switch (activeTab) {
        case 'tyre_inventory': setTyreInventory(tyreInventory.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
        case 'tyre_assignment': setTyreAssignments(tyreAssignments.map(t => t.id === itemId ? { ...t, ...payload } : t)); break;
        case 'tyre_rotation': setTyreRotations(tyreRotations.map(t => t.id === itemId ? { ...t, ...payload } : t)); break;
        case 'tyre_retreading': setTyreRetreads(tyreRetreads.map(r => r.id === itemId ? { ...r, ...payload } : r)); break;
        case 'tyre_damage': setTyreDamages(tyreDamages.map(t => t.id === itemId ? { ...t, ...payload } : t)); break;
        case 'tyre_scrap': setTyreScraps(tyreScraps.map(s => s.id === itemId ? { ...s, ...payload } : s)); break;
      }
    } else {
      switch (activeTab) {
        case 'tyre_inventory': setTyreInventory([payload, ...tyreInventory]); break;
        case 'tyre_assignment': setTyreAssignments([payload, ...tyreAssignments]); break;
        case 'tyre_rotation': setTyreRotations([payload, ...tyreRotations]); break;
        case 'tyre_retreading': setTyreRetreads([payload, ...tyreRetreads]); break;
        case 'tyre_damage': setTyreDamages([payload, ...tyreDamages]); break;
        case 'tyre_scrap': setTyreScraps([payload, ...tyreScraps]); break;
      }
    }

    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Sub tabs selector */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        {tyreTabs.map(tab => {
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

      {/* TYRE COST REPORT SPECIAL DASHBOARD VIEW */}
      {activeTab === 'tyre_cost_report' && (
        <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-3">
            <div>
              <h3 className="text-base font-black text-white">Heavy Fleet Tyre Lifespan Cost analysis</h3>
              <p className="text-xs text-slate-500 font-mono">Consolidated MRF & Apollo radial investment ledger</p>
            </div>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2.5 py-1 rounded">Avg Lifespan: 82,400 KM</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Tyre Purchase Cost</span>
              <div className="text-xl font-mono font-black text-white mt-1">₹4,82,000</div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">32 Active Mountings</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Retread Saving</span>
              <div className="text-xl font-mono font-black text-emerald-400 mt-1">₹12,400 / Tyre</div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Cold thread resolution active</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Premature Damage Cost</span>
              <div className="text-xl font-mono font-black text-red-400 mt-1">₹31,600</div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Sidewall highway road cuts</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Scrap Value Recovered</span>
              <div className="text-xl font-mono font-black text-cyan-400 mt-1">₹3,400</div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Sold to recycling agency</span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC GRID TABLES */}
      {activeTab === 'tyre_inventory' && (
        <DataGridWrapper<any>
          title="Tyre Inventory Master"
          items={tyreInventory}
          searchKeys={['tyre_serial', 'brand']}
          templateHeaders={['Tyre Serial Number', 'Brand Manufacturer', 'Tyre Dimensions Size', 'Purchase Cost']}
          templateSampleRow={['TY-SER-99201', 'MRF Muscle', '10.00R20 HGV', '16500']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'tyre_serial', label: 'Tyre Serial Number' },
            { key: 'brand', label: 'Manufacturer Brand' },
            { key: 'size', label: 'Dimensions Size' },
            { key: 'cost', label: 'Cost Price (₹)' },
            { 
              key: 'status', 
              label: 'Inventory State',
              render: (t) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  t.status === 'IN_STOCK' ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  {t.status}
                </span>
              )
            }
          ]}
          onImport={(items) => setTyreInventory([...items, ...tyreInventory])}
        />
      )}

      {activeTab === 'tyre_assignment' && (
        <DataGridWrapper<any>
          title="Active Axle Tyre Assignments"
          items={tyreAssignments}
          searchKeys={['tyre_serial', 'vehicle_reg']}
          templateHeaders={['Tyre Serial', 'Vehicle Reg Placed', 'Axle Mounting Position', 'Initial Mount KM']}
          templateSampleRow={['TY-SER-99201', 'HR-55-AJ-9021', 'Front-Left steering', '120000']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'tyre_serial', label: 'Tyre Serial' },
            { key: 'vehicle_reg', label: 'Mounted Vehicle' },
            { key: 'position', label: 'Axle Mount Position' },
            { key: 'mount_date', label: 'Mount Date' },
            { key: 'current_km', label: 'Odometer at Mount' }
          ]}
          onImport={(items) => setTyreAssignments([...items, ...tyreAssignments])}
        />
      )}

      {activeTab === 'tyre_rotation' && (
        <DataGridWrapper<any>
          title="Tyre Wear Rotation Logs"
          items={tyreRotations}
          searchKeys={['vehicle_reg']}
          templateHeaders={['Vehicle', 'Rotation Date', 'Reason', 'From Position', 'To Position']}
          templateSampleRow={['HR-55-AJ-9021', '2026-06-20', 'Wear balance', 'Front-Left', 'Rear-Left outer']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Registration' },
            { key: 'date', label: 'Rotation Date' },
            { key: 'reason', label: 'Rotation Reason' },
            { key: 'from_pos', label: 'Original Position' },
            { key: 'to_pos', label: 'Rotated To Position' }
          ]}
          onImport={(items) => setTyreRotations([...items, ...tyreRotations])}
        />
      )}

      {activeTab === 'tyre_retreading' && (
        <DataGridWrapper<any>
          title="Tyre Retreading (Resole) logs"
          items={tyreRetreads}
          searchKeys={['tyre_serial', 'vendor']}
          templateHeaders={['Tyre Serial', 'Cold Retread Vendor', 'Retread Cost', 'Thread Status', 'Retread Date']}
          templateSampleRow={['TY-SER-99201', 'Guru Nanak Retreading', '3200', 'DONE_RESOLD_ONCE', '2026-06-15']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'tyre_serial', label: 'Tyre Serial' },
            { key: 'vendor', label: 'Retread Vendor' },
            { key: 'cost', label: 'Retread Cost (₹)' },
            { key: 'status', label: 'Retread Level' },
            { key: 'retread_date', label: 'Resolution Date' }
          ]}
          onImport={(items) => setTyreRetreads([...items, ...tyreRetreads])}
        />
      )}

      {activeTab === 'tyre_damage' && (
        <DataGridWrapper<any>
          title="Tyre Damage incident logs"
          items={tyreDamages}
          searchKeys={['tyre_serial', 'vehicle_reg']}
          templateHeaders={['Tyre Serial', 'Vehicle Reg', 'Incident Damage Type', 'Financial Cost Implication']}
          templateSampleRow={['TY-SER-99201', 'HR-55-AJ-9021', 'Sidewall road cut', '16500']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'tyre_serial', label: 'Tyre Serial' },
            { key: 'vehicle_reg', label: 'Vehicle Registration' },
            { key: 'damage_type', label: 'Damage Cause' },
            { key: 'cost_implication', label: 'Asset Loss (₹)' },
            { key: 'date', label: 'Incident Date' }
          ]}
          onImport={(items) => setTyreDamages([...items, ...tyreDamages])}
        />
      )}

      {activeTab === 'tyre_scrap' && (
        <DataGridWrapper<any>
          title="Tyre Scrap Register"
          items={tyreScraps}
          searchKeys={['tyre_serial']}
          templateHeaders={['Tyre Serial', 'Scrap Reason Description', 'Scrap Value Recovered Amount', 'Disposal Date']}
          templateSampleRow={['TY-SER-99201', 'Tread worn out safely past limit', '800', '2026-06-01']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'tyre_serial', label: 'Tyre Serial' },
            { key: 'scrap_reason', label: 'Disposal Reason' },
            { key: 'scrap_value_recovered', label: 'Recovery Scrap Value (₹)' },
            { key: 'scrap_date', label: 'Disposal Date' }
          ]}
          onImport={(items) => setTyreScraps([...items, ...tyreScraps])}
        />
      )}

      {/* DYNAMIC MODAL FOR TYRE LOG ENTRIES */}
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
              {editItem ? 'Edit Tyre Entry' : 'Log Tyre Event'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Tyre Serial Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TY-RADIAL-98210"
                  value={formFields.tyre_serial || ''}
                  onChange={(e) => setFormFields({ ...formFields, tyre_serial: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Registration / Brand / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR-55-AJ-9021 / MRF Muscle / Tread worn"
                  value={formFields.vehicle_reg || formFields.brand || formFields.scrap_reason || formFields.vendor || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === 'tyre_inventory') {
                      setFormFields({ ...formFields, brand: val });
                    } else if (activeTab === 'tyre_scrap') {
                      setFormFields({ ...formFields, scrap_reason: val });
                    } else if (activeTab === 'tyre_retreading') {
                      setFormFields({ ...formFields, vendor: val });
                    } else {
                      setFormFields({ ...formFields, vehicle_reg: val.toUpperCase() });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Tyre Size / Position *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.00R20 HGV"
                    value={formFields.size || formFields.position || formFields.damage_type || ''}
                    onChange={(e) => {
                      if (activeTab === 'tyre_inventory') {
                        setFormFields({ ...formFields, size: e.target.value });
                      } else if (activeTab === 'tyre_damage') {
                        setFormFields({ ...formFields, damage_type: e.target.value });
                      } else {
                        setFormFields({ ...formFields, position: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Cost / Recovery Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="15800"
                    value={formFields.cost || formFields.scrap_value_recovered || formFields.cost_implication || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (activeTab === 'tyre_scrap') {
                        setFormFields({ ...formFields, scrap_value_recovered: val });
                      } else if (activeTab === 'tyre_damage') {
                        setFormFields({ ...formFields, cost_implication: val });
                      } else {
                        setFormFields({ ...formFields, cost: val });
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
                {editItem ? 'Save Tyre Changes' : 'Log Tyre Node'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
