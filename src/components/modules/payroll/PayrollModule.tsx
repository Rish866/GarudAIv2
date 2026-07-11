import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, classNames } from '../../../lib/utils';
import { DollarSign, Users, CheckCircle, Clock, CreditCard } from 'lucide-react';

interface SalaryRecord {
  driver_id: string;
  driver_name: string;
  salary_type: 'monthly' | 'per_trip' | 'per_km';
  base_salary: number;
  trip_count: number;
  trip_allowance: number;
  total_km: number;
  advance_given: number;
  deductions: number;
  net_payable: number;
  status: 'pending' | 'paid';
}

export default function PayrollModule() {
  const { drivers, trips } = useStore();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = [2024, 2025, 2026];

  const computeSalaries = useMemo((): SalaryRecord[] => {
    return drivers.map((driver) => {
      const driverTrips = trips.filter((t) => {
        const tripDate = new Date(t.booking_date);
        return (
          t.driver_id === driver.id &&
          tripDate.getMonth() === selectedMonth &&
          tripDate.getFullYear() === selectedYear
        );
      });

      const tripCount = driverTrips.length;
      const totalKm = driverTrips.reduce((sum, t) => sum + t.distance_km, 0);

      let tripAllowance = 0;
      let basePay = 0;

      if (driver.salary_type === 'monthly') {
        basePay = driver.base_salary;
        tripAllowance = tripCount * 500;
      } else if (driver.salary_type === 'per_trip') {
        basePay = 0;
        tripAllowance = tripCount * driver.base_salary;
      } else {
        basePay = 0;
        tripAllowance = totalKm * driver.base_salary;
      }

      const advance = tripCount > 0 ? Math.round(tripCount * 1500) : 0;
      const deductions = Math.round(basePay * 0.05);
      const netPayable = basePay + tripAllowance - advance - deductions;

      return {
        driver_id: driver.id,
        driver_name: driver.name,
        salary_type: driver.salary_type,
        base_salary: driver.base_salary,
        trip_count: tripCount,
        trip_allowance: tripAllowance,
        total_km: totalKm,
        advance_given: advance,
        deductions,
        net_payable: Math.max(netPayable, 0),
        status: 'pending' as const,
      };
    });
  }, [drivers, trips, selectedMonth, selectedYear]);

  const [salaries, setSalaries] = useState<SalaryRecord[]>(computeSalaries);

  React.useEffect(() => {
    setSalaries(computeSalaries);
  }, [computeSalaries]);

  const totalPayable = salaries.reduce((sum, s) => sum + s.net_payable, 0);
  const totalPaid = salaries.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.net_payable, 0);
  const pendingAmount = totalPayable - totalPaid;

  const handlePayDriver = (driverId: string) => {
    setSalaries((prev) =>
      prev.map((s) => (s.driver_id === driverId ? { ...s, status: 'paid' as const } : s))
    );
  };

  const handleProcessAll = () => {
    setSalaries((prev) => prev.map((s) => ({ ...s, status: 'paid' as const })));
  };

  const getSalaryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      per_trip: 'Per Trip',
      per_km: 'Per KM',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
          <p className="text-slate-500 mt-1">Driver salary processing and tracking</p>
        </div>
        <button
          onClick={handleProcessAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Process All Salaries
        </button>
      </div>

      {/* Month/Year Selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Payable</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPayable)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Paid</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Base Salary</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Trips</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Trip Allowance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total KM</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Advance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Deductions</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Net Payable</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaries.map((s) => (
                <tr key={s.driver_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.driver_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{getSalaryTypeLabel(s.salary_type)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">
                    {s.salary_type === 'per_km' ? `₹${s.base_salary}/km` : formatCurrency(s.base_salary)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{s.trip_count}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatCurrency(s.trip_allowance)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{s.total_km.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatCurrency(s.advance_given)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">-{formatCurrency(s.deductions)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">{formatCurrency(s.net_payable)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', s.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.status === 'pending' && (
                      <button
                        onClick={() => handlePayDriver(s.driver_id)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
