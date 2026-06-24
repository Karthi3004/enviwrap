import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { qaqcAPI } from '../../lib/api';
import { ShieldCheck, CheckCircle, AlertCircle, X } from 'lucide-react';

const severityStyle = {
  BLOCK: { bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/20 text-red-700', icon: 'text-red-700' },
  ERROR: { bg: 'bg-orange-500/10 border-orange-500/20', badge: 'bg-orange-500/20 text-orange-700', icon: 'text-orange-700' },
  WARNING: { bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-700', icon: 'text-amber-700' },
  REVIEW: { bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-700', icon: 'text-blue-700' },
};

export default function QAQCPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [resolving, setResolving] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadFlags(); }, [filter]);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? { resolved: false } :
        filter === 'resolved' ? { resolved: true } :
        { severity: filter, resolved: false };
      const { data } = await qaqcAPI.listFlags(params);
      setFlags(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resolve = async (id) => {
    try {
      await qaqcAPI.resolveFlag(id, { resolution_note: resolveNote });
      setResolving(null);
      setResolveNote('');
      await loadFlags();
    } catch (err) { alert('Failed to resolve'); }
  };

  const counts = flags.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});

  const filters = [
    { id: 'all', label: 'All', count: flags.length },
    { id: 'BLOCK', label: 'Block', count: counts.BLOCK || 0 },
    { id: 'ERROR', label: 'Error', count: counts.ERROR || 0 },
    { id: 'WARNING', label: 'Warn', count: counts.WARNING || 0 },
    { id: 'REVIEW', label: 'Review', count: counts.REVIEW || 0 },
    { id: 'resolved', label: 'Resolved', count: null },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-700" /> QA/QC Flags
        </h1>
        <p className="text-stone-500 text-xs mt-0.5">30 automated rules · resolve BLOCK flags before VVB export</p>
      </div>

      {/* Filter pills — scrollable on mobile */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {filters.map(({ id, label, count }) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === id ? 'bg-emerald-600 text-white border-emerald-600' : 'text-stone-600 border-stone-300 hover:text-stone-900'
            }`}>
            {label}
            {count !== null && (
              <span className={`px-1 py-0.5 rounded text-[10px] font-bold ${filter === id ? 'bg-white/20' : 'bg-stone-50 text-stone-500'}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Flags */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 animate-pulse h-16" />)
        ) : flags.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
            <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-stone-600 text-sm font-medium">No flags</p>
            <p className="text-stone-500 text-xs mt-1">{filter === 'resolved' ? 'None resolved yet' : 'All checks passed'}</p>
          </div>
        ) : (
          flags.map((flag) => {
            const style = severityStyle[flag.severity] || severityStyle.WARNING;
            return (
              <div key={flag.id} className={`border rounded-2xl p-4 ${style.bg}`}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${style.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>{flag.severity}</span>
                      <span className="text-[10px] text-stone-500">Rule {flag.rule}</span>
                      {flag.farms?.farm_id && (
                        <button onClick={() => navigate(`/farms/${flag.farm_id}`)} className="text-[10px] text-emerald-700 font-mono">
                          {flag.farms.farm_id}
                        </button>
                      )}
                      {flag.resolved && <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">resolved</span>}
                    </div>
                    <p className="text-sm text-stone-800 leading-relaxed">{flag.message}</p>
                    {flag.field && <code className="text-[10px] text-stone-500 mt-1 block">{flag.field}</code>}
                    {flag.resolution_note && <p className="text-xs text-stone-500 mt-1 italic">Resolution: {flag.resolution_note}</p>}
                  </div>

                  {!flag.resolved && (
                    resolving === flag.id ? (
                      <div className="flex flex-col gap-2 min-w-0 w-40 flex-shrink-0">
                        <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                          placeholder="Resolution note..." rows={2}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2 py-1.5 text-xs text-stone-900 placeholder-stone-400 resize-none" />
                        <div className="flex gap-1.5">
                          <button onClick={() => resolve(flag.id)} className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 rounded-lg">Done</button>
                          <button onClick={() => setResolving(null)} className="text-stone-500 hover:text-stone-600 p-1"><X size={13} /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setResolving(flag.id)}
                        className="text-xs text-stone-500 hover:text-emerald-700 border border-stone-300 px-2.5 py-1.5 rounded-xl flex-shrink-0">
                        Resolve
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
