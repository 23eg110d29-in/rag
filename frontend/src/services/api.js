import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const documentApi = {
  upload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  },
  list: () => api.get('/documents'),
  chunks: (filename) => api.get(`/documents/${encodeURIComponent(filename)}/chunks`),
  delete: (filename) => api.delete(`/documents/${encodeURIComponent(filename)}`)
};

export const chatApi = {
  sendMessage: (sessionId, message, retrievalOptions) => api.post('/chat', { sessionId, message, retrievalOptions })
};

export const memoryApi = {
  listSessions: () => api.get('/memory/sessions'),
  getHistory: (sessionId) => api.get(`/memory/${sessionId}`),
  deleteSession: (sessionId) => api.delete(`/memory/${sessionId}`)
};

export const searchApi = {
  debugSearch: (query, limit = 5) => 
    api.get(`/search`, { params: { query, limit } })
};

export const evaluationApi = {
  getMetrics: () => api.get('/evaluation/metrics')
};

export default api;
