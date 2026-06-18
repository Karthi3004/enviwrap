import { supabase } from '../db/supabase.js';

export const listVisits = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('monitoring_visits').select('*').eq('farm_id', req.params.farmId).order('visit_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const getVisit = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('monitoring_visits').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Visit not found' });
    res.json(data);
  } catch (err) { next(err); }
};

export const createVisit = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('monitoring_visits').insert({
      ...req.body,
      officer_id: req.user.id,
      visit_date: req.body.visit_date || new Date().toISOString().split('T')[0],
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateVisit = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('monitoring_visits').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const createSiteVisit = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('site_visits').insert({
      ...req.body,
      visitor_id: req.user.id,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};
