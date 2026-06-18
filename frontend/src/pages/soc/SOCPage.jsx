import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { socAPI } from '../../lib/api';
import { ChevronLeft, Plus, FlaskConical, CheckCircle, AlertTriangle, Save } from 'lucide-react';

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';
const selectClass = `${inputClass} cursor-pointer`;

const Field = ({ label, children, hint, tag }) => (
  <div>
    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
      {label}
      {tag && <span className="ml-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded">NEW</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
  </div>
);

const labStatusColors = {
  pending: 'bg-amber-500/10 text-amber-400',
  sent: 'bg-blue-500/10 text-blue-400',
  received: 'bg-emerald-500/10 text-emerald-400',
};

export default function SOCPage() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showLabForm, setShowLabForm] = useState(null);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      sub_sample_count: 5,
      is_lab_crosscheck: false,
      lab_status: 'pending',
      gps_accuracy_class: 'Consumer (<5m)',
    },
  });

  const { register: labReg, handleSubmit: labSubmit, reset: labReset } = useForm();
  const watched = watch();

  useEffect(() => {
    loadSamples();
  }, [farmId]);

  const loadSamples = async () => {
    setLoading(true);
    try {
      const { data } = await socAPI.list(farmId);
      setSamples(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const onSave = async (data) => {
    setSaving(true);
    try {
      if (editingSample) {
        await socAPI.update(editingSample.id, { ...data, farm_id: farmId });
      } else {
        await socAPI.create({ ...data, farm_id: farmId });
      }
      await loadSamples();
      setShowForm(false);
      setEditingSample(null);
      reset();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onLabSave = async (data) => {
    try {
      await socAPI.uploadLabResults(showLabForm, data);
      await loadSamples();
      setShowLabForm(null);
      labReset();
    } catch (err) {
      alert('Lab result save failed');
    }
  };

  const openEdit = (sample) => {
    setEditingSample(sample);
    reset(sample);
    setShowForm(true);
  };

  const crossCheckCount = samples.filter(s => s.is_lab_crosscheck).length;
  const targetCrossCheck = Math.ceil(samples.length * 0.1);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/farms/${farmId}`)} className="text-gray-600 hover:text-gray-300">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">SOC Samples</h1>
            <p className="text-gray-500 text-sm">Module 3 — NIR + 10% Lab cross-check</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingSample(null); reset({ sub_sample_count: 5, lab_status: 'pending' }); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Sample
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{samples.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Samples</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{crossCheckCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Lab Cross-checks</div>
          <div className="text-[10px] text-gray-600 mt-0.5">Target: {targetCrossCheck} (10%)</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {samples.filter(s => s.lab_status === 'received').length}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Results Received</div>
        </div>
      </div>

      {/* Sample list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Sample Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">GPS</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Sub-samples</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">NIR SOC %</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Lab Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Lab SOC %</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cross-check</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"></div></td>
                  ))}
                </tr>
              ))
            ) : samples.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-600">
                  No samples collected yet. Add the first sample.
                </td>
              </tr>
            ) : (
              samples.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-300">{s.sample_date || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">
                    {s.sample_gps_lat ? `${Number(s.sample_gps_lat).toFixed(4)}, ${Number(s.sample_gps_lng).toFixed(4)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${s.sub_sample_count < 5 ? 'text-red-400' : 'text-gray-300'}`}>
                      {s.sub_sample_count}
                      {s.sub_sample_count < 5 && <AlertTriangle size={11} className="inline ml-1" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.nir_soc_pct ? `${s.nir_soc_pct}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${labStatusColors[s.lab_status] || 'text-gray-500'}`}>
                      {s.lab_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.lab_soc_pct ? `${s.lab_soc_pct}%` : '—'}</td>
                  <td className="px-4 py-3">
                    {s.is_lab_crosscheck
                      ? <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">10% Lab</span>
                      : <span className="text-[10px] text-gray-600">NIR only</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-gray-500 hover:text-gray-200">Edit</button>
                      {s.is_lab_crosscheck && s.lab_status !== 'received' && (
                        <button
                          onClick={() => { setShowLabForm(s.id); labReset(); }}
                          className="text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          + Lab Results
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sample form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">
                {editingSample ? 'Edit Sample' : 'Add SOC Sample'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingSample(null); }} className="text-gray-600 hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sample Date">
                  <input {...register('sample_date')} type="date" className={inputClass} />
                </Field>
                <Field label="Sub-sample Count" hint="Minimum 5 required">
                  <input {...register('sub_sample_count', { valueAsNumber: true })} type="number" min={1} className={inputClass} />
                </Field>
                <Field label="GPS Latitude">
                  <input {...register('sample_gps_lat')} type="number" step="0.0000001" className={inputClass} placeholder="11.0168" />
                </Field>
                <Field label="GPS Longitude">
                  <input {...register('sample_gps_lng')} type="number" step="0.0000001" className={inputClass} placeholder="76.9558" />
                </Field>
                <Field label="GPS Accuracy (m)">
                  <input {...register('gps_accuracy_metres', { valueAsNumber: true })} type="number" step="0.1" className={inputClass} />
                </Field>
                <Field label="GPS Instrument Type" tag>
                  <select {...register('gps_instrument_type')} className={selectClass}>
                    <option>Mobile GPS</option>
                    <option>Handheld GPS device</option>
                    <option>Survey grade GPS</option>
                  </select>
                </Field>
                <Field label="GPS Accuracy Class" tag>
                  <select {...register('gps_accuracy_class')} className={selectClass}>
                    <option>Consumer (&lt;5m)</option>
                    <option>Survey grade (&lt;1m)</option>
                  </select>
                </Field>
                <Field label="Sampling Depth (cm)">
                  <input {...register('sampling_depth_cm', { valueAsNumber: true })} type="number" step="0.5" className={inputClass} placeholder="30" />
                </Field>
                <Field label="Soil Group">
                  <select {...register('soil_group')} className={selectClass}>
                    <option value="">Select</option>
                    <option>Vertisols</option>
                    <option>Inceptisols</option>
                    <option>Alfisols</option>
                    <option>Entisols</option>
                    <option>Ultisols</option>
                  </select>
                </Field>
                {watched.soil_group === 'Vertisols' && (
                  <Field label="Vertisol Moisture Condition" tag hint="Wet BD may be elevated">
                    <select {...register('vertisol_moisture_condition')} className={selectClass}>
                      <option>Dry</option>
                      <option>Moist</option>
                      <option>Wet</option>
                    </select>
                  </Field>
                )}
              </div>

              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-400 mb-3">NIR Results</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="NIR SOC %">
                    <input {...register('nir_soc_pct', { valueAsNumber: true })} type="number" step="0.001" className={inputClass} placeholder="1.234" />
                  </Field>
                  <Field label="NIR Bulk Density (g/cm³)">
                    <input {...register('nir_bulk_density', { valueAsNumber: true })} type="number" step="0.001" className={inputClass} placeholder="1.350" />
                  </Field>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input {...register('is_lab_crosscheck')} type="checkbox" id="lab_check" className="accent-emerald-500" />
                  <label htmlFor="lab_check" className="text-xs text-gray-300">This is a 10% lab cross-check sample</label>
                </div>
                {watched.is_lab_crosscheck && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                    <p className="text-xs text-purple-400 mb-2">Lab results can be entered after the sample is sent and received.</p>
                    <Field label="Lab Status">
                      <select {...register('lab_status')} className={selectClass}>
                        <option value="pending">Pending (not yet sent)</option>
                        <option value="sent">Sent to lab</option>
                        <option value="received">Results received</option>
                      </select>
                    </Field>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-400 mb-3">Satellite Cross-check</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Satellite Land Cover">
                    <input {...register('satellite_land_cover')} className={inputClass} placeholder="Auto-fetched from Sentinel-2" />
                  </Field>
                  <Field label="Land Cover Confirmed Cropland?">
                    <select {...register('satellite_land_cover_ok')} className={selectClass}>
                      <option value="true">Yes</option>
                      <option value="false">No — discrepancy</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab results modal */}
      {showLabForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Enter Lab Results</h2>
              <button onClick={() => setShowLabForm(null)} className="text-gray-600 hover:text-gray-300">✕</button>
            </div>
            <form onSubmit={labSubmit(onLabSave)} className="p-6 space-y-4">
              <Field label="Lab SOC %">
                <input {...labReg('soc_pct', { valueAsNumber: true })} type="number" step="0.001" className={inputClass} placeholder="1.234" />
              </Field>
              <Field label="Lab Bulk Density (g/cm³)">
                <input {...labReg('bulk_density', { valueAsNumber: true })} type="number" step="0.001" className={inputClass} placeholder="1.350" />
              </Field>
              <Field label="Fine Bulk Density (g/cm³)" tag hint="Required for Vertisol samples">
                <input {...labReg('fine_bulk_density', { valueAsNumber: true })} type="number" step="0.001" className={inputClass} placeholder="1.280" />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLabForm(null)} className="text-sm text-gray-500 hover:text-gray-300">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2 rounded-lg">Save Lab Results</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
