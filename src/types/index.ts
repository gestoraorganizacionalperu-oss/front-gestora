export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  profileId?: number;
  empresa_id: string;
  empresa_nombre: string;
}

export interface MenuItem {
  id: string;
  nombre: string;
  ruta: string;
  icono?: string;
  orden: number;
  padre_id?: string;
  hijos?: MenuItem[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    usuario: User;
    token: string;
    menus: MenuItem[];
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type MessageType = 'success' | 'error' | 'warning' | 'information';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
}
