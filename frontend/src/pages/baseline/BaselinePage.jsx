import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { baselineAPI, farmAPI } from '../../lib/api';
import { ChevronLeft, Save, CheckCircle, AlertCircle, Download, Loader } from 'lucide-react';

const YEARS = ['t-1', 't-2', 't-3'];

const TN_CROPS = [
  'Paddy (Rice)', 'Sugarcane', 'Cotton', 'Groundnut', 'Sunflower', 'Maize',
  'Sorghum', 'Pearl Millet', 'Finger Millet', 'Blackgram', 'Greengram',
  'Redgram', 'Banana', 'Coconut', 'Turmeric', 'Ginger', 'Tomato', 'Other',
];

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';
const selectClass = `${inputClass} cursor-pointer`;

// ── Combined Module 1 + Module 2 PDF Generator ──
function calcAcres(pts) {
  if (!pts || pts.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const lat1 = pts[i][0] * Math.PI / 180;
    const lat2 = pts[j][0] * Math.PI / 180;
    const dLng = (pts[j][1] - pts[i][1]) * Math.PI / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return (Math.abs(area * R * R / 2) / 4046.856).toFixed(4);
}

function generateCombinedPDF(farm, baselineRecords) {
  const coords = farm.gps_boundary_coordinates || [];
  const acres  = farm.field_area_acres || calcAcres(coords);
  const net    = farm.net_eligible_area_acres || acres;

  const yearLabel = { 't-1': 'Year T-1 (Most Recent)', 't-2': 'Year T-2', 't-3': 'Year T-3 (Oldest)' };

  const baselineSectionHtml = ['t-1', 't-2', 't-3'].map(y => {
    const r = baselineRecords[y];
    if (!r) return `
      <div class="year-block">
        <div class="year-title">${yearLabel[y]}</div>
        <div class="doc-ref" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;">No data recorded for this year</div>
      </div>`;
    return `
      <div class="year-block">
        <div class="year-title">${yearLabel[y]} ${r.farmer_otp_attested ? '<span class="status-badge">✓ Attested</span>' : ''}</div>
        
        <div class="subsection-title">Crop Information</div>
        <div class="grid">
          <div class="field"><label>Crop Type</label><span>${r.crop_type || '—'}</span></div>
          <div class="field"><label>Crop Year Label</label><span>${r.crop_year_label || '—'}</span></div>
          <div class="field"><label>Planting Month</label><span>${r.planting_month || '—'}</span></div>
          <div class="field"><label>Harvest Month</label><span>${r.harvest_month || '—'}</span></div>
          <div class="field"><label>Crop Yield (t/ha)</label><span>${r.crop_yield_t_ha || '—'}</span></div>
          <div class="field"><label>Fallow Period</label><span>${r.fallow_period ? 'Yes' : 'No'}${r.fallow_duration_weeks ? ` (${r.fallow_duration_weeks} wks)` : ''}</span></div>
          <div class="field"><label>Perennial Crop</label><span>${r.is_perennial ? 'Yes' : 'No'}</span></div>
        </div>

        <div class="subsection-title">Cover Crop</div>
        <div class="grid">
          <div class="field"><label>Cover Crop Used</label><span>${r.cover_crop_used ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Species</label><span>${r.cover_crop_species || '—'}</span></div>
          <div class="field"><label>Duration (weeks)</label><span>${r.cover_crop_duration_weeks || '—'}</span></div>
        </div>

        <div class="subsection-title">Tillage</div>
        <div class="grid">
          <div class="field"><label>Tillage Done</label><span>${r.tillage_done ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Tillage Type</label><span>${r.tillage_type || '—'}</span></div>
          <div class="field"><label>Tillage Depth</label><span>${r.tillage_depth || '—'}</span></div>
          <div class="field"><label>Soil Inverted</label><span>${r.soil_inverted ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Residue Cover After</label><span>${r.residue_cover_after_tillage_pct || '—'}</span></div>
        </div>

        <div class="subsection-title">Crop Residue</div>
        <div class="grid">
          <div class="field"><label>Residue Removed</label><span>${r.residue_removed ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>% Removed</label><span>${r.pct_residue_removed ?? '—'}%</span></div>
          <div class="field"><label>Residue Burned</label><span>${r.residue_burned ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Harvested for Sale</label><span>${r.residue_harvested_for_sale ? 'Yes' : 'No'}</span></div>
        </div>

        <div class="subsection-title">Fertilizer & Inputs</div>
        <div class="grid">
          <div class="field"><label>Synthetic Fertilizer</label><span>${r.synthetic_fertilizer_used ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Product</label><span>${r.fertilizer_product || '—'}</span></div>
          <div class="field"><label>N Rate (kg/ha)</label><span>${r.n_application_rate_kg_ha || '—'}</span></div>
          <div class="field"><label>Application Method</label><span>${r.application_method || '—'}</span></div>
          <div class="field"><label>Organic Fertilizer</label><span>${r.organic_fertilizer_used ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Organic Type</label><span>${r.organic_input_type || '—'}</span></div>
        </div>

        <div class="subsection-title">Irrigation</div>
        <div class="grid">
          <div class="field"><label>Irrigation Done</label><span>${r.irrigation_done ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Method</label><span>${r.irrigation_method || '—'}</span></div>
          <div class="field"><label>Cycles</label><span>${r.irrigation_cycles || '—'}</span></div>
          <div class="field"><label>% Field Flooded</label><span>${r.pct_field_flooded ?? '—'}%</span></div>
        </div>

        <div class="subsection-title">Liming & Livestock</div>
        <div class="grid">
          <div class="field"><label>Liming Done</label><span>${r.liming_done ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Liming Material</label><span>${r.liming_material || '—'}</span></div>
          <div class="field"><label>Livestock Present</label><span>${r.livestock_present ? 'Yes' : 'No'}</span></div>
          <div class="field"><label>Livestock Type</label><span>${r.livestock_type || '—'}</span></div>
          <div class="field"><label>Biomass Burned</label><span>${r.biomass_burned ? 'Yes' : 'No'}</span></div>
        </div>

        ${r.farm_photos_urls?.length || r.satellite_image_url_uploaded ? `
        <div class="subsection-title">Photos & Satellite Image</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
          ${(r.farm_photos_urls || []).map(url => `<img src="${url}" style="width:100%;height:120px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;"/>`).join('')}
          ${r.satellite_image_url_uploaded ? `<img src="${r.satellite_image_url_uploaded}" style="width:100%;height:120px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;"/>` : ''}
        </div>` : ''}

        ${r.govt_estimate_used ? `<div class="doc-ref" style="margin-top:8px;">Government estimate used as source: ${r.govt_data_source || 'N/A'}</div>` : ''}
      </div>`;
  }).join('<div class="page-break"></div>');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Complete Farm Report — ${farm.farm_id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
  .header { background: #064e3b; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center; }
  .header .logo { font-size: 24px; font-weight: bold; letter-spacing: 0.05em; }
  .header .sub { font-size: 11px; opacity: 0.8; margin-top: 4px; }
  .header .farm-id { font-size: 26px; font-weight: bold; color: #6ee7b7; margin-top: 12px; font-family: monospace; }
  .header .meta { font-size: 12px; margin-top: 8px; opacity: 0.9; }
  .module-banner { background: #10b981; color: white; padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: bold; margin: 24px 0 16px; text-transform: uppercase; letter-spacing: 0.05em; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: bold; color: #064e3b; border-bottom: 2px solid #10b981; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .subsection-title { font-size: 11px; font-weight: bold; color: #6b7280; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; border-left: 3px solid #10b981; padding-left: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .field label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; display: block; }
  .field span { font-size: 12px; color: #111827; font-weight: 500; }
  .area-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 14px; text-align: center; }
  .area-box .num { font-size: 22px; font-weight: bold; color: #059669; }
  .area-box .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .coords-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; font-family: monospace; font-size: 9px; color: #374151; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background: #d1fae5; color: #065f46; margin-left: 6px; }
  .doc-ref { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin: 4px 0; }
  .year-block { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .year-title { font-size: 14px; font-weight: bold; color: #064e3b; margin-bottom: 10px; }
  .page-break { page-break-before: always; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 0; } .module-banner { page-break-before: always; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo">🌿 ENVIWRAP</div>
  <div class="sub">Digital MRV Platform · VM0042 v2.2 · Tamil Nadu Carbon Credit Programme</div>
  <div class="farm-id">${farm.farm_id || '—'}</div>
  <div class="meta">${farm.farmer_full_name || '—'} · Enrolled: ${farm.enrolment_date || '—'}</div>
</div>

<div class="module-banner">Module 1 — Farm & Field Identity</div>

<div class="section">
  <div class="section-title">1A — Farm Identity</div>
  <div class="grid">
    <div class="field"><label>Farmer Name</label><span>${farm.farmer_full_name || '—'}</span></div>
    <div class="field"><label>Phone</label><span>${farm.farmer_phone || '—'}</span></div>
    <div class="field"><label>Aadhaar (Last 4)</label><span>****${farm.aadhaar_last4 || '—'}</span></div>
    <div class="field"><label>Village</label><span>${farm.village || '—'}</span></div>
    <div class="field"><label>Block / Taluk</label><span>${farm.block_taluk || '—'}</span></div>
    <div class="field"><label>District</label><span>${farm.district || '—'}</span></div>
    <div class="field"><label>Cadastral Reference</label><span>${farm.cadastral_reference || '—'}</span></div>
    <div class="field"><label>Field Officer</label><span>${farm.field_officer_name_manual || farm.field_officer_name || '—'}</span></div>
    <div class="field"><label>Surveyor</label><span>${farm.surveyor_name || '—'}</span></div>
    <div class="field"><label>Status</label><span class="status-badge">${farm.status || '—'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">1B — Field Boundary & Area</div>
  <div class="grid-3">
    <div class="area-box"><div class="num">${Number(acres).toFixed(4)}</div><div class="lbl">Total Area (acres)</div></div>
    <div class="area-box"><div class="num" style="color:#dc2626;">${(parseFloat(farm.excluded_area_acres)||0).toFixed(4)}</div><div class="lbl">Excluded (acres)</div></div>
    <div class="area-box"><div class="num">${Number(net).toFixed(4)}</div><div class="lbl">Net Eligible (acres)</div></div>
  </div>
  <div class="grid" style="margin-top:10px;">
    <div class="field"><label>Land Type</label><span>${farm.land_type || '—'}</span></div>
    <div class="field"><label>GPS Accuracy</label><span>${farm.gps_accuracy_metres ? '±'+farm.gps_accuracy_metres+'m' : '—'}</span></div>
    <div class="field"><label>Boundary Points</label><span>${coords.length || '—'}</span></div>
    <div class="field"><label>Satellite Match</label><span>${farm.boundary_satellite_match || '—'}</span></div>
  </div>
  ${coords.length > 0 ? `
  <div style="margin-top:10px;">
    <div class="subsection-title" style="margin-top:0;">GPS Boundary Coordinates</div>
    <div class="coords-box">
      ${coords.slice(0,10).map((c,i) => `Point ${i+1}: ${c[0].toFixed(6)}, ${c[1].toFixed(6)}`).join('<br/>')}
      ${coords.length > 10 ? `<br/>... and ${coords.length-10} more points` : ''}
    </div>
  </div>` : ''}
</div>

<div class="section">
  <div class="section-title">1C — Farm Characteristics</div>
  <div class="grid">
    <div class="field"><label>Primary Crop</label><span>${farm.primary_crop || '—'}</span></div>
    <div class="field"><label>Secondary Crop</label><span>${farm.secondary_crop || '—'}</span></div>
    <div class="field"><label>Crop System</label><span>${farm.crop_system_type || '—'}</span></div>
    <div class="field"><label>Irrigation Source</label><span>${farm.irrigation_source || '—'}</span></div>
    <div class="field"><label>Slope Class</label><span>${farm.slope_class || '—'}</span></div>
    <div class="field"><label>IPCC Climate Zone</label><span>${farm.ipcc_climate_zone || '—'}</span></div>
    <div class="field"><label>FAO Soil Group</label><span>${farm.fao_soil_group || '—'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Documents & Field Photos</div>
  <div class="subsection-title" style="margin-top:0;">Aadhaar Card</div>
  ${farm.aadhaar_file_url ? `<img src="${farm.aadhaar_file_url}" style="max-width:100%;max-height:180px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;"/>` : '<div class="doc-ref" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;">Not uploaded</div>'}
  <div class="subsection-title">Patta / Chitta</div>
  ${farm.patta_file_url ? `<img src="${farm.patta_file_url}" style="max-width:100%;max-height:180px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;"/>` : '<div class="doc-ref" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;">Not uploaded</div>'}
  ${farm.farm_photos_urls?.length ? `
  <div class="subsection-title">Farm Photos (${farm.farm_photos_urls.length})</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
    ${farm.farm_photos_urls.map(url => `<img src="${url}" style="width:100%;height:120px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;"/>`).join('')}
  </div>` : ''}
</div>

<div class="module-banner">Module 2 — Baseline Data (3-Year Historical Record)</div>

<div class="section">
  ${baselineSectionHtml}
</div>

<div class="footer">
  Generated by Enviwrap dMRV Platform · VM0042 v2.2 · ${new Date().toLocaleString('en-IN')} · Farm ID: ${farm.farm_id}
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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

  // Check if all 3 years have at least crop_type filled
  const allYearsComplete = YEARS.every(y => records[y]?.crop_type);

  const downloadCompletePDF = async () => {
    setDownloadingPDF(true);
    try {
      const { data: farm } = await farmAPI.get(farmId);
      generateCombinedPDF(farm, records);
    } catch (err) {
      alert('Failed to load farm data for PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/farms/${farmId}`)} className="text-gray-600 hover:text-gray-300">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Baseline Data</h1>
          <p className="text-gray-500 text-sm">Module 2 — Historical data · 3 years pre-project</p>
        </div>
        <button
          onClick={downloadCompletePDF}
          disabled={downloadingPDF}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {downloadingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          {downloadingPDF ? 'Generating…' : 'Download Complete PDF Report'}
        </button>
      </div>

      {!allYearsComplete && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 mb-4 text-xs text-amber-400">
          <AlertCircle size={13} />
          Some baseline years are incomplete. The PDF will show available data and mark missing years.
        </div>
      )}


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