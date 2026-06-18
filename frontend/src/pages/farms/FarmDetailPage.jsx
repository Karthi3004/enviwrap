import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { farmAPI, qaqcAPI } from '../../lib/api';
import {
  ChevronLeft, MapPin, ClipboardList, FlaskConical, Activity,
  ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Edit2
} from 'lucide-react';

const severityStyle = {
  BLOCK: 'bg-red-500/10 text-red-400 border-red-500/20',
  ERROR: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function FarmDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningQAQC, setRunningQAQC] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [farmRes, flagRes] = await Promise.all([
          farmAPI.get(id),
          farmAPI.getQAQC(id),
        ]);
        setFarm(farmRes.data);
        setFlags(flagRes.data.flags || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const runQAQC = async () => {
    setRunningQAQC(true);
    try {
      const { data } = await qaqcAPI.run(id);
      setFlags(data.flags || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningQAQC(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!farm) return (
    <div className="p-6 text-center text-gray-500">Farm not found</div>
  );

  const modules = [
    { label: 'Baseline Data', icon: ClipboardList, path: `/farms/${id}/baseline`, desc: 'Module 2 — 3-year historical data', color: 'text-blue-400' },
    { label: 'SOC Samples', icon: FlaskConical, path: `/farms/${id}/soc`, desc: 'Module 3 — Soil measurements', color: 'text-purple-400' },
    { label: 'Monitoring', icon: Activity, path: `/farms/${id}/monitoring`, desc: 'Module 4 — Annual visits', color: 'text-emerald-400' },
  ];

  const blockCount = flags.filter(f => f.severity === 'BLOCK').length;
  const unresolvedCount = flags.filter(f => !f.resolved).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/farms')} className="text-gray-600 hover:text-gray-300">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white">{farm.farmer_full_name}</h1>
              <span className="font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {farm.farm_id}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {farm.village}, {farm.block_taluk}, {farm.district}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runQAQC}
            disabled={runningQAQC}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={runningQAQC ? 'animate-spin' : ''} />
            Run QA/QC
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Farm summary */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Farm Details</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Farm ID', farm.farm_id],
              ['Phone', farm.farmer_phone],
              ['Aadhaar Last 4', `****${farm.aadhaar_last4}`],
              ['District', farm.district],
              ['Cluster', farm.cluster_id || '—'],
              ['Enrolled', farm.enrolment_date],
              ['Land Type', farm.land_type],
              ['Field Area (ha)', farm.field_area_ha?.toFixed(3)],
              ['Excluded Area (ha)', farm.excluded_area_ha?.toFixed(3) || '0.000'],
              ['Net Eligible (ha)', farm.net_eligible_area_ha?.toFixed(3)],
              ['Primary Crop', farm.primary_crop],
              ['Crop System', farm.crop_system_type],
              ['Irrigation', farm.irrigation_source],
              ['Slope', farm.slope_class],
              ['IPCC Zone', farm.ipcc_climate_zone || '—'],
              ['Soil Group', farm.fao_soil_group || '—'],
              ['GPS Accuracy', farm.gps_accuracy_metres ? `${farm.gps_accuracy_metres}m` : '—'],
              ['Boundary Match', farm.boundary_satellite_match || '—'],
              ['Cadastral Ref', farm.cadastral_reference || '—'],
              ['Field Officer', farm.field_officer_name || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</span>
                <span className="text-sm text-gray-200 mt-0.5">{value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Completeness bar */}
          <div className="mt-5 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Data Completeness</span>
              <span className={`text-xs font-semibold ${
                (farm.data_completeness_pct || 0) >= 90 ? 'text-emerald-400' :
                (farm.data_completeness_pct || 0) >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>{farm.data_completeness_pct || 0}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (farm.data_completeness_pct || 0) >= 90 ? 'bg-emerald-500' :
                  (farm.data_completeness_pct || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${farm.data_completeness_pct || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* QA/QC Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">QA/QC Status</h2>
            </div>
            {unresolvedCount === 0 && (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
          </div>

          {unresolvedCount === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">All checks passed</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {flags.filter(f => !f.resolved).map((flag) => (
                <div key={flag.id} className={`border rounded-lg p-2.5 ${severityStyle[flag.severity]}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase mb-0.5">{flag.severity} · Rule {flag.rule}</p>
                      <p className="text-xs leading-relaxed">{flag.message}</p>
                      {flag.field && (
                        <code className="text-[10px] opacity-60 mt-1 block">{flag.field}</code>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {blockCount > 0 && (
            <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400 font-medium">
                ⚠ {blockCount} blocker(s) — resolve before submission
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Module Cards */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Data Entry Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modules.map(({ label, icon: Icon, path, desc, color }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 text-left transition-colors group"
          >
            <Icon size={20} className={`${color} mb-3`} />
            <div className="text-sm font-semibold text-white group-hover:text-gray-100">{label}</div>
            <div className="text-xs text-gray-600 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
