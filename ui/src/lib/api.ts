import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const scanApi = {
  startScan: (data: any) => api.post('/scans', data),
  getScan: (id: string) => api.get(`/scans/${id}`),
  getScanStatus: (id: string) => api.get(`/scans/${id}/status`),
  getScans: (accountId?: string) => 
    api.get('/scans', { params: { accountId } }),
  getDashboardStats: () => api.get('/scans/dashboard/stats'),
};

export const assetsApi = {
  getAssets: (accountId?: string, provider?: string) =>
    api.get('/assets', { params: { accountId, provider } }),
  getAsset: (id: string) => api.get(`/assets/${id}`),
  getConfigHistory: (id: string, limit?: number) =>
    api.get(`/assets/${id}/config-history`, { params: { limit } }),
};
