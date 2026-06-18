import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { baselineAPI } from '../../lib/api';
import { ChevronLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';

const YEARS = ['t-1', 't-2', 't-3'];

const TN_CROPS = [
  'Paddy (Rice)', 'Sugarcane', 'Cotton', 'Groundnut', 'Sunflower', 'Maize',
  'Sorghum', 'Pearl Millet', 'Finger Millet', 'Blackgram', 'Greengram',
  'Redgram', 'Banana', 'Coconut', 'Turmeric', 'Ginger', 'Tomato', 'Other',
];

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';
const selectClass = `${inputClass} cursor-pointer`;

const Field = ({ label, children, hint, required }) => (
  <div>
    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
  </div>
);

const Section = ({ title, children, tag }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-semibold text-gray-300">{title}</h3>
      {tag && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">NEW — Regrow</span>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  </div>
);

export default function BaselinePage() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [activeYear, setActiveYear] = useState('t-1');
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, reset } = useForm();
  const watched = watch();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await baselineAPI.list(farmId);
        const byYear = {};
        data.forEach(r => { byYear[r.year] = r; });
        setRecords(byYear);
        reset(byYear[activeYear] || { year: activeYear, farm_id: farmId });
      } catch (err) { console.error(err); }
    };
    load();
  }, [farmId]);

  useEffect(() => {
    reset(records[activeYear] || { year: activeYear, farm_id: farmId });
  }, [activeYear]);

  const onSave = async (data) => {
    setSaving(true);
    setSaved(false);
    try {
      await baselineAPI.upsert({ ...data, farm_id: farmId, year: activeYear });
      const { data: updated } = await baselineAPI.list(farmId);
      const byYear = {};
      updated.forEach(r => { byYear[r.year] = r; });
      setRecords(byYear);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onAttest = async () => {
    const record = records[activeYear];
    if (!record?.id) { alert('Save the record first'); return; }
    setAttesting(true);
    try {
      await baselineAPI.attest(record.id, { otp_verified: true, attestation_timestamp: new Date().toISOString() });
      const { data: updated } = await baselineAPI.list(farmId);
      const byYear = {};
      updated.forEach(r => { byYear[r.year] = r; });
      setRecords(byYear);
    } catch (err) {
      alert('Attestation failed');
    } finally {
      setAttesting(false);
    }
  };

  const currentRecord = records[activeYear];
  const isAttested = currentRecord?.farmer_otp_attested;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/farms/${farmId}`)} className="text-gray-600 hover:text-gray-300">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Baseline Data</h1>
          <p className="text-gray-500 text-sm">Module 2 — Historical data · 3 years pre-project</p>
        </div>
      </div>

      {/* Year tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {YEARS.map((y) => {
          const r = records[y];
          return (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeYear === y
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {y}
              {r?.farmer_otp_attested && (
                <CheckCircle size={11} className={activeYear === y ? 'text-white/70' : 'text-emerald-500'} />
              )}
            </button>
          );
        })}
      </div>

      {isAttested && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5 mb-4 text-sm text-emerald-400">
          <CheckCircle size={14} />
          Farmer has attested this year's baseline via OTP · {currentRecord?.attestation_method}
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)}>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-8">

          {/* Crop Info */}
          <Section title="Crop Information">
            <Field label="Crop Type" required>
              <select {...register('crop_type')} className={selectClass} disabled={isAttested}>
                <option value="">Select crop</option>
                {TN_CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Crop Year Label" hint="Auto-built e.g. Kharif 2023">
              <input {...register('crop_year_label')} className={inputClass} placeholder="Kharif 2023" disabled={isAttested} />
            </Field>
            <Field label="Planting Month">
              <input {...register('planting_month')} type="month" className={inputClass} disabled={isAttested} />
            </Field>
            <Field label="Harvest Month">
              <input {...register('harvest_month')} type="month" className={inputClass} disabled={isAttested} />
            </Field>
            <Field label="Crop Yield (t/ha)">
              <input {...register('crop_yield_t_ha')} type="number" step="0.01" className={inputClass} placeholder="e.g. 4.5" disabled={isAttested} />
            </Field>
            <Field label="Fallow Period?" tag>
              <select {...register('fallow_period')} className={selectClass} disabled={isAttested}>
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {watched.fallow_period === 'true' && (
              <Field label="Fallow Duration (weeks)" tag>
                <input {...register('fallow_duration_weeks')} type="number" className={inputClass} disabled={isAttested} />
              </Field>
            )}
            <Field label="Perennial Crop?" tag>
              <select {...register('is_perennial')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.is_perennial === 'true' && (
              <>
                <Field label="Year Perennial Planted" tag>
                  <input {...register('perennial_planted_year')} type="number" className={inputClass} placeholder="e.g. 2018" disabled={isAttested} />
                </Field>
                <Field label="Canopy Cover %" tag>
                  <select {...register('canopy_cover_pct')} className={selectClass} disabled={isAttested}>
                    <option>&lt;25%</option>
                    <option>25–50%</option>
                    <option>50–75%</option>
                    <option>&gt;75%</option>
                  </select>
                </Field>
              </>
            )}
          </Section>

          {/* Cover Crop */}
          <Section title="Cover Crop">
            <Field label="Cover Crop Used?">
              <select {...register('cover_crop_used')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.cover_crop_used === 'true' && (
              <>
                <Field label="Cover Crop Species">
                  <input {...register('cover_crop_species')} className={inputClass} placeholder="e.g. Dhaincha" disabled={isAttested} />
                </Field>
                <Field label="Duration in Field (weeks)" tag>
                  <input {...register('cover_crop_duration_weeks')} type="number" className={inputClass} disabled={isAttested} />
                </Field>
              </>
            )}
          </Section>

          {/* Tillage */}
          <Section title="Tillage">
            <Field label="Tillage Done?">
              <select {...register('tillage_done')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.tillage_done === 'true' && (
              <>
                <Field label="Tillage Type">
                  <select {...register('tillage_type')} className={selectClass} disabled={isAttested}>
                    <option>Conventional</option>
                    <option>Minimum</option>
                    <option>Strip</option>
                    <option>No-till</option>
                  </select>
                </Field>
                <Field label="Tillage Depth">
                  <select {...register('tillage_depth')} className={selectClass} disabled={isAttested}>
                    <option>Shallow &lt;10cm</option>
                    <option>Medium 10–20cm</option>
                    <option>Deep &gt;20cm</option>
                  </select>
                </Field>
                <Field label="Tillage Frequency">
                  <select {...register('tillage_frequency')} className={selectClass} disabled={isAttested}>
                    <option>1</option><option>2</option><option>3+</option>
                  </select>
                </Field>
                <Field label="% Soil Area Disturbed">
                  <select {...register('pct_soil_area_disturbed')} className={selectClass} disabled={isAttested}>
                    <option>&lt;10%</option><option>10–30%</option><option>30–70%</option><option>&gt;70%</option>
                  </select>
                </Field>
                <Field label="Soil Inverted?" tag>
                  <select {...register('soil_inverted')} className={selectClass} disabled={isAttested}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </Field>
                <Field label="Residue Cover After Tillage" tag>
                  <select {...register('residue_cover_after_tillage_pct')} className={selectClass} disabled={isAttested}>
                    <option>&lt;15%</option><option>15–30%</option><option>&gt;30%</option>
                  </select>
                </Field>
              </>
            )}
          </Section>

          {/* Residue */}
          <Section title="Crop Residue">
            <Field label="Residue Removed?">
              <select {...register('residue_removed')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.residue_removed === 'true' && (
              <Field label="% Residue Removed">
                <select {...register('pct_residue_removed')} className={selectClass} disabled={isAttested}>
                  <option value="0">0%</option><option value="25">25%</option>
                  <option value="50">50%</option><option value="75">75%</option>
                  <option value="100">100%</option>
                </select>
              </Field>
            )}
            <Field label="Residue Harvested for Sale?" tag>
              <select {...register('residue_harvested_for_sale')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.residue_harvested_for_sale === 'true' && (
              <Field label="Quantity Harvested (t/ha)" tag>
                <input {...register('qty_residue_harvested_t_ha')} type="number" step="0.01" className={inputClass} disabled={isAttested} />
              </Field>
            )}
            <Field label="Residue Burned?">
              <select {...register('residue_burned')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
          </Section>

          {/* Fertilizer */}
          <Section title="Fertilizer">
            <Field label="Synthetic Fertilizer Used?">
              <select {...register('synthetic_fertilizer_used')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            {watched.synthetic_fertilizer_used === 'true' && (
              <>
                <Field label="Fertilizer Product">
                  <select {...register('fertilizer_product')} className={selectClass} disabled={isAttested}>
                    <option>Urea</option><option>DAP</option><option>NPK</option>
                    <option>Ammonium Sulphate</option><option>Other</option>
                  </select>
                </Field>
                <Field label="N Rate (kg N/ha)">
                  <select {...register('n_application_rate_kg_ha')} className={selectClass} disabled={isAttested}>
                    <option>&lt;50</option><option>50–100</option>
                    <option>100–150</option><option>150–200</option><option>&gt;200</option>
                  </select>
                </Field>
                <Field label="Application Method" tag>
                  <select {...register('application_method')} className={selectClass} disabled={isAttested}>
                    <option>Broadcast</option><option>Fertigation</option>
                    <option>Injected</option><option>Banded</option>
                  </select>
                </Field>
                {(watched.application_method === 'Injected' || watched.application_method === 'Banded') && (
                  <Field label="Application Depth (cm)" tag>
                    <input {...register('application_depth_cm')} type="number" step="0.5" className={inputClass} disabled={isAttested} />
                  </Field>
                )}
                {watched.application_method === 'Fertigation' && (
                  <Field label="Water with Fertigation (l/ha)" tag>
                    <input {...register('water_with_fertigation_l_ha')} type="number" className={inputClass} disabled={isAttested} />
                  </Field>
                )}
                <Field label="Nitrification Inhibitor?" tag>
                  <select {...register('nitrification_inhibitor_used')} className={selectClass} disabled={isAttested}>
                    <option value="false">No</option><option value="true">Yes</option>
                  </select>
                </Field>
                <Field label="Urease Inhibitor?" tag>
                  <select {...register('urease_inhibitor_used')} className={selectClass} disabled={isAttested}>
                    <option value="false">No</option><option value="true">Yes</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Organic Fertilizer Used?">
              <select {...register('organic_fertilizer_used')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            {watched.organic_fertilizer_used === 'true' && (
              <>
                <Field label="Organic Input Type">
                  <select {...register('organic_input_type')} className={selectClass} disabled={isAttested}>
                    <option>FYM</option><option>Compost</option><option>Vermicompost</option>
                    <option>Poultry Manure</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Organic Input Rate (kg/ha)">
                  <select {...register('organic_input_rate_kg_ha')} className={selectClass} disabled={isAttested}>
                    <option>&lt;1000</option><option>1000–3000</option>
                    <option>3000–5000</option><option>&gt;5000</option>
                  </select>
                </Field>
              </>
            )}
          </Section>

          {/* Irrigation */}
          <Section title="Irrigation">
            <Field label="Irrigation Done?">
              <select {...register('irrigation_done')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            {watched.irrigation_done === 'true' && (
              <>
                <Field label="Irrigation Method">
                  <select {...register('irrigation_method')} className={selectClass} disabled={isAttested}>
                    <option>Flood</option><option>Drip</option><option>Sprinkler</option>
                    <option>Furrow</option><option>Subsurface Drip</option>
                  </select>
                </Field>
                <Field label="Start Month" tag>
                  <input {...register('irrigation_start_month')} type="month" className={inputClass} disabled={isAttested} />
                </Field>
                <Field label="End Month" tag>
                  <input {...register('irrigation_end_month')} type="month" className={inputClass} disabled={isAttested} />
                </Field>
                <Field label="No. of Cycles" tag>
                  <input {...register('irrigation_cycles')} type="number" className={inputClass} disabled={isAttested} />
                </Field>
                {watched.irrigation_method === 'Subsurface Drip' && (
                  <Field label="Subsurface Drip Depth (cm)" tag>
                    <input {...register('subsurface_drip_depth_cm')} type="number" className={inputClass} disabled={isAttested} />
                  </Field>
                )}
                <Field label="% Field Flooded" tag>
                  <select {...register('pct_field_flooded')} className={selectClass} disabled={isAttested}>
                    <option value="0">0%</option><option value="25">25%</option>
                    <option value="50">50%</option><option value="75">75%</option>
                    <option value="100">100%</option>
                  </select>
                </Field>
              </>
            )}
          </Section>

          {/* Liming & Livestock */}
          <Section title="Liming & Livestock">
            <Field label="Liming Done?">
              <select {...register('liming_done')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            {watched.liming_done === 'true' && (
              <>
                <Field label="Liming Material">
                  <select {...register('liming_material')} className={selectClass} disabled={isAttested}>
                    <option>Calcitic</option><option>Dolomite</option>
                  </select>
                </Field>
                <Field label="Liming Rate (kg/ha)">
                  <input {...register('liming_rate_kg_ha')} type="number" className={inputClass} disabled={isAttested} />
                </Field>
              </>
            )}
            <Field label="Livestock Present?">
              <select {...register('livestock_present')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            {watched.livestock_present === 'true' && (
              <>
                <Field label="Livestock Type">
                  <select {...register('livestock_type')} className={selectClass} disabled={isAttested}>
                    <option>Cattle</option><option>Buffalo</option><option>Sheep</option>
                    <option>Goat</option><option>Poultry</option>
                  </select>
                </Field>
                <Field label="Stocking Rate (animals/ha)">
                  <input {...register('stocking_rate')} type="number" step="0.1" className={inputClass} disabled={isAttested} />
                </Field>
                <Field label="Grazing Duration (days/year)">
                  <input {...register('grazing_duration_days')} type="number" className={inputClass} disabled={isAttested} />
                </Field>
              </>
            )}
            <Field label="Biomass Burned?">
              <select {...register('biomass_burned')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
          </Section>

          {/* Evidence & Source */}
          <Section title="Evidence & Data Source" tag>
            <Field label="Documentary Evidence Uploaded?">
              <select {...register('documentary_evidence_uploaded')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            <Field label="Govt Estimate Used as Source?" tag>
              <select {...register('govt_estimate_used')} className={selectClass} disabled={isAttested}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </Field>
            {watched.govt_estimate_used === 'true' && (
              <Field label="Govt Data Source Name" tag>
                <input {...register('govt_data_source')} className={inputClass} placeholder="e.g. TN Agri Dept district census 2021" disabled={isAttested} />
              </Field>
            )}
          </Section>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                <CheckCircle size={14} />
                Saved
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {currentRecord?.id && !isAttested && (
              <button
                type="button"
                onClick={onAttest}
                disabled={attesting}
                className="flex items-center gap-1.5 text-sm text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 px-4 py-2 rounded-lg transition-colors"
              >
                {attesting ? 'Attesting...' : '📱 Farmer OTP Attest'}
              </button>
            )}
            {!isAttested && (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
