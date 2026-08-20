import axios from 'axios';
import type {
  ApiResponse,
  ChatRequestDto,
  ChatResponseDto,
  DocumentMetadataDto,
  DocumentResponseDto,
  SearchRequestDto,
  SearchResultDto,
} from '../types';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request from the Zustand auth store
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Catch 401 Unauthorized responses, log out, and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Document APIs
export const documentApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<ApiResponse<DocumentResponseDto>> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ApiResponse<DocumentResponseDto>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  uploadMultiple: async (files: File[], onProgress?: (pct: number) => void): Promise<ApiResponse<DocumentResponseDto[]>> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const { data } = await api.post<ApiResponse<DocumentResponseDto[]>>('/documents/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  // Logged-in user's own documents
  getMine: async (): Promise<ApiResponse<DocumentMetadataDto[]>> => {
    const { data } = await api.get<ApiResponse<DocumentMetadataDto[]>>('/documents/user');
    return data;
  },

  // Admin-only all documents
  getAll: async (): Promise<ApiResponse<DocumentMetadataDto[]>> => {
    const { data } = await api.get<ApiResponse<DocumentMetadataDto[]>>('/documents');
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<DocumentMetadataDto>> => {
    const { data } = await api.get<ApiResponse<DocumentMetadataDto>>(`/documents/${id}`);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`/documents/${id}`);
    return data;
  },
};

// Chat APIs
export const chatApi = {
  query: async (request: ChatRequestDto): Promise<ApiResponse<ChatResponseDto>> => {
    const { data } = await api.post<ApiResponse<ChatResponseDto>>('/chat/query', request);
    return data;
  },

  searchSimilarity: async (request: SearchRequestDto): Promise<ApiResponse<SearchResultDto>> => {
    const { data } = await api.post<ApiResponse<SearchResultDto>>('/chat/search/similarity', request);
    return data;
  },

  // Helper for raw fetch streaming with auth header
  stream: async (request: ChatRequestDto, signal?: AbortSignal): Promise<Response> => {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/v1/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    return response;
  },
};

export default api;
