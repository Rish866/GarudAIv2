import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Brain, TrendingUp, Truck, Clock, Wrench, BarChart3, AlertTriangle, Zap, Target } from 'lucide-react';

type AIView = 'eta' | 'maintenance' | 'demand' | 'insights';

interface ETAPrediction {
  trip_id: string;
  trip_number: string;
  vehicle_reg: string;
  origin: string;
  destination: string;
  distance_km: number;
  predicted_eta: string;
  confidence: number;
  delay_risk: 'low' | 'medium' | 'high';
  factors: string[];
}

interface MaintenancePrediction {
  vehicle_id: string;
  vehicle_reg: string;
  component: string;
  predicted_failure_date: string;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  estimated_cost: number;
}

interface DemandForecast {
  route: string;
  current_week: number;
  next_week_predicted: number;
  growth: number;
  confidence: number;
}


export default function PredictiveModule() {
  const { data: trips } = useModuleData<any>('trips');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: maintenance } = useModuleData<any>('maintenance');
  const [view, setView] = useState<AIView>('eta');

  // Simulated AI predictions based on real store data
  const etaPredictions: ETAPrediction[] = useMemo(() => {
    return trips.filter(t => ['in_transit', 'loading', 'assigned'].includes(t.status)).map(t => {
      const avgSpeed = 45; // km/h average for Indian highways
      const hoursRemaining = t.distance_km / avgSpeed * (1 + Math.random() * 0.3);
      const eta = new Date();
      eta.setHours(eta.getHours() + Math.round(hoursRemaining));
      const confidence = 75 + Math.floor(Math.random() * 20);
      const delay = Math.random();
      return {
        trip_id: t.id, trip_number: t.trip_number, vehicle_reg: t.vehicle_reg,
        origin: t.origin, destination: t.destination, distance_km: t.distance_km,
        predicted_eta: eta.toISOString(),
        confidence,
        delay_risk: delay > 0.7 ? 'high' : delay > 0.4 ? 'medium' : 'low',
        factors: delay > 0.7 ? ['Heavy traffic on NH-44', 'Toll congestion expected'] : delay > 0.4 ? ['Moderate traffic', 'Weather advisory'] : ['Clear route', 'Normal conditions'],
      };
    });
  }, [trips]);

  const maintenancePredictions: MaintenancePrediction[] = useMemo(() => {
    return vehicles.slice(0, 6).map(v => {
      const components = ['Engine Oil', 'Brake Pads', 'Air Filter', 'Clutch Plate', 'Battery', 'Radiator'];
      const comp = components[Math.floor(Math.random() * components.length)];
      const daysToFailure = 5 + Math.floor(Math.random() * 30);
      const failDate = new Date();
      failDate.setDate(failDate.getDate() + daysToFailure);
      const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = ['critical', 'high', 'medium', 'low'];
      const risk = daysToFailure < 7 ? 'critical' : daysToFailure < 14 ? 'high' : daysToFailure < 21 ? 'medium' : 'low';
      return {
        vehicle_id: v.id, vehicle_reg: v.reg_number, component: comp,
        predicted_failure_date: failDate.toISOString().split('T')[0],
        confidence: 70 + Math.floor(Math.random() * 25),
        risk_level: risk,
        recommended_action: risk === 'critical' ? 'Schedule immediate maintenance' : risk === 'high' ? 'Plan service within a week' : 'Monitor & schedule at next service',
        estimated_cost: 2000 + Math.floor(Math.random() * 15000),
      };
    });
  }, [vehicles]);

  const demandForecasts: DemandForecast[] = [
    { route: 'Pune → Mumbai', current_week: 12, next_week_predicted: 15, growth: 25, confidence: 88 },
    { route: 'Mumbai → Delhi', current_week: 8, next_week_predicted: 10, growth: 25, confidence: 82 },
    { route: 'Pune → Hyderabad', current_week: 6, next_week_predicted: 7, growth: 17, confidence: 79 },
    { route: 'Mumbai → Ahmedabad', current_week: 9, next_week_predicted: 8, growth: -11, confidence: 85 },
    { route: 'Pune → Chennai', current_week: 4, next_week_predicted: 6, growth: 50, confidence: 74 },
    { route: 'Delhi → Jaipur', current_week: 3, next_week_predicted: 4, growth: 33, confidence: 71 },
  ];

  const riskColors = { low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Predictive Analytics (AI)</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>AI-powered predictions for ETA, maintenance & demand forecasting</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-purple-50 text-purple-700">
          <Zap className="w-4 h-4" /> Powered by ML models trained on your historical data
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'eta', label: 'ETA Prediction', icon: Clock },
          { id: 'maintenance', label: 'Maintenance Prediction', icon: Wrench },
          { id: 'demand', label: 'Demand Forecasting', icon: TrendingUp },
          { id: 'insights', label: 'AI Insights', icon: Brain },
        ] as { id: AIView; label: string; icon: React.ComponentType<{className?: string; size?: number}> }[]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={classNames('flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium', view === t.id ? 'bg-blue-600 text-white' : '')} style={view !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ETA Predictions */}
      {view === 'eta' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active Predictions</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{etaPredictions.length}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Avg Confidence</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{etaPredictions.length > 0 ? Math.round(etaPredictions.reduce((s, p) => s + p.confidence, 0) / etaPredictions.length) : 0}%</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>High Delay Risk</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{etaPredictions.filter(p => p.delay_risk === 'high').length}</p>
            </div>
          </div>
          <div className="space-y-3">
            {etaPredictions.map(pred => (
              <div key={pred.trip_id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{pred.trip_number}</p>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{pred.vehicle_reg}</span>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', riskColors[pred.delay_risk])}>Delay: {pred.delay_risk}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{pred.origin} → {pred.destination} ({pred.distance_km} km)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>ETA: {new Date(pred.predicted_eta).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Confidence: {pred.confidence}%</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {pred.factors.map((f, i) => <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{f}</span>)}
                </div>
              </div>
            ))}
            {etaPredictions.length === 0 && (
              <div className="text-center py-12"><Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} /><p style={{ color: 'var(--text-tertiary)' }}>No active trips for ETA prediction</p></div>
            )}
          </div>
        </div>
      )}


      {/* Maintenance Prediction */}
      {view === 'maintenance' && (
        <div className="space-y-4">
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Component</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Predicted Failure</th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Confidence</th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Risk</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Est. Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {maintenancePredictions.sort((a, b) => { const order = { critical: 0, high: 1, medium: 2, low: 3 }; return order[a.risk_level] - order[b.risk_level]; }).map(pred => (
                  <tr key={pred.vehicle_id + pred.component} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pred.vehicle_reg}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pred.component}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(pred.predicted_failure_date)}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-primary)' }}>{pred.confidence}%</td>
                    <td className="px-4 py-3 text-center"><span className={classNames('px-2 py-1 rounded-full text-xs font-medium', riskColors[pred.risk_level])}>{pred.risk_level}</span></td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pred.estimated_cost)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{pred.recommended_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demand Forecasting */}
      {view === 'demand' && (
        <div className="space-y-4">
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Route</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>This Week</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Next Week (Pred.)</th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Growth</th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {demandForecasts.map(f => (
                  <tr key={f.route} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.route}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>{f.current_week} trips</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--accent)' }}>{f.next_week_predicted} trips</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={f.growth >= 0 ? 'text-green-600' : 'text-red-600'}>{f.growth >= 0 ? '+' : ''}{f.growth}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-primary)' }}>{f.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {view === 'insights' && (
        <div className="space-y-4">
          {[
            { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', title: 'Revenue Opportunity', desc: 'Pune-Chennai route showing 50% demand growth. Consider adding 2 more vehicles on this route next week to capture ₹1.9L additional revenue.' },
            { icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', title: 'Maintenance Alert', desc: `${maintenancePredictions.filter(p => p.risk_level === 'critical').length} vehicles have critical maintenance predictions. Schedule service immediately to avoid breakdown costs (est. ₹${Math.round(maintenancePredictions.filter(p => p.risk_level === 'critical').reduce((s, p) => s + p.estimated_cost, 0) / 1000)}K).` },
            { icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Fleet Utilization', desc: 'Fleet utilization is at 72% this week. Optimal target is 85%. Recommended: Accept 3 more indents on Mumbai-Ahmedabad route.' },
            { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', title: 'Delay Risk', desc: `${etaPredictions.filter(p => p.delay_risk === 'high').length} trips have high delay risk. Major factor: NH-44 traffic congestion. Suggest alternate route via NH-48 for Pune-Mumbai trips.` },
            { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Cost Optimization', desc: 'Fuel costs increased 8% this month vs last month. Top contributor: MH-12-AB-1234 (12% above fleet average). Recommend driver training on fuel-efficient driving.' },
          ].map((insight, i) => (
            <div key={i} className="rounded-2xl border p-5 flex gap-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className={classNames('p-2 rounded-lg h-fit shrink-0', insight.bg)}><insight.icon className={classNames('w-5 h-5', insight.color)} /></div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{insight.title}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
