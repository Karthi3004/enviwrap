import { supabase } from '../db/supabase.js';

export const listBaselineRecords = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('baseline_records')
      .select('*')
      .eq('farm_id', req.params.farmId)
      .order('year', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const getBaselineRecord = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('baseline_records').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Record not found' });
    res.json(data);
  } catch (err) { next(err); }
};

export const upsertBaselineRecord = async (req, res, next) => {
  try {
    const {
      farm_id, year, // 't-1' | 't-2' | 't-3'
      crop_type, crop_year_label,
      planting_month, harvest_month,
      fallow_period, fallow_duration_weeks,
      is_perennial, perennial_planted_year, canopy_cover_pct,
      crop_yield_t_ha, cover_crop_used, cover_crop_species, cover_crop_duration_weeks,
      tillage_done, tillage_type, tillage_depth, tillage_frequency,
      pct_soil_area_disturbed, soil_inverted, residue_cover_after_tillage_pct,
      residue_removed, pct_residue_removed, residue_harvested_for_sale, qty_residue_harvested_t_ha,
      residue_burned, synthetic_fertilizer_used, fertilizer_product,
      n_application_rate_kg_ha, application_method, application_depth_cm,
      water_with_fertigation_l_ha, nitrification_inhibitor_used, urease_inhibitor_used,
      organic_fertilizer_used, organic_input_type, organic_input_rate_kg_ha,
      irrigation_done, irrigation_method, irrigation_start_month, irrigation_end_month,
      irrigation_cycles, subsurface_drip_depth_cm, pct_field_flooded,
      liming_done, liming_material, liming_rate_kg_ha,
      livestock_present, livestock_type, stocking_rate, grazing_duration_days,
      biomass_burned, documentary_evidence_uploaded,
      govt_estimate_used, govt_data_source,
    } = req.body;

    // Auto-generate crop year label if not provided
    const autoLabel = crop_year_label ||
      (planting_month ? `${crop_type || 'Crop'} ${planting_month.split('-')[0]}` : null);

    const recordData = {
      farm_id, year, crop_type, crop_year_label: autoLabel,
      planting_month, harvest_month,
      fallow_period, fallow_duration_weeks, is_perennial,
      perennial_planted_year, canopy_cover_pct,
      crop_yield_t_ha, cover_crop_used, cover_crop_species, cover_crop_duration_weeks,
      tillage_done, tillage_type, tillage_depth, tillage_frequency,
      pct_soil_area_disturbed, soil_inverted, residue_cover_after_tillage_pct,
      residue_removed, pct_residue_removed, residue_harvested_for_sale,
      qty_residue_harvested_t_ha, residue_burned,
      synthetic_fertilizer_used, fertilizer_product, n_application_rate_kg_ha,
      application_method, application_depth_cm, water_with_fertigation_l_ha,
      nitrification_inhibitor_used, urease_inhibitor_used,
      organic_fertilizer_used, organic_input_type, organic_input_rate_kg_ha,
      irrigation_done, irrigation_method, irrigation_start_month, irrigation_end_month,
      irrigation_cycles, subsurface_drip_depth_cm, pct_field_flooded,
      liming_done, liming_material, liming_rate_kg_ha,
      livestock_present, livestock_type, stocking_rate, grazing_duration_days,
      biomass_burned, documentary_evidence_uploaded,
      govt_estimate_used, govt_data_source,
      farmer_otp_attested: false, // requires attestation step
      updated_at: new Date().toISOString(),
    };

    // Upsert on farm_id + year combination
    const { data, error } = await supabase
      .from('baseline_records')
      .upsert(recordData, { onConflict: 'farm_id,year' })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const attestBaseline = async (req, res, next) => {
  try {
    const { otp_verified, thumbprint_used, attestation_timestamp } = req.body;
    if (!otp_verified && !thumbprint_used) {
      return res.status(400).json({ error: 'Either OTP verification or thumbprint required' });
    }
    const { data, error } = await supabase
      .from('baseline_records')
      .update({
        farmer_otp_attested: true,
        attestation_method: thumbprint_used ? 'thumbprint' : 'otp',
        attestation_timestamp: attestation_timestamp || new Date().toISOString(),
        attested_by_officer: req.user.id,
      })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ message: 'Baseline record attested successfully', record: data });
  } catch (err) { next(err); }
};
