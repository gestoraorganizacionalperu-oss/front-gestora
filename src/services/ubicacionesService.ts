import axios from 'axios';
import type { Ubicacion, UbicacionesResponse, UbicacionesRequest } from '@/types/ubicaciones';
import { MOCK_CONFIG } from '@/config/mockConfig';

const API_BASE_URL = MOCK_CONFIG.API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const ubicacionesService = {
  /**
   * Obtener todas las ubicaciones y sus áreas
   */
  async getUbicaciones(): Promise<UbicacionesResponse> {
    const response = await apiClient.get<UbicacionesResponse>('/api/maestros/ubicaciones-y-areas');
    return response.data;
  },

  /**
   * Actualizar ubicaciones y áreas (envía todo el array)
   */
  async updateUbicaciones(ubicaciones: UbicacionesRequest): Promise<UbicacionesResponse> {
    const response = await apiClient.put<UbicacionesResponse>(
      '/api/maestros/ubicaciones-y-areas',
      ubicaciones
    );
    return response.data;
  },
};
