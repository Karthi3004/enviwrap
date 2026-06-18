import { supabase } from '../db/supabase.js';
export const listControlSites = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('control_sites').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};
export const getControlSite = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('control_sites').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) { next(err); }
};
export const createControlSite = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('control_sites').insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};
