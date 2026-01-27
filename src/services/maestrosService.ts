import httpClient from './httpClient';

export interface Area {
  id: string;
  nombre: string;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  areas: Area[];
}

// Área completa del endpoint /api/maestros/areas
export interface AreaCompleta {
  _id: string;
  Nombre: string;
  UbicacionId: string;
  IsActive: boolean;
  CompanyId: string;
  CreatedBy: string;
  UpdatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
  Codigo: string;
}

export const maestrosService = {
  // Obtener ubicaciones y áreas
  async getUbicacionesYAreas(): Promise<Ubicacion[]> {
    const response = await httpClient.get<Ubicacion[]>('/api/maestros/ubicaciones-y-areas');
    return response.data;
  },

  // Obtener todas las áreas
  async getAreas(): Promise<AreaCompleta[]> {
    const response = await httpClient.get<AreaCompleta[]>('/api/maestros/areas');
    return Array.isArray(response.data) ? response.data : [];
  },
};
