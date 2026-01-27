import httpClient from './httpClient';

export interface Perfil {
  IdPerfil: number;
  NamePerfil: string;
}

export const perfilesService = {
  // Obtener todos los perfiles
  async getPerfiles(): Promise<Perfil[]> {
    const response = await httpClient.get<Perfil[]>('/api/maestros/perfiles');
    return response.data;
  },
};
