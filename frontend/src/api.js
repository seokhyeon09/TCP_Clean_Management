import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tcp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentToken = localStorage.getItem('tcp_token');
      const reqAuth = error.config?.headers?.Authorization;
      // Only clear if the 401 response belongs to the CURRENT active token
      if (reqAuth && currentToken && reqAuth === `Bearer ${currentToken}`) {
        localStorage.removeItem('tcp_token');
        localStorage.removeItem('tcp_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/me'),
  getMyZones: () => api.get('/me/zones'),
  getUsers: () => api.get('/admin/users'),
};

export const deviceApi = {
  list: () => api.get('/admin/device-sets'),
  register: (data) => api.post('/admin/device-sets', data),
  update: (id, data) => api.patch(`/admin/device-sets/${id}`, data),
  deactivate: (id) => api.delete(`/admin/device-sets/${id}`),
};

export const permissionApi = {
  list: () => api.get('/admin/permissions'),
  grant: (userId, zoneId) => api.post('/admin/permissions', { userId, zoneId }),
  revoke: (permissionId) => api.delete(`/admin/permissions/${permissionId}`),
  revokeByUserAndZone: (userId, zoneId) => api.delete(`/admin/permissions?userId=${userId}&zoneId=${zoneId}`),
};

export const zoneApi = {
  list: () => api.get('/admin/zones'),
  create: (data) => api.post('/admin/zones', data),
  update: (id, data) => api.patch(`/admin/zones/${id}`, data),
  delete: (id) => api.delete(`/admin/zones/${id}`),
};

export const dashboardApi = {
  getZoneDashboard: (zoneId) => api.get(`/zones/${zoneId}/dashboard`),
  getZoneSeries: (zoneId, params) => api.get(`/zones/${zoneId}/series`, { params }),
};

export const alertApi = {
  list: (params) => api.get('/alerts', { params }),
  resolve: (alertId, actionDetail) => api.post(`/alerts/${alertId}/actions`, { actionDetail }),
};

export const iotSimulateApi = {
  sendData: (sensorId, payload) => api.post(`/iot/sensors/${sensorId}/data`, payload),
};

export default api;
