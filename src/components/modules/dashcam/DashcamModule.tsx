import { Camera, AlertTriangle, ShieldCheck, Wifi, WifiOff, Info, Eye, Brain, Phone, ArrowLeftRight, Gauge } from 'lucide-react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { classNames } from '../../../lib/utils';

type EventSeverity = 'critical' | 'warning' | 'info';

interface DashcamEvent {
  id: string;
  type: string;
  description: string;
  vehicle_reg: string;
  timestamp: string;
  severity: EventSeverity;
}

const simulatedEvents: DashcamEvent[] = [];

function getEventIcon(type: string) {
  switch (type) {
    case 'fatigue': return <Eye className="w-4 h-4" />;
    case 'harsh_braking': return <AlertTriangle className="w-4 h-4" />;
    case 'phone_usage': return <Phone className="w-4 h-4" />;
    case 'lane_departure': return <ArrowLeftRight className="w-4 h-4" />;
    case 'overspeeding': return <Gauge className="w-4 h-4" />;
    default: return <Brain className="w-4 h-4" />;
  }
}

function getSeverityStyle(severity: EventSeverity) {
  switch (severity) {
    case 'critical': return { badge: 'bg-red-100 text-red-800', icon: 'bg-red-100 text-red-600' };
    case 'warning': return { badge: 'bg-yellow-100 text-yellow-800', icon: 'bg-yellow-100 text-yellow-600' };
    case 'info': return { badge: 'bg-blue-100 text-blue-800', icon: 'bg-blue-100 text-blue-600' };
  }
}

export default function DashcamModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');

  const cameraVehicles = vehicles.slice(0, 6);
  const topDrivers = [...drivers].sort((a, b) => b.safety_score - a.safety_score).slice(0, 5);

  const totalCameras = cameraVehicles.length * 2;
  const onlineCameras = cameraVehicles.filter((v) => v.status === 'on_trip').length * 2;
  const offlineCameras = totalCameras - onlineCameras;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Dashcam</h1>
        <p className="text-slate-500 mt-1">Driver behavior monitoring & video telematics</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Connect your dashcam devices to enable live monitoring.</p>
          <p className="text-sm text-blue-700 mt-1">Currently showing simulated events.</p>
        </div>
      </div>

      {/* Device Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Device Status</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Camera className="w-4 h-4" /> {totalCameras} cameras
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <Wifi className="w-4 h-4" /> {onlineCameras} online
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <WifiOff className="w-4 h-4" /> {offlineCameras} offline
            </span>
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Camera Feeds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameraVehicles.map((vehicle, idx) => {
            const isOnline = vehicle.status === 'on_trip';
            const channel = idx % 2 === 0 ? 'Road-facing' : 'Cabin';
            return (
              <div key={vehicle.id + channel} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Placeholder camera feed */}
                <div className="h-36 bg-gray-100 flex items-center justify-center relative">
                  <Camera className="w-10 h-10 text-gray-300" />
                  <div className={classNames(
                    'absolute top-2 right-2 w-2.5 h-2.5 rounded-full',
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                  {isOnline && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-red-600 text-white rounded font-medium">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{vehicle.reg_number}</p>
                    <span className={classNames(
                      'px-2 py-0.5 text-xs rounded-full font-medium',
                      isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    )}>
                      {isOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{channel}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Last event: {isOnline ? '2 min ago' : 'N/A'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Event Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Event Log</h2>
        <div className="space-y-3">
          {simulatedEvents.map((event) => {
            const style = getSeverityStyle(event.severity);
            return (
              <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={classNames('w-8 h-8 rounded-lg flex items-center justify-center', style.icon)}>
                    {getEventIcon(event.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {event.description} - {event.vehicle_reg}
                    </p>
                    <p className="text-xs text-slate-500">{event.timestamp}</p>
                  </div>
                </div>
                <span className={classNames('px-2 py-1 text-xs rounded-full font-medium', style.badge)}>
                  {event.severity}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver Safety Scores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Driver Safety Scores
          </div>
        </h2>
        <div className="space-y-3">
          {topDrivers.map((driver, idx) => (
            <div key={driver.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{driver.name}</p>
                  <p className="text-xs text-slate-500">{driver.assigned_vehicle_reg || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={classNames(
                      'h-full rounded-full',
                      driver.safety_score >= 90 ? 'bg-green-500' : driver.safety_score >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${driver.safety_score}%` }}
                  />
                </div>
                <span className={classNames(
                  'text-sm font-bold',
                  driver.safety_score >= 90 ? 'text-green-600' : driver.safety_score >= 80 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {driver.safety_score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
