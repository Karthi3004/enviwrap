import { supabase } from '../db/supabase.js';
export const listPeriods = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('verification_periods').select('*').order('start_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};
export const getPeriod = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('verification_periods').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) { next(err); }
};
export const createPeriod = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('verification_periods').insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};
export const exportVVBData = async (req, res, next) => {
  try {
    // Aggregate all data for VVB export
    const { data: period } = await supabase.from('verification_periods').select('*').eq('id', req.params.id).single();
    const { data: farms } = await supabase.from('farms').select('*');
    const { data: baselines } = await supabase.from('baseline_records').select('*');
    const { data: soc } = await supabase.from('soc_samples').select('*');
    const { data: monitoring } = await supabase.from('monitoring_visits').select('*');
    res.json({ period, farms, baselines, soc_samples: soc, monitoring_visits: monitoring, exported_at: new Date().toISOString() });
  } catch (err) { next(err); }
};
