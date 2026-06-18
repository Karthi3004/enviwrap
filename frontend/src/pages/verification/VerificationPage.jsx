import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { verificationAPI } from '../../lib/api';
import { CheckSquare, Plus, Download, Calendar, Save } from 'lucide-react';

const statusColors = {
  open: 'bg-blue-500/10 text-blue-400',
  'vvb-review': 'bg-amber-500/10 text-amber-400',
  closed: 'bg-emerald-500/10 text-emerald-400',
};

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';

export default function VerificationPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => { loadPeriods(); }, []);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const { data } = await verificationAPI.list();
      setPeriods(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const onSave = async (data) => {
    setSaving(true);
    try {
      await verificationAPI.create(data);
      await loadPeriods();
      setShowForm(false);
      reset();
    } catch (err) {
      alert('Failed to create verification period');
    } finally { setSaving(false); }
  };

  const exportVVB = async (id, name) => {
    setExporting(id);
    try {
      const { data } = await verificationAPI.exportVVB(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enviwrap-vvb-export-${name}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    } finally { setExporting(null); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare size={20} className="text-emerald-400" />
            Verification Periods
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Module 6 — VVB audit periods and data export</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Period
        </button>
      </div>

      {/* Periods list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24"></div>
          ))
        ) : periods.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Calendar size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No verification periods yet</p>
            <p className="text-gray-600 text-sm mt-1">Create a period to track a verification cycle</p>
          </div>
        ) : (
          periods.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-semibold text-white">{p.period_name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[p.status] || 'bg-gray-700 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.start_date} → {p.end_date}
                  </p>
                  <div className="flex gap-4 mt-3">
                    {[
                      ['Farms', p.total_farms],
                      ['Area (ha)', p.total_area_ha?.toFixed(1)],
                      ['ERRs (tCO₂e)', p.total_errs_t_co2e?.toFixed(1)],
                      ['VCUs Issued', p.total_vcus_issued?.toFixed(0)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-sm font-bold text-white">{value || '—'}</div>
                        <div className="text-[10px] text-gray-600">{label}</div>
                      </div>
                    ))}
                  </div>
                  {p.vvb_name && (
                    <p className="text-xs text-gray-600 mt-2">VVB: {p.vvb_name} {p.vvb_audit_date && `· Audit: ${p.vvb_audit_date}`}</p>
                  )}
                </div>
                <button
                  onClick={() => exportVVB(p.id, p.period_name)}
                  disabled={exporting === p.id}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={12} />
                  {exporting === p.id ? 'Exporting...' : 'VVB Export'}
                </button>
              </div>
              {p.notes && (
                <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-800">{p.notes}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* New period modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">New Verification Period</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Period Name</label>
                <input {...register('period_name', { required: true })} className={inputClass} placeholder="e.g. Verification Period 1 (2024–2025)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input {...register('start_date', { required: true })} type="date" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">End Date</label>
                  <input {...register('end_date', { required: true })} type="date" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">VVB Name</label>
                <input {...register('vvb_name')} className={inputClass} placeholder="e.g. Verra Validation Body" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">VVB Audit Date</label>
                <input {...register('vvb_audit_date')} type="date" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea {...register('notes')} rows={2} className={`${inputClass} resize-none`} placeholder="Optional notes..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
                  <Save size={14} />
                  {saving ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
