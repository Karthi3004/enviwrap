// Generates ENV-[District]-[Year]-[Serial] e.g. ENV-CBE-2025-0001
export const generateFarmId = (district, serial) => {
  const year = new Date().getFullYear();
  const distCode = district.substring(0, 3).toUpperCase();
  const serialPadded = String(serial).padStart(4, '0');
  return `ENV-${distCode}-${year}-${serialPadded}`;
};

// Generate unique cluster ID from GPS proximity grouping
export const generateClusterId = (district, lat, lng) => {
  // Grid cells of ~1km (0.01 degrees)
  const gridLat = Math.floor(lat * 100);
  const gridLng = Math.floor(lng * 100);
  return `CLU-${district.substring(0, 3).toUpperCase()}-${gridLat}-${gridLng}`;
};

// Calculate polygon area using Shoelace formula (returns hectares)
export const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[j];
    // Convert to meters using approximate equirectangular
    const x1 = lng1 * 111320 * Math.cos(lat1 * Math.PI / 180);
    const y1 = lat1 * 110540;
    const x2 = lng2 * 111320 * Math.cos(lat2 * Math.PI / 180);
    const y2 = lat2 * 110540;
    area += x1 * y2 - x2 * y1;
  }
  const areaM2 = Math.abs(area) / 2;
  return areaM2 / 10000; // convert m² to hectares
};

export const formatDate = (date = new Date()) => date.toISOString().split('T')[0];
