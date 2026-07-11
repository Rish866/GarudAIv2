import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Users, Eye, Package, Receipt, MapPin, Search, Download, Truck, Clock, CheckCircle, AlertTriangle, Globe } from 'lucide-react';

type PortalView = 'overview' | 'tracking' | 'invoices' | 'pod' | 'bookings';

export default function CustomerPortalModule() {
  const { data: customers } = useModuleData<any>('customers');
  const { data: trips } = useModuleData<any>('trips');
  const { data: invoices } = useModuleData<any>('invoices');
  const { data: payments } = useModuleData<any>('payments');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [activeView, setActiveView] = useState<PortalView>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const customer = customers.find(c => c.id === selectedCustomer);

  // Customer-specific data
  const customerTrips = useMemo(() =>
    selectedCustomer ? trips.filter(t => t.customer_id === selectedCustomer) : [],
    [selectedCustomer, trips]
  );
  const customerInvoices = useMemo(() =>
    selectedCustomer ? invoices.filter(i => i.customer_id === selectedCustomer) : [],
    [selectedCustomer, invoices]
  );
  const customerPayments = useMemo(() =>
    selectedCustomer ? payments.filter(p => p.customer_id === selectedCustomer) : [],
    [selectedCustomer, payments]
  );


  const activeTrips = customerTrips.filter(t => ['in_transit', 'loading', 'assigned', 'booked'].includes(t.status)).length;
  const deliveredTrips = customerTrips.filter(t => ['completed', 'billed', 'settled'].includes(t.status)).length;
  const totalOutstanding = customerInvoices.reduce((s, i) => s + i.balance_amount, 0);
  const totalBusiness = customerInvoices.reduce((s, i) => s + i.total_amount, 0);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTripStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      booked: 'bg-blue-100 text-blue-800',
      assigned: 'bg-indigo-100 text-indigo-800',
      loading: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      reached: 'bg-teal-100 text-teal-800',
      completed: 'bg-green-100 text-green-800',
      billed: 'bg-emerald-100 text-emerald-800',
      settled: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Customer not selected — show selection panel
  if (!selectedCustomer) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Self-service portal — select a customer to view their shipment tracking, invoices & PODs</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Portal Access Configuration</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            When deployed, each customer gets a unique login URL. They can track shipments, download invoices & PODs without calling your office. Select a customer below to preview their portal view.
          </p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c.id)} className="text-left p-4 rounded-xl border transition-all hover:shadow-md" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{c.contact_person} • {c.phone}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent)' }}>Outstanding: {formatCurrency(c.outstanding)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // Customer portal view
  return (
    <div className="p-6 space-y-6">
      {/* Portal Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedCustomer('')} className="text-sm underline" style={{ color: 'var(--accent)' }}>← Back</button>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Portal: {customer?.name}</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Customer self-service view • {customer?.contact_person}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Portal Active
        </div>
      </div>

      {/* Portal Nav Tabs */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
        {([
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'tracking', label: 'Live Tracking', icon: MapPin },
          { id: 'invoices', label: 'Invoices', icon: Receipt },
          { id: 'pod', label: 'POD Downloads', icon: Package },
          { id: 'bookings', label: 'Booking Requests', icon: Truck },
        ] as { id: PortalView; label: string; icon: React.ComponentType<{className?: string; size?: number}> }[]).map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id)} className={classNames('flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors', activeView === tab.id ? 'bg-blue-600 text-white' : '')} style={activeView !== tab.id ? { color: 'var(--text-secondary)' } : undefined}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active Shipments</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{activeTrips}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Delivered</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{deliveredTrips}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Business</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBusiness)}</p>
            </div>
          </div>
          {/* Recent Trips */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Shipments</h3>
            <div className="space-y-3">
              {customerTrips.slice(0, 5).map(trip => (
                <div key={trip.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{trip.trip_number} • {trip.lr_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{trip.origin} → {trip.destination}</p>
                  </div>
                  <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', getTripStatusBadge(trip.status))}>{trip.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Live Tracking */}
      {activeView === 'tracking' && (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Active Shipments — Live Status</h3>
          {customerTrips.filter(t => ['in_transit', 'loading', 'assigned', 'booked'].includes(t.status)).length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active shipments in transit</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customerTrips.filter(t => ['in_transit', 'loading', 'assigned', 'booked'].includes(t.status)).map(trip => (
                <div key={trip.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{trip.trip_number}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Vehicle: {trip.vehicle_reg} • Driver: {trip.driver_name}</p>
                    </div>
                    <span className={classNames('px-3 py-1 rounded-full text-xs font-medium', getTripStatusBadge(trip.status))}>{trip.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow" />
                    </div>
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  </div>
                  <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{trip.origin}</span>
                    <span>{trip.distance_km} km</span>
                    <span>{trip.destination}</span>
                  </div>
                  {trip.expected_delivery && (
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Clock className="w-3 h-3" />
                      ETA: {formatDate(trip.expected_delivery)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeView === 'invoices' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Amount</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customerInvoices.map(inv => (
                <tr key={inv.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{formatCurrency(inv.balance_amount)}</td>
                  <td className="px-4 py-3"><span className={classNames('px-2 py-1 rounded-full text-xs font-medium', inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>{inv.status}</span></td>
                  <td className="px-4 py-3"><button className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}><Download className="w-3 h-3" /> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* POD Downloads */}
      {activeView === 'pod' && (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Proof of Delivery — Downloads</h3>
          <div className="space-y-3">
            {customerTrips.filter(t => ['completed', 'billed', 'settled'].includes(t.status)).map(trip => (
              <div key={trip.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{trip.trip_number} • {trip.lr_number}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{trip.origin} → {trip.destination} • Delivered {trip.actual_delivery ? formatDate(trip.actual_delivery) : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {trip.pod_url ? (
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                      <Download className="w-3 h-3" /> Download POD
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium">
                      <Clock className="w-3 h-3" /> POD Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
            {customerTrips.filter(t => ['completed', 'billed', 'settled'].includes(t.status)).length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No delivered shipments yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Requests */}
      {activeView === 'bookings' && (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Booking Request Form</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Customers can submit transport requests that appear as new enquiries in your system.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Pickup Location</label>
              <input type="text" placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Delivery Location</label>
              <input type="text" placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Material Type</label>
              <input type="text" placeholder="e.g., Cement Bags" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Weight (Tons)</label>
              <input type="number" placeholder="25" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Preferred Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vehicle Type</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option>Truck</option><option>Trailer</option><option>Container</option><option>Tanker</option><option>Tipper</option><option>Reefer</option><option>LCV</option><option>Open Body</option><option>Flatbed</option><option>Bulker</option><option>Car Carrier</option><option>Half Body</option><option>Full Body</option><option>Mini Truck</option>
              </select>
            </div>
          </div>
          <button className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Submit Booking Request</button>
        </div>
      )}
    </div>
  );
}
