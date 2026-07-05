import React, { useState } from 'react';
import DataGridWrapper from './DataGridWrapper';
import { 
  Users, 
  UserCheck, 
  Settings, 
  DollarSign, 
  Briefcase, 
  Wallet, 
  Gift, 
  AlertOctagon, 
  FileText, 
  X,
  Plus
} from 'lucide-react';

export default function PayrollManager() {
  const [activeTab, setActiveTab] = useState<string>('salary_setup');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Operational payroll datasets
  const [staffAttendance, setStaffAttendance] = useState<any[]>([
    { id: 'sa-1', employee_name: 'Anjali Sharma', designation: 'Billing Accountant', date: '2026-07-04', status: 'PRESENT' },
    { id: 'sa-2', employee_name: 'Suresh Kumar', designation: 'Fleet Coordinator', date: '2026-07-04', status: 'PRESENT' }
  ]);
  const [driverAttendance, setDriverAttendance] = useState<any[]>([
    { id: 'da-1', driver_name: 'Karan Singh', license_no: 'DL-394201', date: '2026-07-04', status: 'ON_ROUTE_DUTY' },
    { id: 'da-2', driver_name: 'Prem Singh', license_no: 'DL-832103', date: '2026-07-04', status: 'STANDBY_OFFICE' }
  ]);
  const [salarySetup, setSalarySetup] = useState<any[]>([
    { id: 'ss-1', employee_name: 'Karan Singh', category: 'Heavy Commercial Driver', basic_salary: 18000, daily_allowance: 350, km_incentive_rate: 1.5 },
    { id: 'ss-2', employee_name: 'Anjali Sharma', category: 'Branch Office Staff', basic_salary: 24000, daily_allowance: 0, km_incentive_rate: 0 }
  ]);
  const [driverSalaries, setDriverSalaries] = useState<any[]>([
    { id: 'ds-1', driver_name: 'Karan Singh', month_year: 'June 2026', total_km_run: 4800, base_salary_earned: 18000, trip_allowances: 10500, deduction_advances: 4000, net_payable: 24500 }
  ]);
  const [staffSalaries, setStaffSalaries] = useState<any[]>([
    { id: 'sts-1', employee_name: 'Anjali Sharma', month_year: 'June 2026', present_days: 26, basic_salary: 24000, deductions: 500, net_payable: 23500 }
  ]);
  const [advances, setAdvances] = useState<any[]>([
    { id: 'adv-1', name: 'Karan Singh', type: 'Driver Festival Advance', amount: 4000, requested_date: '2026-06-10', status: 'RECOVERED_IN_SALARY' }
  ]);
  const [incentives, setIncentives] = useState<any[]>([
    { id: 'inc-1', name: 'Karan Singh', type: 'High Mileage Conservation Incentive', amount: 1500, approval_date: '2026-06-30', status: 'CREDITED' }
  ]);
  const [penalties, setPenalties] = useState<any[]>([
    { id: 'pen-1', name: 'Prem Singh', type: 'Speeding Violation Penalty', amount: 1000, incident_date: '2026-06-15', status: 'DEDUCTED' }
  ]);

  const payrollTabs = [
    { id: 'salary_setup', label: 'Salary Setup Structures', icon: Settings },
    { id: 'staff_attendance', label: 'Staff Attendance', icon: Users },
    { id: 'driver_attendance', label: 'Driver Attendance', icon: UserCheck },
    { id: 'driver_salary', label: 'Driver Salaries', icon: DollarSign },
    { id: 'staff_salary', label: 'Staff Salaries', icon: Briefcase },
    { id: 'advances', label: 'Advances Register', icon: Wallet },
    { id: 'incentives', label: 'Incentives & Rewards', icon: Gift },
    { id: 'penalties', label: 'Penalties & Fines', icon: AlertOctagon },
    { id: 'slips', label: 'Salary Pay Slip Center', icon: FileText }
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
    if (!confirm('Are you sure you want to delete this payroll node?')) return;
    
    switch (activeTab) {
      case 'salary_setup': setSalarySetup(salarySetup.filter(s => s.id !== item.id)); break;
      case 'staff_attendance': setStaffAttendance(staffAttendance.filter(s => s.id !== item.id)); break;
      case 'driver_attendance': setDriverAttendance(driverAttendance.filter(d => d.id !== item.id)); break;
      case 'driver_salary': setDriverSalaries(driverSalaries.filter(d => d.id !== item.id)); break;
      case 'staff_salary': setStaffSalaries(staffSalaries.filter(s => s.id !== item.id)); break;
      case 'advances': setAdvances(advances.filter(a => a.id !== item.id)); break;
      case 'incentives': setIncentives(incentives.filter(i => i.id !== item.id)); break;
      case 'penalties': setPenalties(penalties.filter(p => p.id !== item.id)); break;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'pay-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      switch (activeTab) {
        case 'salary_setup': setSalarySetup(salarySetup.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
        case 'staff_attendance': setStaffAttendance(staffAttendance.map(s => s.id === itemId ? { ...s, ...payload } : s)); break;
        case 'driver_attendance': setDriverAttendance(driverAttendance.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'driver_salary': setDriverSalaries(driverSalaries.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'staff_salary': setStaffSalaries(staffSalaries.map(s => s.id === itemId ? { ...s, ...payload } : s)); break;
        case 'advances': setAdvances(advances.map(a => a.id === itemId ? { ...a, ...payload } : a)); break;
        case 'incentives': setIncentives(incentives.map(i => i.id === itemId ? { ...i, ...payload } : i)); break;
        case 'penalties': setPenalties(penalties.map(p => p.id === itemId ? { ...p, ...payload } : p)); break;
      }
    } else {
      switch (activeTab) {
        case 'salary_setup': setSalarySetup([payload, ...salarySetup]); break;
        case 'staff_attendance': setStaffAttendance([payload, ...staffAttendance]); break;
        case 'driver_attendance': setDriverAttendance([payload, ...driverAttendance]); break;
        case 'driver_salary': setDriverSalaries([payload, ...driverSalaries]); break;
        case 'staff_salary': setStaffSalaries([payload, ...staffSalaries]); break;
        case 'advances': setAdvances([payload, ...advances]); break;
        case 'incentives': setIncentives([payload, ...incentives]); break;
        case 'penalties': setPenalties([payload, ...penalties]); break;
      }
    }

    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Sub tabs selector */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-850 font-sans">
        {payrollTabs.map(tab => {
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

      {/* SALARY PAY SLIP CENTER */}
      {activeTab === 'slips' && (
        <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-3">
            <div>
              <h3 className="text-base font-black text-white">Salary Pay Slip Print Center</h3>
              <p className="text-xs text-slate-500 font-mono">Consolidated monthly staff & driver vouchers</p>
            </div>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2.5 py-1 rounded">June 2026 Vouchers Cleared</span>
          </div>

          <div className="space-y-4 max-w-2xl">
            {[
              { name: 'Karan Singh', role: 'HCV Truck Driver', month: 'June 2026', amount: 24500 },
              { name: 'Anjali Sharma', role: 'Branch Office Accountant', month: 'June 2026', amount: 23500 }
            ].map((slip, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white">{slip.name}</h4>
                  <p className="text-[10px] text-slate-400">{slip.role} | {slip.month}</p>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold mt-1">Voucher Net payable: ₹{slip.amount.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head><title>Pay Slip - ${slip.name}</title></head>
                        <body style="font-family: Arial; padding: 40px; color: #333;">
                          <h2 style="border-bottom: 2px solid #0891b2; padding-bottom: 10px;">GARUD AI TRANSPORT ERP - PAYSLIP</h2>
                          <p><strong>Employee:</strong> ${slip.name} (${slip.role})</p>
                          <p><strong>Payroll Cycle:</strong> ${slip.month}</p>
                          <hr/>
                          <h3>Earnings Structure:</h3>
                          <p>Basic Salary: Rs. 18,000</p>
                          <p>Allowances / Incentives: Rs. 10,500</p>
                          <h3>Deductions:</h3>
                          <p>Advances / Fine Recoveries: Rs. 4,000</p>
                          <hr/>
                          <h2>Net Salary Payable: Rs. ${slip.amount.toLocaleString()}</h2>
                          <p style="margin-top: 50px; font-size: 11px; color: #777;">This is an AI generated computerized pay slip certificate. No signatures required.</p>
                          <script>window.onload = function() { window.print(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Generate & Print Slip
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC GRID TABLES */}
      {activeTab === 'salary_setup' && (
        <DataGridWrapper<any>
          title="Salary Structures Setup"
          items={salarySetup}
          searchKeys={['employee_name', 'category']}
          templateHeaders={['Employee Name', 'Staff Category Classification', 'Basic Salary base', 'Daily Food Allowance', 'KM incentive rate']}
          templateSampleRow={['Gopal Sharma', 'Driver Heavy Axle', '18000', '350', '1.5']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'employee_name', label: 'Employee Entity' },
            { key: 'category', label: 'Staff Category' },
            { key: 'basic_salary', label: 'Basic Salary (₹)' },
            { key: 'daily_allowance', label: 'Daily Allowance (₹)' },
            { key: 'km_incentive_rate', label: 'KM Incentive Rate (₹)' }
          ]}
          onImport={(items) => setSalarySetup([...items, ...salarySetup])}
        />
      )}

      {activeTab === 'staff_attendance' && (
        <DataGridWrapper<any>
          title="Branch Staff Attendance logs"
          items={staffAttendance}
          searchKeys={['employee_name', 'designation']}
          templateHeaders={['Employee Name', 'Designation role', 'Attendance Date', 'Status']}
          templateSampleRow={['Anjali Sharma', 'Accountant', '2026-07-04', 'PRESENT']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'employee_name', label: 'Employee Name' },
            { key: 'designation', label: 'Designation Role' },
            { key: 'date', label: 'Date Logged' },
            { key: 'status', label: 'Attendance status' }
          ]}
          onImport={(items) => setStaffAttendance([...items, ...staffAttendance])}
        />
      )}

      {activeTab === 'driver_attendance' && (
        <DataGridWrapper<any>
          title="Heavy Truck Driver Attendance logs"
          items={driverAttendance}
          searchKeys={['driver_name']}
          templateHeaders={['Driver Name', 'License Number', 'Attendance Date', 'Status']}
          templateSampleRow={['Karan Singh', 'DL-394201', '2026-07-04', 'ON_ROUTE_DUTY']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'driver_name', label: 'Driver Name' },
            { key: 'license_no', label: 'License Code' },
            { key: 'date', label: 'Date Logged' },
            { key: 'status', label: 'Duty State' }
          ]}
          onImport={(items) => setDriverAttendance([...items, ...driverAttendance])}
        />
      )}

      {activeTab === 'driver_salary' && (
        <DataGridWrapper<any>
          title="Heavy Truck Driver Salaries"
          items={driverSalaries}
          searchKeys={['driver_name']}
          templateHeaders={['Driver Name', 'Month Year', 'Total KM Run', 'Base Salary', 'Allowances', 'Deduction Advances', 'Net Payable']}
          templateSampleRow={['Karan Singh', 'June 2026', '4800', '18000', '10500', '4000', '24500']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'driver_name', label: 'Driver Name' },
            { key: 'month_year', label: 'Cycle Month' },
            { key: 'total_km_run', label: 'Total KM Run' },
            { key: 'base_salary_earned', label: 'Base Salary (₹)' },
            { key: 'trip_allowances', label: 'Trip Allowances (₹)' },
            { key: 'deduction_advances', label: 'Deductions (₹)' },
            { key: 'net_payable', label: 'Net Salary Paid (₹)' }
          ]}
          onImport={(items) => setDriverSalaries([...items, ...driverSalaries])}
        />
      )}

      {activeTab === 'staff_salary' && (
        <DataGridWrapper<any>
          title="Branch Staff Salaries Ledger"
          items={staffSalaries}
          searchKeys={['employee_name']}
          templateHeaders={['Employee Name', 'Month Year', 'Present Days', 'Basic Salary', 'Deductions', 'Net Payable']}
          templateSampleRow={['Anjali Sharma', 'June 2026', '26', '24000', '500', '23500']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'employee_name', label: 'Employee Name' },
            { key: 'month_year', label: 'Cycle Month' },
            { key: 'present_days', label: 'Present Days' },
            { key: 'basic_salary', label: 'Basic Salary (₹)' },
            { key: 'deductions', label: 'Deductions (₹)' },
            { key: 'net_payable', label: 'Net Payable (₹)' }
          ]}
          onImport={(items) => setStaffSalaries([...items, ...staffSalaries])}
        />
      )}

      {activeTab === 'advances' && (
        <DataGridWrapper<any>
          title="Employee Salary Advances Register"
          items={advances}
          searchKeys={['name']}
          templateHeaders={['Employee Name', 'Advance Category Type', 'Cash Amount', 'Requested Date']}
          templateSampleRow={['Karan Singh', 'Festival Advance', '4000', '2026-06-10']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'name', label: 'Employee Name' },
            { key: 'type', label: 'Advance Category' },
            { key: 'amount', label: 'Advance Cash (₹)' },
            { key: 'requested_date', label: 'Issued Date' },
            { key: 'status', label: 'Recovery Status' }
          ]}
          onImport={(items) => setAdvances([...items, ...advances])}
        />
      )}

      {activeTab === 'incentives' && (
        <DataGridWrapper<any>
          title="Bonus incentives & rewards register"
          items={incentives}
          searchKeys={['name']}
          templateHeaders={['Employee Name', 'Incentive Reason', 'Reward Amount', 'Approval Date']}
          templateSampleRow={['Karan Singh', 'Safety bonus', '1500', '2026-06-30']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'name', label: 'Employee Name' },
            { key: 'type', label: 'Incentive Category' },
            { key: 'amount', label: 'Incentive (₹)' },
            { key: 'approval_date', label: 'Approval Date' },
            { key: 'status', label: 'Credit status' }
          ]}
          onImport={(items) => setIncentives([...items, ...incentives])}
        />
      )}

      {activeTab === 'penalties' && (
        <DataGridWrapper<any>
          title="Salary deductions & penalties ledger"
          items={penalties}
          searchKeys={['name']}
          templateHeaders={['Employee Name', 'Penalty Infraction Reason', 'Deduction Penalty Amount', 'Incident Date']}
          templateSampleRow={['Prem Singh', 'Delayed report penalty', '1000', '2026-06-15']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'name', label: 'Employee Name' },
            { key: 'type', label: 'Deduction Category' },
            { key: 'amount', label: 'Penalty Fine (₹)' },
            { key: 'incident_date', label: 'Incident Date' },
            { key: 'status', label: 'Deduction status' }
          ]}
          onImport={(items) => setPenalties([...items, ...penalties])}
        />
      )}

      {/* DYNAMIC MODAL FOR DATA ENTRY */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowAddEditModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <Plus className="w-4.5 h-4.5 text-cyan-400" />
              {editItem ? 'Edit Payroll Node' : 'Record Payroll Transaction'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Employee / Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karan Singh"
                  value={formFields.employee_name || formFields.driver_name || formFields.name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === 'driver_salary' || activeTab === 'driver_attendance') {
                      setFormFields({ ...formFields, driver_name: val });
                    } else if (activeTab === 'salary_setup' || activeTab === 'staff_salary' || activeTab === 'staff_attendance') {
                      setFormFields({ ...formFields, employee_name: val });
                    } else {
                      setFormFields({ ...formFields, name: val });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Deduction / Designation / Category / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Driver / Accountant / Festival advance"
                  value={formFields.category || formFields.designation || formFields.type || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === 'salary_setup') {
                      setFormFields({ ...formFields, category: val });
                    } else if (activeTab === 'staff_attendance') {
                      setFormFields({ ...formFields, designation: val });
                    } else {
                      setFormFields({ ...formFields, type: val });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Basic Salary / Daily Attendance *</label>
                  <input
                    type="number"
                    required
                    placeholder="18000"
                    value={formFields.basic_salary || formFields.present_days || formFields.total_km_run || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (activeTab === 'staff_salary') {
                        setFormFields({ ...formFields, present_days: val });
                      } else if (activeTab === 'driver_salary') {
                        setFormFields({ ...formFields, total_km_run: val });
                      } else {
                        setFormFields({ ...formFields, basic_salary: val });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Pay Voucher Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="24500"
                    value={formFields.amount || formFields.net_payable || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (activeTab === 'driver_salary' || activeTab === 'staff_salary') {
                        setFormFields({ ...formFields, net_payable: val });
                      } else {
                        setFormFields({ ...formFields, amount: val });
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
                {editItem ? 'Save Payroll changes' : 'Record Payroll Node'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
