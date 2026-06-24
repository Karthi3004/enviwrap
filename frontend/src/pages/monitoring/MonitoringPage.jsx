import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { monitoringAPI } from '../../lib/api';
import { ChevronLeft, Plus, Activity, Satellite, AlertTriangle, CheckCircle, Save, MapPin } from 'lucide-react';

const inputClass = 'w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-500';
const selectClass = `${inputClass} cursor-pointer`;

const Field = ({ label, children, hint, tag }) => (
  <div>
    <label className="block text-[10px] font-medium text-stone-500 uppercase tracking-wide mb-1.5">
      {label}
      {tag && <span className="ml-1.5 text-[9px] bg-emerald-500/10 text-emerald-700 px-1 py-0.5 rounded">NEW</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-stone-500 mt-1">{hint}</p>}
  </div>
);

const SatelliteFlag = ({ label, match, satellite, reported, unit = '' }) => {
  if (match === null || match === undefined) return null;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${match ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
      {match
        ? <CheckCircle size={12} className="text-emerald-700 mt-0.5 flex-shrink-0" />
        : <AlertTriangle size={12} className="text-amber-700 mt-0.5 flex-shrink-0" />
      }
      <div>
        <p className={`font-medium ${match ? 'text-emerald-700' : 'text-amber-700'}`}>{label}</p>
        <p className="text-stone-500 mt-0.5">
          Satellite: <span className="text-stone-700">{satellite}{unit}</span>
          {reported !== undefined && <> · Reported: <span className="text-stone-700">{reported}{unit}</span></>}
        </p>
      </div>
    </div>
  );
};

export default function MonitoringPage() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('annual');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      cover_crop_used: 'false',
      tillage_done: 'false',
      irrigation_done: 'false',
      synthetic_fertilizer_used: 'false',
      organic_fertilizer_used: 'false',
      residue_removed: 'false',
      residue_burned: 'false',
      residue_harvested_for_sale: 'false',
      is_perennial: 'false',
      fallow_period_this_year: 'false',
    },
  });
  const { register: siteReg, handleSubmit: siteSubmit, reset: siteReset } = useForm();
  const watched = watch();

  useEffect(() => { loadVisits(); }, [farmId]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const { data } = await monitoringAPI.list(farmId);
      setVisits(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const onSaveVisit = async (data) => {
    setSaving(true);
    try {
      await monitoringAPI.create({ ...data, farm_id: farmId });
      await loadVisits();
      setShowForm(false);
      reset();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const onSaveSiteVisit = async (data) => {
    setSaving(true);
    try {
      await monitoringAPI.createSiteVisit({ ...data, farm_id: farmId });
      await loadVisits();
      setShowForm(false);
      siteReset();
    } catch (err) {
      alert('Site visit save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/farms/${farmId}`)} className="text-stone-500 hover:text-stone-900">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Monitoring</h1>
            <p className="text-stone-500 text-sm">Module 4 — Annual farm visits & satellite verification</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); reset(); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Visit
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-stone-200 rounded-xl p-1 w-fit">
        {[
          { id: 'annual', label: 'Annual Visits', icon: Activity },
          { id: 'site', label: 'Formal Site Visits', icon: MapPin },
          { id: 'satellite', label: 'Satellite Alerts', icon: Satellite },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:text-stone-900'}`}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Annual visits list */}
      {activeTab === 'annual' && (
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse h-20"></div>
            ))
          ) : visits.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-500">
              No visits recorded yet.
            </div>
          ) : (
            visits.map((v) => (
              <div key={v.id}
                onClick={() => setSelected(selected?.id === v.id ? null : v)}
                className="bg-white border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-stone-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-900">{v.visit_date}</span>
                      {v.crop_year_label && <span className="text-xs text-stone-500">{v.crop_year_label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {v.crop_type && <span className="text-[10px] bg-stone-50 text-stone-600 px-2 py-0.5 rounded">{v.crop_type}</span>}
                      {v.tillage_done && <span className="text-[10px] bg-stone-50 text-stone-600 px-2 py-0.5 rounded">Tillage: {v.tillage_type}</span>}
                      {v.irrigation_done && <span className="text-[10px] bg-stone-50 text-stone-600 px-2 py-0.5 rounded">{v.irrigation_method}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {v.satellite_crop_match === false && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">Crop mismatch</span>
                    )}
                    {v.satellite_tillage_match === false && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">Tillage mismatch</span>
                    )}
                    {v.satellite_crop_match !== false && v.satellite_tillage_match !== false && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full">Satellite OK</span>
                    )}
                  </div>
                </div>

                {selected?.id === v.id && (
                  <div className="mt-4 pt-4 border-t border-stone-200 space-y-2">
                    <p className="text-xs font-semibold text-stone-600 mb-2">Satellite Cross-verification</p>
                    <SatelliteFlag label="Crop Type" match={v.satellite_crop_match} satellite={v.satellite_crop_type} reported={v.crop_type} />
                    <SatelliteFlag label="Planting Date" match={v.planting_date_discrepancy_days <= 30} satellite={v.satellite_planting_date} reported={v.planting_date} />
                    <SatelliteFlag label="Harvest Date" match={v.harvest_date_discrepancy_days <= 30} satellite={v.satellite_harvest_date} reported={v.harvest_date} />
                    <SatelliteFlag label="Tillage Confidence" match={v.satellite_tillage_match} satellite={v.satellite_tillage_score} unit=" score" />
                    <SatelliteFlag label="Residue Cover" match={!v.residue_cover_discrepancy_flag} satellite={v.satellite_residue_cover_pct} reported={v.reported_residue_cover_pct} unit="%" />
                    <SatelliteFlag label="Cover Crop Persistence" match={!v.cover_crop_persistence_flag} satellite={v.satellite_cover_crop_weeks} reported={v.cover_crop_persistence_weeks} unit=" weeks" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Satellite alerts tab */}
      {activeTab === 'satellite' && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs text-stone-500 mb-4">Sentinel-2 & Sentinel-1 SAR cross-checks for this farm. Populated automatically by the satellite processing job.</p>
          {visits.filter(v =>
            v.satellite_crop_match === false ||
            v.satellite_tillage_match === false ||
            v.residue_cover_discrepancy_flag ||
            v.cover_crop_persistence_flag ||
            v.planting_date_discrepancy_days > 30 ||
            v.harvest_date_discrepancy_days > 30
          ).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-stone-500">No satellite discrepancies for this farm</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((v) => (
                <div key={v.id}>
                  {v.satellite_crop_match === false && (
                    <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <AlertTriangle size={14} className="text-amber-700" />
                      <div>
                        <p className="text-xs font-medium text-amber-700">Crop Type Mismatch · {v.visit_date}</p>
                        <p className="text-xs text-stone-500">Satellite: {v.satellite_crop_type} · Reported: {v.crop_type}</p>
                      </div>
                    </div>
                  )}
                  {v.satellite_tillage_match === false && (
                    <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <AlertTriangle size={14} className="text-amber-700" />
                      <div>
                        <p className="text-xs font-medium text-amber-700">Tillage Mismatch · {v.visit_date}</p>
                        <p className="text-xs text-stone-500">Satellite score: {v.satellite_tillage_score} · Reported: {v.tillage_type}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Annual visit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-stone-200 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 sticky top-0 bg-white z-10">
              <h2 className="text-sm font-semibold text-stone-900">Annual Farm Visit Record</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-500 hover:text-stone-900">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSaveVisit)} className="p-6 space-y-6">

              {/* Basic */}
              <div>
                <p className="text-xs font-semibold text-stone-700 mb-3">Visit Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Visit Date">
                    <input {...register('visit_date')} type="date" className={inputClass} required />
                  </Field>
                  <Field label="Crop Type">
                    <input {...register('crop_type')} className={inputClass} placeholder="e.g. Paddy" />
                  </Field>
                  <Field label="Crop Year Label" tag>
                    <input {...register('crop_year_label')} className={inputClass} placeholder="Kharif 2025" />
                  </Field>
                  <Field label="Crop Yield (t/ha)">
                    <input {...register('crop_yield_t_ha', { valueAsNumber: true })} type="number" step="0.01" className={inputClass} />
                  </Field>
                  <Field label="Fallow Period?" tag>
                    <select {...register('fallow_period_this_year')} className={selectClass}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </Field>
                  {watched.fallow_period_this_year === 'true' && (
                    <Field label="Fallow Duration (weeks)" tag>
                      <input {...register('fallow_duration_weeks', { valueAsNumber: true })} type="number" className={inputClass} />
                    </Field>
                  )}
                  <Field label="Planting Date">
                    <input {...register('planting_date')} type="date" className={inputClass} />
                  </Field>
                  <Field label="Harvest Date">
                    <input {...register('harvest_date')} type="date" className={inputClass} />
                  </Field>
                </div>
              </div>

              {/* Tillage */}
              <div className="border-t border-stone-200 pt-5">
                <p className="text-xs font-semibold text-stone-700 mb-3">Tillage</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tillage Done?">
                    <select {...register('tillage_done')} className={selectClass}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </Field>
                  {watched.tillage_done === 'true' && (
                    <>
                      <Field label="Tillage Type">
                        <select {...register('tillage_type')} className={selectClass}>
                          <option>Conventional</option><option>Minimum</option>
                          <option>Strip</option><option>No-till</option>
                        </select>
                      </Field>
                      <Field label="Soil Inverted?" tag>
                        <select {...register('soil_inverted')} className={selectClass}>
                          <option value="false">No</option><option value="true">Yes</option>
                        </select>
                      </Field>
                      <Field label="Residue Cover After Tillage" tag>
                        <select {...register('residue_cover_after_tillage_pct')} className={selectClass}>
                          <option>&lt;15%</option><option>15–30%</option><option>&gt;30%</option>
                        </select>
                      </Field>
                      <Field label="Reported Residue Cover %">
                        <input {...register('reported_residue_cover_pct', { valueAsNumber: true })} type="number" min={0} max={100} className={inputClass} />
                      </Field>
                    </>
                  )}
                </div>
              </div>

              {/* Irrigation */}
              <div className="border-t border-stone-200 pt-5">
                <p className="text-xs font-semibold text-stone-700 mb-3">Irrigation</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Irrigation Done?">
                    <select {...register('irrigation_done')} className={selectClass}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </Field>
                  {watched.irrigation_done === 'true' && (
                    <>
                      <Field label="Irrigation Method">
                        <select {...register('irrigation_method')} className={selectClass}>
                          <option>Flood</option><option>Drip</option><option>Sprinkler</option>
                          <option>Furrow</option><option>Subsurface Drip</option>
                        </select>
                      </Field>
                      <Field label="Start Date" tag>
                        <input {...register('irrigation_start_date')} type="date" className={inputClass} />
                      </Field>
                      <Field label="End Date" tag>
                        <input {...register('irrigation_end_date')} type="date" className={inputClass} />
                      </Field>
                      <Field label="No. of Cycles" tag>
                        <input {...register('irrigation_cycles', { valueAsNumber: true })} type="number" className={inputClass} />
                      </Field>
                      <Field label="% Field Flooded" tag>
                        <select {...register('pct_field_flooded')} className={selectClass}>
                          <option value="0">0%</option><option value="25">25%</option>
                          <option value="50">50%</option><option value="75">75%</option>
                          <option value="100">100%</option>
                        </select>
                      </Field>
                    </>
                  )}
                </div>
              </div>

              {/* Fertilizer */}
              <div className="border-t border-stone-200 pt-5">
                <p className="text-xs font-semibold text-stone-700 mb-3">Fertilizer</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Synthetic Fertilizer?">
                    <select {...register('synthetic_fertilizer_used')} className={selectClass}>
                      <option value="false">No</option><option value="true">Yes</option>
                    </select>
                  </Field>
                  {watched.synthetic_fertilizer_used === 'true' && (
                    <>
                      <Field label="N Rate (kg N/ha)">
                        <select {...register('n_application_rate_kg_ha')} className={selectClass}>
                          <option>&lt;50</option><option>50–100</option><option>100–150</option><option>&gt;150</option>
                        </select>
                      </Field>
                      <Field label="Application Method" tag>
                        <select {...register('application_method')} className={selectClass}>
                          <option>Broadcast</option><option>Fertigation</option>
                          <option>Injected</option><option>Banded</option>
                        </select>
                      </Field>
                      <Field label="Nitrification Inhibitor?" tag>
                        <select {...register('nitrification_inhibitor_used')} className={selectClass}>
                          <option value="false">No</option><option value="true">Yes</option>
                        </select>
                      </Field>
                      <Field label="Urease Inhibitor?" tag>
                        <select {...register('urease_inhibitor_used')} className={selectClass}>
                          <option value="false">No</option><option value="true">Yes</option>
                        </select>
                      </Field>
                    </>
                  )}
                </div>
              </div>

              {/* Evidence */}
              <div className="border-t border-stone-200 pt-5">
                <p className="text-xs font-semibold text-stone-700 mb-3">Evidence</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Video Evidence URL" tag>
                    <input {...register('video_evidence_url')} className={inputClass} placeholder="Upload URL or storage path" />
                  </Field>
                  <Field label="Tractor Log Photo URL" tag>
                    <input {...register('tractor_log_photo_url')} className={inputClass} placeholder="Upload URL or storage path" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 hover:text-stone-900 px-4 py-2">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg">
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
