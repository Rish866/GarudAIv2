import { Fuel, AlertTriangle, TrendingUp, Shield, Info, Search, DollarSign, BarChart3 } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, classNames } from '../../../lib/utils';

interface FuelAnomaly {
  id: string;
  vehicle_reg: string;
  description: string;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  label: string;
}

interface MileageRow {
  vehicle_reg: string;
  expected_mileage: number;
  actual_mileage: number;
  variance: number;
  status: 'normal' | 'low' | 'critical';
}

const simulatedAnomalies: FuelAnomaly[] = [
  {
    id: 'anom_001',
    vehicle_reg: 'MH-12-AB-1234',
    description: 'Sudden fuel drop of 15L detected',
    detail: 'Jul 08, 2:30 AM - GPS shows vehicle stationary at highway rest stop',
    severity: 'critical',
    timestamp: '2025-07-08T02:30:00Z',
    label: 'SUSPECTED THEFT',
  },
  {
    id: 'anom_002',
    vehicle_reg: 'GJ-05-GH-3456',
    description: 'Mileage dropped to 2.1 km/l (avg 4.2)',
    detail: 'Consistent low mileage over last 3 fuel fills',
    severity: 'warning',
    timestamp: '2025-07-07T14:00:00Z',
    label: 'UNDER INVESTIGATION',
  },
  {
    id: 'anom_003',
    vehicle_reg: 'MH-12-CD-5678',
    description: 'Fuel filling mismatch: Billed 120L, sensor shows 95L',
    detail: 'Discrepancy of 25L at Indian Oil, Pune-Mumbai Expressway',
    severity: 'critical',
    timestamp: '2025-07-06T18:45:00Z',
    label: 'PILFERAGE ALERT',
  },
  {
    id: 'anom_004',
    vehicle_reg: 'RJ-14-JK-7890',
    description: 'Fuel level inconsistency after maintenance',
    detail: 'Tank shows 20L less after returning from workshop',
    severity: 'warning',
    timestamp: '2025-07-05T09:00:00Z',
    label: 'REVIEW REQUIRED',
  },
];

const simulatedMileage: MileageRow[] = [
  { vehicle_reg: 'MH-12-AB-1234', expected_mileage: 4.2, actual_mileage: 4.0, variance: -4.8, status: 'normal' },
  { vehicle_reg: 'MH-12-CD-5678', expected_mileage: 3.8, actual_mileage: 3.5, variance: -7.9, status: 'low' },
  { vehicle_reg: 'GJ-05-GH-3456', expected_mileage: 4.2, actual_mileage: 2.1, variance: -50.0, status: 'critical' },
  { vehicle_reg: 'KA-01-LM-2345', expected_mileage: 4.5, actual_mileage: 4.3, variance: -4.4, status: 'normal' },
  { vehicle_reg: 'MH-14-EF-9012', expected_mileage: 4.0, actual_mileage: 3.2, variance: -20.0, status: 'low' },
  { vehicle_reg: 'MP-09-NP-6789', expected_mileage: 3.9, actual_mileage: 3.7, variance: -5.1, status: 'normal' },
];

function getSeverityBadgeStyle(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'info': return 'bg-blue-100 text-blue-800';
  }
}

function getStatusBadge(status: 'normal' | 'low' | 'critical') {
  switch (status) {
    case 'normal': return 'bg-green-100 text-green-800';
    case 'low': return 'bg-yellow-100 text-yellow-800';
    case 'critical': return 'bg-red-100 text-red-800';
  }
}

export default function FuelTheftModule() {
  const { fuelEntries, vehicles } = useStore();

  const totalFuelCost = fuelEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const avgMileage = fuelEntries.length > 0
    ? (fuelEntries.reduce((sum, e) => sum + (e.mileage || 0), 0) / fuelEntries.filter((e) => e.mileage).length).toFixed(1)
    : '0.0';
  const anomaliesDetected = 3;
  const estimatedSavings = 45000;

  const summaryCards = [
    { label: 'Total Fuel Cost', value: formatCurrency(totalFuelCost), icon: Fuel, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Mileage', value: `${avgMileage} km/l`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Anomalies Detected', value: anomaliesDetected.toString(), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Estimated Savings', value: formatCurrency(estimatedSavings), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fuel Monitoring & Theft Detection</h1>
        <p className="text-slate-500 mt-1">AI-powered fuel anomaly detection</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Connect fuel sensors for real-time monitoring.</p>
          <p className="text-sm text-blue-700 mt-1">Currently showing simulated analytics.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={classNames('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                <card.icon className={classNames('w-5 h-5', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Anomaly Alerts
          </div>
        </h2>
        <div className="space-y-4">
          {simulatedAnomalies.map((anomaly) => (
            <div key={anomaly.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={classNames(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    anomaly.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                  )}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{anomaly.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{anomaly.vehicle_reg} - {anomaly.detail}</p>
                  </div>
                </div>
                <span className={classNames(
                  'px-2 py-1 text-xs rounded-full font-bold whitespace-nowrap',
                  getSeverityBadgeStyle(anomaly.severity)
                )}>
                  {anomaly.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Mileage Comparison */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-500" />
            Vehicle Mileage Comparison
          </div>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 font-medium text-slate-600">Vehicle</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">Expected (km/l)</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">Actual (km/l)</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">Variance (%)</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {simulatedMileage.map((row) => (
                <tr key={row.vehicle_reg} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium text-slate-900">{row.vehicle_reg}</td>
                  <td className="py-3 px-2 text-slate-700">{row.expected_mileage}</td>
                  <td className="py-3 px-2 text-slate-700">{row.actual_mileage}</td>
                  <td className="py-3 px-2">
                    <span className={classNames(
                      'font-medium',
                      row.status === 'normal' ? 'text-green-600' : row.status === 'low' ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {row.variance}%
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={classNames('px-2 py-1 text-xs rounded-full font-medium', getStatusBadge(row.status))}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fuel Consumption Chart (Simple bar comparison) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            Fuel Consumption: Expected vs Actual
          </div>
        </h2>
        <div className="space-y-4">
          {simulatedMileage.map((row) => (
            <div key={row.vehicle_reg + '_chart'} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{row.vehicle_reg}</span>
                <span className="text-xs text-slate-500">
                  {row.actual_mileage} / {row.expected_mileage} km/l
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                  {/* Expected (background bar) */}
                  <div
                    className="absolute inset-0 h-full bg-blue-200 rounded-full"
                    style={{ width: '100%' }}
                  />
                  {/* Actual (foreground bar) */}
                  <div
                    className={classNames(
                      'absolute inset-0 h-full rounded-full',
                      row.status === 'normal' ? 'bg-green-500' : row.status === 'low' ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${(row.actual_mileage / row.expected_mileage) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-200 rounded-full inline-block" /> Expected
                </span>
                <span className="flex items-center gap-1">
                  <span className={classNames(
                    'w-2 h-2 rounded-full inline-block',
                    row.status === 'normal' ? 'bg-green-500' : row.status === 'low' ? 'bg-yellow-500' : 'bg-red-500'
                  )} /> Actual
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
