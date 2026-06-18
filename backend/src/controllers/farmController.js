import { supabase } from '../db/supabase.js';
import { generateFarmId, generateClusterId, calculatePolygonArea } from '../utils/helpers.js';
import { runQAQCRules } from '../utils/qaqcRules.js';

export const listFarms = async (req, res, next) => {
  try {
    const { district, cluster_id, status, page = 1, limit = 20 } = req.query;
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
    const { data, error } = await supabase
      .from('farms').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Farm not found' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createFarm = async (req, res, next) => {
  try {
    const {
      farmer_full_name, farmer_phone, aadhaar_last4,
      village, block_taluk, district,
      gps_boundary_coordinates, gps_accuracy_metres,
      boundary_satellite_match, boundary_discrepancy_note,
      overlap_detected, non_ag_land_exclusion, excluded_area_ha,
      cadastral_reference, land_type,
      primary_crop, secondary_crop, crop_system_type,
      irrigation_source, slope_class, ipcc_climate_zone,
      fao_soil_group, field_photos,
    } = req.body;

    // Auto-calculations
    const field_area_ha = calculatePolygonArea(gps_boundary_coordinates || []);
    const net_eligible_area_ha = field_area_ha - (excluded_area_ha || 0);

    // Get next serial for Farm ID
    const { count } = await supabase.from('farms').select('*', { count: 'exact', head: true });
    const farm_id = generateFarmId(district, (count || 0) + 1);

    // Cluster assignment
    const centroid = gps_boundary_coordinates?.[0] || [0, 0];
    const cluster_id = generateClusterId(district, centroid[0], centroid[1]);

    const farmData = {
      farm_id, farmer_full_name, farmer_phone, aadhaar_last4,
      village, block_taluk, district, state: 'Tamil Nadu',
      cluster_id, enrolment_date: new Date().toISOString().split('T')[0],
      field_officer_id: req.user.id,
      field_officer_name: req.user.user_metadata?.name || req.user.email,
      gps_boundary_coordinates, gps_accuracy_metres, field_area_ha,
      boundary_satellite_match, boundary_discrepancy_note,
      overlap_detected: overlap_detected || false,
      non_ag_land_exclusion, excluded_area_ha,
      net_eligible_area_ha: Math.max(0, net_eligible_area_ha),
      cadastral_reference, land_type,
      primary_crop, secondary_crop, crop_system_type,
      irrigation_source, slope_class, ipcc_climate_zone,
      fao_soil_group, field_photos,
      status: 'enrolled',
      data_completeness_pct: 0,
    };

    const { data, error } = await supabase.from('farms').insert(farmData).select().single();
    if (error) throw error;

    // Run QA/QC immediately
    const { flags, summary } = runQAQCRules(data);
    if (flags.length > 0) {
      await supabase.from('qaqc_flags').insert(
        flags.map(f => ({ ...f, farm_id: data.id, resolved: false }))
      );
    }

    // Update completeness score
    const mandatory = [
      'farmer_full_name', 'farmer_phone', 'aadhaar_last4', 'village',
      'gps_boundary_coordinates', 'land_type', 'primary_crop', 'crop_system_type',
      'irrigation_source', 'slope_class', 'ipcc_climate_zone', 'fao_soil_group',
    ];
    const filled = mandatory.filter(k => farmData[k] != null && farmData[k] !== '').length;
    const completeness = Math.round((filled / mandatory.length) * 100);
    await supabase.from('farms').update({ data_completeness_pct: completeness }).eq('id', data.id);

    res.status(201).json({ farm: data, qaqc: { flags, summary } });
  } catch (err) { next(err); }
};

export const updateFarm = async (req, res, next) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    // Recalculate area if boundary changed
    if (updates.gps_boundary_coordinates) {
      updates.field_area_ha = calculatePolygonArea(updates.gps_boundary_coordinates);
      updates.net_eligible_area_ha = updates.field_area_ha - (updates.excluded_area_ha || 0);
    }

    const { data, error } = await supabase
      .from('farms').update(updates).eq('id', req.params.id).select().single();
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
    const { photos } = req.body; // array of { direction: 'N'|'S'|'E'|'W', base64, filename }
    const uploaded = [];
    for (const photo of photos) {
      const buffer = Buffer.from(photo.base64, 'base64');
      const path = `farms/${req.params.id}/boundary/${photo.direction}_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('farm-photos').upload(path, buffer, {
        contentType: 'image/jpeg',
      });
      if (!error) uploaded.push({ direction: photo.direction, path });
    }
    await supabase.from('farms').update({ field_photos: uploaded }).eq('id', req.params.id);
    res.json({ uploaded });
  } catch (err) { next(err); }
};

export const checkOverlap = async (req, res, next) => {
  try {
    const { coordinates, exclude_farm_id } = req.body;
    // Simple bounding box overlap check (PostGIS ST_Intersects would be used in production)
    // For now we return a placeholder — implement with PostGIS extension in Supabase
    const { data } = await supabase
      .from('farms')
      .select('farm_id, farmer_full_name, gps_boundary_coordinates')
      .neq('id', exclude_farm_id || '00000000-0000-0000-0000-000000000000');

    // TODO: Replace with Supabase RPC call using ST_Intersects once PostGIS enabled
    res.json({ overlap: false, overlapping_farms: [], note: 'PostGIS ST_Intersects required for precise check' });
  } catch (err) { next(err); }
};

export const getFarmQAQC = async (req, res, next) => {
  try {
    const { data: flags, error } = await supabase
      .from('qaqc_flags')
      .select('*')
      .eq('farm_id', req.params.id)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ flags });
  } catch (err) { next(err); }
};
