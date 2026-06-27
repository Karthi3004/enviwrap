import { supabase } from '../db/supabase.js';
import { generateFarmId, generateClusterId, calculatePolygonArea } from '../utils/helpers.js';
import { runQAQCRules } from '../utils/qaqcRules.js';

const num  = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const num0 = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const str  = (v) => (v === '' || v === undefined || v === null) ? null : v;

export const listFarms = async (req, res, next) => {
  try {
    const { district, cluster_id, status, page = 1, limit = 50 } = req.query;
    let query = supabase.from('farms').select('*', { count: 'exact' });
    if (district) query = query.eq('district', district);
    if (cluster_id) query = query.eq('cluster_id', cluster_id);
    if (status) query = query.eq('status', status);
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order('created_at', { ascending: false });
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ farms: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

export const getFarm = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('farms').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Farm not found' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createFarm = async (req, res, next) => {
  try {
    const b = req.body;
    const coords = Array.isArray(b.gps_boundary_coordinates) ? b.gps_boundary_coordinates : [];
    const field_area_ha    = coords.length >= 3 ? calculatePolygonArea(coords) : (num(b.field_area_ha) || null);
    const field_area_acres = num(b.field_area_acres) || (field_area_ha != null ? field_area_ha * 2.47105 : null);
    const excl_acres       = num0(b.excluded_area_acres);
    const net_acres        = field_area_acres != null ? Math.max(0, field_area_acres - excl_acres) : null;

    const { count } = await supabase.from('farms').select('*', { count: 'exact', head: true });
    const district = str(b.district) || 'TN';
    const farm_id  = generateFarmId(district, (count || 0) + 1);
    const centroid = coords[0] || [11.0, 77.0];
    const cluster_id = generateClusterId(district, centroid[0], centroid[1]);

    const farmData = {
      farm_id,
      farmer_full_name:          str(b.farmer_full_name),
      farmer_phone:              str(b.farmer_phone),
      aadhaar_last4:             str(b.aadhaar_last4),
      village:                   str(b.village),
      block_taluk:               str(b.block_taluk),
      district:                  str(b.district),
      state:                     'Tamil Nadu',
      cluster_id,
      enrolment_date:            new Date().toISOString().split('T')[0],
      field_officer_id:          req.user.id,
      field_officer_name:        req.user.user_metadata?.name || req.user.email,
      field_officer_name_manual: str(b.field_officer_name_manual),
      surveyor_name:             str(b.surveyor_name),
      gps_boundary_coordinates:  coords.length ? coords : null,
      field_area_ha,
      field_area_acres,
      gps_accuracy_metres:       num(b.gps_accuracy_metres),
      boundary_satellite_match:  str(b.boundary_satellite_match),
      boundary_discrepancy_note: str(b.boundary_discrepancy_note),
      overlap_detected:          b.overlap_detected === 'true' || b.overlap_detected === true,
      non_ag_land_exclusion:     excl_acres > 0,
      excluded_area_ha:          excl_acres / 2.47105,
      excluded_area_acres:       excl_acres,
      excluded_area_type:        str(b.excluded_area_type),
      net_eligible_area_ha:      net_acres != null ? net_acres / 2.47105 : null,
      net_eligible_area_acres:   net_acres,
      cadastral_reference:       str(b.cadastral_reference),
      land_type:                 str(b.land_type),
      map_center:                b.map_center || null,
      map_zoom:                  b.map_zoom ? parseInt(b.map_zoom) : null,
      aadhaar_file_url:          str(b.aadhaar_file_url),
      patta_file_url:            str(b.patta_file_url),
      farm_photos_urls:          b.farm_photos_urls || null,
      primary_crop:              str(b.primary_crop),
      secondary_crop:            str(b.secondary_crop),
      crop_system_type:          str(b.crop_system_type),
      irrigation_source:         str(b.irrigation_source),
      slope_class:               str(b.slope_class),
      ipcc_climate_zone:         str(b.ipcc_climate_zone),
      fao_soil_group:            str(b.fao_soil_group),
      status:                    str(b.status) || 'draft',
      data_completeness_pct:     0,
    };

    const { data, error } = await supabase.from('farms').insert(farmData).select().single();
    if (error) throw error;

    const { flags, summary } = runQAQCRules(data);
    if (flags.length > 0) {
      await supabase.from('qaqc_flags').insert(flags.map(f => ({ ...f, farm_id: data.id, resolved: false })));
    }

    const mandatory = ['farmer_full_name','farmer_phone','aadhaar_last4','village',
      'gps_boundary_coordinates','land_type','primary_crop','crop_system_type','irrigation_source'];
    const filled = mandatory.filter(k => farmData[k] != null).length;
    const pct = Math.round((filled / mandatory.length) * 100);
    await supabase.from('farms').update({ data_completeness_pct: pct }).eq('id', data.id);

    res.status(201).json({ farm: { ...data, data_completeness_pct: pct }, qaqc: { flags, summary } });
  } catch (err) { next(err); }
};

export const updateFarm = async (req, res, next) => {
  try {
    const b = req.body;
    const updates = { updated_at: new Date().toISOString() };

    const simpleFields = [
      'farmer_full_name','farmer_phone','aadhaar_last4','village','block_taluk',
      'district','field_officer_name_manual','surveyor_name',
      'boundary_satellite_match','boundary_discrepancy_note','cadastral_reference','land_type',
      'excluded_area_type','primary_crop','secondary_crop','crop_system_type',
      'irrigation_source','slope_class','ipcc_climate_zone','fao_soil_group',
      'aadhaar_file_url','patta_file_url','farm_photos_urls','satellite_image_url_uploaded',
      'map_center','map_zoom','status',
    ];
    simpleFields.forEach(f => { if (b[f] !== undefined) updates[f] = str(b[f]) ?? b[f]; });

    if (b.overlap_detected !== undefined) {
      updates.overlap_detected = b.overlap_detected === 'true' || b.overlap_detected === true;
    }

    const coords = Array.isArray(b.gps_boundary_coordinates) ? b.gps_boundary_coordinates : null;
    if (coords) {
      updates.gps_boundary_coordinates = coords;
      updates.field_area_ha    = calculatePolygonArea(coords);
      updates.field_area_acres = updates.field_area_ha * 2.47105;
    }
    if (b.gps_accuracy_metres !== undefined) updates.gps_accuracy_metres = num(b.gps_accuracy_metres);

    const has_excl   = b.excluded_area_acres !== undefined;
    const excl_acres = has_excl ? num0(b.excluded_area_acres) : null;
    if (excl_acres !== null) {
      updates.excluded_area_acres    = excl_acres;
      updates.excluded_area_ha       = excl_acres / 2.47105;
      updates.non_ag_land_exclusion  = excl_acres > 0;
    }

    if (updates.field_area_acres !== undefined || excl_acres !== null) {
      const { data: cur } = await supabase.from('farms')
        .select('field_area_acres,excluded_area_acres').eq('id', req.params.id).single();
      const fa = updates.field_area_acres ?? num(cur?.field_area_acres) ?? 0;
      const ea = excl_acres ?? num0(cur?.excluded_area_acres);
      updates.net_eligible_area_acres = Math.max(0, fa - ea);
      updates.net_eligible_area_ha    = updates.net_eligible_area_acres / 2.47105;
    }

    if (b.status === 'enrolled') {
      const mandatory = ['farmer_full_name','farmer_phone','aadhaar_last4','village',
        'gps_boundary_coordinates','land_type','primary_crop','crop_system_type','irrigation_source'];
      const allFields = { ...b, ...updates };
      updates.data_completeness_pct = Math.round(
        mandatory.filter(k => allFields[k] != null && allFields[k] !== '').length / mandatory.length * 100
      );
    }

    const { data, error } = await supabase.from('farms').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

// Upload file to Supabase Storage, return public URL
export const uploadFile = async (req, res, next) => {
  try {
    const { farmId, fileType } = req.params; // fileType: aadhaar | patta | photo
    const { base64, filename, mimeType } = req.body;
    if (!base64 || !filename) return res.status(400).json({ error: 'base64 and filename required' });

    const buffer   = Buffer.from(base64, 'base64');
    const bucket   = fileType === 'photo' ? 'farm-photos' : 'farm-documents';
    const path     = `${farmId}/${fileType}/${Date.now()}_${filename}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = urlData.publicUrl;

    // Save URL back to farm record
    const colMap = { aadhaar: 'aadhaar_file_url', patta: 'patta_file_url' };
    if (colMap[fileType]) {
      await supabase.from('farms').update({ [colMap[fileType]]: url }).eq('id', farmId);
    } else if (fileType === 'photo') {
      const { data: farm } = await supabase.from('farms').select('farm_photos_urls').eq('id', farmId).single();
      const existing = farm?.farm_photos_urls || [];
      await supabase.from('farms').update({ farm_photos_urls: [...existing, url] }).eq('id', farmId);
    }

    res.json({ url, path });
  } catch (err) { next(err); }
};

export const deleteFarm = async (req, res, next) => {
  try {
    const { error } = await supabase.from('farms').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Farm deleted' });
  } catch (err) { next(err); }
};

export const uploadBoundaryPhotos = async (req, res, next) => {
  try {
    const { photos } = req.body;
    const uploaded = [];
    for (const photo of photos) {
      const buffer = Buffer.from(photo.base64, 'base64');
      const path   = `farms/${req.params.id}/boundary/${photo.direction}_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('farm-photos').upload(path, buffer, { contentType: 'image/jpeg' });
      if (!error) uploaded.push({ direction: photo.direction, path });
    }
    await supabase.from('farms').update({ field_photos: uploaded }).eq('id', req.params.id);
    res.json({ uploaded });
  } catch (err) { next(err); }
};

export const checkOverlap = async (req, res, next) => {
  res.json({ overlap: false, overlapping_farms: [] });
};

export const getFarmQAQC = async (req, res, next) => {
  try {
    const { data: flags, error } = await supabase.from('qaqc_flags').select('*')
      .eq('farm_id', req.params.id).order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ flags });
  } catch (err) { next(err); }
};