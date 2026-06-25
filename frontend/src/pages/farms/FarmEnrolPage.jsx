import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { farmAPI } from '../../lib/api';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, MapPin, Satellite, Navigation, Undo2, Play, Plus, CheckCircle2, Map } from 'lucide-react';

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

const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30';
const selectClass = `${inputClass} cursor-pointer`;

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

// ─── Spherical Excess area formula (accurate on Earth surface) ───
function calcAreaHa(points) {
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
  return Math.abs(area * R * R / 2) / 10000;
}

// ─── GPS Boundary Mapper Component ───
function BoundaryMapper({ onComplete }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const polygonRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayersRef = useRef({});

  const [gpsStatus, setGpsStatus] = useState('acquiring'); // acquiring | locked | error
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState([]);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [areaHa, setAreaHa] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [toast, setToast] = useState('');
  const watchIdRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Load Leaflet dynamically
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

  // Start GPS
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
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Init map when Leaflet ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });

    tileLayersRef.current = {
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
      street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }),
    };
    tileLayersRef.current.satellite.addTo(map);

    // Default center — Tamil Nadu
    map.setView([11.0, 77.0], 15);
    leafletMap.current = map;
  }, [mapReady]);

  // Center map on GPS lock
  useEffect(() => {
    if (currentPos && leafletMap.current && !isRecording && points.length === 0) {
      leafletMap.current.setView([currentPos.lat, currentPos.lng], 18);
    }
  }, [currentPos]);

  // Redraw polygon whenever points change
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const L = window.L;
    const map = leafletMap.current;

    // Remove old polygon and markers
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (points.length === 0) return;

    // Draw polygon (close it visually)
    const latlngs = points.map(p => [p[0], p[1]]);
    polygonRef.current = L.polygon(latlngs, {
      color: '#10b981',
      weight: 2.5,
      fillColor: '#10b981',
      fillOpacity: 0.18,
    }).addTo(map);

    // Numbered markers
    points.forEach((pt, i) => {
      const icon = L.divIcon({
        html: `<div style="background:${i === 0 ? '#f59e0b' : '#10b981'};color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;font-family:monospace;">${i + 1}</div>`,
        iconSize: [24, 24], iconAnchor: [12, 12], className: '',
      });
      const marker = L.marker([pt[0], pt[1]], { icon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        setPoints(prev => {
          const updated = [...prev];
          updated[i] = [ll.lat, ll.lng];
          return updated;
        });
      });
      markersRef.current.push(marker);
    });

    // Fit bounds
    if (points.length >= 2) {
      map.fitBounds(polygonRef.current.getBounds(), { padding: [30, 30] });
    }

    setAreaHa(calcAreaHa(points));
  }, [points, mapReady]);

  const switchLayer = (type) => {
    if (!leafletMap.current) return;
    Object.values(tileLayersRef.current).forEach(l => leafletMap.current.removeLayer(l));
    tileLayersRef.current[type].addTo(leafletMap.current);
    setActiveLayer(type);
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
    onComplete({
      gps_boundary_coordinates: points,
      field_area_ha: parseFloat(calcAreaHa(points).toFixed(4)),
      net_eligible_area_ha: parseFloat(calcAreaHa(points).toFixed(4)),
      gps_accuracy_metres: gpsAccuracy,
    });
  };

  const layerBtns = [
    { id: 'satellite', icon: <Satellite size={12} />, label: 'Satellite' },
    { id: 'street', icon: <Map size={12} />, label: 'Street' },
    { id: 'terrain', icon: <Navigation size={12} />, label: 'Terrain' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-white">1B — Field Boundary</h2>

      {/* GPS Status */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
        gpsStatus === 'locked' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
        gpsStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
        'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          gpsStatus === 'locked' ? 'bg-emerald-400 animate-pulse' :
          gpsStatus === 'error' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
        }`} />
        {gpsStatus === 'locked' && currentPos
          ? `GPS locked · ±${gpsAccuracy}m · ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`
          : gpsStatus === 'error'
          ? 'GPS unavailable — allow location permission'
          : 'Acquiring GPS signal…'
        }
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-700" style={{ height: '320px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Layer switcher */}
        <div className="absolute top-2 right-2 z-[1000] flex gap-1">
          {layerBtns.map(({ id, icon, label }) => (
            <button key={id} onClick={() => switchLayer(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                activeLayer === id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800'
              }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Area badge */}
        {points.length >= 3 && (
          <div className="absolute bottom-2 left-2 z-[1000] bg-gray-900/90 border border-emerald-500/40 rounded-xl px-3 py-1.5">
            <span className="text-xs text-emerald-400 font-bold">{calcAreaHa(points).toFixed(4)} ha</span>
            <span className="text-[10px] text-gray-500 ml-1.5">{(calcAreaHa(points) * 2.471).toFixed(2)} acres</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isRecording ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-3">
            Stand at the <span className="text-amber-400 font-medium">first corner</span> of the farm.
            Wait for GPS to lock, then press START to begin recording boundary points.
          </p>
          <button
            onClick={startRecording}
            disabled={gpsStatus !== 'locked'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-all active:scale-95"
          >
            <Play size={15} />
            START Boundary Recording
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Point counter */}
          <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-3">
            <div>
              <div className="text-xl font-bold text-white">{points.length}</div>
              <div className="text-[10px] text-gray-500">boundary points</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400">{calcAreaHa(points).toFixed(4)} ha</div>
              <div className="text-[10px] text-gray-500">area</div>
            </div>
          </div>

          {/* Points list */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden max-h-32 overflow-y-auto">
            {points.map((pt, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-700/50 last:border-0 ${i === 0 ? 'bg-amber-500/5' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                  {i + 1}
                </div>
                <span className="font-mono text-[10px] text-gray-300">{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={addPoint} disabled={gpsStatus !== 'locked'}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all active:scale-95">
              <Plus size={15} /> Next Point
            </button>
            <button onClick={undoPoint} disabled={points.length <= 1}
              className="flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all active:scale-95">
              <Undo2 size={15} /> Undo
            </button>
          </div>

          <button
            onClick={completeBoundary}
            disabled={points.length < 3}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/40 text-white font-medium py-3 rounded-xl text-sm transition-all active:scale-95"
          >
            <CheckCircle2 size={15} />
            Complete Boundary ({points.length} pts · {calcAreaHa(points).toFixed(3)} ha)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Main FarmEnrolPage ───
export default function FarmEnrolPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors }, trigger, setValue } = useForm({
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

  const handleBoundaryComplete = (data) => {
    setBoundaryData(data);
    setValue('gps_boundary_coordinates', data.gps_boundary_coordinates);
    setValue('field_area_ha', data.field_area_ha);
    setValue('net_eligible_area_ha', data.net_eligible_area_ha);
    setValue('gps_accuracy_metres', data.gps_accuracy_metres);
  };

  const nextStep = async () => {
    const fieldsPerStep = {
      1: ['farmer_full_name', 'farmer_phone', 'aadhaar_last4', 'village', 'district', 'block_taluk'],
      2: ['land_type'],
      3: ['primary_crop', 'crop_system_type'],
    };
    const valid = await trigger(fieldsPerStep[step] || []);
    if (valid) setStep(s => s + 1);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await farmAPI.create({ ...data, ...boundaryData });
      setResult(res.data);
      setStep(5);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to enrol farm');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (step === 5 && result) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Farm Enrolled!</h2>
          <p className="text-gray-500 text-sm mb-3">Farm ID assigned:</p>
          <div className="font-mono text-2xl text-emerald-400 font-bold bg-emerald-500/10 rounded-xl py-3 px-4 mb-4">
            {result.farm?.farm_id}
          </div>
          {boundaryData && (
            <div className="bg-gray-800/50 rounded-xl p-3 mb-4 text-sm">
              <div className="text-gray-400">Field Area: <span className="text-white font-semibold">{boundaryData.field_area_ha} ha</span></div>
              <div className="text-gray-400 text-xs mt-0.5">{boundaryData.gps_boundary_coordinates?.length} boundary points recorded</div>
            </div>
          )}
          {result.qaqc?.summary?.total > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-left">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={13} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400">QA/QC Flags</span>
              </div>
              <p className="text-xs text-gray-400">
                {result.qaqc.summary.blocks} blockers · {result.qaqc.summary.errors} errors · {result.qaqc.summary.warnings} warnings
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/farms')} className="flex-1 px-4 py-3 text-sm text-gray-400 border border-gray-700 rounded-xl">Farm List</button>
            <button onClick={() => navigate(`/farms/${result.farm?.id}`)} className="flex-1 px-4 py-3 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium">View Farm →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/farms')} className="text-gray-600 hover:text-gray-300 p-1">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Enrol New Farm</h1>
          <p className="text-gray-500 text-xs">Module 1 — Farm & Field Identity</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <div className={`flex items-center gap-1.5 ${step === s.id ? 'text-white' : step > s.id ? 'text-emerald-400' : 'text-gray-600'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all flex-shrink-0 ${
                step === s.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                step > s.id ? 'border-emerald-500 bg-emerald-500 text-white' :
                'border-gray-700 text-gray-600'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="text-xs font-medium whitespace-nowrap hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-8 h-px mx-1.5 flex-shrink-0 ${step > s.id ? 'bg-emerald-500/50' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">

          {/* Step 1 — Farm Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">1A — Farm Identity</h2>
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

          {/* Step 2 — Field Boundary (GPS Mapper) */}
          {step === 2 && (
            <div>
              <BoundaryMapper onComplete={handleBoundaryComplete} />

              {/* Boundary confirmed summary */}
              {boundaryData && (
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Boundary Recorded</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-white font-bold text-sm">{boundaryData.field_area_ha}</div>
                      <div className="text-[10px] text-gray-500">hectares</div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{(boundaryData.field_area_ha * 2.471).toFixed(2)}</div>
                      <div className="text-[10px] text-gray-500">acres</div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{boundaryData.gps_boundary_coordinates?.length}</div>
                      <div className="text-[10px] text-gray-500">points</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual override fields */}
              <div className="mt-4 space-y-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">Additional boundary info</p>
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
                  <Field label="Discrepancy Note">
                    <textarea {...register('boundary_discrepancy_note')} className={`${inputClass} resize-none`} rows={2} placeholder="Describe the discrepancy..." />
                  </Field>
                )}
                <Field label="Non-Agricultural Land in Polygon?">
                  <select {...register('non_ag_land_exclusion')} className={selectClass}>
                    <option value="false">No</option>
                    <option value="true">Yes — homestead / road / water body</option>
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
            </div>
          )}

          {/* Step 3 — Farm Characteristics */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white mb-4">1C — Farm Characteristics</h2>
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
                  <option>Annual</option><option>Perennial</option><option>Mixed</option>
                </select>
              </Field>
              <Field label="Irrigation Source" required>
                <select {...register('irrigation_source')} className={selectClass}>
                  {['Rainfed','Borewell','Canal','Tank','Drip','Sprinkler','None'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Slope Class" required>
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

          {/* Step 4 — Review */}
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
                  ['Land Type', watched.land_type],
                  ['Primary Crop', watched.primary_crop],
                  ['Crop System', watched.crop_system_type],
                  ['Irrigation', watched.irrigation_source],
                  ['Slope', watched.slope_class],
                  ['Field Area (ha)', boundaryData?.field_area_ha || '—'],
                  ['Boundary Points', boundaryData?.gps_boundary_coordinates?.length || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-gray-800/60">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs text-gray-200 font-medium text-right ml-4">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400">Farm ID auto-generated on submission. QA/QC rules run automatically.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between mt-4">
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/farms')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-200 py-2 px-3">
            <ChevronLeft size={15} />
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          {step < 4 ? (
            <button type="button" onClick={nextStep}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button type="submit" disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all">
              {submitting ? 'Enrolling...' : 'Enrol Farm'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
