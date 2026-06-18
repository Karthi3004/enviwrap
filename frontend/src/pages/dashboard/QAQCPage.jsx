import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { qaqcAPI } from '../../lib/api';
import { ShieldCheck, Filter, CheckCircle, AlertCircle, X } from 'lucide-react';

const severityStyle = {
  BLOCK: { bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/20 text-red-400', icon: 'text-red-400' },
  ERROR: { bg: 'bg-orange-500/10 border-orange-500/20', badge: 'bg-orange-500/20 text-orange-400', icon: 'text-orange-400' },
  WARNING: { bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', icon: 'text-amber-400' },
  REVIEW: { bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', icon: 'text-blue-400' },
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
    } catch (err) { alert('Failed to resolve flag'); }
  };

  const counts = flags.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          QA/QC Flags
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">All 30 automated rules · Resolve BLOCK and ERROR flags before VVB export</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { id: 'all', label: 'All unresolved', count: flags.length },
          { id: 'BLOCK', label: 'Blockers', count: counts.BLOCK || 0 },
          { id: 'ERROR', label: 'Errors', count: counts.ERROR || 0 },
          { id: 'WARNING', label: 'Warnings', count: counts.WARNING || 0 },
          { id: 'REVIEW', label: 'Reviews', count: counts.REVIEW || 0 },
          { id: 'resolved', label: 'Resolved', count: null },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            {label}
            {count !== null && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${filter === id ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Flags list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-16"></div>
          ))
        ) : flags.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No flags in this category</p>
            <p className="text-gray-600 text-sm mt-1">
              {filter === 'resolved' ? 'No flags have been resolved yet' : 'All QA/QC checks passed'}
            </p>
          </div>
        ) : (
          flags.map((flag) => {
            const style = severityStyle[flag.severity] || severityStyle.WARNING;
            return (
              <div key={flag.id} className={`border rounded-xl p-4 ${style.bg}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={15} className={`mt-0.5 flex-shrink-0 ${style.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${style.badge}`}>
                        {flag.severity}
                      </span>
                      <span className="text-[10px] text-gray-600">Rule {flag.rule}</span>
                      {flag.farms?.farm_id && (
                        <button
                          onClick={() => navigate(`/farms/${flag.farm_id}`)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono"
                        >
                          {flag.farms.farm_id}
                        </button>
                      )}
                      {flag.farms?.farmer_full_name && (
                        <span className="text-[10px] text-gray-500">{flag.farms.farmer_full_name}</span>
                      )}
                      {flag.resolved && (
                        <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded">resolved</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200">{flag.message}</p>
                    {flag.field && (
                      <code className="text-[10px] text-gray-600 mt-1 block">field: {flag.field}</code>
                    )}
                    {flag.resolution_note && (
                      <p className="text-xs text-gray-500 mt-1 italic">Resolution: {flag.resolution_note}</p>
                    )}
                    <p className="text-[10px] text-gray-700 mt-1.5">
                      {new Date(flag.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {!flag.resolved && (
                    <div className="flex-shrink-0">
                      {resolving === flag.id ? (
                        <div className="flex flex-col gap-2 min-w-48">
                          <textarea
                            value={resolveNote}
                            onChange={e => setResolveNote(e.target.value)}
                            placeholder="Resolution note..."
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => resolve(flag.id)} className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded">
                              Resolve
                            </button>
                            <button onClick={() => setResolving(null)} className="text-gray-600 hover:text-gray-400">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolving(flag.id)}
                          className="text-xs text-gray-500 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
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
