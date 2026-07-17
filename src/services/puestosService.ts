import httpClient from './httpClient';

// Mock mode flag - set to true to use mock data without backend
const USE_MOCK_MODE = false;

export interface Requisito {
  Id: number;
  Requisito: string;
}

export interface Responsable {
  Id: number;
  UsuarioId: string;
  Name: string;
  Email: string;
}

export interface Puesto {
  _id: string;
  Nombre: string;
  Descripcion: string;
  CargoId: string;
  UbicacionId: string;
  AreaId: string;
  puestoParentId?: string | null;
  requisitos: Requisito[];
  responsibles: Responsable[];
  IsActive: boolean;
  CompanyId: string;
  CreatedBy: string;
  UpdatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  mof_duties: any[];
}

export interface CreatePuestoDto {
  name: string;
  description: string;
  cargoId: string;
  locationId: string;
  areaId: string;
  puestoParentId?: string | null;
  technicalRequirements: string[];
  responsibleIds?: string[]; // Opcional - ya no se gestiona desde este formulario
}

export interface UpdatePuestoDto {
  name: string;
  description: string;
  cargoId: string;
  locationId: string;
  areaId: string;
  puestoParentId?: string | null;
  technicalRequirements: string[];
  responsibleIds?: string[]; // Opcional - ya no se gestiona desde este formulario
}

export interface MOFListItem {
  _id: string;
  Nombre: string;
  CargoId: string;
  NombreCargo: string;
}

export interface MOFActividad {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface MOFDetalle {
  _id: string;
  Nombre: string;
  CargoId: string;
  NombreCargo: string;
  requisitos: string[];
  actividades: MOFActividad[];
}

export interface MOFMasivoItem {
  _id: string;
  Nombre: string;
  CargoId: string;
  NombreCargo: string;
  AreaId: string;
  NombreArea: string;
  requisitos: string[];
  actividades: MOFActividad[];
  cantidadResponsables: number;
  puestoPadre: string;
}

// Mock data
const mockPuestos: Puesto[] = [
  {
    _id: '6907f12efdd7fe49aee4c808',
    Nombre: 'Supervisor de Almacén',
    Descripcion: 'Responsable de supervisar las operaciones diarias del almacén, coordinar el personal y asegurar el cumplimiento de los procedimientos de recepción, almacenamiento y despacho de mercadería.',
    CompanyId: '6907a5a21f9a5744d381627b',
    IsActive: true,
    AreaId: '65e24d89aaaaaaaabbbbbbbb',
    UbicacionId: '65e24c781111111111111111',
    requisitos: [
      {
        Id: 1,
        Requisito: 'Experiencia mínima de 2 años en gestión de almacenes',
      },
    ],
    responsibles: [
      {
        Id: 1,
        UsuarioId: '6907aa501f9a5744d3816284',
        Name: 'Juan Pérez',
        Email: 'juan.perez@empresa.com',
      },
    ],
    CargoId: '6907d7b9d36b456ea8529062',
    CreatedBy: '6907aa501f9a5744d3816284',
    UpdatedBy: '6907aa501f9a5744d3816284',
    mof_duties: [],
    CreatedAt: '2025-11-03T00:02:54.312Z',
    UpdatedAt: '2025-11-29T21:49:11.869Z',
  },
  {
    _id: '692cedb3a083e06933a1ed57',
    Nombre: 'Digitador',
    Descripcion: 'Encargado de registrar en el sistema toda la información relacionada con la recepción de mercadería, incluyendo cantidades, códigos de productos y observaciones relevantes.',
    CompanyId: '6907a5a21f9a5744d381627b',
    IsActive: true,
    AreaId: '65e24d89aaaaaaaabbbbbbbb',
    UbicacionId: '65e24c781111111111111111',
    requisitos: [
      {
        Id: 1,
        Requisito: 'Conocimientos en sistemas de gestión de inventarios',
      },
    ],
    responsibles: [
      {
        Id: 1,
        UsuarioId: '6910c76feb5cb666615ef49f',
        Name: 'María González',
        Email: 'maria.gonzalez@empresa.com',
      },
    ],
    CargoId: '692cec64a083e06933a1ed3a',
    CreatedBy: '6907aa501f9a5744d3816284',
    UpdatedBy: '6907aa501f9a5744d3816284',
    mof_duties: [],
    CreatedAt: '2025-12-01T01:21:55.510Z',
    UpdatedAt: '2025-12-01T01:25:46.465Z',
  },
  {
    _id: '692cee3ca083e06933a1ed66',
    Nombre: 'Almacenero',
    Descripcion: 'Responsable de la recepción física de la mercadería, verificación de cantidades y estado de los productos, y su correcta ubicación en el almacén.',
    CompanyId: '6907a5a21f9a5744d381627b',
    IsActive: true,
    AreaId: '65e24d89aaaaaaaabbbbbbbb',
    UbicacionId: '65e24c781111111111111111',
    requisitos: [
      {
        Id: 1,
        Requisito: 'Capacidad física para manipular cargas',
      },
    ],
    responsibles: [
      {
        Id: 1,
        UsuarioId: '6907aa741f9a5744d3816286',
        Name: 'Carlos Ramírez',
        Email: 'carlos.ramirez@empresa.com',
      },
    ],
    CargoId: '692cec64a083e06933a1ed3a',
    CreatedBy: '6907aa501f9a5744d3816284',
    UpdatedBy: '6907aa501f9a5744d3816284',
    mof_duties: [],
    CreatedAt: '2025-12-01T01:24:12.081Z',
    UpdatedAt: '2025-12-01T01:25:21.057Z',
  },
];

// Mock implementation
const mockPuestosService = {
  async getAllPuestos(): Promise<Puesto[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockPuestos;
  },

  async getPuestosByCargoId(cargoId: string): Promise<Puesto[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockPuestos.filter((p) => p.CargoId === cargoId);
  },

  async getPuestoById(id: string): Promise<Puesto> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const puesto = mockPuestos.find((p) => p._id === id);
    if (!puesto) {
      throw new Error('Puesto no encontrado');
    }
    return puesto;
  },

