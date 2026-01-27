import type { AuthResponse } from '@/types';

// Mock de datos de usuario y menús (sin Dashboard, según API real)
export const mockAuthResponse: AuthResponse = {
  success: true,
  message: 'Login exitoso',
  data: {
    usuario: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@toolgestora.com',
      nombre: 'Juan Carlos',
      apellido: 'Rodríguez',
      rol: 'Administrador',
      profileId: 2,
      empresa_id: '660e8400-e29b-41d4-a716-446655440001',
      empresa_nombre: 'ToolGestora S.A.'
    },
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImFkbWluQHRvb2xnZXN0b3JhLmNvbSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDg2NDAwfQ.mock-signature',
    menus: [
      {
        id: '2',
        nombre: 'Mantenimiento',
        ruta: '#',
        icono: 'mantenimiento',
        orden: 1,
        padre_id: null,
        hijos: [
          {
            id: '3',
            nombre: 'Empresa',
            ruta: '/empresa',
            icono: 'empresa',
            orden: 1,
            padre_id: '2',
            hijos: []
          },
          {
            id: '4',
            nombre: 'Usuarios',
            ruta: '/usuarios',
            icono: 'usuarios',
            orden: 2,
            padre_id: '2',
            hijos: []
          },
          {
            id: '5',
            nombre: 'Cargos y Puestos',
            ruta: '/cargos',
            icono: 'cargos',
            orden: 3,
            padre_id: '2',
            hijos: []
          },
          {
            id: '6',
            nombre: 'Parámetros',
            ruta: '/parametros',
            icono: 'parametros',
            orden: 4,
            padre_id: '2',
            hijos: []
          }
        ]
      },
      {
        id: '7',
        nombre: 'Organigrama',
        ruta: '/organigrama',
        icono: 'organigrama',
        orden: 2,
        padre_id: null,
        hijos: []
      },
      {
        id: '8',
        nombre: 'Matriz de Procesos',
        ruta: '/matriz-procesos',
        icono: 'matriz',
        orden: 3,
        padre_id: null,
        hijos: []
      },
      {
        id: '9',
        nombre: 'MOF',
        ruta: '/mof',
        icono: 'mof',
        orden: 4,
        padre_id: null,
        hijos: []
      },
      {
        id: '10',
        nombre: 'Políticas y Procedimientos',
        ruta: '/politicas',
        icono: 'politicas',
        orden: 5,
        padre_id: null,
        hijos: []
      }
    ]
  }
};

// Mock de respuesta de error
export const mockAuthErrorResponse = {
  success: false,
  message: 'Credenciales inválidas',
  data: null
};

// Usuarios de prueba
export const mockUsers = [
  {
    email: 'admin@toolgestora.com',
    password: 'admin123',
    response: mockAuthResponse
  },
  {
    email: 'usuario@toolgestora.com',
    password: 'user123',
    response: {
      success: true,
      message: 'Login exitoso',
      data: {
        usuario: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'usuario@toolgestora.com',
          nombre: 'María',
          apellido: 'González',
          rol: 'Usuario',
          profileId: 4,
          empresa_id: '660e8400-e29b-41d4-a716-446655440001',
          empresa_nombre: 'ToolGestora S.A.'
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDIiLCJlbWFpbCI6InVzdWFyaW9AdG9vbGdlc3RvcmEuY29tIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwODY0MDB9.mock-signature',
        menus: [
          {
            id: '7',
            nombre: 'Organigrama',
            ruta: '/organigrama',
            icono: 'organigrama',
            orden: 1,
            padre_id: null,
            hijos: []
          },
          {
            id: '9',
            nombre: 'MOF',
            ruta: '/mof',
            icono: 'mof',
            orden: 2,
            padre_id: null,
            hijos: []
          }
        ]
      }
    }
  }
];

// Función para simular delay de red
export const simulateNetworkDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Función para validar credenciales mock
export const validateMockCredentials = (email: string, password: string) => {
  const user = mockUsers.find(u => u.email === email && u.password === password);
  return user ? user.response : null;
};
