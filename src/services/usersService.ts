import httpClient from './httpClient';

export interface UserData {
  id: string;
  name: string;
  lastName: string;
  email: string | null;
  username: string | null;
  dni: string;
  profileId: number;
  profileName: string;
  isActive: boolean;
  hasCredentials: boolean;
  companyId: string;
  puestoId?: string | null; // ID del puesto asignado (solo para responsables)
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  // Solo presente en la respuesta de creación, cuando se envió esTrabajador=true.
  trabajadorVinculado?: { id: string | number; creado: boolean } | null;
}

export interface CreateUserDto {
  name: string;
  lastName: string;
  dni: string;
  profileId: number;
  hasCredentials: boolean;
  email?: string;
  username?: string;
  password?: string;
  puestoId?: string; // Obligatorio solo cuando profileId === 3 (Responsable)
  // Si es true, además de crear el Usuario se crea o vincula (por DNI) un
  // registro en `trabajador`, para que aparezca en Asistencia/Producción.
  esTrabajador?: boolean;
}

export interface UpdateUserDto {
  name: string;
  lastName: string;
  dni: string;
  profileId: number;
  hasCredentials: boolean;
  email?: string;
  username?: string;
  password?: string;
  puestoId?: string; // Obligatorio solo cuando profileId === 3 (Responsable)
}

export const usersService = {
  // Obtener todos los usuarios
  async getUsers(): Promise<UserData[]> {
    const response = await httpClient.get<UserData[]>('/api/users');
    return response.data;
  },

  // Obtener usuario por ID
  async getUserById(id: string): Promise<UserData> {
    const response = await httpClient.get<UserData>(`/api/users/${id}`);
    return response.data;
  },

  // Obtener solo responsables (profileId: 3)
  async getResponsables(): Promise<UserData[]> {
    const users = await this.getUsers();
    return users.filter(user => user.profileId === 3 && user.isActive);
  },

  // Crear un nuevo usuario
  async createUser(data: CreateUserDto): Promise<UserData> {
    const response = await httpClient.post<UserData>('/api/users', data);
    return response.data;
  },

  // Actualizar un usuario
  async updateUser(id: string, data: UpdateUserDto): Promise<UserData> {
    const response = await httpClient.put<UserData>(`/api/users/${id}`, data);
    return response.data;
  },

  // Desactivar un usuario
  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await httpClient.delete<{ message: string }>(`/api/users/${id}`);
    return response.data;
  },
};
