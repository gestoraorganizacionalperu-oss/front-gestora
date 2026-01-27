import httpClient from './httpClient';
import type { AuthResponse, LoginCredentials, User, MenuItem } from '@/types';
import { MOCK_CONFIG } from '@/config/mockConfig';
import { validateMockCredentials, simulateNetworkDelay, mockAuthErrorResponse } from '@/mocks/authMock';

// Interfaz para la respuesta real del backend
interface BackendAuthResponse {
  user: {
    id: string;
    Name: string;
    LastName: string;
    Dni: string;
    Email: string;
    Username: string;
    ProfileId: number;
    HasCredentials: boolean;
    IsActive: boolean;
    CompanyId: string;
    CreatedAt: string;
    UpdatedBy: string;
    CreatedBy: string | null;
    UpdatedAt: string;
  };
  permisos: {
    NamePerfil: string;
    DescripcionPerfil: string;
    Menus: Array<{
      Id: number;
      Nombre: string;
      Ruta: string | null;
      Icono: string;
      ParentId: number | null;
      submenus?: Array<{
        Id: number;
        Nombre: string;
        Ruta: string;
        Icono: string;
        ParentId: number;
      }>;
    }>;
  };
  token: string;
}

// Función para transformar la respuesta del backend al formato esperado por el frontend
const transformBackendResponse = (backendResponse: BackendAuthResponse): AuthResponse => {
  // Transformar usuario
  const usuario: User = {
    id: backendResponse.user.id,
    email: backendResponse.user.Email,
    nombre: backendResponse.user.Name,
    apellido: backendResponse.user.LastName,
    rol: backendResponse.permisos.NamePerfil,
    profileId: backendResponse.user.ProfileId,
    empresa_id: backendResponse.user.CompanyId,
    empresa_nombre: 'ToolGestora S.A.', // El backend no retorna el nombre de la empresa
  };

  // Transformar menús
  const transformMenu = (menu: BackendAuthResponse['permisos']['Menus'][0]): MenuItem => {
    return {
      id: menu.Id.toString(),
      nombre: menu.Nombre,
      ruta: menu.Ruta || '#',
      icono: menu.Icono.toLowerCase(),
      orden: menu.Id,
      padre_id: menu.ParentId?.toString() || null,
      hijos: menu.submenus?.map(submenu => ({
        id: submenu.Id.toString(),
        nombre: submenu.Nombre,
        ruta: submenu.Ruta,
        icono: submenu.Icono.toLowerCase(),
        orden: submenu.Id,
        padre_id: submenu.ParentId.toString(),
        hijos: [],
      })) || [],
    };
  };

  const menus: MenuItem[] = backendResponse.permisos.Menus.map(transformMenu);

  return {
    success: true,
    message: 'Login exitoso',
    data: {
      usuario,
      token: backendResponse.token,
      menus,
    },
  };
};

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Si el modo mock está habilitado, usar datos simulados
    if (MOCK_CONFIG.ENABLE_MOCK) {
      console.log('🔧 Modo MOCK habilitado - Usando datos simulados');
      console.log('📧 Credenciales de prueba:');
      console.log('   Admin: admin@toolgestora.com / admin123');
      console.log('   Usuario: usuario@toolgestora.com / user123');
      
      // Simular delay de red
      await simulateNetworkDelay(MOCK_CONFIG.NETWORK_DELAY);
      
      // Validar credenciales mock
      const mockResponse = validateMockCredentials(credentials.email, credentials.password);
      
      if (mockResponse) {
        console.log('✅ Login mock exitoso:', credentials.email);
        return mockResponse;
      } else {
        console.log('❌ Credenciales mock inválidas');
        throw new Error(mockAuthErrorResponse.message);
      }
    }
    
    // Modo normal: usar API real
    console.log('🌐 Modo REAL - Conectando con backend');
    try {
      const response = await httpClient.post<BackendAuthResponse>('/api/auth/login', credentials);
      console.log('✅ Respuesta del backend recibida');
      
      // Transformar la respuesta del backend al formato esperado
      const transformedResponse = transformBackendResponse(response.data);
      console.log('✅ Respuesta transformada correctamente');
      
      return transformedResponse;
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('menus');
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getStoredToken: () => {
    return localStorage.getItem('token');
  },

  getStoredMenus: () => {
    const menusStr = localStorage.getItem('menus');
    return menusStr ? JSON.parse(menusStr) : [];
  },

  storeAuthData: (token: string, user: any, menus: any[]) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('menus', JSON.stringify(menus));
  },
};
