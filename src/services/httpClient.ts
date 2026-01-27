import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { MOCK_CONFIG } from '@/config/mockConfig';

const httpClient: AxiosInstance = axios.create({
  baseURL: MOCK_CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No agregar token al endpoint de login
    if (config.url !== '/api/auth/login') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Redirigir a login si el token es inválido o expiró
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('menus');
      window.location.href = '/login';
    }

    // Extraer el mensaje de error del backend
    if (error.response?.data?.message) {
      const message = error.response.data.message;
      // Si el mensaje es un array, unir los mensajes
      const errorMessage = Array.isArray(message) ? message.join(', ') : message;
      // Crear un nuevo error con el mensaje del backend
      const customError = new Error(errorMessage);
      return Promise.reject(customError);
    }

    return Promise.reject(error);
  }
);

export default httpClient;
