import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { farmAPI } from '../../lib/api';
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
  Satellite, Navigation, Undo2, Play, Plus, CheckCircle2,
  Map, Upload, X, FileText, Save
} from 'lucide-react';

const STEPS = [
  { id: 1, label: '1A — Identity' },
  { id: 2, label: '1B — Boundary' },
  { id: 3, label: '1C — Characteristics' },
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

const NON_AG_TYPES = ['House','Road','Pond','Water body','Other non-agricultural land'];

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30';
const selectClass = `${inputClass} cursor-pointer`;

const Field = ({ label, children, hint }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
  </div>
);

// ── Area in ACRES (1 ha = 2.47105 acres) ──
function calcAreaAcres(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = points[i][0] * Math.PI / 180;
    const lat2 = points[j][0] * Math.PI / 180;
    const dLng = (points[j][1] - points[i][1]) * Math.PI / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const m2 = Math.abs(area * R * R / 2);
  return m2 / 4046.856; // m² → acres
}

// ── File upload helper ──
const FileUpload = ({ label, accept, value, onChange, hint }) => {
  const ref = useRef();
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 bg-gray-800 border border-emerald-500/40 rounded-xl px-3 py-2.5">
          <FileText size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 truncate flex-1">{value.name || value}</span>
          <button type="button" onClick={() => onChange(null)} className="text-gray-600 hover:text-red-400">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-dashed border-gray-600 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <Upload size={14} />
          Upload {label}
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => onChange(e.target.files[0] || null)} />
      {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
};

// ── GPS Boundary Mapper ──
function BoundaryMapper({ onComplete, savedData }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const polygonRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayersRef = useRef({});

  const [gpsStatus, setGpsStatus] = useState('acquiring');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState(savedData?.coordinates || []);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [mapReady, setMapReady] = useState(false);
  const [toast, setToast] = useState('');
  const watchIdRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('locked');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const center = savedData?.center || [11.0, 77.0];
    const zoom = savedData?.zoom || 15;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    tileLayersRef.current = {
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
      street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }),
    };
    tileLayersRef.current.satellite.addTo(map);
    map.setView(center, zoom);
    leafletMap.current = map;
  }, [mapReady]);

  // Center on GPS if no saved data
  useEffect(() => {
    if (currentPos && leafletMap.current && !savedData?.center && !isRecording && points.length === 0) {
      leafletMap.current.setView([currentPos.lat, currentPos.lng], 18);
    }
  }, [currentPos]);

  // Draw polygon
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const L = window.L;
    const map = leafletMap.current;
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (points.length === 0) return;

    const latlngs = points.map(p => [p[0], p[1]]);
    polygonRef.current = L.polygon(latlngs, {
      color: '#10b981', weight: 2.5, fillColor: '#10b981', fillOpacity: 0.18,
    }).addTo(map);

    points.forEach((pt, i) => {
      const icon = L.divIcon({
        html: `<div style="background:${i===0?'#f59e0b':'#10b981'};color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">${i+1}</div>`,
        iconSize: [24,24], iconAnchor: [12,12], className: '',
      });
      const marker = L.marker([pt[0], pt[1]], { icon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        setPoints(prev => { const u=[...prev]; u[i]=[ll.lat,ll.lng]; return u; });
      });
      markersRef.current.push(marker);
    });

    if (points.length >= 2) map.fitBounds(polygonRef.current.getBounds(), { padding: [30,30] });
  }, [points, mapReady]);

  const switchLayer = (type) => {
    if (!leafletMap.current) return;
    Object.values(tileLayersRef.current).forEach(l => leafletMap.current.removeLayer(l));
    tileLayersRef.current[type].addTo(leafletMap.current);
    setActiveLayer(type);
  };

  const getMapState = () => {
    if (!leafletMap.current) return {};
    const c = leafletMap.current.getCenter();
    return { center: [c.lat, c.lng], zoom: leafletMap.current.getZoom() };
  };

  const startRecording = () => {
    if (!currentPos) { showToast('GPS not ready yet'); return; }
    setIsRecording(true);
    setPoints([[currentPos.lat, currentPos.lng]]);
    showToast('Point 1 saved — walk to next corner');
  };

  const addPoint = () => {
    if (!currentPos) { showToast('GPS not ready'); return; }
    setPoints(prev => {
      const updated = [...prev, [currentPos.lat, currentPos.lng]];
      showToast(`Point ${updated.length} saved`);
      return updated;
    });
  };

  const undoPoint = () => {
    if (points.length <= 1) { showToast('Cannot remove first point'); return; }
    setPoints(prev => prev.slice(0, -1));
    showToast('Last point removed');
  };

  const completeBoundary = () => {
    if (points.length < 3) { showToast('Need at least 3 points'); return; }
    const acres = parseFloat(calcAreaAcres(points).toFixed(4));
    const mapState = getMapState();
    onComplete({
      gps_boundary_coordinates: points,
      field_area_acres: acres,
      net_eligible_area_acres: acres,
      gps_accuracy_metres: gpsAccuracy,
      map_center: mapState.center,
      map_zoom: mapState.zoom,
    });
  };

  const areaAcres = calcAreaAcres(points);
  const layerBtns = [
    { id: 'satellite', icon: <Satellite size={12}/>, label: 'Satellite' },
    { id: 'street', icon: <Map size={12}/>, label: 'Street' },
    { id: 'terrain', icon: <Navigation size={12}/>, label: 'Terrain' },
  ];

  return (
    <div className="space-y-4">
      {/* GPS Status */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
        gpsStatus==='locked' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
        gpsStatus==='error'  ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                               'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          gpsStatus==='locked' ? 'bg-emerald-400 animate-pulse' :
          gpsStatus==='error'  ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
        }`}/>
        {gpsStatus==='locked' && currentPos
          ? `GPS locked · ±${gpsAccuracy}m · ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`
          : gpsStatus==='error' ? 'GPS unavailable — allow location permission'
          : 'Acquiring GPS signal…'}
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-700" style={{height:'320px'}}>
        <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
        <div className="absolute top-2 right-2 z-[1000] flex gap-1">
          {layerBtns.map(({id,icon,label})=>(
            <button key={id} onClick={()=>switchLayer(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                activeLayer===id ? 'bg-emerald-600 text-white' : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800'
              }`}>{icon}{label}</button>
          ))}
        </div>
        {points.length>=3 && (
          <div className="absolute bottom-2 left-2 z-[1000] bg-gray-900/90 border border-emerald-500/40 rounded-xl px-3 py-1.5">
            <span className="text-xs text-emerald-400 font-bold">{areaAcres.toFixed(4)} ac</span>
          </div>
        )}
      </div>

      {/* Saved boundary notice */}
      {savedData?.coordinates?.length >= 3 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400">
          Saved boundary restored · {savedData.coordinates.length} points · {calcAreaAcres(savedData.coordinates).toFixed(4)} ac
        </div>
      )}

      {!isRecording && points.length < 3 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-3">
            Stand at the <span className="text-amber-400 font-medium">first corner</span> of the farm.
            Wait for GPS to lock, then press START.
          </p>
          <button onClick={startRecording} disabled={gpsStatus!=='locked'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm active:scale-95 transition-all">
            <Play size={15}/> START Boundary Recording
          </button>
        </div>
      ) : isRecording ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-3">
            <div>
              <div className="text-xl font-bold text-white">{points.length}</div>
              <div className="text-[10px] text-gray-500">points</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400">{areaAcres.toFixed(4)} ac</div>
              <div className="text-[10px] text-gray-500">area</div>
            </div>
          </div>

          <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden max-h-28 overflow-y-auto">
            {points.map((pt,i)=>(
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/50 last:border-0 ${i===0?'bg-amber-500/5':''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${i===0?'bg-amber-500':'bg-emerald-600'}`}>{i+1}</div>
                <span className="font-mono text-[10px] text-gray-300">{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={addPoint} disabled={gpsStatus!=='locked'}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm active:scale-95">
              <Plus size={15}/> Next Point
            </button>
            <button onClick={undoPoint} disabled={points.length<=1}
              className="flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm active:scale-95">
              <Undo2 size={15}/> Undo
            </button>
          </div>

          <button onClick={completeBoundary} disabled={points.length<3}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 border border-emerald-500/40 text-white font-medium py-3 rounded-xl text-sm active:scale-95">
            <CheckCircle2 size={15}/> Complete Boundary ({points.length} pts · {areaAcres.toFixed(3)} ac)
          </button>
        </div>
      ) : null}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function FarmEnrolPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [farmId, setFarmId] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [pattaFile, setPattaFile] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, getValues, setValue } = useForm({
    defaultValues: {
      state: 'Tamil Nadu',
      boundary_satellite_match: 'Yes',
      overlap_detected: 'false',
      non_ag_land_exclusion: 'false',
      excluded_area_acres: 0,
      land_type: 'Cropland',
      crop_system_type: 'Annual',
      irrigation_source: 'Rainfed',
      slope_class: 'Flat',
    }
  });

  const watched = watch();

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('enviwrap_farm_draft');
    if (draft) {
      const data = JSON.parse(draft);
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'boundary') setBoundaryData(v);
        else if (k !== 'farm_id') setValue(k, v);
      });
      if (data.farm_id) setFarmId(data.farm_id);
    }
  }, []);

  const saveDraft = async () => {
    setSaving(true);
    const data = getValues();
    // Save to localStorage for restore
    localStorage.setItem('enviwrap_farm_draft', JSON.stringify({
      ...data, boundary: boundaryData, farm_id: farmId,
    }));
    try {
      const payload = {
        ...data,
        ...boundaryData,
        field_area_ha: boundaryData ? boundaryData.field_area_acres / 2.47105 : null,
        net_eligible_area_ha: boundaryData
          ? (boundaryData.field_area_acres - (parseFloat(data.excluded_area_acres) || 0)) / 2.47105
          : null,
        status: 'draft',
      };
      if (farmId) {
        await farmAPI.update(farmId, payload);
      } else {
        const res = await farmAPI.create(payload);
        setFarmId(res.data.farm?.id);
        localStorage.setItem('enviwrap_farm_draft', JSON.stringify({
          ...data, boundary: boundaryData, farm_id: res.data.farm?.id,
        }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Still saved locally even if API fails
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleBoundaryComplete = (data) => {
    setBoundaryData(data);
    setValue('gps_boundary_coordinates', data.gps_boundary_coordinates);
    setValue('gps_accuracy_metres', data.gps_accuracy_metres);
  };

  const onSubmit = async () => {
    setSaving(true);
    const data = getValues();
    try {
      const payload = {
        ...data,
        ...boundaryData,
        field_area_ha: boundaryData ? boundaryData.field_area_acres / 2.47105 : null,
        net_eligible_area_ha: boundaryData
          ? (boundaryData.field_area_acres - (parseFloat(data.excluded_area_acres) || 0)) / 2.47105
          : null,
        status: 'enrolled',
      };
      if (farmId) {
        await farmAPI.update(farmId, payload);
      } else {
        const res = await farmAPI.create(payload);
        setFarmId(res.data.farm?.id);
      }
      localStorage.removeItem('enviwrap_farm_draft');
      navigate('/farms');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const netEligibleAcres = boundaryData
    ? Math.max(0, boundaryData.field_area_acres - (parseFloat(watched.excluded_area_acres) || 0))
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/farms')} className="text-gray-600 hover:text-gray-300 p-1">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Enrol New Farm</h1>
          <p className="text-gray-500 text-xs">Module 1 — Farm & Field Identity</p>
        </div>
        {/* Save draft button */}
        <button onClick={saveDraft} disabled={submitting}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors">
          <Save size={12}/>
          {submitting ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Stepper — all steps clickable (free navigation) */}
      <div className="flex items-center mb-5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <button onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 transition-colors ${
                step === s.id ? 'text-emerald-400' : step > s.id ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-400'
              }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                step === s.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                step > s.id ? 'border-emerald-600 bg-emerald-600/20 text-emerald-400' :
                'border-gray-700 text-gray-600'
              }`}>{s.id}</div>
              <span className="text-[11px] font-medium whitespace-nowrap hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length-1 && (
              <div className={`w-5 sm:w-8 h-px mx-1.5 flex-shrink-0 ${step > s.id ? 'bg-emerald-600/50' : 'bg-gray-800'}`}/>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">

        {/* ── STEP 1 — 1A Farm Identity ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">1A — Farm Identity</h2>
            <Field label="Farmer Full Name">
              <input {...register('farmer_full_name')} className={inputClass} placeholder="e.g. Murugan Ramasamy"/>
            </Field>
            <Field label="Phone Number" hint="10 digits">
              <input {...register('farmer_phone')} className={inputClass} placeholder="9876543210" maxLength={10} inputMode="numeric"/>
            </Field>
            <Field label="Aadhaar (last 4 digits)">
              <input {...register('aadhaar_last4')} className={inputClass} placeholder="XXXX" maxLength={4} inputMode="numeric"/>
            </Field>
            <Field label="District">
              <select {...register('district')} className={selectClass}>
                <option value="">Select district</option>
                {TN_DISTRICTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Block / Taluk">
              <input {...register('block_taluk')} className={inputClass} placeholder="e.g. Annur"/>
            </Field>
            <Field label="Village">
              <input {...register('village')} className={inputClass} placeholder="e.g. Karumathampatty"/>
            </Field>
            <Field label="State">
              <input value="Tamil Nadu" disabled className={`${inputClass} opacity-40`}/>
            </Field>
            <Field label="Cadastral / Revenue Reference" hint="Survey number or Patta number">
              <input {...register('cadastral_reference')} className={inputClass} placeholder="e.g. S.No. 123/4A"/>
            </Field>

            {/* Document uploads */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400">Document Uploads</p>
              <FileUpload label="Aadhaar Card" accept="image/*,.pdf"
                value={aadhaarFile} onChange={setAadhaarFile} hint="Image or PDF"/>
              <FileUpload label="Patta / Chitta" accept="image/*,.pdf"
                value={pattaFile} onChange={setPattaFile} hint="Image or PDF"/>
            </div>
          </div>
        )}

        {/* ── STEP 2 — 1B Field Boundary ── */}
        {step === 2 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-4">1B — Field Boundary</h2>
            <BoundaryMapper
              onComplete={handleBoundaryComplete}
              savedData={boundaryData ? {
                coordinates: boundaryData.gps_boundary_coordinates,
                center: boundaryData.map_center,
                zoom: boundaryData.map_zoom,
              } : null}
            />

            {/* Boundary confirmed */}
            {boundaryData && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-emerald-400"/>
                  <span className="text-sm font-medium text-emerald-400">Boundary Recorded</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-white font-bold text-sm">{boundaryData.field_area_acres?.toFixed(4)}</div>
                    <div className="text-[10px] text-gray-500">acres (total)</div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm text-emerald-400">
                      {netEligibleAcres !== null ? netEligibleAcres.toFixed(4) : '—'}
                    </div>
                    <div className="text-[10px] text-gray-500">acres (net eligible)</div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{boundaryData.gps_boundary_coordinates?.length}</div>
                    <div className="text-[10px] text-gray-500">points</div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional 1B fields */}
            <div className="mt-5 space-y-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">Boundary Details</p>

              <Field label="Field Officer Name">
                <input {...register('field_officer_name_manual')} className={inputClass} placeholder="Name of field officer"/>
              </Field>
              <Field label="Surveyor Name" hint="If different from field officer">
                <input {...register('surveyor_name')} className={inputClass} placeholder="Name of surveyor (optional)"/>
              </Field>

              <Field label="Excluded Non-Agricultural Area (acres)" hint="House, road, pond, water body, etc.">
                <input {...register('excluded_area_acres', { valueAsNumber: true })}
                  type="number" step="0.0001" min="0" className={inputClass} placeholder="0.0000" inputMode="decimal"/>
              </Field>

              <Field label="Type of Excluded Area">
                <select {...register('excluded_area_type')} className={selectClass}>
                  <option value="">None / Not applicable</option>
                  {NON_AG_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>

              {boundaryData && (
                <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-3 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Total field area</span>
                    <span className="text-white">{boundaryData.field_area_acres?.toFixed(4)} ac</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Excluded area</span>
                    <span className="text-white">− {(parseFloat(watched.excluded_area_acres)||0).toFixed(4)} ac</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-700 mt-1 font-semibold">
                    <span className="text-gray-300">Net eligible area</span>
                    <span className="text-emerald-400">{netEligibleAcres !== null ? netEligibleAcres.toFixed(4) : '—'} ac</span>
                  </div>
                </div>
              )}

              <Field label="Land Type">
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
              {(watched.boundary_satellite_match==='No'||watched.boundary_satellite_match==='Partially') && (
                <Field label="Discrepancy Note">
                  <textarea {...register('boundary_discrepancy_note')} className={`${inputClass} resize-none`} rows={2} placeholder="Describe the discrepancy…"/>
                </Field>
              )}
              <Field label="Overlap with Existing Farm?">
                <select {...register('overlap_detected')} className={selectClass}>
                  <option value="false">No overlap</option>
                  <option value="true">Overlap detected</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3 — 1C Farm Characteristics ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-4">1C — Farm Characteristics</h2>
            <Field label="Primary Crop">
              <select {...register('primary_crop')} className={selectClass}>
                <option value="">Select crop</option>
                {TN_CROPS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Secondary Crop">
              <select {...register('secondary_crop')} className={selectClass}>
                <option value="">None</option>
                {TN_CROPS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Crop System Type">
              <select {...register('crop_system_type')} className={selectClass}>
                <option>Annual</option><option>Perennial</option><option>Mixed</option>
              </select>
            </Field>
            <Field label="Irrigation Source">
              <select {...register('irrigation_source')} className={selectClass}>
                {['Rainfed','Borewell','Canal','Tank','Drip','Sprinkler','None'].map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Slope Class">
              <select {...register('slope_class')} className={selectClass}>
                <option>Flat</option><option>Gentle</option><option>Moderate</option><option>Steep</option>
              </select>
            </Field>
            <Field label="IPCC Climate Zone">
              <select {...register('ipcc_climate_zone')} className={selectClass}>
                <option value="">Select</option>
                <option>Warm Temperate Dry</option><option>Warm Temperate Moist</option>
                <option>Tropical Dry</option><option>Tropical Moist</option><option>Tropical Wet</option>
              </select>
            </Field>
            <Field label="FAO Soil Group (WRB)">
              <select {...register('fao_soil_group')} className={selectClass}>
                <option value="">Select</option>
                <option>Vertisols</option><option>Inceptisols</option><option>Alfisols</option>
                <option>Entisols</option><option>Aridisols</option><option>Ultisols</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 4 — Review ── */}
        {step === 4 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-4">Review & Submit</h2>
            <div className="space-y-0">
              {[
                ['Farmer Name', watched.farmer_full_name],
                ['Phone', watched.farmer_phone],
                ['Aadhaar Last 4', watched.aadhaar_last4],
                ['Village', watched.village],
                ['Block / Taluk', watched.block_taluk],
                ['District', watched.district],
                ['Field Officer', watched.field_officer_name_manual],
                ['Surveyor', watched.surveyor_name],
                ['Land Type', watched.land_type],
                ['Primary Crop', watched.primary_crop],
                ['Crop System', watched.crop_system_type],
                ['Irrigation', watched.irrigation_source],
                ['Slope', watched.slope_class],
                ['Total Area', boundaryData ? `${boundaryData.field_area_acres?.toFixed(4)} ac` : '—'],
                ['Excluded Area', `${(parseFloat(watched.excluded_area_acres)||0).toFixed(4)} ac (${watched.excluded_area_type||'—'})`],
                ['Net Eligible', netEligibleAcres !== null ? `${netEligibleAcres.toFixed(4)} ac` : '—'],
                ['Boundary Points', boundaryData?.gps_boundary_coordinates?.length || '—'],
                ['GPS Accuracy', boundaryData?.gps_accuracy_metres ? `±${boundaryData.gps_accuracy_metres}m` : '—'],
                ['Aadhaar Upload', aadhaarFile ? aadhaarFile.name : '—'],
                ['Patta Upload', pattaFile ? pattaFile.name : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-800/60">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs text-gray-200 font-medium text-right ml-4">{value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-400">Farm ID auto-generated. You can continue editing any section after saving.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between mt-4">
        <button type="button"
          onClick={() => step > 1 ? setStep(s => s-1) : navigate('/farms')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-200 py-2 px-3">
          <ChevronLeft size={15}/>{step > 1 ? 'Back' : 'Cancel'}
        </button>
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s+1)}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
            Next <ChevronRight size={15}/>
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all">
            {submitting ? 'Saving…' : 'Submit Module 1'}
          </button>
        )}
      </div>
    </div>
  );
}
