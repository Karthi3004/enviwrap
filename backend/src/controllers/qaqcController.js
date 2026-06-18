import { supabase } from '../db/supabase.js';
import { runQAQCRules } from '../utils/qaqcRules.js';

export const runFarmQAQC = async (req, res, next) => {
  try {
    const { data: farm } = await supabase.from('farms').select('*').eq('id', req.params.farmId).single();
    const { data: baseline } = await supabase.from('baseline_records').select('*').eq('farm_id', req.params.farmId);
    const { data: soc } = await supabase.from('soc_samples').select('*').eq('farm_id', req.params.farmId);
    const { data: monitoring } = await supabase.from('monitoring_visits').select('*').eq('farm_id', req.params.farmId);
    const { flags, summary } = runQAQCRules(farm, baseline || [], soc || [], monitoring || []);
    // Upsert flags
    await supabase.from('qaqc_flags').delete().eq('farm_id', req.params.farmId).eq('resolved', false);
    if (flags.length > 0) {
      await supabase.from('qaqc_flags').insert(flags.map(f => ({ ...f, farm_id: req.params.farmId, resolved: false })));
    }
    res.json({ flags, summary });
  } catch (err) { next(err); }
};

export const listAllFlags = async (req, res, next) => {
  try {
    const { severity, resolved } = req.query;
    let query = supabase.from('qaqc_flags').select('*, farms(farm_id, farmer_full_name)');
    if (severity) query = query.eq('severity', severity);
    if (resolved !== undefined) query = query.eq('resolved', resolved === 'true');
    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const resolveFlag = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('qaqc_flags').update({
      resolved: true,
      resolution_note: req.body.resolution_note,
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};
