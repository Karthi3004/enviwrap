import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { farmAPI } from '../../lib/api';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Farm Identity' },
  { id: 2, label: 'Field Boundary' },
  { id: 3, label: 'Characteristics' },
  { id: 4, label: 'Review' },
];

const TN_DISTRICTS = [
  'Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri',
  'Dindigul','Erode','Kallakurichi','Kancheepuram','Kanniyakumari','Karur',
  'Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal',
  'Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem',
  'Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli',
  'Tirunelveli','Tirupathur','Tiruppur','Tiruvallur','Tiruvannamalai',
  'Tiruvarur','Vellore','Villupuram','Virudhunagar'
];

const TN_CROPS = [
  'Paddy (Rice)','Sugarcane','Cotton','Groundnut','Sunflower','Maize',
  'Sorghum (Jowar)','Pearl Millet (Bajra)','Finger Millet (Ragi)',
  'Blackgram','Greengram','Redgram','Horsegram','Soybean',
  'Turmeric','Ginger','Banana','Coconut','Mango','Tamarind','Neem'
];

const inputClass = 'w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30';
const selectClass = `${inputClass} cursor-pointer`;

const Field = ({ label, error, children, required, hint }) => (
  <div>
    <label className="block text-xs font-medium text-stone-600 mb-1.5">
      {label} {required && <span className="text-red-700">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[10px] text-stone-500 mt-1">{hint}</p>}
    {error && <p className="text-[10px] text-red-700 mt-1">{error}</p>}
  </div>
);

export default function FarmEnrolPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      state: 'Tamil Nadu',
      boundary_satellite_match: 'Yes',
      overlap_detected: false,
      non_ag_land_exclusion: false,
      excluded_area_ha: 0,
      land_type: 'Cropland',
      crop_system_type: 'Annual',
      irrigation_source: 'Rainfed',
      slope_class: 'Flat',
    }
  });

  const watched = watch();

  // Map field names to the step they live on, so we can jump the user
  // to the right step if validation fails on submit.
  const stepOfField = {
    farmer_full_name: 1, farmer_phone: 1, aadhaar_last4: 1, district: 1, block_taluk: 1, village: 1,
    primary_crop: 3, crop_system_type: 3,
  };

  // Users can move freely between steps — no forced order, no validation gate.
  const goToStep = (id) => setStep(id);
  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await farmAPI.create(data);
      setResult(res.data);
      setStep(5);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to enrol farm');
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = (formErrors) => {
    // Jump to the earliest step that contains a validation error.
    const erroredSteps = Object.keys(formErrors).map(name => stepOfField[name] || 1);
    if (erroredSteps.length) setStep(Math.min(...erroredSteps));
  };

  // Success screen
  if (step === 5 && result) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">Farm Enrolled!</h2>
          <p className="text-stone-500 text-sm mb-3">Farm ID assigned:</p>
          <div className="font-mono text-2xl text-emerald-700 font-bold bg-emerald-500/10 rounded-xl py-3 px-4 mb-6">
            {result.farm?.farm_id}
          </div>
          {result.qaqc?.summary?.total > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-700" />
                <span className="text-sm font-medium text-amber-700">QA/QC Flags</span>
              </div>
              <p className="text-xs text-stone-600">
                {result.qaqc.summary.blocks} blockers · {result.qaqc.summary.errors} errors · {result.qaqc.summary.warnings} warnings
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/farms')} className="flex-1 px-4 py-3 text-sm text-stone-600 border border-stone-300 rounded-xl hover:border-stone-400">
              Farm List
            </button>
            <button onClick={() => navigate(`/farms/${result.farm?.id}`)} className="flex-1 px-4 py-3 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium">
              View Farm →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? prevStep() : navigate('/farms')} className="text-stone-500 hover:text-stone-900 p-1">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-900">Enrol New Farm</h1>
          <p className="text-stone-500 text-xs">Module 1 — Farm & Field Identity</p>
        </div>
      </div>

      {/* Stepper — click any step to jump directly, in any order */}
      <div className="flex items-center mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => goToStep(s.id)}
              className={`flex items-center gap-1.5 ${step === s.id ? 'text-stone-900' : step > s.id ? 'text-emerald-700' : 'text-stone-500'} hover:text-emerald-700 transition-colors`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all flex-shrink-0 ${
                step === s.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' :
                step > s.id ? 'border-emerald-500 bg-emerald-500 text-white' :
                'border-stone-300 text-stone-500'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="text-xs font-medium whitespace-nowrap hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-10 h-px mx-1.5 sm:mx-2 transition-colors flex-shrink-0 ${step > s.id ? 'bg-emerald-500/50' : 'bg-stone-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6">

          {/* Step 1 — Farm Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">1A — Farm Identity</h2>
              <Field label="Farmer Full Name" required error={errors.farmer_full_name?.message}>
                <input {...register('farmer_full_name', { required: 'Required' })} className={inputClass} placeholder="e.g. Murugan Ramasamy" />
              </Field>
              <Field label="Phone Number" required error={errors.farmer_phone?.message} hint="10 digits">
                <input {...register('farmer_phone', { required: 'Required', pattern: { value: /^\d{10}$/, message: '10 digits required' } })} className={inputClass} placeholder="9876543210" maxLength={10} inputMode="numeric" />
              </Field>
              <Field label="Aadhaar (last 4 digits)" required error={errors.aadhaar_last4?.message}>
                <input {...register('aadhaar_last4', { required: 'Required', pattern: { value: /^\d{4}$/, message: '4 digits only' } })} className={inputClass} placeholder="XXXX" maxLength={4} inputMode="numeric" />
              </Field>
              <Field label="District" required error={errors.district?.message}>
                <select {...register('district', { required: 'Required' })} className={selectClass}>
                  <option value="">Select district</option>
                  {TN_DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Block / Taluk" required error={errors.block_taluk?.message}>
                <input {...register('block_taluk', { required: 'Required' })} className={inputClass} placeholder="e.g. Annur" />
              </Field>
              <Field label="Village" required error={errors.village?.message}>
                <input {...register('village', { required: 'Required' })} className={inputClass} placeholder="e.g. Karumathampatty" />
              </Field>
              <Field label="State">
                <input value="Tamil Nadu" disabled className={`${inputClass} opacity-40`} />
              </Field>
              <Field label="Cadastral / Revenue Reference" hint="Survey number or Patta number">
                <input {...register('cadastral_reference')} className={inputClass} placeholder="e.g. S.No. 123/4A" />
              </Field>
            </div>
          )}

          {/* Step 2 — Field Boundary */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-stone-900 mb-2">1B — Field Boundary</h2>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-blue-700 font-medium mb-1">GPS Boundary</p>
                <p className="text-xs text-stone-500">Walk the field perimeter — GPS coordinates are captured per vertex. Area is auto-calculated.</p>
              </div>
              <Field label="GPS Accuracy (metres)" hint="Flag if >5m accuracy">
                <input {...register('gps_accuracy_metres', { valueAsNumber: true })} type="number" step="0.1" className={inputClass} placeholder="e.g. 3.2" inputMode="decimal" />
              </Field>
              <Field label="Land Type" required>
                <select {...register('land_type')} className={selectClass}>
                  <option>Cropland</option>
                  <option>Grassland</option>
                </select>
              </Field>
              <Field label="Boundary Matches Satellite?">
                <select {...register('boundary_satellite_match')} className={selectClass}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Partially">Partially</option>
                </select>
              </Field>
              {(watched.boundary_satellite_match === 'No' || watched.boundary_satellite_match === 'Partially') && (
                <Field label="Boundary Discrepancy Note" required>
                  <textarea {...register('boundary_discrepancy_note')} className={`${inputClass} resize-none`} rows={2} placeholder="Describe the discrepancy..." />
                </Field>
              )}
              <Field label="Non-Agricultural Land in Polygon?">
                <select {...register('non_ag_land_exclusion')} className={selectClass}>
                  <option value="false">No</option>
                  <option value="true">Yes — homestead / road / water body present</option>
                </select>
              </Field>
              {watched.non_ag_land_exclusion === 'true' && (
                <Field label="Excluded Area (ha)">
                  <input {...register('excluded_area_ha', { valueAsNumber: true })} type="number" step="0.01" className={inputClass} placeholder="0.00" inputMode="decimal" />
                </Field>
              )}
              <Field label="Overlap with Existing Farm?">
                <select {...register('overlap_detected')} className={selectClass}>
                  <option value="false">No overlap</option>
                  <option value="true">Overlap detected</option>
                </select>
              </Field>
            </div>
          )}

          {/* Step 3 — Farm Characteristics */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-stone-900 mb-4">1C — Farm Characteristics</h2>
              <Field label="Primary Crop" required error={errors.primary_crop?.message}>
                <select {...register('primary_crop', { required: 'Required' })} className={selectClass}>
                  <option value="">Select crop</option>
                  {TN_CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Secondary Crop">
                <select {...register('secondary_crop')} className={selectClass}>
                  <option value="">None</option>
                  {TN_CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Crop System Type" required>
                <select {...register('crop_system_type')} className={selectClass}>
                  <option>Annual</option>
                  <option>Perennial</option>
                  <option>Mixed</option>
                </select>
              </Field>
              <Field label="Irrigation Source" required>
                <select {...register('irrigation_source')} className={selectClass}>
                  {['Rainfed','Borewell','Canal','Tank','Drip','Sprinkler','None'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Slope Class" required>
                <select {...register('slope_class')} className={selectClass}>
                  <option>Flat</option><option>Gentle</option>
                  <option>Moderate</option><option>Steep</option>
                </select>
              </Field>
              <Field label="IPCC Climate Zone">
                <select {...register('ipcc_climate_zone')} className={selectClass}>
                  <option value="">Select</option>
                  <option>Warm Temperate Dry</option>
                  <option>Warm Temperate Moist</option>
                  <option>Tropical Dry</option>
                  <option>Tropical Moist</option>
                  <option>Tropical Wet</option>
                </select>
              </Field>
              <Field label="FAO Soil Group (WRB)">
                <select {...register('fao_soil_group')} className={selectClass}>
                  <option value="">Select</option>
                  <option>Vertisols</option><option>Inceptisols</option>
                  <option>Alfisols</option><option>Entisols</option>
                  <option>Aridisols</option><option>Ultisols</option>
                </select>
              </Field>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-900 mb-4">Review & Submit</h2>
              <div className="space-y-0">
                {[
                  ['Farmer Name', watched.farmer_full_name],
                  ['Phone', watched.farmer_phone],
                  ['Aadhaar Last 4', watched.aadhaar_last4],
                  ['Village', watched.village],
                  ['Block / Taluk', watched.block_taluk],
                  ['District', watched.district],
                  ['Land Type', watched.land_type],
                  ['Primary Crop', watched.primary_crop],
                  ['Crop System', watched.crop_system_type],
                  ['Irrigation', watched.irrigation_source],
                  ['Slope', watched.slope_class],
                  ['IPCC Zone', watched.ipcc_climate_zone],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-stone-200">
                    <span className="text-xs text-stone-500">{label}</span>
                    <span className="text-xs text-stone-800 font-medium text-right ml-4">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  Farm ID auto-generated on submission. QA/QC rules run automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav — Previous / Next always available, data is preserved across steps */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => step > 1 ? prevStep() : navigate('/farms')}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 py-2 px-3"
          >
            <ChevronLeft size={15} />
            {step > 1 ? 'Previous' : 'Cancel'}
          </button>
          <div className="flex items-center gap-3">
            {step < 4 && (
              <button type="button" onClick={nextStep}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
                Next <ChevronRight size={15} />
              </button>
            )}
            {step === 4 && (
              <button type="submit" disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all">
                {submitting ? 'Enrolling...' : 'Enrol Farm'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
