import { supabase } from '../db/supabase.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const [{ count: totalFarms }, { data: farms }] = await Promise.all([
      supabase.from('farms').select('*', { count: 'exact', head: true }),
      supabase.from('farms').select('net_eligible_area_ha, status, district'),
    ]);
    const totalArea = farms?.reduce((sum, f) => sum + (f.net_eligible_area_ha || 0), 0) || 0;
    const byDistrict = farms?.reduce((acc, f) => { acc[f.district] = (acc[f.district] || 0) + 1; return acc; }, {});
    res.json({ total_farms: totalFarms, total_area_ha: totalArea, farms_by_district: byDistrict, estimated_vcus: totalArea * 0.5 });
  } catch (err) { next(err); }
};

export const getSatelliteAlerts = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('qaqc_flags').select('*, farms(farm_id, farmer_full_name)').in('rule', [20,21,22,23,24,25]).eq('resolved', false).order('timestamp', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const getVisitSchedule = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 365);
    const { data, error } = await supabase.from('farms').select('id, farm_id, farmer_full_name, district').lt('last_visit_date', thirtyDaysAgo.toISOString().split('T')[0]).order('last_visit_date', { ascending: true });
    if (error) throw error;
    res.json({ due_visits: data, count: data?.length || 0 });
  } catch (err) { next(err); }
};

export const getLabTracker = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').select('id, farm_id, lab_status, collected_at, lab_result_received_at, farms(farm_id, farmer_full_name)');
    if (error) throw error;
    const pending = data?.filter(s => s.lab_status !== 'received') || [];
    const received = data?.filter(s => s.lab_status === 'received') || [];
    res.json({ pending, received, total: data?.length || 0 });
  } catch (err) { next(err); }
};

export const getVVBReadiness = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('farms').select('id, farm_id, farmer_full_name, data_completeness_pct, status');
    if (error) throw error;
    const green = data?.filter(f => f.data_completeness_pct >= 90) || [];
    const amber = data?.filter(f => f.data_completeness_pct >= 60 && f.data_completeness_pct < 90) || [];
    const red = data?.filter(f => f.data_completeness_pct < 60) || [];
    res.json({ green, amber, red, summary: { green: green.length, amber: amber.length, red: red.length } });
  } catch (err) { next(err); }
};
