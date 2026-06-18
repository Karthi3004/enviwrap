import { supabase } from '../db/supabase.js';

export const listSamples = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').select('*').eq('farm_id', req.params.farmId);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const getSample = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Sample not found' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createSample = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').insert({
      ...req.body,
      collected_by: req.user.id,
      collected_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateSample = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const uploadLabResults = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('soc_samples').update({
      lab_soc_pct: req.body.soc_pct,
      lab_bulk_density: req.body.bulk_density,
      fine_bulk_density: req.body.fine_bulk_density,
      lab_result_received_at: new Date().toISOString(),
      lab_status: 'received',
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};
