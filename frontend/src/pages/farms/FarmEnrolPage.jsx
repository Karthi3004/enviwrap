import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { farmAPI } from '../../lib/api';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Farm Identity', fields: '1A' },
  { id: 2, label: 'Field Boundary', fields: '1B' },
  { id: 3, label: 'Farm Characteristics', fields: '1C' },
  { id: 4, label: 'Review & Submit', fields: '' },
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

const Field = ({ label, error, children, required, hint }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
  </div>
);

const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30";
const selectClass = `${inputClass} cursor-pointer`;

export default function FarmEnrolPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors }, getValues, trigger } = useForm({
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

  const nextStep = async () => {
    const fieldsPerStep = {
      1: ['farmer_full_name', 'farmer_phone', 'aadhaar_last4', 'village', 'district'],
      2: ['land_type'],
      3: ['primary_crop', 'crop_system_type'],
    };
    const valid = await trigger(fieldsPerStep[step] || []);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await farmAPI.create(data);
      setResult(res.data);
      setStep(5); // success screen
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to enrol farm');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 5 && result) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Farm Enrolled</h2>
          <p className="text-gray-400 text-sm mb-1">Farm ID assigned:</p>
          <div className="font-mono text-2xl text-emerald-400 font-bold mb-6">{result.farm?.farm_id}</div>
          {result.qaqc?.summary?.total > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-amber-400">QA/QC Flags Raised</span>
              </div>
              <p className="text-xs text-gray-400">
                {result.qaqc.summary.blocks} blocks · {result.qaqc.summary.errors} errors · {result.qaqc.summary.warnings} warnings
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/farms')} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg">
              Farm List
            </button>
            <button onClick={() => navigate(`/farms/${result.farm?.id}`)} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              View Farm →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/farms')} className="text-gray-600 hover:text-gray-300">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Enrol New Farm</h1>
          <p className="text-gray-500 text-sm">Module 1 — Farm & Field Identity</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${step === s.id ? 'text-white' : step > s.id ? 'text-emerald-400' : 'text-gray-600'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                step > s.id ? 'border-emerald-500 bg-emerald-500 text-white' :
                'border-gray-700 text-gray-600'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 transition-colors ${step > s.id ? 'bg-emerald-500/50' : 'bg-gray-800'}`}></div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">

          {/* Step 1 — Farm Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">1A — Farm Identity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Farmer Full Name" required error={errors.farmer_full_name?.message}>
                  <input {...register('farmer_full_name', { required: 'Required' })} className={inputClass} placeholder="e.g. Murugan Ramasamy" />
                </Field>
                <Field label="Phone Number" required error={errors.farmer_phone?.message} hint="10 digits, no spaces">
                  <input {...register('farmer_phone', { required: 'Required', pattern: { value: /^\d{10}$/, message: '10 digits required' } })} className={inputClass} placeholder="9876543210" maxLength={10} />
                </Field>
                <Field label="Aadhaar (last 4 digits)" required error={errors.aadhaar_last4?.message}>
                  <input {...register('aadhaar_last4', { required: 'Required', pattern: { value: /^\d{4}$/, message: '4 digits only' } })} className={inputClass} placeholder="XXXX" maxLength={4} />
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
                  <input value="Tamil Nadu" disabled className={`${inputClass} opacity-50`} />
                </Field>
                <Field label="Cadastral / Revenue Reference" hint="Survey number or Patta number">
                  <input {...register('cadastral_reference')} className={inputClass} placeholder="e.g. S.No. 123/4A" />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2 — Field Boundary */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">1B — Field Boundary</h2>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-xs text-blue-400 font-medium mb-1">GPS Boundary Capture</p>
                <p className="text-xs text-gray-500">Walk the field perimeter with the mobile app. GPS coordinates are captured automatically per vertex. Area is auto-calculated using Haversine formula.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GPS Accuracy (metres)" hint="Flag if >5m accuracy">
                  <input {...register('gps_accuracy_metres', { valueAsNumber: true })} type="number" step="0.1" className={inputClass} placeholder="e.g. 3.2" />
                </Field>
                <Field label="Land Type" required error={errors.land_type?.message}>
                  <select {...register('land_type', { required: 'Required' })} className={selectClass}>
                    <option>Cropland</option>
                    <option>Grassland</option>
                  </select>
                </Field>
                <Field label="Boundary Matches Satellite?" required>
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
                    <input {...register('excluded_area_ha', { valueAsNumber: true })} type="number" step="0.01" className={inputClass} placeholder="0.00" />
                  </Field>
                )}
                <Field label="Overlap with Existing Farm?">
                  <select {...register('overlap_detected')} className={selectClass}>
                    <option value="false">No overlap detected</option>
                    <option value="true">Overlap detected (will block submission)</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* Step 3 — Farm Characteristics */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">1C — Farm Characteristics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <option>Flat</option>
                    <option>Gentle</option>
                    <option>Moderate</option>
                    <option>Steep</option>
                  </select>
                </Field>
                <Field label="IPCC Climate Zone" hint="Auto-suggested from GPS">
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
                    <option>Vertisols</option>
                    <option>Inceptisols</option>
                    <option>Alfisols</option>
                    <option>Entisols</option>
                    <option>Aridisols</option>
                    <option>Ultisols</option>
                  </select>
                </Field>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                * 4 directional photos (N/S/E/W) and satellite image can be uploaded after enrolment from the farm detail page.
              </p>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div>
              <h2 className="text-sm font-semibold text-white mb-4">Review & Submit</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                  <div key={label} className="flex gap-2 py-2 border-b border-gray-800/60">
                    <span className="text-gray-500 min-w-32 text-xs">{label}</span>
                    <span className="text-gray-200 text-xs font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-400">
                  Farm ID will be auto-generated on submission. QA/QC rules will run automatically.
                  Baseline data (Module 2) must be collected in the same enrolment visit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/farms')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors"
          >
            <ChevronLeft size={15} />
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {submitting ? 'Enrolling...' : 'Enrol Farm'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
