import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { Link, Copy, CheckCircle, MapPin, Truck, Clock, Share2, ExternalLink } from 'lucide-react';

export default function TrackingLinkModule() {
  const { trips } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const activeTrips = trips.filter(t => ['in_transit', 'loading', 'assigned', 'booked'].includes(t.status));
  const filteredTrips = activeTrips.filter(t =>
    t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    t.lr_number.toLowerCase().includes(search.toLowerCase())
  );

  const generateTrackingURL = (trip: typeof trips[0]) => {
    // In production this would be a real URL with encoded trip ID
    return `https://garudai.in/track/${trip.id.slice(-8)}`;
  };

  const copyLink = (tripId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(tripId);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareViaWhatsApp = (trip: typeof trips[0]) => {
    const url = generateTrackingURL(trip);
    const message = `📦 Shipment Tracking - ${trip.trip_number}\n\nFrom: ${trip.origin}\nTo: ${trip.destination}\nVehicle: ${trip.vehicle_reg}\nLR: ${trip.lr_number}\n\n🔗 Track live: ${url}\n\n— Garud Transport`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Tracking Links</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Share live tracking URLs with customers — no login required</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 border border-green-200">
          <Link className="w-4 h-4" /> {activeTrips.length} active trackable trips
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>How Tracking Links Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', label: 'Generate Link', desc: 'Click copy/share for any active trip' },
            { step: '2', label: 'Share with Customer', desc: 'Send via WhatsApp, SMS, or email' },
            { step: '3', label: 'Customer Opens', desc: 'No login needed — sees live status' },
            { step: '4', label: 'Real-time Updates', desc: 'Position, ETA, status auto-refresh' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{item.step}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by trip no, customer, or LR..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
      </div>

      {/* Active Trips with Tracking Links */}
      <div className="space-y-3">
        {filteredTrips.map(trip => {
          const trackingUrl = generateTrackingURL(trip);
          return (
            <div key={trip.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{trip.trip_number}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{trip.lr_number}</span>
                    <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium', trip.status === 'in_transit' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>{trip.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{trip.customer_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => shareViaWhatsApp(trip)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700" title="Share via WhatsApp">
                    <Share2 className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button onClick={() => copyLink(trip.id, trackingUrl)} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    {copied === trip.id ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === trip.id ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{trip.origin} → {trip.destination}</span>
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{trip.vehicle_reg}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />ETA: {trip.expected_delivery ? formatDate(trip.expected_delivery) : 'N/A'}</span>
              </div>
              {/* Tracking URL */}
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <code className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--accent)' }}>{trackingUrl}</code>
              </div>
            </div>
          );
        })}
        {filteredTrips.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-tertiary)' }}>No active trips to track</p>
          </div>
        )}
      </div>
    </div>
  );
}
