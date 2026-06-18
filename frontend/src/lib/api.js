import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// Attach auth token from Supabase session
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── API service methods ────────────────────────────────────────

export const farmAPI = {
  list: (params) => api.get('/farms', { params }),
  get: (id) => api.get(`/farms/${id}`),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  delete: (id) => api.delete(`/farms/${id}`),
  uploadPhotos: (id, photos) => api.post(`/farms/${id}/photos`, { photos }),
  checkOverlap: (data) => api.post('/farms/check-overlap', data),
  getQAQC: (id) => api.get(`/farms/${id}/qaqc`),
};

export const baselineAPI = {
  list: (farmId) => api.get(`/baseline/farm/${farmId}`),
  get: (id) => api.get(`/baseline/${id}`),
  upsert: (data) => api.post('/baseline', data),
  attest: (id, data) => api.post(`/baseline/${id}/attest`, data),
};

export const socAPI = {
  list: (farmId) => api.get(`/soc/farm/${farmId}`),
  get: (id) => api.get(`/soc/${id}`),
  create: (data) => api.post('/soc', data),
  update: (id, data) => api.put(`/soc/${id}`, data),
  uploadLabResults: (id, data) => api.post(`/soc/${id}/lab-results`, data),
};

export const monitoringAPI = {
  list: (farmId) => api.get(`/monitoring/farm/${farmId}`),
  get: (id) => api.get(`/monitoring/${id}`),
  create: (data) => api.post('/monitoring', data),
  update: (id, data) => api.put(`/monitoring/${id}`, data),
  createSiteVisit: (data) => api.post('/monitoring/site-visit', data),
};

export const qaqcAPI = {
  run: (farmId) => api.post(`/qaqc/run/${farmId}`),
  listFlags: (params) => api.get('/qaqc/flags', { params }),
  resolveFlag: (id, data) => api.patch(`/qaqc/flags/${id}/resolve`, data),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  satelliteAlerts: () => api.get('/dashboard/satellite-alerts'),
  visitSchedule: () => api.get('/dashboard/visit-schedule'),
  labTracker: () => api.get('/dashboard/lab-tracker'),
  vvbReadiness: () => api.get('/dashboard/vvb-readiness'),
};

export const verificationAPI = {
  list: () => api.get('/verification'),
  get: (id) => api.get(`/verification/${id}`),
  create: (data) => api.post('/verification', data),
  exportVVB: (id) => api.get(`/verification/${id}/export`),
};

export default api;
