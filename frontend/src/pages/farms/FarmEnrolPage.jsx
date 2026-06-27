import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { farmAPI } from '../../lib/api';
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
  Satellite, Navigation, Undo2, Play, Plus, CheckCircle2,
  Map, Upload, X, FileText, Save, Loader, Image
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

// ── Acres area formula (Spherical Excess) ──
function calcAreaAcres(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const lat1 = points[i][0] * Math.PI / 180;
    const lat2 = points[j][0] * Math.PI / 180;
    const dLng = (points[j][1] - points[i][1]) * Math.PI / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2) / 4046.856;
}

// ── File Upload Component — uploads to Supabase Storage ──
const FileUpload = ({ label, accept, value, onChange, hint, farmId, fileType }) => {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) { onChange(null); return; }
    // Always store file object for display
    onChange({ name: file.name, uploading: true });
    // Must save the farm first to get a farmId before uploading
    if (farmId) {
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result.split(',')[1];
            const res = await farmAPI.uploadFile(farmId, fileType, base64, file.name, file.type);
            if (res.data?.url) {
              onChange({ name: file.name, url: res.data.url });
            } else {
              onChange({ name: file.name, error: true });
              alert('Upload succeeded but no URL returned');
            }
          } catch (uploadErr) {
            console.error('Upload failed:', uploadErr?.response?.data || uploadErr);
            onChange({ name: file.name, error: true });
            alert(`Upload failed: ${uploadErr?.response?.data?.error || uploadErr.message}`);
          } finally {
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('FileReader failed:', err);
        onChange({ name: file.name, error: true });
        setUploading(false);
      }
    } else {
      // No farmId yet — store file locally, will upload when Save is pressed
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        onChange({ name: file.name + ' (pending — press Save to upload)', base64, mimeType: file.type, file });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 bg-gray-800 border border-emerald-500/40 rounded-xl px-3 py-2.5">
          <FileText size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 truncate flex-1">{value.name || value}</span>
          {uploading && <Loader size={12} className="animate-spin text-emerald-400 flex-shrink-0"/>}
          {value.url && <a href={value.url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 flex-shrink-0">View</a>}
          {value.error && <span className="text-[10px] text-red-400 flex-shrink-0">Failed</span>}
          <button type="button" onClick={() => onChange(null)} className="text-gray-600 hover:text-red-400 p-1 flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-dashed border-gray-600 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <Upload size={14} /> Upload {label}
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => handleFile(e.target.files[0] || null)} />
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

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const center = savedData?.center || [11.0, 77.0];
    const zoom = savedData?.zoom || 15;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    tileLayersRef.current = {
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
      street:    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      terrain:   L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }),
    };
    tileLayersRef.current.satellite.addTo(map);
    map.setView(center, zoom);
    leafletMap.current = map;
  }, [mapReady]);

  useEffect(() => {
    if (currentPos && leafletMap.current && !savedData?.center && points.length === 0) {
      leafletMap.current.setView([currentPos.lat, currentPos.lng], 18);
    }
  }, [currentPos]);

  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const L = window.L;
    const map = leafletMap.current;
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (points.length === 0) return;

    polygonRef.current = L.polygon(points.map(p => [p[0], p[1]]), {
      color: '#10b981', weight: 2.5, fillColor: '#10b981', fillOpacity: 0.18,
    }).addTo(map);

    points.forEach((pt, i) => {
      const icon = L.divIcon({
        html: `<div style="background:${i===0?'#f59e0b':'#10b981'};color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">${i+1}</div>`,
        iconSize:[24,24], iconAnchor:[12,12], className:'',
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
    setIsRecording(false);
    showToast('Boundary saved!');
  };

  const areaAcres = calcAreaAcres(points);
  const layerBtns = [
    { id: 'satellite', icon: <Satellite size={12}/>, label: 'Satellite' },
    { id: 'street',    icon: <Map size={12}/>, label: 'Street' },
    { id: 'terrain',   icon: <Navigation size={12}/>, label: 'Terrain' },
  ];

  return (
    <div className="space-y-4">
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

      {savedData?.coordinates?.length >= 3 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400">
          ✓ Saved boundary restored · {savedData.coordinates.length} points · {calcAreaAcres(savedData.coordinates).toFixed(4)} ac
        </div>
      )}

      {!isRecording && points.length < 3 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-3">
            Stand at the <span className="text-amber-400 font-medium">first corner</span> of the farm. Wait for GPS to lock, then press START.
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
  const { id } = useParams(); // present when editing /farms/:id/edit
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(isEdit);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [farmDbId, setFarmDbId] = useState(isEdit ? id : null);
  const [farmCode, setFarmCode] = useState(null);
  const [boundaryData, setBoundaryData] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [pattaFile, setPattaFile] = useState(null);
  const [farmPhotos, setFarmPhotos] = useState([]); // array of {name, url, base64, mimeType}
  const navigate = useNavigate();

  const { register, watch, getValues, setValue, reset } = useForm({
    defaultValues: {
      state: 'Tamil Nadu',
      boundary_satellite_match: 'Yes',
      overlap_detected: 'false',
      excluded_area_acres: 0,
      land_type: 'Cropland',
      crop_system_type: 'Annual',
      irrigation_source: 'Rainfed',
      slope_class: 'Flat',
    }
  });

  // Load existing farm data when editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const { data: farm } = await farmAPI.get(id);
        // Populate form fields
        const fields = [
          'farmer_full_name','farmer_phone','aadhaar_last4','village','block_taluk',
          'district','cadastral_reference','land_type','boundary_satellite_match',
          'boundary_discrepancy_note','overlap_detected','excluded_area_acres',
          'excluded_area_type','field_officer_name_manual','surveyor_name',
          'primary_crop','secondary_crop','crop_system_type','irrigation_source',
          'slope_class','ipcc_climate_zone','fao_soil_group',
        ];
        const vals = {};
        fields.forEach(f => { if (farm[f] !== null && farm[f] !== undefined) vals[f] = farm[f]; });
        vals.overlap_detected = farm.overlap_detected ? 'true' : 'false';
        vals.excluded_area_acres = farm.excluded_area_acres || 0;
        reset(vals);
        setFarmCode(farm.farm_id);
        // Restore boundary data
        if (farm.gps_boundary_coordinates?.length >= 3) {
          setBoundaryData({
            gps_boundary_coordinates: farm.gps_boundary_coordinates,
            field_area_acres: farm.field_area_acres,
            net_eligible_area_acres: farm.net_eligible_area_acres,
            gps_accuracy_metres: farm.gps_accuracy_metres,
            map_center: farm.map_center,
            map_zoom: farm.map_zoom,
          });
        }
        // Restore file URLs as display names
        if (farm.aadhaar_file_url) setAadhaarFile({ name: 'Aadhaar (saved)', url: farm.aadhaar_file_url });
        if (farm.patta_file_url)   setPattaFile({ name: 'Patta/Chitta (saved)', url: farm.patta_file_url });
        if (farm.farm_photos_urls?.length) setFarmPhotos(farm.farm_photos_urls.map(url => ({ url, name: 'Photo (saved)' })));
      } catch (err) { console.error('Failed to load farm:', err); }
      finally { setLoadingFarm(false); }
    };
    load();
  }, [id, isEdit]);

  const watched = watch();

  const netEligibleAcres = boundaryData
    ? Math.max(0, boundaryData.field_area_acres - (parseFloat(watched.excluded_area_acres) || 0))
    : null;

  const buildPayload = () => {
    const data = getValues();
    const excl = parseFloat(data.excluded_area_acres) || 0;
    const fa = boundaryData?.field_area_acres || null;
    const net = fa !== null ? Math.max(0, fa - excl) : null;
    // Convert empty strings to null for all text fields
    const clean = {};
    Object.entries(data).forEach(([k, v]) => {
      clean[k] = (v === '' || v === undefined) ? null : v;
    });
    return {
      ...clean,
      gps_boundary_coordinates: boundaryData?.gps_boundary_coordinates || null,
      field_area_acres:         fa,
      field_area_ha:            fa !== null ? fa / 2.47105 : null,
      net_eligible_area_acres:  net,
      net_eligible_area_ha:     net !== null ? net / 2.47105 : null,
      gps_accuracy_metres:      boundaryData?.gps_accuracy_metres || null,
      map_center:               boundaryData?.map_center || null,
      map_zoom:                 boundaryData?.map_zoom || null,
      excluded_area_acres:      excl,
      excluded_area_ha:         excl / 2.47105,
      aadhaar_file_url:         aadhaarFile?.url || null,
      patta_file_url:           pattaFile?.url   || null,
      farm_photos_urls:         farmPhotos.filter(p => p.url).map(p => p.url),
    };
  };

  // Upload a pending file (base64) to Supabase Storage after farm exists
  const uploadPendingFile = async (fid, fileObj, fileType) => {
    if (!fileObj || fileObj.url || !fileObj.base64) return fileObj?.url || null;
    try {
      const res = await farmAPI.uploadFile(fid, fileType, fileObj.base64, fileObj.name, fileObj.mimeType);
      return res.data.url;
    } catch (err) {
      console.error('File upload failed:', err);
      return null;
    }
  };

  const saveToSupabase = async (status = 'draft') => {
    setSaving(true);
    try {
      const payload = { ...buildPayload(), status };
      let fid = farmDbId;

      if (fid) {
        await farmAPI.update(fid, payload);
      } else {
        const res = await farmAPI.create(payload);
        fid = res.data.farm?.id;
        setFarmDbId(fid);
        setFarmCode(res.data.farm?.farm_id);
      }

      // Upload pending files now that we have a farm ID
      let aadhaarUrl = aadhaarFile?.url || null;
      let pattaUrl   = pattaFile?.url   || null;

      if (aadhaarFile?.base64) {
        aadhaarUrl = await uploadPendingFile(fid, aadhaarFile, 'aadhaar');
        if (aadhaarUrl) setAadhaarFile({ name: aadhaarFile.name, url: aadhaarUrl });
      }
      if (pattaFile?.base64) {
        pattaUrl = await uploadPendingFile(fid, pattaFile, 'patta');
        if (pattaUrl) setPattaFile({ name: pattaFile.name, url: pattaUrl });
      }

      // Upload pending farm photos
      const pendingPhotos = farmPhotos.filter(p => p.base64 && !p.url);
      for (const photo of pendingPhotos) {
        try {
          const res = await farmAPI.uploadFile(fid, 'photo', photo.base64, photo.name, photo.mimeType);
          photo.url = res.data.url;
          delete photo.base64;
        } catch (err) { console.error('Photo upload failed:', err); }
      }
      if (pendingPhotos.length > 0) {
        const allUrls = farmPhotos.filter(p => p.url).map(p => p.url);
        await farmAPI.update(fid, { farm_photos_urls: allUrls });
        setFarmPhotos(farmPhotos.map(p => ({ name: p.name, url: p.url })));
      }

      // Save document URLs back to farm record
      if (aadhaarUrl || pattaUrl) {
        await farmAPI.update(fid, {
          ...(aadhaarUrl ? { aadhaar_file_url: aadhaarUrl } : {}),
          ...(pattaUrl   ? { patta_file_url:   pattaUrl   } : {}),
        });
      }

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
      return fid;
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed — check your connection');
    } finally {
      setSaving(false);
    }
  };

  const handleBoundaryComplete = (data) => {
    setBoundaryData(data);
  };

  const handleSubmit = async () => {
    const savedId = await saveToSupabase('enrolled');
    if (isEdit) {
      navigate(`/farms/${id}`);
    } else {
      navigate('/farms');
    }
  };

  if (loadingFarm) return (
    <div className="p-6 flex justify-center items-center h-40">
      <Loader size={24} className="animate-spin text-emerald-400" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => isEdit ? navigate(`/farms/${id}`) : navigate('/farms')} className="text-gray-600 hover:text-gray-300 p-1">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white">{isEdit ? 'Edit Farm' : 'Enrol New Farm'}</h1>
          {farmCode
            ? <p className="text-emerald-400 text-xs font-mono">{farmCode}</p>
            : <p className="text-gray-500 text-xs">Module 1 — Farm & Field Identity</p>
          }
        </div>
        <button onClick={() => saveToSupabase('draft')} disabled={saving}
          className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 border-gray-700 text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40">
          {saving ? <Loader size={12} className="animate-spin"/> : <Save size={12}/>}
          {saving ? 'Saving…' : savedFeedback ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Stepper — all steps freely clickable */}
      <div className="flex items-center mb-5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <button onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 transition-colors ${
                step===s.id ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                step===s.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                              'border-gray-700 text-gray-600 hover:border-gray-500'
              }`}>{s.id}</div>
              <span className="text-[11px] font-medium whitespace-nowrap hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length-1 && <div className="w-5 sm:w-7 h-px mx-1.5 bg-gray-800 flex-shrink-0"/>}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">

        {/* Step 1 */}
        {step===1 && (
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
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400">Document Uploads</p>
              <FileUpload label="Aadhaar Card" accept="image/*,.pdf" value={aadhaarFile} onChange={setAadhaarFile} hint="Image or PDF" farmId={farmDbId} fileType="aadhaar"/>
              <FileUpload label="Patta / Chitta" accept="image/*,.pdf" value={pattaFile} onChange={setPattaFile} hint="Image or PDF" farmId={farmDbId} fileType="patta"/>

              {/* Farm Photos — multiple */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Farm Photos (up to 5)</label>
                <div className="space-y-2">
                  {farmPhotos.map((photo, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-800 border border-emerald-500/40 rounded-xl px-3 py-2">
                      <Image size={13} className="text-emerald-400 flex-shrink-0"/>
                      <span className="text-xs text-gray-300 truncate flex-1">{photo.name}</span>
                      {photo.url
                        ? <a href={photo.url} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 flex-shrink-0">View</a>
                        : <Loader size={11} className="animate-spin text-emerald-400 flex-shrink-0"/>
                      }
                      <button type="button" onClick={() => setFarmPhotos(prev => prev.filter((_,j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 p-0.5 flex-shrink-0"><X size={12}/></button>
                    </div>
                  ))}
                  {farmPhotos.length < 5 && (
                    <button type="button"
                      onClick={() => {
                        const inp = document.createElement('input');
                        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = false;
                        inp.onchange = async (e) => {
                          const file = e.target.files[0]; if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = ev.target.result.split(',')[1];
                            const photoObj = { name: file.name, base64, mimeType: file.type };
                            if (farmDbId) {
                              try {
                                const res = await farmAPI.uploadFile(farmDbId, 'photo', base64, file.name, file.type);
                                photoObj.url = res.data.url;
                                delete photoObj.base64;
                              } catch(err) { console.error(err); }
                            }
                            setFarmPhotos(prev => [...prev, photoObj]);
                          };
                          reader.readAsDataURL(file);
                        };
                        inp.click();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-dashed border-gray-600 hover:border-emerald-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      <Upload size={13}/> Add Photo ({farmPhotos.length}/5)
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Field photos for documentation</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step===2 && (
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

            {boundaryData && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-emerald-400"/>
                  <span className="text-sm font-medium text-emerald-400">Boundary Recorded</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-white font-bold text-sm">{boundaryData.field_area_acres?.toFixed(4)}</div>
                    <div className="text-[10px] text-gray-500">acres total</div>
                  </div>
                  <div>
                    <div className="text-emerald-400 font-bold text-sm">{netEligibleAcres !== null ? netEligibleAcres.toFixed(4) : '—'}</div>
                    <div className="text-[10px] text-gray-500">acres eligible</div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{boundaryData.gps_boundary_coordinates?.length}</div>
                    <div className="text-[10px] text-gray-500">points</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">Boundary Details</p>
              <Field label="Field Officer Name">
                <input {...register('field_officer_name_manual')} className={inputClass} placeholder="Name of field officer"/>
              </Field>
              <Field label="Surveyor Name" hint="If different from field officer">
                <input {...register('surveyor_name')} className={inputClass} placeholder="Name of surveyor (optional)"/>
              </Field>
              <Field label="Excluded Non-Agricultural Area (acres)" hint="House, road, pond, water body, etc.">
                <input {...register('excluded_area_acres')} type="number" step="0.0001" min="0"
                  className={inputClass} placeholder="0.0000" inputMode="decimal"/>
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
                  <option>Cropland</option><option>Grassland</option>
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
                  <textarea {...register('boundary_discrepancy_note')} className={`${inputClass} resize-none`} rows={2}/>
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

        {/* Step 3 */}
        {step===3 && (
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

        {/* Step 4 — Review */}
        {step===4 && (
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
                ['Excluded', `${(parseFloat(watched.excluded_area_acres)||0).toFixed(4)} ac (${watched.excluded_area_type||'none'})`],
                ['Net Eligible', netEligibleAcres !== null ? `${netEligibleAcres.toFixed(4)} ac` : '—'],
                ['GPS Points', boundaryData?.gps_boundary_coordinates?.length || '—'],
                ['GPS Accuracy', boundaryData?.gps_accuracy_metres ? `±${boundaryData.gps_accuracy_metres}m` : '—'],
                ['Aadhaar Upload', aadhaarFile ? (aadhaarFile.url ? '✓ Uploaded' : aadhaarFile.name) : '—'],
                ['Patta Upload', pattaFile ? (pattaFile.url ? '✓ Uploaded' : pattaFile.name) : '—'],
                ['Farm Photos', farmPhotos.length > 0 ? `${farmPhotos.filter(p=>p.url).length}/${farmPhotos.length} uploaded` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-800/60">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs text-gray-200 font-medium text-right ml-4">{value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-400">
                All data saves to Supabase — visible on any device instantly.
                You can continue editing after submission.
              </p>
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
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all">
            {saving ? <Loader size={14} className="animate-spin"/> : null}
            {saving ? 'Saving…' : isEdit ? 'Update Farm' : 'Submit Module 1'}
          </button>
        )}
      </div>
    </div>
  );
}