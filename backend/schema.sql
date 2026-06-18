-- ============================================================
-- ENVIWRAP dMRV DATABASE SCHEMA
-- VM0042 v2.2 | Supabase PostgreSQL
-- Run this in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis; -- for polygon overlap checks

-- ============================================================
-- MODULE 1: FARMS (Farm & Field Identity)
-- ============================================================
CREATE TABLE farms (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id                     VARCHAR(30) UNIQUE NOT NULL,       -- ENV-CBE-2025-0001
  
  -- 1A: Farm Identity
  farmer_full_name            TEXT NOT NULL,
  farmer_phone                VARCHAR(10) NOT NULL,
  aadhaar_last4               VARCHAR(4) NOT NULL,
  village                     TEXT NOT NULL,
  block_taluk                 TEXT NOT NULL,
  district                    TEXT NOT NULL,
  state                       TEXT NOT NULL DEFAULT 'Tamil Nadu',
  cluster_id                  TEXT,
  enrolment_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  field_officer_id            UUID REFERENCES auth.users(id),
  field_officer_name          TEXT,

  -- 1B: Field Boundary
  gps_boundary_coordinates    JSONB,                             -- [[lat,lng], ...]
  field_area_ha               DECIMAL(10,4),
  gps_accuracy_metres         DECIMAL(6,2),
  boundary_satellite_match    VARCHAR(20),                       -- Yes/No/Partially
  boundary_discrepancy_note   TEXT,
  overlap_detected            BOOLEAN DEFAULT false,
  overlap_alert_resolved      BOOLEAN DEFAULT false,
  non_ag_land_exclusion       BOOLEAN DEFAULT false,
  excluded_area_ha            DECIMAL(10,4) DEFAULT 0,
  net_eligible_area_ha        DECIMAL(10,4),
  cadastral_reference         TEXT,
  land_type                   VARCHAR(20),                       -- Cropland/Grassland
  satellite_image_url         TEXT,

  -- 1C: Farm Characteristics
  primary_crop                TEXT NOT NULL,
  secondary_crop              TEXT,
  crop_system_type            VARCHAR(20),                       -- Annual/Perennial/Mixed
  irrigation_source           VARCHAR(50),
  slope_class                 VARCHAR(20),
  ipcc_climate_zone           TEXT,
  fao_soil_group              TEXT,
  nearest_weather_station     TEXT,
  distance_to_weather_km      DECIMAL(8,2),
  field_photos                JSONB,                             -- [{direction, path}]

  -- Platform fields
  status                      VARCHAR(20) DEFAULT 'enrolled',
  data_completeness_pct       INTEGER DEFAULT 0,
  last_visit_date             DATE,
  estimated_vcus              DECIMAL(10,2),

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for polygon queries (PostGIS)
-- CREATE INDEX farms_boundary_gix ON farms USING GIST(ST_GeomFromGeoJSON(gps_boundary_coordinates::TEXT));

CREATE INDEX idx_farms_district ON farms(district);
CREATE INDEX idx_farms_cluster ON farms(cluster_id);
CREATE INDEX idx_farms_status ON farms(status);
CREATE INDEX idx_farms_officer ON farms(field_officer_id);


-- ============================================================
-- MODULE 2: BASELINE RECORDS (Historical Data — 3 years)
-- ============================================================
CREATE TABLE baseline_records (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id                         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  year                            VARCHAR(5) NOT NULL,            -- t-1, t-2, t-3
  
  -- Crop info
  crop_type                       TEXT NOT NULL,
  crop_year_label                 TEXT,                           -- "Kharif 2023"
  planting_month                  VARCHAR(7),                     -- YYYY-MM
  harvest_month                   VARCHAR(7),
  fallow_period                   BOOLEAN,
  fallow_duration_weeks           INTEGER,
  is_perennial                    BOOLEAN,
  perennial_planted_year          INTEGER,
  canopy_cover_pct                VARCHAR(20),
  crop_yield_t_ha                 DECIMAL(8,2),
  
  -- Cover crop
  cover_crop_used                 BOOLEAN,
  cover_crop_species              TEXT,
  cover_crop_duration_weeks       INTEGER,
  
  -- Tillage
  tillage_done                    BOOLEAN,
  tillage_type                    VARCHAR(30),
  tillage_depth                   VARCHAR(20),
  tillage_frequency               VARCHAR(10),
  pct_soil_area_disturbed         VARCHAR(20),
  soil_inverted                   BOOLEAN,
  residue_cover_after_tillage_pct VARCHAR(20),
  
  -- Residue
  residue_removed                 BOOLEAN,
  pct_residue_removed             INTEGER,
  residue_harvested_for_sale      BOOLEAN,
  qty_residue_harvested_t_ha      DECIMAL(8,2),
  residue_burned                  BOOLEAN,
  
  -- Fertilizer
  synthetic_fertilizer_used       BOOLEAN,
  fertilizer_product              TEXT,
  n_application_rate_kg_ha        VARCHAR(30),
  application_method              VARCHAR(30),
  application_depth_cm            DECIMAL(6,1),
  water_with_fertigation_l_ha     DECIMAL(10,1),
  nitrification_inhibitor_used    BOOLEAN,
  urease_inhibitor_used           BOOLEAN,
  
  -- Organic input
  organic_fertilizer_used         BOOLEAN,
  organic_input_type              TEXT,
  organic_input_rate_kg_ha        VARCHAR(30),
  
  -- Irrigation
  irrigation_done                 BOOLEAN,
  irrigation_method               VARCHAR(30),
  irrigation_start_month          VARCHAR(7),
  irrigation_end_month            VARCHAR(7),
  irrigation_cycles               INTEGER,
  subsurface_drip_depth_cm        DECIMAL(6,1),
  pct_field_flooded               INTEGER,
  
  -- Liming
  liming_done                     BOOLEAN,
  liming_material                 VARCHAR(30),
  liming_rate_kg_ha               DECIMAL(8,1),
  
  -- Livestock
  livestock_present               BOOLEAN,
  livestock_type                  TEXT,
  stocking_rate                   DECIMAL(8,2),
  grazing_duration_days           INTEGER,
  
  -- Other
  biomass_burned                  BOOLEAN,
  documentary_evidence_uploaded   BOOLEAN DEFAULT false,
  govt_estimate_used              BOOLEAN DEFAULT false,
  govt_data_source                TEXT,
  
  -- Attestation
  farmer_otp_attested             BOOLEAN DEFAULT false,
  attestation_method              VARCHAR(20),
  attestation_timestamp           TIMESTAMPTZ,
  attested_by_officer             UUID REFERENCES auth.users(id),

  UNIQUE(farm_id, year),
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_baseline_farm ON baseline_records(farm_id);


-- ============================================================
-- MODULE 3: SOC SAMPLES
-- ============================================================
CREATE TABLE soc_samples (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id                     UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cluster_id                  TEXT,
  sample_date                 DATE,
  
  -- Collection
  sub_sample_count            INTEGER DEFAULT 5,
  sample_gps_lat              DECIMAL(10,7),
  sample_gps_lng              DECIMAL(10,7),
  gps_accuracy_metres         DECIMAL(6,2),
  gps_instrument_type         VARCHAR(40),
  gps_accuracy_class          VARCHAR(30),
  sampling_depth_cm           DECIMAL(6,1),
  
  -- Soil characteristics
  soil_group                  TEXT,
  vertisol_moisture_condition VARCHAR(10),                        -- Dry/Moist/Wet
  
  -- NIR results
  nir_soc_pct                 DECIMAL(6,3),
  nir_bulk_density            DECIMAL(6,3),
  nir_analyzed_at             TIMESTAMPTZ,
  
  -- Lab results (10% cross-check)
  is_lab_crosscheck           BOOLEAN DEFAULT false,
  lab_soc_pct                 DECIMAL(6,3),
  lab_bulk_density            DECIMAL(6,3),
  fine_bulk_density           DECIMAL(6,3),
  lab_status                  VARCHAR(20) DEFAULT 'pending',      -- pending/sent/received
  lab_result_received_at      TIMESTAMPTZ,
  
  -- Satellite cross-check
  satellite_land_cover        TEXT,
  satellite_land_cover_ok     BOOLEAN,
  satellite_discrepancy_flag  BOOLEAN DEFAULT false,
  
  collected_by                UUID REFERENCES auth.users(id),
  collected_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_soc_farm ON soc_samples(farm_id);
CREATE INDEX idx_soc_cluster ON soc_samples(cluster_id);


-- ============================================================
-- MODULE 4A: MONITORING VISITS (Annual)
-- ============================================================
CREATE TABLE monitoring_visits (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id                         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  visit_date                      DATE NOT NULL,
  officer_id                      UUID REFERENCES auth.users(id),
  
  -- Crop
  crop_type                       TEXT,
  crop_year_label                 TEXT,
  fallow_period_this_year         BOOLEAN,
  fallow_duration_weeks           INTEGER,
  is_perennial                    BOOLEAN,
  canopy_cover_pct                VARCHAR(20),
  crop_yield_t_ha                 DECIMAL(8,2),
  
  -- Cover crop
  cover_crop_used                 BOOLEAN,
  cover_crop_species              TEXT,
  cover_crop_persistence_weeks    INTEGER,
  
  -- Tillage (with satellite cross-check)
  tillage_done                    BOOLEAN,
  tillage_type                    VARCHAR(30),
  soil_inverted                   BOOLEAN,
  residue_cover_after_tillage_pct VARCHAR(20),
  satellite_tillage_score         DECIMAL(6,3),
  satellite_tillage_match         BOOLEAN,
  
  -- Residue (with satellite)
  residue_removed                 BOOLEAN,
  pct_residue_removed             INTEGER,
  reported_residue_cover_pct      INTEGER,
  residue_harvested_for_sale      BOOLEAN,
  qty_residue_harvested_t_ha      DECIMAL(8,2),
  residue_burned                  BOOLEAN,
  satellite_residue_cover_pct     DECIMAL(6,2),
  residue_cover_discrepancy_flag  BOOLEAN DEFAULT false,
  
  -- Crop dates (with satellite)
  planting_date                   DATE,
  harvest_date                    DATE,
  satellite_planting_date         DATE,
  satellite_harvest_date          DATE,
  planting_date_discrepancy_days  INTEGER,
  harvest_date_discrepancy_days   INTEGER,
  
  -- Satellite crop
  satellite_crop_type             TEXT,
  satellite_crop_match            BOOLEAN,
  
  -- Cover crop satellite
  satellite_cover_crop_weeks      INTEGER,
  cover_crop_persistence_flag     BOOLEAN DEFAULT false,
  
  -- Fertilizer
  synthetic_fertilizer_used       BOOLEAN,
  fertilizer_product              TEXT,
  n_application_rate_kg_ha        VARCHAR(30),
  application_method              VARCHAR(30),
  application_depth_cm            DECIMAL(6,1),
  water_with_fertigation_l_ha     DECIMAL(10,1),
  nitrification_inhibitor_used    BOOLEAN,
  urease_inhibitor_used           BOOLEAN,
  organic_fertilizer_used         BOOLEAN,
  organic_input_type              TEXT,
  organic_input_rate_kg_ha        VARCHAR(30),
  
  -- Irrigation
  irrigation_done                 BOOLEAN,
  irrigation_method               VARCHAR(30),
  irrigation_start_date           DATE,
  irrigation_end_date             DATE,
  irrigation_cycles               INTEGER,
  subsurface_drip_depth_cm        DECIMAL(6,1),
  pct_field_flooded               INTEGER,
  
  -- Evidence
  video_evidence_url              TEXT,
  tractor_log_photo_url           TEXT,
  photos                          JSONB,
  
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_monitoring_farm ON monitoring_visits(farm_id);
CREATE INDEX idx_monitoring_date ON monitoring_visits(visit_date);


-- ============================================================
-- MODULE 4B: FORMAL SITE VISITS
-- ============================================================
CREATE TABLE site_visits (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id                         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  visit_date                      DATE NOT NULL,
  visitor_id                      UUID REFERENCES auth.users(id),
  visitor_role                    TEXT,
  
  crops_observed                  TEXT,
  tillage_evidence_observed       VARCHAR(40),
  residue_cover_observed_pct      VARCHAR(20),
  cover_crop_observed             BOOLEAN,
  organic_input_evidence          BOOLEAN,
  irrigation_infrastructure       TEXT,
  agroforestry_trees_count        INTEGER,
  
  farmer_interview_conducted      BOOLEAN,
  farmer_statements_consistent    BOOLEAN,
  discrepancies_noted             TEXT,
  
  photos                          JSONB,                          -- min 6 photos
  video_url                       TEXT,
  officer_signed                  BOOLEAN DEFAULT false,
  
  created_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sitevisit_farm ON site_visits(farm_id);


-- ============================================================
-- MODULE 5: CONTROL SITES
-- ============================================================
CREATE TABLE control_sites (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id          TEXT NOT NULL,
  site_name           TEXT NOT NULL,
  site_type           VARCHAR(30),                                -- KVK/TNAU/farmer-delay
  gps_lat             DECIMAL(10,7),
  gps_lng             DECIMAL(10,7),
  area_ha             DECIMAL(10,4),
  soil_group          TEXT,
  baseline_soc_pct    DECIMAL(6,3),
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- MODULE 6: VERIFICATION PERIODS
-- ============================================================
CREATE TABLE verification_periods (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_name             TEXT NOT NULL,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  status                  VARCHAR(20) DEFAULT 'open',              -- open/vvb-review/closed
  
  total_farms             INTEGER DEFAULT 0,
  total_area_ha           DECIMAL(12,4) DEFAULT 0,
  total_errs_t_co2e       DECIMAL(12,4) DEFAULT 0,
  total_vcus_issued       DECIMAL(12,4) DEFAULT 0,
  
  vvb_name                TEXT,
  vvb_audit_date          DATE,
  notes                   TEXT,
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- MODULE 7: QA/QC FLAGS
-- ============================================================
CREATE TABLE qaqc_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id         UUID REFERENCES farms(id) ON DELETE CASCADE,
  rule            INTEGER NOT NULL,
  severity        VARCHAR(10) NOT NULL,                            -- BLOCK/ERROR/WARNING/REVIEW
  message         TEXT NOT NULL,
  field           TEXT,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  resolved        BOOLEAN DEFAULT false,
  resolution_note TEXT,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_flags_farm ON qaqc_flags(farm_id);
CREATE INDEX idx_flags_severity ON qaqc_flags(severity);
CREATE INDEX idx_flags_resolved ON qaqc_flags(resolved);


-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE soc_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qaqc_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all (field officers see all farms in their org)
CREATE POLICY "auth_read_farms" ON farms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_farms" ON farms FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_farms" ON farms FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_read_baseline" ON baseline_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_baseline" ON baseline_records FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_soc" ON soc_samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_soc" ON soc_samples FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_monitoring" ON monitoring_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_monitoring" ON monitoring_visits FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_sitevisits" ON site_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sitevisits" ON site_visits FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_control" ON control_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_control" ON control_sites FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_verification" ON verification_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_verification" ON verification_periods FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_flags" ON qaqc_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_flags" ON qaqc_flags FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);


-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('farm-photos', 'farm-photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('soc-photos', 'soc-photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-docs', 'evidence-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('site-visit-media', 'site-visit-media', false);
