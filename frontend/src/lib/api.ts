import axios from 'axios';
import { supabase } from './supabase';

const getDefaultApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';

  const hostname = window.location.hostname;
  const normalizedHostname = hostname === '0.0.0.0' || hostname === '[::]' || hostname === '::1'
    ? 'localhost'
    : hostname;

  return `${window.location.protocol}//${normalizedHostname}:3001`;
};

const API_URL = import.meta.env.VITE_API_URL || getDefaultApiUrl();

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Fetch token via Supabase Auth
async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Erro de conexão com a API';
    const status = error.response?.status || 0;
    return Promise.reject(new ApiError(message, status));
  }
);

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const { data } = await apiClient.get<T>(path);
    return data;
  },
  post: async <T>(path: string, body: unknown): Promise<T> => {
    const { data } = await apiClient.post<T>(path, body);
    return data;
  },
  put: async <T>(path: string, body: unknown): Promise<T> => {
    const { data } = await apiClient.put<T>(path, body);
    return data;
  },
  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const { data } = await apiClient.patch<T>(path, body);
    return data;
  },
  delete: async <T>(path: string): Promise<T> => {
    const { data } = await apiClient.delete<T>(path);
    return data;
  },
};
