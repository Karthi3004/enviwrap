import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmAPI, qaqcAPI } from '../../lib/api';
import {
  ChevronLeft, ClipboardList, FlaskConical, Activity,
  ShieldCheck, AlertCircle, CheckCircle2, RefreshCw,
  Edit2, Download, MapPin, FileText, Image, Satellite,
  Navigation, Map, Loader
} from 'lucide-react';

const Row = ({ label, value }) => value ? (
  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2 border-b border-gray-800/60">
    <span className="text-[10px] text-gray-600 uppercase tracking-wide sm:w-40 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-200">{value}</span>
  </div>
) : null;

// Mini Leaflet map showing saved polygon
function SavedBoundaryMap({ coordinates, center, zoom }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const c = center || [11.0, 77.0];
    const z = zoom || 15;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
    map.setView(c, z);

    if (coordinates?.length >= 3) {
      const poly = L.polygon(coordinates.map(p => [p[0], p[1]]), {
        color: '#10b981', weight: 2.5, fillColor: '#10b981', fillOpacity: 0.2,
      }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [20, 20] });

      coordinates.forEach((pt, i) => {
        const icon = L.divIcon({
          html: `<div style="background:${i===0?'#f59e0b':'#10b981'};color:white;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;">${i+1}</div>`,
          iconSize: [20,20], iconAnchor: [10,10], className: '',
        });
        L.marker([pt[0], pt[1]], { icon }).addTo(map);
      });
    }
    leafletMap.current = map;
  }, [ready, coordinates]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-700" style={{ height: '280px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <Loader size={20} className="animate-spin text-emerald-400" />
        </div>
      )}
    </div>
  );
}

