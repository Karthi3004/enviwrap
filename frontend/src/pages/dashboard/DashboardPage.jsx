import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../lib/api';
import {
  MapPin, AlertTriangle, FlaskConical, ShieldCheck,
  TrendingUp, Calendar, Satellite, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

const StatCard = ({ label, value, sub, icon: Icon, color = 'emerald' }) => {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value ?? '—'}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
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
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Program Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Enviwrap dMRV · VM0042 v2.2 · Tamil Nadu</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Farms Enrolled" value={stats?.total_farms ?? 0} icon={MapPin} />
        <StatCard label="Total Area (ha)" value={stats?.total_area_ha?.toFixed(1) ?? 0} sub="Net eligible" icon={TrendingUp} color="blue" />
        <StatCard label="Est. VCUs" value={stats?.estimated_vcus?.toFixed(0) ?? 0} sub="Preliminary estimate" icon={TrendingUp} color="emerald" />
        <StatCard label="Satellite Alerts" value={alerts.length} sub="Unresolved flags" icon={AlertTriangle} color={alerts.length > 0 ? 'amber' : 'emerald'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Satellite Alerts Feed */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
              <h2 className="text-sm font-semibold text-white">Satellite Alert Feed</h2>
            </div>
            <button onClick={() => navigate('/qaqc')} className="text-xs text-emerald-400 hover:text-emerald-300">
              View all →
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No unresolved satellite discrepancies</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {alert.farms?.farm_id} · {alert.farms?.farmer_full_name}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                    alert.severity === 'BLOCK' ? 'bg-red-500/20 text-red-400' :
                    alert.severity === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                    alert.severity === 'REVIEW' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VVB Readiness */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">VVB Readiness</h2>
          </div>
          {vvb ? (
            <div className="space-y-3">
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
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visit Schedule */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Annual Visits Due</h2>
            {visits?.count > 0 && (
              <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {visits.count} overdue
              </span>
            )}
          </div>
          {!visits?.due_visits?.length ? (
            <p className="text-gray-600 text-sm text-center py-4">All farms visited recently</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {visits.due_visits.slice(0, 6).map((farm) => (
                <div key={farm.id} className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-gray-200">{farm.farmer_full_name}</p>
                    <p className="text-[10px] text-gray-600">{farm.farm_id} · {farm.district}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/farms/${farm.id}`)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Visit →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lab Tracker */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={15} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Lab Sample Tracker</h2>
          </div>
          {lab ? (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{lab.pending?.length || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Pending</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400">{lab.received?.length || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Received</div>
                </div>
              </div>
              {lab.pending?.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-t border-gray-800/60">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                  <span className="text-xs text-gray-400 truncate">{s.farms?.farm_id || s.farm_id}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {s.collected_at ? new Date(s.collected_at).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
