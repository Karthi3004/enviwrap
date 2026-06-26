import { supabase } from '../db/supabase.js';
import { generateFarmId, generateClusterId, calculatePolygonArea } from '../utils/helpers.js';
import { runQAQCRules } from '../utils/qaqcRules.js';

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
    const body = req.body;

    // Area calculations
    const coords = body.gps_boundary_coordinates || [];
    const field_area_ha = coords.length >= 3 ? calculatePolygonArea(coords) : (body.field_area_ha || null);
    const field_area_acres = body.field_area_acres || (field_area_ha ? field_area_ha * 2.47105 : null);
    const excluded_acres = parseFloat(body.excluded_area_acres) || 0;
    const net_eligible_area_acres = field_area_acres !== null ? Math.max(0, field_area_acres - excluded_acres) : null;
    const net_eligible_area_ha = net_eligible_area_acres !== null ? net_eligible_area_acres / 2.47105 : null;

    // Farm ID serial
    const { count } = await supabase.from('farms').select('*', { count: 'exact', head: true });
    const district = body.district || 'TN';
    const farm_id = generateFarmId(district, (count || 0) + 1);

    // Cluster
    const centroid = coords[0] || [11.0, 77.0];
    const cluster_id = generateClusterId(district, centroid[0], centroid[1]);

    const farmData = {
      farm_id,
      farmer_full_name:         body.farmer_full_name || null,
      farmer_phone:             body.farmer_phone || null,
      aadhaar_last4:            body.aadhaar_last4 || null,
      village:                  body.village || null,
      block_taluk:              body.block_taluk || null,
      district:                 body.district || null,
      state:                    'Tamil Nadu',
      cluster_id,
      enrolment_date:           new Date().toISOString().split('T')[0],
      field_officer_id:         req.user.id,
      field_officer_name:       req.user.user_metadata?.name || req.user.email,
      field_officer_name_manual: body.field_officer_name_manual || null,
      surveyor_name:            body.surveyor_name || null,

      // Boundary
      gps_boundary_coordinates: coords.length ? coords : null,
      field_area_ha,
      field_area_acres,
      gps_accuracy_metres:      body.gps_accuracy_metres || null,
      boundary_satellite_match: body.boundary_satellite_match || null,
      boundary_discrepancy_note: body.boundary_discrepancy_note || null,
      overlap_detected:         body.overlap_detected === 'true' || body.overlap_detected === true,
      non_ag_land_exclusion:    excluded_acres > 0,
      excluded_area_ha:         excluded_acres / 2.47105,
      excluded_area_acres,
      excluded_area_type:       body.excluded_area_type || null,
      net_eligible_area_ha,
      net_eligible_area_acres,
      cadastral_reference:      body.cadastral_reference || null,
      land_type:                body.land_type || null,

      // Map state
      map_center:               body.map_center || null,
      map_zoom:                 body.map_zoom || null,

      // Documents
      aadhaar_file_url:         body.aadhaar_file_url || null,
      patta_file_url:           body.patta_file_url || null,

      // Characteristics
      primary_crop:             body.primary_crop || null,
      secondary_crop:           body.secondary_crop || null,
      crop_system_type:         body.crop_system_type || null,
      irrigation_source:        body.irrigation_source || null,
      slope_class:              body.slope_class || null,
      ipcc_climate_zone:        body.ipcc_climate_zone || null,
      fao_soil_group:           body.fao_soil_group || null,

      status:                   body.status || 'draft',
      data_completeness_pct:    0,
    };

    const { data, error } = await supabase.from('farms').insert(farmData).select().single();
    if (error) throw error;

    // QA/QC
    const { flags, summary } = runQAQCRules(data);
    if (flags.length > 0) {
      await supabase.from('qaqc_flags').insert(
        flags.map(f => ({ ...f, farm_id: data.id, resolved: false }))
      );
    }

    // Completeness
    const mandatory = ['farmer_full_name','farmer_phone','aadhaar_last4','village',
      'gps_boundary_coordinates','land_type','primary_crop','crop_system_type','irrigation_source'];
    const filled = mandatory.filter(k => farmData[k] != null && farmData[k] !== '').length;
    const pct = Math.round((filled / mandatory.length) * 100);
    await supabase.from('farms').update({ data_completeness_pct: pct }).eq('id', data.id);

    res.status(201).json({ farm: { ...data, data_completeness_pct: pct }, qaqc: { flags, summary } });
  } catch (err) { next(err); }
};

