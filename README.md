# Enviwrap dMRV Platform
### VM0042 v2.2 | React + Node.js + Supabase

Full-stack digital MRV system for Tamil Nadu soil carbon projects. 279 data fields, 30 QA/QC rules, satellite verification layer, and VVB-ready audit exports.

---

## Architecture

```
enviwrap/
├── frontend/          React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/     8 modules as route pages
│       ├── lib/       Supabase client + API service
│       └── context/   Auth context
│
└── backend/           Node.js + Express
    ├── src/
    │   ├── routes/    9 API route files
    │   ├── controllers/ Business logic per module
    │   ├── utils/     QA/QC rules engine + helpers
    │   └── db/        Supabase service client
    └── schema.sql     Full PostgreSQL schema (run in Supabase)
```

---

## Module Map

| Module | Route | Description |
|--------|-------|-------------|
| 1 — Farm Identity | `GET/POST /api/farms` | 35 fields: farmer, boundary, characteristics |
| 2 — Baseline | `GET/POST /api/baseline` | 70 fields × 3 years, OTP attestation |
| 3 — SOC Samples | `GET/POST /api/soc` | NIR + 10% lab cross-check |
| 4 — Monitoring | `GET/POST /api/monitoring` | Annual visits + satellite cross-verification |
| 5 — Control Sites | `GET/POST /api/control-sites` | KVK/TNAU baseline plots |
| 6 — Verification | `GET/POST /api/verification` | VVB periods + JSON export |
| 7 — QA/QC | `POST /api/qaqc/run/:farmId` | 30 automated rules engine |
| 8 — Dashboard | `GET /api/dashboard/*` | Stats, satellite alerts, lab tracker, VVB readiness |

---

## Setup

### 1. Supabase

1. Create project at https://supabase.com
2. Run `backend/schema.sql` in the SQL editor
3. Enable PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis;`
4. Create storage buckets: `farm-photos`, `soc-photos`, `evidence-docs`, `site-visit-media`
5. Create a user in Auth > Users (set `role` in user_metadata: `officer` / `manager` / `admin`)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY from Supabase project settings
npm install
npm run dev
# API running on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
# App running on http://localhost:5173
```

---

## MySQL Migration

When migrating from Supabase/PostgreSQL to MySQL:

1. Replace all `UUID` types with `CHAR(36)` and manage UUID generation in application code
2. Replace `JSONB` columns with `JSON` (MySQL 5.7.8+) or `TEXT` with JSON parsing in controllers
3. Remove PostGIS — use a bounding box overlap check in application code instead of `ST_Intersects`
4. Replace Supabase RLS policies with middleware role checks (already partially done in `middleware/auth.js`)
5. Replace `@supabase/supabase-js` with `mysql2` or `prisma` in the backend
6. Replace Supabase Auth with JWT + bcrypt user table
7. Replace Supabase Storage with local disk or S3/Cloudinary

Key files to change: `src/db/supabase.js`, all controllers (swap `supabase.from()` calls for SQL queries)

---

## QA/QC Rules Summary

| # | Severity | Trigger |
|---|----------|---------|
| 1 | WARNING | GPS accuracy > 5m |
| 2 | ERROR | Field area < 0.1 ha |
| 3 | ERROR | Land type not Cropland/Grassland |
| 4 | ERROR | Boundary mismatch but no note |
| 5 | ERROR | Fertilizer used, N rate missing |
| 6 | WARNING | Residue burned + 100% removed |
| 7 | BLOCK | Farmer OTP attestation missing |
| 8 | ERROR | SOC sub-samples < 5 |
| 9 | WARNING | SOC sample GPS > 5m |
| 19 | BLOCK | Polygon overlaps existing farm |
| 20 | REVIEW | Satellite vs reported tillage mismatch |
| 21 | REVIEW | Satellite vs reported crop mismatch |
| 22 | REVIEW | Planting date discrepancy > 30 days |
| 23 | REVIEW | Harvest date discrepancy > 30 days |
| 24 | REVIEW | Residue cover discrepancy > 20% |
| 25 | REVIEW | Cover crop persistence mismatch > 2 weeks |
| 26 | WARNING | Non-ag land without excluded area |
| 27 | WARNING | Vertisol sampled wet (BD caveat) |
| 28 | BLOCK | Vertisol lab sample missing fine BD |
| 29 | WARNING | Flood % > 0 without flood method |
| 30 | WARNING | Inhibitor used, no receipt uploaded |

---

## Satellite Verification (Planned Integration)

Four free data sources to connect:
- **Sentinel-2** (ESA Copernicus) — crop type, NDVI, residue cover
- **Sentinel-1 SAR** — tillage detection from backscatter change
- **Landsat 8/9** (NASA/USGS) — backup optical
- **SMAP** (NASA) — soil moisture / irrigation detection

Implement as a scheduled daily job that runs `POST /api/qaqc/run/:farmId` after updating satellite fields in `monitoring_visits`.

---

## Deployment

**Frontend**: Vercel — `cd frontend && vercel`  
**Backend**: Railway / Render — set env vars, `npm start`  
**Database**: Supabase (free tier: 500MB, 2 CPUs)
