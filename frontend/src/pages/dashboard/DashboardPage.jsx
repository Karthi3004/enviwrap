import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../lib/api';
import { MapPin, AlertTriangle, FlaskConical, ShieldCheck, TrendingUp, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

const StatCard = ({ label, value, sub, icon: Icon, color = 'emerald' }) => {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={15} />
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [visits, setVisits] = useState(null);
  const [lab, setLab] = useState(null);
  const [vvb, setVVB] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, v, l, r] = await Promise.all([
          dashboardAPI.stats(),
          dashboardAPI.satelliteAlerts(),
          dashboardAPI.visitSchedule(),
          dashboardAPI.labTracker(),
          dashboardAPI.vvbReadiness(),
        ]);
        setStats(s.data);
        setAlerts(a.data || []);
        setVisits(v.data);
        setLab(l.data);
        setVVB(r.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg sm:text-xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-xs mt-0.5">Enviwrap dMRV · VM0042 v2.2 · Tamil Nadu</p>
      </div>

      {/* KPI Grid — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Farms Enrolled" value={stats?.total_farms ?? 0} icon={MapPin} />
        <StatCard label="Total Area (ha)" value={stats?.total_area_ha?.toFixed(1) ?? 0} sub="Net eligible" icon={TrendingUp} color="blue" />
        <StatCard label="Est. VCUs" value={stats?.estimated_vcus?.toFixed(0) ?? 0} icon={TrendingUp} color="emerald" />
        <StatCard label="Satellite Alerts" value={alerts.length} sub="Unresolved" icon={AlertTriangle} color={alerts.length > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* VVB Readiness */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">VVB Readiness</h2>
        </div>
        {vvb ? (
          <div className="space-y-2.5">
            {[
              { label: 'Audit-ready (≥90%)', count: vvb.summary?.green || 0, color: 'bg-emerald-500' },
              { label: 'In progress (60–90%)', count: vvb.summary?.amber || 0, color: 'bg-amber-500' },
              { label: 'Incomplete (<60%)', count: vvb.summary?.red || 0, color: 'bg-red-500' },
            ].map(({ label, count, color }) => {
              const total = (vvb.summary?.green || 0) + (vvb.summary?.amber || 0) + (vvb.summary?.red || 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-300 font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="h-16 bg-gray-800 rounded-xl animate-pulse" />}
      </div>

      {/* Satellite Alert Feed */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {alerts.length > 0 && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
            <h2 className="text-sm font-semibold text-white">Satellite Alerts</h2>
          </div>
          <button onClick={() => navigate('/qaqc')} className="text-xs text-emerald-400">View all →</button>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-5">
            <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs text-gray-500">No unresolved discrepancies</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 p-2.5 bg-gray-800/50 rounded-xl">
                <AlertCircle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{alert.farms?.farm_id}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  alert.severity === 'BLOCK' ? 'bg-red-500/20 text-red-400' :
                  alert.severity === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>{alert.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Annual Visits Due */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Visits Due</h2>
            {visits?.count > 0 && (
              <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{visits.count}</span>
            )}
          </div>
          {!visits?.due_visits?.length ? (
            <p className="text-xs text-gray-600 text-center py-3">All farms visited recently</p>
          ) : (
            <div className="space-y-2">
              {visits.due_visits.slice(0, 4).map((farm) => (
                <div key={farm.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-200">{farm.farmer_full_name}</p>
                    <p className="text-[10px] text-gray-600">{farm.farm_id}</p>
                  </div>
                  <button onClick={() => navigate(`/farms/${farm.id}`)} className="text-xs text-emerald-400">Visit →</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lab Tracker */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={14} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Lab Samples</h2>
          </div>
          {lab ? (
            <div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-white">{lab.pending?.length || 0}</div>
                  <div className="text-[10px] text-gray-500">Pending</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400">{lab.received?.length || 0}</div>
                  <div className="text-[10px] text-gray-500">Received</div>
                </div>
              </div>
              {lab.pending?.slice(0, 2).map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-t border-gray-800/60">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate">{s.farms?.farm_id || s.farm_id}</span>
                </div>
              ))}
            </div>
          ) : <div className="h-20 bg-gray-800 rounded-xl animate-pulse" />}
        </div>
      </div>
    </div>
  );
}