export const updateFarm = async (req, res, next) => {
  try {
    const body = req.body;

    const updates = { updated_at: new Date().toISOString() };

    // Only update fields that are present in the body
    const simpleFields = [
      'farmer_full_name','farmer_phone','aadhaar_last4','village','block_taluk',
      'district','field_officer_name_manual','surveyor_name',
      'boundary_satellite_match','boundary_discrepancy_note','cadastral_reference','land_type',
      'excluded_area_type','primary_crop','secondary_crop','crop_system_type',
      'irrigation_source','slope_class','ipcc_climate_zone','fao_soil_group',
      'aadhaar_file_url','patta_file_url','farm_photos_urls','satellite_image_url_uploaded',
      'map_center','map_zoom','status',
    ];
    simpleFields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });

    // Overlap
    if (body.overlap_detected !== undefined) {
      updates.overlap_detected = body.overlap_detected === 'true' || body.overlap_detected === true;
    }

    // Recalculate areas if boundary or exclusion changes
    const coords = body.gps_boundary_coordinates;
    if (coords) {
      updates.gps_boundary_coordinates = coords;
      updates.field_area_ha = calculatePolygonArea(coords);
      updates.field_area_acres = updates.field_area_ha * 2.47105;
    }
    if (body.gps_accuracy_metres !== undefined) updates.gps_accuracy_metres = body.gps_accuracy_metres;
    if (body.map_center !== undefined) updates.map_center = body.map_center;
    if (body.map_zoom !== undefined) updates.map_zoom = body.map_zoom;

    const excluded_acres = body.excluded_area_acres !== undefined
      ? parseFloat(body.excluded_area_acres) || 0
      : null;
    if (excluded_acres !== null) {
      updates.excluded_area_acres = excluded_acres;
      updates.excluded_area_ha = excluded_acres / 2.47105;
      updates.non_ag_land_exclusion = excluded_acres > 0;
    }

    // Net eligible — recalculate if area or exclusion changed
    if (updates.field_area_acres !== undefined || excluded_acres !== null) {
      // Get current farm to fill in missing values
      const { data: current } = await supabase.from('farms').select('field_area_acres,excluded_area_acres').eq('id', req.params.id).single();
      const fa = updates.field_area_acres ?? current?.field_area_acres ?? 0;
      const ea = excluded_acres ?? current?.excluded_area_acres ?? 0;
      updates.net_eligible_area_acres = Math.max(0, fa - ea);
      updates.net_eligible_area_ha = updates.net_eligible_area_acres / 2.47105;
    }

    // Completeness
    if (body.status === 'enrolled') {
      const mandatory = ['farmer_full_name','farmer_phone','aadhaar_last4','village',
        'gps_boundary_coordinates','land_type','primary_crop','crop_system_type','irrigation_source'];
      const allFields = { ...body, ...updates };
      const filled = mandatory.filter(k => allFields[k] != null && allFields[k] !== '').length;
      updates.data_completeness_pct = Math.round((filled / mandatory.length) * 100);
    }

    const { data, error } = await supabase.from('farms').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
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
      const path = `farms/${req.params.id}/boundary/${photo.direction}_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('farm-photos').upload(path, buffer, { contentType: 'image/jpeg' });
      if (!error) uploaded.push({ direction: photo.direction, path });
    }
    await supabase.from('farms').update({ field_photos: uploaded }).eq('id', req.params.id);
    res.json({ uploaded });
  } catch (err) { next(err); }
};

export const checkOverlap = async (req, res, next) => {
  try {
    res.json({ overlap: false, overlapping_farms: [], note: 'PostGIS ST_Intersects required for precise check' });
  } catch (err) { next(err); }
};

export const getFarmQAQC = async (req, res, next) => {
  try {
    const { data: flags, error } = await supabase.from('qaqc_flags').select('*').eq('farm_id', req.params.id).order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ flags });
  } catch (err) { next(err); }
};