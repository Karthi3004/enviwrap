import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI, qaqcAPI } from '../../lib/api';
import { ChevronLeft, ClipboardList, FlaskConical, Activity, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const severityStyle = {
  BLOCK: 'bg-red-500/10 text-red-700 border-red-500/20',
  ERROR: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  WARNING: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  REVIEW: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
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
        const [farmRes, flagRes] = await Promise.all([farmAPI.get(id), farmAPI.getQAQC(id)]);
        setFarm(farmRes.data);
        setFlags(flagRes.data.flags || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const runQAQC = async () => {
    setRunningQAQC(true);
    try {
      const { data } = await qaqcAPI.run(id);
      setFlags(data.flags || []);
    } catch (err) { console.error(err); }
    finally { setRunningQAQC(false); }
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!farm) return <div className="p-6 text-center text-stone-500">Farm not found</div>;

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const blockCount = unresolvedFlags.filter(f => f.severity === 'BLOCK').length;

  const modules = [
    { label: 'Baseline Data', icon: ClipboardList, path: `/farms/${id}/baseline`, desc: 'Module 2 — 3-year history', color: 'text-blue-700', bg: 'bg-blue-500/5 border-blue-500/20' },
    { label: 'SOC Samples', icon: FlaskConical, path: `/farms/${id}/soc`, desc: 'Module 3 — Soil measurements', color: 'text-purple-700', bg: 'bg-purple-500/5 border-purple-500/20' },
    { label: 'Monitoring', icon: Activity, path: `/farms/${id}/monitoring`, desc: 'Module 4 — Annual visits', color: 'text-emerald-700', bg: 'bg-emerald-500/5 border-emerald-500/20' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={() => navigate('/farms')} className="text-stone-500 hover:text-stone-900 mt-0.5 p-1 flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-stone-900">{farm.farmer_full_name}</h1>
            <span className="font-mono text-xs text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded flex-shrink-0">{farm.farm_id}</span>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">{farm.village}, {farm.block_taluk}, {farm.district}</p>
        </div>
        <button onClick={runQAQC} disabled={runningQAQC}
          className="flex items-center gap-1 text-xs text-stone-600 border border-stone-300 px-2.5 py-1.5 rounded-lg flex-shrink-0">
          <RefreshCw size={11} className={runningQAQC ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">QA/QC</span>
        </button>
      </div>

      {/* Completeness */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-500">Data Completeness</span>
          <span className={`text-xs font-bold ${(farm.data_completeness_pct || 0) >= 90 ? 'text-emerald-700' : (farm.data_completeness_pct || 0) >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
            {farm.data_completeness_pct || 0}%
          </span>
        </div>
        <div className="h-2 bg-stone-50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${(farm.data_completeness_pct || 0) >= 90 ? 'bg-emerald-500' : (farm.data_completeness_pct || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${farm.data_completeness_pct || 0}%` }} />
        </div>
      </div>

      {/* Farm info grid */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-3">
        <h2 className="text-xs font-semibold text-stone-600 mb-3 uppercase tracking-wide">Farm Details</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            ['Phone', farm.farmer_phone],
            ['Aadhaar', `****${farm.aadhaar_last4}`],
            ['Land Type', farm.land_type],
            ['Field Area', `${farm.field_area_ha?.toFixed(3) || '—'} ha`],
            ['Net Eligible', `${farm.net_eligible_area_ha?.toFixed(3) || '—'} ha`],
            ['Primary Crop', farm.primary_crop],
            ['Crop System', farm.crop_system_type],
            ['Irrigation', farm.irrigation_source],
            ['Slope', farm.slope_class],
            ['IPCC Zone', farm.ipcc_climate_zone || '—'],
            ['Soil Group', farm.fao_soil_group || '—'],
            ['Enrolled', farm.enrolment_date],
            ['Cluster', farm.cluster_id || '—'],
            ['GPS Accuracy', farm.gps_accuracy_metres ? `${farm.gps_accuracy_metres}m` : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
              <div className="text-sm text-stone-800 mt-0.5 truncate">{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* QA/QC */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-emerald-700" />
          <h2 className="text-sm font-semibold text-stone-900">QA/QC</h2>
          {unresolvedFlags.length === 0 && <CheckCircle2 size={14} className="text-emerald-700 ml-auto" />}
        </div>
        {unresolvedFlags.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-2">All checks passed</p>
        ) : (
          <div className="space-y-2">
            {unresolvedFlags.slice(0, 5).map((flag) => (
              <div key={flag.id} className={`border rounded-xl p-2.5 ${severityStyle[flag.severity]}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase mb-0.5">{flag.severity} · Rule {flag.rule}</p>
                    <p className="text-xs leading-relaxed">{flag.message}</p>
                  </div>
                </div>
              </div>
            ))}
            {blockCount > 0 && (
              <p className="text-xs text-red-700 text-center pt-1">⚠ {blockCount} blocker(s) — resolve before VVB submission</p>
            )}
          </div>
        )}
      </div>

      {/* Module cards */}
      <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Data Entry Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modules.map(({ label, icon: Icon, path, desc, color, bg }) => (
          <button key={label} onClick={() => navigate(path)}
            className={`border rounded-2xl p-4 text-left transition-all active:scale-95 hover:border-stone-400 ${bg} border-stone-200`}>
            <Icon size={18} className={`${color} mb-2.5`} />
            <div className="text-sm font-semibold text-stone-900">{label}</div>
            <div className="text-[10px] text-stone-500 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
