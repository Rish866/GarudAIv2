import React, { useState } from 'react';
// Mobile App - config module
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { Smartphone, Download, Bell, MapPin, Camera, Shield, Settings, Users, CheckCircle, Clock, QrCode, Wifi } from 'lucide-react';

type AppView = 'overview' | 'drivers' | 'config' | 'activity';

interface DriverAppStatus {
  driver_id: string;
  driver_name: string;
  app_version: string;
  last_active: string;
  gps_enabled: boolean;
  notification_enabled: boolean;
  battery_level: number;
  os: 'android' | 'ios';
  status: 'online' | 'offline' | 'background';
}

interface AppActivity {
  id: string;
  driver_name: string;
  action: string;
  timestamp: string;
  details: string;
}


const seedDriverApps: DriverAppStatus[] = [];

const seedActivity: AppActivity[] = [];

export default function MobileAppModule() {
  const { drivers } = useStore();
  const [view, setView] = useState<AppView>('overview');
  const [appConfig, setAppConfig] = useState({
    gps_interval_seconds: 30,
    background_tracking: true,
    force_selfie_attendance: true,
    allow_offline_mode: true,
    max_speed_alert_kmh: 80,
    sos_enabled: true,
    pod_photo_required: true,
    auto_update_enabled: true,
  });

  const driverApps = [];
  const onlineCount = driverApps.filter(d => d.status === 'online').length;
  const offlineCount = driverApps.filter(d => d.status === 'offline').length;
  const gpsDisabled = driverApps.filter(d => !d.gps_enabled).length;
  const lowBattery = driverApps.filter(d => d.battery_level < 20 && d.battery_level > 0).length;


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mobile App Manager</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Driver app deployment, configuration & monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700">
          <Wifi className="w-4 h-4" /> {onlineCount} drivers online
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'overview', label: 'Overview', icon: Smartphone },
          { id: 'drivers', label: 'Driver Devices', icon: Users },
          { id: 'config', label: 'App Config', icon: Settings },
          { id: 'activity', label: 'App Activity', icon: Clock },
        ] as { id: AppView; label: string; icon: React.ComponentType<{className?: string; size?: number}> }[]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={classNames('flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium', view === t.id ? 'bg-blue-600 text-white' : '')} style={view !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {view === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Online Drivers</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{onlineCount}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Offline</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{offlineCount}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>GPS Disabled</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{gpsDisabled}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Low Battery</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{lowBattery}</p>
            </div>
          </div>

          {/* App Download Card */}
          <div className="rounded-2xl border p-6 flex flex-col md:flex-row items-center gap-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <QrCode className="w-24 h-24" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Garud AI Driver App</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Share this QR code with drivers to download the app. Available on Android & iOS.</p>
              <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> Google Play</button>
                <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> App Store</button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Current version: 2.4.1 | Min supported: 2.3.0</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: MapPin, label: 'Live GPS Tracking', desc: 'Auto-share location' },
              { icon: Camera, label: 'POD Upload', desc: 'Photo proof of delivery' },
              { icon: Bell, label: 'Push Notifications', desc: 'Trip alerts & updates' },
              { icon: Shield, label: 'SOS Button', desc: 'Emergency alert' },
            ].map((feat, i) => (
              <div key={i} className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <feat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{feat.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Driver Devices */}
      {view === 'drivers' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Driver</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Version</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>OS</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>GPS</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Notif</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Battery</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {driverApps.map(app => (
                <tr key={app.driver_id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{app.driver_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', app.status === 'online' ? 'bg-green-100 text-green-800' : app.status === 'background' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>{app.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{app.app_version}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{app.os === 'android' ? '🤖 Android' : '🍎 iOS'}</td>
                  <td className="px-4 py-3 text-center">{app.gps_enabled ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-red-500 text-xs">OFF</span>}</td>
                  <td className="px-4 py-3 text-center">{app.notification_enabled ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-red-500 text-xs">OFF</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={classNames('h-full rounded-full', app.battery_level > 50 ? 'bg-green-500' : app.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${app.battery_level}%` }} /></div>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.battery_level}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(app.last_active).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* App Config */}
      {view === 'config' && (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Driver App Configuration</h3>
          <div className="space-y-4">
            {[
              { key: 'gps_interval_seconds', label: 'GPS Update Interval', desc: 'How often location is shared (seconds)', type: 'number' },
              { key: 'max_speed_alert_kmh', label: 'Max Speed Alert (km/h)', desc: 'Alert when driver exceeds this speed', type: 'number' },
              { key: 'background_tracking', label: 'Background GPS Tracking', desc: 'Track even when app is in background', type: 'toggle' },
              { key: 'force_selfie_attendance', label: 'Selfie Attendance', desc: 'Require selfie for check-in/check-out', type: 'toggle' },
              { key: 'pod_photo_required', label: 'POD Photo Required', desc: 'Mandate photo upload for delivery confirmation', type: 'toggle' },
              { key: 'allow_offline_mode', label: 'Offline Mode', desc: 'Allow data entry without internet (syncs later)', type: 'toggle' },
              { key: 'sos_enabled', label: 'SOS Emergency Button', desc: 'Show panic button for emergencies', type: 'toggle' },
              { key: 'auto_update_enabled', label: 'Auto App Updates', desc: 'Force update to latest version', type: 'toggle' },
            ].map(cfg => (
              <div key={cfg.key} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cfg.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cfg.desc}</p>
                </div>
                {cfg.type === 'toggle' ? (
                  <button onClick={() => setAppConfig(c => ({ ...c, [cfg.key]: !(c as any)[cfg.key] }))} className={classNames('w-12 h-6 rounded-full relative transition-colors', (appConfig as any)[cfg.key] ? 'bg-blue-600' : 'bg-gray-300')}>
                    <div className={classNames('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow', (appConfig as any)[cfg.key] ? 'left-[26px]' : 'left-0.5')} />
                  </button>
                ) : (
                  <input type="number" value={(appConfig as any)[cfg.key]} onChange={(e) => setAppConfig(c => ({ ...c, [cfg.key]: Number(e.target.value) }))} className="w-20 px-2 py-1 border rounded text-sm text-center" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {view === 'activity' && (
        <div className="rounded-2xl border divide-y" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          {([]).map(act => (
            <div key={act.id} className="flex items-start gap-4 p-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Smartphone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{act.driver_name}</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{act.action.replace('_', ' ')}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{act.details}</p>
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{new Date(act.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