  async createPuesto(data: CreatePuestoDto): Promise<Puesto> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Mock: Create not implemented');
  },

  async updatePuesto(id: string, data: UpdatePuestoDto): Promise<Puesto> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Mock: Update not implemented');
  },

  async deletePuesto(id: string): Promise<{ message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Mock: Delete not implemented');
  },

  async getMOFListado(): Promise<MOFListItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    throw new Error('Mock: getMOFListado not implemented');
  },

  async getMOFDetalle(puestoId: string): Promise<MOFDetalle> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    throw new Error('Mock: getMOFDetalle not implemented');
  },

  async getMOFMasivo(puestoIds: string[]): Promise<MOFMasivoItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    throw new Error('Mock: getMOFMasivo not implemented');
  },
};

// Real implementation
const realPuestosService = {
  async getAllPuestos(): Promise<Puesto[]> {
    const response = await httpClient.get<Puesto[]>('/api/puestos');
    return response.data;
  },

  async getPuestosByCargoId(cargoId: string): Promise<Puesto[]> {
    const response = await httpClient.get<Puesto[]>(`/api/puestos?cargoId=${cargoId}`);
    return response.data;
  },

  async getPuestoById(id: string, incluirInactivo = false): Promise<Puesto> {
    const response = await httpClient.get<Puesto>(`/api/puestos/${id}`, {
      params: incluirInactivo ? { incluirInactivo: 'true' } : undefined,
    });
    return response.data;
  },

  async createPuesto(data: CreatePuestoDto): Promise<Puesto> {
    const response = await httpClient.post<Puesto>('/api/puestos', data);
    return response.data;
  },

  async updatePuesto(id: string, data: UpdatePuestoDto): Promise<Puesto> {
    const response = await httpClient.put<Puesto>(`/api/puestos/${id}`, data);
    return response.data;
  },

  async deletePuesto(id: string): Promise<{ message: string }> {
    const response = await httpClient.delete<{ message: string }>(`/api/puestos/${id}`);
    return response.data;
  },

  // Nuevos métodos para MOF
  async getMOFListado(): Promise<MOFListItem[]> {
    const response = await httpClient.get<MOFListItem[]>('/api/puestos/listado-mof');
    return response.data;
  },

  async getMOFDetalle(puestoId: string): Promise<MOFDetalle> {
    const response = await httpClient.get<MOFDetalle>(`/api/puestos/detalle-mof/${puestoId}`);
    return response.data;
  },

  async getMOFMasivo(puestoIds: string[]): Promise<MOFMasivoItem[]> {
    const response = await httpClient.post<MOFMasivoItem[]>('/api/puestos/mof-masivo', puestoIds);
    return response.data;
  },
};

// Export the appropriate service based on mode
export const puestosService = USE_MOCK_MODE ? mockPuestosService : realPuestosService;
