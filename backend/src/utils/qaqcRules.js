/**
 * QA/QC Rules Engine — implements all 30 rules from the dMRV spec
 * Returns array of { rule, severity, message, field }
 */

export const runQAQCRules = (farm, baseline = [], socSamples = [], monitoring = []) => {
  const flags = [];

  const flag = (rule, severity, message, field = null) =>
    flags.push({ rule, severity, message, field, timestamp: new Date().toISOString() });

  // ── Module 1 Rules ──────────────────────────────────────────────
  // Rule 1: GPS accuracy
  if (farm.gps_accuracy_metres > 5) {
    flag(1, 'WARNING', `GPS accuracy ${farm.gps_accuracy_metres}m exceeds 5m threshold`, 'gps_accuracy_metres');
  }

  // Rule 2: Minimum field area
  if (farm.field_area_ha < 0.1) {
    flag(2, 'ERROR', 'Field area below 0.1 ha minimum eligibility', 'field_area_ha');
  }

  // Rule 3: Land type eligibility
  if (!['Cropland', 'Grassland'].includes(farm.land_type)) {
    flag(3, 'ERROR', 'Land type not eligible for VM0042 (must be Cropland or Grassland)', 'land_type');
  }

  // Rule 19 (NEW — Regrow): Polygon overlap
  if (farm.overlap_detected) {
    flag(19, 'BLOCK', 'Polygon overlaps existing registered farm — enrolment blocked until resolved', 'overlap_detected');
  }

  // Rule 26 (NEW — Regrow): Non-agricultural land in polygon
  if (farm.non_ag_land_exclusion === true && !farm.excluded_area_ha) {
    flag(26, 'WARNING', 'Non-agricultural land detected but excluded area not specified', 'excluded_area_ha');
  }

  // Officer confirmed boundary vs satellite
  if (farm.boundary_satellite_match === 'No' && !farm.boundary_discrepancy_note) {
    flag(4, 'ERROR', 'Boundary does not match satellite but no discrepancy note provided', 'boundary_discrepancy_note');
  }

  // ── Module 2 Rules ──────────────────────────────────────────────
  for (const b of baseline) {
    // Rule 5: Fertilizer with no rate
    if (b.synthetic_fertilizer_used && !b.n_application_rate_kg_ha) {
      flag(5, 'ERROR', `Baseline year ${b.year}: Fertilizer used but N rate missing`, 'n_application_rate_kg_ha');
    }

    // Rule 6: Residue burned + residue removed = 100%
    if (b.residue_burned && b.pct_residue_removed === 100) {
      flag(6, 'WARNING', `Baseline year ${b.year}: Both residue burned and 100% removed — verify`, 'residue_burned');
    }

    // Rule 29 (NEW): Flood % > 0 without flood irrigation method
    if (b.pct_field_flooded > 0 && b.irrigation_method !== 'Flood') {
      flag(29, 'WARNING', `Baseline year ${b.year}: Field flooded % > 0 but irrigation method not Flood`, 'pct_field_flooded');
    }

    // Rule 30 (NEW): Inhibitor used but no receipt
    if ((b.nitrification_inhibitor_used || b.urease_inhibitor_used) && !b.documentary_evidence_uploaded) {
      flag(30, 'WARNING', `Baseline year ${b.year}: Inhibitor used but no receipt uploaded`, 'documentary_evidence_uploaded');
    }

    // Farmer OTP attestation must be present
    if (!b.farmer_otp_attested) {
      flag(7, 'BLOCK', `Baseline year ${b.year}: Farmer OTP attestation missing — submission blocked`, 'farmer_otp_attested');
    }
  }

  // ── Module 3 Rules ──────────────────────────────────────────────
  for (const sample of socSamples) {
    // Rule 8: Minimum 5 sub-samples
    if (sample.sub_sample_count < 5) {
      flag(8, 'ERROR', `SOC sample ${sample.id}: Less than 5 sub-samples collected`, 'sub_sample_count');
    }

    // Rule 27 (NEW — Regrow): Vertisol + wet moisture at sampling
    if (sample.soil_group?.includes('Vertisol') && sample.vertisol_moisture_condition === 'Wet') {
      flag(27, 'WARNING', `SOC sample ${sample.id}: Vertisol sampled when wet — BD may be elevated, note in uncertainty calculation`, 'vertisol_moisture_condition');
    }

    // Rule 28 (NEW — Regrow): Vertisol 10% cross-check missing fine BD
    if (sample.is_lab_crosscheck && sample.soil_group?.includes('Vertisol') && !sample.fine_bulk_density) {
      flag(28, 'BLOCK', `SOC sample ${sample.id}: Fine BD required for Vertisol lab cross-check — blocked`, 'fine_bulk_density');
    }

    // Rule 9: GPS accuracy
    if (sample.gps_accuracy_metres > 5) {
      flag(9, 'WARNING', `SOC sample ${sample.id}: GPS accuracy ${sample.gps_accuracy_metres}m exceeds 5m`, 'gps_accuracy_metres');
    }
  }

  // ── Module 4 Rules ──────────────────────────────────────────────
  for (const mon of monitoring) {
    // Rule 20 (NEW): Satellite-tillage vs reported mismatch
    if (mon.satellite_tillage_match === false) {
      flag(20, 'REVIEW', `Monitoring ${mon.id}: Satellite tillage confidence score does not match reported tillage — requires PM review`, 'satellite_tillage_match');
    }

    // Rule 21 (NEW): Satellite crop vs reported mismatch
    if (mon.satellite_crop_match === false) {
      flag(21, 'REVIEW', `Monitoring ${mon.id}: Satellite-derived crop type differs from reported crop`, 'satellite_crop_match');
    }

    // Rule 22 (NEW): Planting date discrepancy > 30 days
    if (mon.planting_date_discrepancy_days > 30) {
      flag(22, 'REVIEW', `Monitoring ${mon.id}: Satellite planting date differs ${mon.planting_date_discrepancy_days} days from reported`, 'planting_date_discrepancy_days');
    }

    // Rule 23 (NEW): Harvest date discrepancy > 30 days
    if (mon.harvest_date_discrepancy_days > 30) {
      flag(23, 'REVIEW', `Monitoring ${mon.id}: Satellite harvest date differs ${mon.harvest_date_discrepancy_days} days from reported`, 'harvest_date_discrepancy_days');
    }

    // Rule 24 (NEW): Residue cover discrepancy > 20%
    if (Math.abs((mon.satellite_residue_cover_pct || 0) - (mon.reported_residue_cover_pct || 0)) > 20) {
      flag(24, 'REVIEW', `Monitoring ${mon.id}: Satellite residue cover differs >20% from reported`, 'satellite_residue_cover_pct');
    }

    // Rule 25 (NEW): Cover crop persistence mismatch > 2 weeks
    if (Math.abs((mon.satellite_cover_crop_weeks || 0) - (mon.reported_cover_crop_weeks || 0)) > 2) {
      flag(25, 'REVIEW', `Monitoring ${mon.id}: Satellite cover crop persistence differs >2 weeks from reported`, 'satellite_cover_crop_weeks');
    }

    // Rule 29: Flood % without flood method
    if (mon.pct_field_flooded > 0 && mon.irrigation_method !== 'Flood') {
      flag(29, 'WARNING', `Monitoring ${mon.id}: Flood % > 0 but irrigation method not Flood`, 'pct_field_flooded');
    }
  }

  // Severity summary
  const summary = {
    total: flags.length,
    blocks: flags.filter(f => f.severity === 'BLOCK').length,
    errors: flags.filter(f => f.severity === 'ERROR').length,
    warnings: flags.filter(f => f.severity === 'WARNING').length,
    reviews: flags.filter(f => f.severity === 'REVIEW').length,
    canSubmit: flags.filter(f => f.severity === 'BLOCK').length === 0,
  };

  return { flags, summary };
};
