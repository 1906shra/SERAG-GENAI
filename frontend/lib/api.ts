import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Re-throw so callers can handle 401 themselves.
    // AuthGuard and AuthManager handle session clearing + redirect.
    // We do NOT auto-redirect here to avoid redirect loops.
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data: { name?: string; email?: string }) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
  
  updateSettings: async (settings: any) => {
    const response = await api.put('/auth/settings', { settings });
    return response.data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/password', { currentPassword, newPassword });
    return response.data;
  },
};

export const uploadAPI = {
  uploadFile: async (file: File, data: any) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    const response = await api.post('/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  uploadURL: async (data: { url: string; title?: string; tags?: string; category?: string; isPublic?: boolean }) => {
    const response = await api.post('/upload/url', data);
    return response.data;
  },
  
  getUploadStatus: async (id: string) => {
    const response = await api.get(`/upload/status/${id}`);
    return response.data;
  },
  
  getUserDocuments: async (params?: { page?: number; limit?: number; contentType?: string; tags?: string; search?: string }) => {
    const response = await api.get('/upload/documents', { params });
    return response.data;
  },
  
  deleteDocument: async (id: string) => {
    const response = await api.delete(`/upload/documents/${id}`);
    return response.data;
  },
};

export const searchAPI = {
  search: async (query: string, options?: any) => {
    const response = await api.post('/search', { query, options });
    return response.data;
  },
  
  getSearchSuggestions: async (partialQuery: string) => {
    const response = await api.get('/search/suggestions', { params: { q: partialQuery } });
    return response.data;
  },
  
  getPopularQueries: async (params?: { limit?: number; timeRange?: number }) => {
    const response = await api.get('/search/popular', { params });
    return response.data;
  },
  
  getSearchHistory: async (params?: { page?: number; limit?: number; sessionId?: string }) => {
    const response = await api.get('/search/history', { params });
    return response.data;
  },
  
  addFeedback: async (searchId: string, feedback: { rating?: number; helpful?: boolean; comments?: string }) => {
    const response = await api.post(`/search/${searchId}/feedback`, feedback);
    return response.data;
  },
  
  getSearchAnalytics: async (params?: { days?: number }) => {
    const response = await api.get('/search/analytics', { params });
    return response.data;
  },
};

export const analyticsAPI = {
  getDashboard: async (params?: { days?: number }) => {
    const response = await api.get('/analytics/dashboard', { params });
    return response.data;
  },
  
  getSearchAnalytics: async (params?: { days?: number; granularity?: 'daily' | 'hourly' }) => {
    const response = await api.get('/analytics/search', { params });
    return response.data;
  },
  
  getDocumentAnalytics: async () => {
    const response = await api.get('/analytics/documents');
    return response.data;
  },
  
  getUsageTrends: async (params?: { days?: number }) => {
    const response = await api.get('/analytics/trends', { params });
    return response.data;
  },
  
  exportAnalytics: async (params?: { days?: number; format?: 'json' | 'csv' }) => {
    const response = await api.get('/analytics/export', { 
      params,
      responseType: params?.format === 'csv' ? 'blob' : 'json'
    });
    return response.data;
  },
};

export default api;