// PDF Generator
function generatePDF(farm) {
  const calcAcres = (pts) => {
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
  };

  const coords = farm.gps_boundary_coordinates || [];
  const acres  = farm.field_area_acres || calcAcres(coords);
  const net    = farm.net_eligible_area_acres || acres;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Module 1 — ${farm.farm_id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
  .header { background: #064e3b; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: bold; }
  .header p  { font-size: 12px; opacity: 0.8; margin-top: 4px; }
  .farm-id { font-size: 24px; font-weight: bold; color: #10b981; margin-top: 8px; font-family: monospace; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: bold; color: #064e3b; border-bottom: 2px solid #10b981; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .field { }
  .field label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
  .field value, .field span { font-size: 13px; color: #111827; font-weight: 500; }
  .area-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 16px; text-align: center; margin: 12px 0; }
  .area-box .num { font-size: 28px; font-weight: bold; color: #059669; }
  .area-box .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .coords-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 10px; color: #374151; max-height: 120px; overflow: hidden; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #d1fae5; color: #065f46; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .doc-ref { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin: 4px 0; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <h1>Enviwrap dMRV — Module 1 Farm Record</h1>
  <p>VM0042 v2.2 · Tamil Nadu Carbon Credit Programme</p>
  <div class="farm-id">${farm.farm_id || '—'}</div>
</div>

<div class="section">
  <div class="section-title">1A — Farm Identity</div>
  <div class="grid">
    <div class="field"><label>Farmer Name</label><span>${farm.farmer_full_name || '—'}</span></div>
    <div class="field"><label>Phone</label><span>${farm.farmer_phone || '—'}</span></div>
    <div class="field"><label>Aadhaar (Last 4)</label><span>****${farm.aadhaar_last4 || '—'}</span></div>
    <div class="field"><label>Enrolment Date</label><span>${farm.enrolment_date || '—'}</span></div>
    <div class="field"><label>Village</label><span>${farm.village || '—'}</span></div>
    <div class="field"><label>Block / Taluk</label><span>${farm.block_taluk || '—'}</span></div>
    <div class="field"><label>District</label><span>${farm.district || '—'}</span></div>
    <div class="field"><label>State</label><span>${farm.state || 'Tamil Nadu'}</span></div>
    <div class="field"><label>Cadastral Reference</label><span>${farm.cadastral_reference || '—'}</span></div>
    <div class="field"><label>Status</label><span class="status-badge">${farm.status || '—'}</span></div>
    <div class="field"><label>Field Officer</label><span>${farm.field_officer_name_manual || farm.field_officer_name || '—'}</span></div>
    <div class="field"><label>Surveyor</label><span>${farm.surveyor_name || '—'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">1B — Field Boundary & Area</div>
  <div class="grid-3">
    <div class="area-box">
      <div class="num">${Number(acres).toFixed(4)}</div>
      <div class="lbl">Total Area (acres)</div>
    </div>
    <div class="area-box">
      <div class="num" style="color:#dc2626;">${(parseFloat(farm.excluded_area_acres)||0).toFixed(4)}</div>
      <div class="lbl">Excluded Area (acres)<br/>${farm.excluded_area_type || ''}</div>
    </div>
    <div class="area-box">
      <div class="num">${Number(net).toFixed(4)}</div>
      <div class="lbl">Net Eligible (acres)</div>
    </div>
  </div>
  <div class="grid" style="margin-top:10px;">
    <div class="field"><label>Land Type</label><span>${farm.land_type || '—'}</span></div>
    <div class="field"><label>GPS Accuracy</label><span>${farm.gps_accuracy_metres ? '±'+farm.gps_accuracy_metres+'m' : '—'}</span></div>
    <div class="field"><label>Boundary Points</label><span>${coords.length || '—'}</span></div>
    <div class="field"><label>Satellite Match</label><span>${farm.boundary_satellite_match || '—'}</span></div>
    <div class="field"><label>Overlap</label><span>${farm.overlap_detected ? 'Detected' : 'None'}</span></div>
    <div class="field"><label>Cluster ID</label><span>${farm.cluster_id || '—'}</span></div>
  </div>
  ${coords.length > 0 ? `
  <div style="margin-top:10px;">
    <label style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px;">GPS Boundary Coordinates</label>
    <div class="coords-box">
      ${coords.slice(0,8).map((c,i) => `Point ${i+1}: ${c[0].toFixed(6)}, ${c[1].toFixed(6)}`).join('<br/>')}
      ${coords.length > 8 ? `<br/>... and ${coords.length-8} more points` : ''}
    </div>
  </div>` : ''}
  ${farm.boundary_discrepancy_note ? `<div style="margin-top:8px;" class="doc-ref">⚠ Discrepancy Note: ${farm.boundary_discrepancy_note}</div>` : ''}
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
    <div class="field"><label>Weather Station</label><span>${farm.nearest_weather_station || '—'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Documents & Uploads</div>
  ${farm.aadhaar_file_url ? `<div class="doc-ref">✓ Aadhaar Card: <a href="${farm.aadhaar_file_url}">${farm.aadhaar_file_url}</a></div>` : '<div class="doc-ref" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;">✗ Aadhaar Card: Not uploaded</div>'}
  ${farm.patta_file_url   ? `<div class="doc-ref">✓ Patta/Chitta: <a href="${farm.patta_file_url}">${farm.patta_file_url}</a></div>`   : '<div class="doc-ref" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;">✗ Patta/Chitta: Not uploaded</div>'}
  ${farm.farm_photos_urls?.length ? `<div class="doc-ref">✓ Farm Photos: ${farm.farm_photos_urls.length} photo(s) uploaded</div>` : ''}
</div>

<div class="footer">
  Generated by Enviwrap dMRV Platform · VM0042 v2.2 · ${new Date().toLocaleString('en-IN')} · Farm ID: ${farm.farm_id}
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function FarmDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningQAQC, setRunningQAQC] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

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

  if (loading) return (
    <div className="p-6 flex justify-center items-center h-40">
      <Loader size={24} className="animate-spin text-emerald-400" />
    </div>
  );
  if (!farm) return <div className="p-6 text-center text-gray-500">Farm not found</div>;

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const blockCount = unresolvedFlags.filter(f => f.severity === 'BLOCK').length;
  const coords = farm.gps_boundary_coordinates || [];
  const acres  = farm.field_area_acres || 0;
  const net    = farm.net_eligible_area_acres || acres;

  const modules = [
    { label: 'Baseline Data', icon: ClipboardList, path: `/farms/${id}/baseline`, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
    { label: 'SOC Samples',   icon: FlaskConical,  path: `/farms/${id}/soc`,      color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
    { label: 'Monitoring',    icon: Activity,      path: `/farms/${id}/monitoring`, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
  ];

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'boundary', label: 'Map & Boundary' },
    { id: 'documents', label: 'Documents' },
    { id: 'qaqc', label: `QA/QC${unresolvedFlags.length > 0 ? ` (${unresolvedFlags.length})` : ''}` },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={() => navigate('/farms')} className="text-gray-600 hover:text-gray-300 mt-0.5 p-1 flex-shrink-0">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white">{farm.farmer_full_name || 'Draft Farm'}</h1>
            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex-shrink-0">
              {farm.farm_id}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              farm.status === 'enrolled' ? 'bg-emerald-500/10 text-emerald-400' :
              farm.status === 'draft'    ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-700 text-gray-400'
            }`}>{farm.status}</span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{farm.village}{farm.village && farm.district ? ', ' : ''}{farm.district}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate(`/farms/${id}/edit`)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 px-2.5 py-1.5 rounded-lg transition-colors">
            <Edit2 size={12}/> Edit
          </button>
          <button onClick={() => generatePDF(farm)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 px-2.5 py-1.5 rounded-lg transition-colors">
            <Download size={12}/> PDF
          </button>
          <button onClick={runQAQC} disabled={runningQAQC}
            className="flex items-center gap-1 text-xs text-gray-400 border border-gray-700 px-2 py-1.5 rounded-lg">
            <RefreshCw size={11} className={runningQAQC ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      {/* Completeness bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Data Completeness</span>
          <span className={`text-xs font-bold ${(farm.data_completeness_pct||0)>=90?'text-emerald-400':(farm.data_completeness_pct||0)>=60?'text-amber-400':'text-red-400'}`}>
            {farm.data_completeness_pct||0}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${(farm.data_completeness_pct||0)>=90?'bg-emerald-500':(farm.data_completeness_pct||0)>=60?'bg-amber-500':'bg-red-500'}`}
            style={{width:`${farm.data_completeness_pct||0}%`}}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab===t.id ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300 border border-gray-800'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Details */}
      {activeTab==='details' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">1A — Farm Identity</div>
          <Row label="Farmer Name"     value={farm.farmer_full_name}/>
          <Row label="Phone"           value={farm.farmer_phone}/>
          <Row label="Aadhaar Last 4"  value={farm.aadhaar_last4 ? `****${farm.aadhaar_last4}` : null}/>
          <Row label="Village"         value={farm.village}/>
          <Row label="Block / Taluk"   value={farm.block_taluk}/>
          <Row label="District"        value={farm.district}/>
          <Row label="State"           value={farm.state}/>
          <Row label="Cadastral Ref"   value={farm.cadastral_reference}/>
          <Row label="Enrolled"        value={farm.enrolment_date}/>
          <Row label="Field Officer"   value={farm.field_officer_name_manual || farm.field_officer_name}/>
          <Row label="Surveyor"        value={farm.surveyor_name}/>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-3">1B — Area</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              ['Total Area', `${Number(acres).toFixed(4)} ac`],
              ['Excluded',   `${(parseFloat(farm.excluded_area_acres)||0).toFixed(4)} ac`],
              ['Net Eligible', `${Number(net).toFixed(4)} ac`],
            ].map(([l,v]) => (
              <div key={l} className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-white">{v}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <Row label="Land Type"         value={farm.land_type}/>
          <Row label="Excluded Type"     value={farm.excluded_area_type}/>
          <Row label="GPS Accuracy"      value={farm.gps_accuracy_metres ? `±${farm.gps_accuracy_metres}m` : null}/>
          <Row label="Satellite Match"   value={farm.boundary_satellite_match}/>
          <Row label="Overlap"           value={farm.overlap_detected ? 'Detected' : 'None'}/>
          <Row label="Cluster"           value={farm.cluster_id}/>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-3">1C — Characteristics</div>
          <Row label="Primary Crop"     value={farm.primary_crop}/>
          <Row label="Secondary Crop"   value={farm.secondary_crop}/>
          <Row label="Crop System"      value={farm.crop_system_type}/>
          <Row label="Irrigation"       value={farm.irrigation_source}/>
          <Row label="Slope"            value={farm.slope_class}/>
          <Row label="IPCC Zone"        value={farm.ipcc_climate_zone}/>
          <Row label="Soil Group"       value={farm.fao_soil_group}/>
        </div>
      )}

      {/* Tab: Map & Boundary */}
      {activeTab==='boundary' && (
        <div className="space-y-4">
          {coords.length >= 3 ? (
            <>
              <SavedBoundaryMap
                coordinates={coords}
                center={farm.map_center}
                zoom={farm.map_zoom}
              />
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Boundary Points</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {coords.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${i===0?'bg-amber-500':'bg-emerald-600'}`}>
                        {i+1}
                      </div>
                      <span className="font-mono text-xs text-gray-300">{pt[0].toFixed(6)}, {pt[1].toFixed(6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
              <MapPin size={28} className="text-gray-700 mx-auto mb-2"/>
              <p className="text-gray-500 text-sm">No boundary recorded yet</p>
              <button onClick={() => navigate(`/farms/${id}/edit`)}
                className="mt-3 text-emerald-400 text-sm hover:text-emerald-300">
                Edit farm to add boundary →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab==='documents' && (
        <div className="space-y-3">
          {/* Aadhaar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-blue-400"/>
              <span className="text-sm font-semibold text-white">Aadhaar Card</span>
            </div>
            {farm.aadhaar_file_url ? (
              <a href={farm.aadhaar_file_url} target="_blank" rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline break-all">
                View Aadhaar Document ↗
              </a>
            ) : (
              <p className="text-xs text-gray-600">Not uploaded</p>
            )}
          </div>

          {/* Patta */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-amber-400"/>
              <span className="text-sm font-semibold text-white">Patta / Chitta</span>
            </div>
            {farm.patta_file_url ? (
              <a href={farm.patta_file_url} target="_blank" rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline break-all">
                View Patta Document ↗
              </a>
            ) : (
              <p className="text-xs text-gray-600">Not uploaded</p>
            )}
          </div>

          {/* Farm photos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image size={14} className="text-emerald-400"/>
              <span className="text-sm font-semibold text-white">Farm Photos</span>
              {farm.farm_photos_urls?.length > 0 && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                  {farm.farm_photos_urls.length} photos
                </span>
              )}
            </div>
            {farm.farm_photos_urls?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {farm.farm_photos_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Farm photo ${i+1}`}
                      className="w-full h-28 object-cover rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors"/>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">No photos uploaded</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: QA/QC */}
      {activeTab==='qaqc' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-emerald-400"/>
            <span className="text-sm font-semibold text-white">QA/QC Status</span>
          </div>
          {unresolvedFlags.length === 0 ? (
            <div className="text-center py-5">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1.5"/>
              <p className="text-xs text-gray-500">All checks passed</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unresolvedFlags.map(flag => (
                <div key={flag.id} className={`border rounded-xl p-2.5 ${
                  flag.severity==='BLOCK'   ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  flag.severity==='ERROR'   ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                  flag.severity==='WARNING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                              'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0"/>
                    <div>
                      <p className="text-[10px] font-bold uppercase mb-0.5">{flag.severity} · Rule {flag.rule}</p>
                      <p className="text-xs leading-relaxed">{flag.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              {blockCount > 0 && (
                <p className="text-xs text-red-400 text-center pt-1">⚠ {blockCount} blocker(s) — resolve before VVB</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Module cards */}
      <div className="mt-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Continue to Other Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modules.map(({ label, icon: Icon, path, color, bg }) => (
            <button key={label} onClick={() => navigate(path)}
              className={`border rounded-2xl p-4 text-left active:scale-95 hover:border-gray-600 transition-all ${bg} border-gray-800`}>
              <Icon size={18} className={`${color} mb-2.5`}/>
              <div className="text-sm font-semibold text-white">{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}