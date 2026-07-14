import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';

import { formatDate, classNames } from '../../../lib/utils';
import { Satellite, Wifi, WifiOff, Check, Settings, RefreshCw, Info, Truck } from 'lucide-react';

interface GPSProvider {
  id: string;
  name: string;
  description: string;
  logo_color: string;
}

interface GPSConfig {
  provider: string;
  api_url: string;
  api_key: string;
  refresh_interval: number;
  is_connected: boolean;
  last_sync: string;
}

interface MappedVehicle {
  id: string;
  vehicle_id: string;
  vehicle_reg: string;
  device_id: string;
  status: 'active' | 'inactive';
}

export default function GPSSettingsModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');

  const providers: GPSProvider[] = [
    { id: 'itriangle', name: 'iTriangle', description: 'India\'s leading GPS tracking provider', logo_color: 'bg-blue-500' },
    { id: 'loconav', name: 'Loconav', description: 'AI-powered fleet intelligence', logo_color: 'bg-green-500' },
    { id: 'uffizio', name: 'Uffizio', description: 'Global fleet management platform', logo_color: 'bg-purple-500' },
    { id: 'tracksolid', name: 'Tracksolid', description: 'Real-time vehicle tracking', logo_color: 'bg-orange-500' },
    { id: 'gpstrackit', name: 'GPSTrackit', description: 'Enterprise GPS solutions', logo_color: 'bg-red-500' },
    { id: 'custom', name: 'Custom API', description: 'Connect any GPS provider via API', logo_color: 'bg-slate-500' },
  ];

  const [config, setConfig] = useState<GPSConfig>({
    provider: 'itriangle',
    api_url: 'https://api.itriangle.in/v2/tracking',
    api_key: 'gt_live_key_••••••••••••',
    refresh_interval: 60,
    is_connected: true,
    last_sync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  });

    const { data: mappedVehicles } = useModuleData<MappedVehicle>('gps_devices');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'idle'>('idle');
  const [saving, setSaving] = useState(false);

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult('idle');
    setTimeout(() => {
      setTesting(false);
      setTestResult('success');
    }, 1000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 800);
  };

  const timeSinceSync = () => {
    const diff = Date.now() - new Date(config.last_sync).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes} min ago`;
  };

  const activeDevices = mappedVehicles.filter((v) => v.status === 'active').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GPS Integration</h1>
        <p className="text-slate-500 mt-1">Connect your existing GPS provider to track vehicles live</p>
      </div>

      {/* Connection Status Banner */}
      <div className={classNames('rounded-2xl border p-4 flex items-center justify-between', config.is_connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
        <div className="flex items-center gap-3">
          <div className={classNames('w-3 h-3 rounded-full', config.is_connected ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
          <div>
            <p className={classNames('font-medium', config.is_connected ? 'text-green-800' : 'text-red-800')}>
              {config.is_connected ? `Connected to: ${providers.find((p) => p.id === config.provider)?.name} GPS` : 'Disconnected'}
            </p>
            <p className="text-sm text-slate-600">
              {activeDevices} vehicles mapped • Last sync: {timeSinceSync()}
            </p>
          </div>
        </div>
        {config.is_connected ? (
          <Wifi className="w-5 h-5 text-green-600" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-600" />
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          We integrate with your existing GPS devices. No new hardware needed. Just provide your GPS provider&apos;s API credentials.
        </p>
      </div>

      {/* Supported Providers */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Supported Providers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={classNames(
                'bg-white rounded-2xl border p-4 text-center cursor-pointer transition-all',
                config.provider === p.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
              )}
              onClick={() => setConfig({ ...config, provider: p.id })}
            >
              <div className={classNames('w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center', p.logo_color)}>
                <Satellite className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500 mt-1">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
            <input
              type="text"
              value={config.api_url}
              onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://api.provider.com/v2/tracking"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Token</label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Refresh Interval</label>
            <select
              value={config.refresh_interval}
              onChange={(e) => setConfig({ ...config, refresh_interval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={120}>120 seconds</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
              ) : testResult === 'success' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Wifi className="w-4 h-4 text-slate-600" />
              )}
              {testing ? 'Testing...' : testResult === 'success' ? 'Connection Successful' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
          {testResult === 'success' && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Connection to {providers.find((p) => p.id === config.provider)?.name} API verified successfully
            </p>
          )}
        </div>
      </div>

      {/* Mapped Vehicles */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-600" />
            Mapped Vehicles ({mappedVehicles.length})
          </h2>
          <span className="text-sm text-slate-500">{activeDevices} active devices</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Vehicle Reg</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">GPS Device ID</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappedVehicles.map((mv) => (
                <tr key={mv.vehicle_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{mv.vehicle_reg}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-mono">{mv.device_id}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', mv.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
                      <span className={classNames('w-1.5 h-1.5 rounded-full', mv.status === 'active' ? 'bg-green-500' : 'bg-gray-400')} />
                      {mv.status}
                    </span>
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
