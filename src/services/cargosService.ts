import httpClient from './httpClient';

export interface Cargo {
  _id: string;
  Nombre: string;
  Descripcion: string;
  ParentId: string | null;
  IsActive: boolean;
  CompanyId: string;
  CreatedBy: string;
  UpdatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateCargoDto {
  name: string;
  description: string;
  parentId?: string | null;
  level: number;
}

export interface UpdateCargoDto {
  name: string;
  description: string;
  parentId?: string | null;
}

export const cargosService = {
  // Obtener todos los cargos
  async getCargos(): Promise<Cargo[]> {
    const response = await httpClient.get<Cargo[]>('/api/cargos');
    return response.data;
  },

  // Obtener cargo por ID
  async getCargoById(id: string): Promise<Cargo> {
    const response = await httpClient.get<Cargo>(`/api/cargos/${id}`);
    return response.data;
  },

  // Crear un nuevo cargo
  async createCargo(data: CreateCargoDto): Promise<Cargo> {
    const response = await httpClient.post<Cargo>('/api/cargos', data);
    return response.data;
  },

  // Actualizar un cargo
  async updateCargo(id: string, data: UpdateCargoDto): Promise<Cargo> {
    const response = await httpClient.put<Cargo>(`/api/cargos/${id}`, data);
    return response.data;
  },

  // Eliminar (desactivar) un cargo
  async deleteCargo(id: string): Promise<{ message: string }> {
    const response = await httpClient.delete<{ message: string }>(`/api/cargos/${id}`);
    return response.data;
  },
};
