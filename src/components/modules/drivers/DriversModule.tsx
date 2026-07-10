import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { useBranchData } from '../../../hooks/useBranchData';
import type { Driver } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, getDaysUntil, classNames } from '../../../lib/utils';
import { exportDrivers } from '../../../lib/excel';
import { Plus, Search, Phone, Shield, MapPin, Calendar, X, AlertTriangle, TrendingUp, Clock, Award, Fuel, ChevronRight, BarChart3, Star } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

type DriverView = 'list' | 'performance' | 'detail';

export default function DriversModule() {
  const { addDriver, trips } = useStore();
  const { drivers } = useBranchData();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [view, setView] = useState<DriverView>('list');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Performance calculations
  const driverPerformance = useMemo(() => {
    return drivers.map(driver => {
      const driverTrips = trips.filter(t => t.driver_id === driver.id);
      const completedTrips = driverTrips.filter(t => ['completed', 'billed', 'settled'].includes(t.status));
      const totalTripsCount = driverTrips.length;
      
      // On-time calculation
      const onTimeTrips = completedTrips.filter(t => {
        if (!t.expected_delivery || !t.actual_delivery) return true; // No data = assume on time
        return new Date(t.actual_delivery) <= new Date(t.expected_delivery);
      });
      const onTimePercent = completedTrips.length > 0 ? Math.round((onTimeTrips.length / completedTrips.length) * 100) : 100;

      // Delay analysis
      const delayedTrips = completedTrips.filter(t => {
        if (!t.expected_delivery || !t.actual_delivery) return false;
        return new Date(t.actual_delivery) > new Date(t.expected_delivery);
      });
      const avgDelayHours = delayedTrips.length > 0 ? Math.round(
        delayedTrips.reduce((sum, t) => {
          const delay = (new Date(t.actual_delivery!).getTime() - new Date(t.expected_delivery!).getTime()) / (1000 * 60 * 60);
          return sum + delay;
        }, 0) / delayedTrips.length
      ) : 0;

      // Revenue generated
      const revenueGenerated = driverTrips.reduce((sum, t) => sum + t.freight_amount, 0);
      
      // KM efficiency (freight per km)
      const totalKm = driverTrips.reduce((sum, t) => sum + t.distance_km, 0);
      const revenuePerKm = totalKm > 0 ? Math.round(revenueGenerated / totalKm) : 0;

      // Overall score (weighted)
      const punctualityScore = onTimePercent;
      const safetyScore = driver.safety_score;
      const experienceScore = Math.min(100, Math.round((driver.total_trips / 300) * 100));
      const overallScore = Math.round(punctualityScore * 0.4 + safetyScore * 0.4 + experienceScore * 0.2);

      // Rating (1-5 stars)
      const rating = overallScore >= 90 ? 5 : overallScore >= 75 ? 4 : overallScore >= 60 ? 3 : overallScore >= 40 ? 2 : 1;

      return {
        ...driver,
        totalTripsCount,
        completedTripsCount: completedTrips.length,
        onTimePercent,
        delayedCount: delayedTrips.length,
        avgDelayHours,
        revenueGenerated,
        totalKmDriven: totalKm,
        revenuePerKm,
        punctualityScore,
        safetyScore,
        experienceScore,
        overallScore,
        rating,
        activeTrip: driverTrips.find(t => ['in_transit', 'loading', 'assigned'].includes(t.status)),
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [drivers, trips]);

  const filteredDrivers = driverPerformance.filter((driver) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      driver.name.toLowerCase().includes(query) ||
      driver.phone.toLowerCase().includes(query)
    );
  });

  const openDriverDetail = (driver: Driver) => {
    setSelectedDriver(driver);
    setView('detail');
  };

  // Top performers
  const topPerformers = driverPerformance.slice(0, 3);
  const avgOnTime = driverPerformance.length > 0 ? Math.round(driverPerformance.reduce((s, d) => s + d.onTimePercent, 0) / driverPerformance.length) : 0;
  const avgSafety = driverPerformance.length > 0 ? Math.round(driverPerformance.reduce((s, d) => s + d.safetyScore, 0) / driverPerformance.length) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Driver Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{drivers.length} drivers • Performance tracking & analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="px-3 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Bulk Upload</button>
          <button onClick={() => exportDrivers(drivers)} className="px-3 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Export</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add Driver
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'list', label: 'All Drivers' },
          { id: 'performance', label: 'Performance & Ranking' },
        ] as { id: DriverView; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium', view === t.id ? 'bg-blue-600 text-white' : '')} style={view !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PERFORMANCE VIEW */}
      {view === 'performance' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-green-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Avg On-Time %</p></div>
              <p className="text-2xl font-bold mt-1 text-green-600">{avgOnTime}%</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Avg Safety Score</p></div>
              <p className="text-2xl font-bold mt-1 text-blue-600">{avgSafety}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p></div>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(driverPerformance.reduce((s, d) => s + d.revenueGenerated, 0))}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Top Performer</p></div>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{topPerformers[0]?.name || '-'}</p>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Driver Performance Ranking</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Score = Punctuality (40%) + Safety (40%) + Experience (20%)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Driver</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Rating</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Score</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>On-Time</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Safety</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Delays</th>
                    <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>₹/KM</th>
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((dp, idx) => (
                    <tr key={dp.id} className="border-t cursor-pointer hover:opacity-80" style={{ borderColor: 'var(--border-color)' }} onClick={() => openDriverDetail(dp)}>
                      <td className="px-3 py-3 text-center">
                        {idx === 0 ? <span className="text-lg">🥇</span> : idx === 1 ? <span className="text-lg">🥈</span> : idx === 2 ? <span className="text-lg">🥉</span> : <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{dp.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{dp.assigned_vehicle_reg || 'Unassigned'}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          {[1,2,3,4,5].map(s => <Star key={s} className={classNames('w-3.5 h-3.5', s <= dp.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={classNames('px-2 py-1 rounded-full text-xs font-bold', dp.overallScore >= 80 ? 'bg-green-100 text-green-800' : dp.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>{dp.overallScore}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={classNames('text-sm font-medium', dp.onTimePercent >= 90 ? 'text-green-600' : dp.onTimePercent >= 70 ? 'text-yellow-600' : 'text-red-600')}>{dp.onTimePercent}%</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{dp.safetyScore}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={classNames('text-sm', dp.delayedCount > 0 ? 'text-red-600 font-medium' : 'text-green-600')}>{dp.delayedCount}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{dp.completedTripsCount}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(dp.revenueGenerated)}</td>
                      <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--accent)' }}>₹{dp.revenuePerKm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedDriver && (() => {
        const dp = driverPerformance.find(d => d.id === selectedDriver.id);
        if (!dp) return null;
        const driverTrips = trips.filter(t => t.driver_id === dp.id);
        return (
          <div className="space-y-6">
            <button onClick={() => setView('performance')} className="text-sm underline" style={{ color: 'var(--accent)' }}>← Back to list</button>
            
            {/* Driver Header */}
            <div className="rounded-2xl border p-6 flex flex-col md:flex-row gap-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                {dp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{dp.name}</h2>
                  <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(dp.status))}>{dp.status.replace(/_/g, ' ')}</span>
                  <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={classNames('w-4 h-4', s <= dp.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />)}</div>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{dp.phone} • {dp.assigned_vehicle_reg || 'No vehicle assigned'} • Joined {formatDate(dp.date_of_joining)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: dp.overallScore >= 80 ? '#16a34a' : dp.overallScore >= 60 ? '#ca8a04' : '#dc2626' }}>{dp.overallScore}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Overall Score</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Punctuality', score: dp.punctualityScore, icon: Clock, color: 'text-green-600', desc: `${dp.onTimePercent}% on-time delivery` },
                { label: 'Safety', score: dp.safetyScore, icon: Shield, color: 'text-blue-600', desc: 'No major incidents' },
                { label: 'Experience', score: dp.experienceScore, icon: Award, color: 'text-purple-600', desc: `${dp.total_trips} lifetime trips` },
                { label: 'Revenue/KM', score: Math.min(100, dp.revenuePerKm), icon: TrendingUp, color: 'text-orange-600', desc: `₹${dp.revenuePerKm}/km efficiency` },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className={classNames('w-4 h-4', item.color)} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
                    </div>
                    <span className={classNames('text-lg font-bold', item.color)}>{item.score}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className={classNames('h-full rounded-full', item.score >= 80 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${item.score}%` }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Trip History */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Trip History ({driverTrips.length} trips)</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {driverTrips.slice(0, 10).map(trip => (
                  <div key={trip.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{trip.trip_number} • {trip.lr_number}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{trip.origin} → {trip.destination} • {trip.distance_km} km</p>
                    </div>
                    <div className="text-right">
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(trip.status))}>{trip.status.replace('_', ' ')}</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(trip.freight_amount)}</p>
                    </div>
                  </div>
                ))}
                {driverTrips.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>No trips assigned yet</p>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>

          {/* Driver Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} onClick={() => openDriverDetail(driver)} className="cursor-pointer">
                <DriverCard driver={driver} onTimePercent={driver.onTimePercent} overallScore={driver.overallScore} rating={driver.rating} />
              </div>
            ))}
          </div>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>No drivers found matching your search.</div>
          )}
        </>
      )}

      {showBulkUpload && (
        <BulkUpload
          title="Bulk Upload Drivers"
          description="Import drivers from a CSV file"
          sampleFields={['name', 'phone', 'license_number', 'license_expiry', 'address', 'emergency_contact', 'emergency_phone', 'salary_type', 'base_salary', 'date_of_joining']}
          onUpload={(data) => {
            data.forEach(row => {
              addDriver({
                id: generateId(),
                company_id: 'comp_garud_001',
                name: row.name || '',
                phone: row.phone || '',
                license_number: row.license_number || '',
                license_expiry: row.license_expiry || '',
                address: row.address || '',
                emergency_contact: row.emergency_contact || '',
                emergency_phone: row.emergency_phone || '',
                salary_type: (row.salary_type as any) || 'monthly',
                base_salary: Number(row.base_salary) || 0,
                date_of_joining: row.date_of_joining || new Date().toISOString().split('T')[0],
                status: 'available',
                safety_score: 85,
                total_trips: 0,
                total_km: 0,
                created_at: new Date().toISOString(),
              });
            });
          }}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      {/* Add Driver Modal */}
      {showModal && <AddDriverModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function DriverCard({ driver, onTimePercent, overallScore, rating }: { key?: string; driver: Driver; onTimePercent: number; overallScore: number; rating: number }) {
  const licenseExpDays = getDaysUntil(driver.license_expiry);
  const isLicenseExpiring = licenseExpDays <= 30;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatKm = (km: number) => {
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
    return km.toString();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      {/* Top: Avatar + Name + Status */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {getInitials(driver.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">{driver.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Phone size={12} className="text-slate-400" />
            <span className="text-sm text-slate-500">{driver.phone}</span>
          </div>
        </div>
        <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', getStatusColor(driver.status))}>
          {driver.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Assigned Vehicle */}
      {driver.assigned_vehicle_reg && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-lg">
          <MapPin size={14} className="text-blue-500" />
          <span className="text-sm text-slate-700 font-medium">{driver.assigned_vehicle_reg}</span>
        </div>
      )}

      {/* License */}
      <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs text-slate-600">{driver.license_number}</span>
        </div>
        <span className={classNames('text-xs font-medium', isLicenseExpiring ? 'text-red-600' : 'text-slate-500')}>
          {isLicenseExpiring && <AlertTriangle size={12} className="inline mr-1" />}
          Exp: {formatDate(driver.license_expiry)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Shield size={12} className="text-green-500" />
            <span className="text-sm font-bold text-slate-900">{driver.safety_score}</span>
          </div>
          <span className="text-xs text-slate-400">Safety</span>
        </div>
        <div className="text-center">
          <span className="text-sm font-bold text-slate-900">{driver.total_trips}</span>
          <br />
          <span className="text-xs text-slate-400">Trips</span>
        </div>
        <div className="text-center">
          <span className="text-sm font-bold text-slate-900">{formatKm(driver.total_km)}</span>
          <br />
          <span className="text-xs text-slate-400">KM</span>
        </div>
      </div>

      {/* Salary + Performance */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => <Star key={s} className={classNames('w-3 h-3', s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />)}
        </div>
        <span className={classNames('text-xs font-bold px-2 py-0.5 rounded-full', overallScore >= 80 ? 'bg-green-100 text-green-800' : overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>
          Score: {overallScore}
        </span>
      </div>
    </div>
  );
}

function AddDriverModal({ onClose }: { onClose: () => void }) {
  const { addDriver } = useStore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    salary_type: 'monthly' as 'monthly' | 'per_trip' | 'per_km',
    base_salary: '',
    date_of_joining: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const driver: Driver = {
      id: generateId(),
      company_id: 'comp_garud_001',
      name: form.name,
      phone: form.phone,
      license_number: form.license_number,
      license_expiry: form.license_expiry,
      address: form.address,
      emergency_contact: form.emergency_contact,
      emergency_phone: form.emergency_phone,
      salary_type: form.salary_type,
      base_salary: Number(form.base_salary) || 0,
      date_of_joining: form.date_of_joining,
      status: 'available',
      safety_score: 85,
      total_trips: 0,
      total_km: 0,
      created_at: new Date().toISOString(),
    };

    addDriver(driver);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Add Driver</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
              <input type="text" name="license_number" value={form.license_number} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Expiry</label>
              <input type="date" name="license_expiry" value={form.license_expiry} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input type="text" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
              <input type="text" name="emergency_phone" value={form.emergency_phone} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary Type</label>
              <select name="salary_type" value={form.salary_type} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="monthly">Monthly</option>
                <option value="per_trip">Per Trip</option>
                <option value="per_km">Per KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary</label>
              <input type="number" name="base_salary" value={form.base_salary} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Joining</label>
            <input type="date" name="date_of_joining" value={form.date_of_joining} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
