import httpClient from './httpClient';
import type {
  SubProcesoDocumento,
  CreateDocumentoRequest,
  UpdateDocumentoRequest,
} from '@/types/documento';
import { usersService } from './usersService';

// Mock mode flag - set to true to use mock data without backend
const USE_MOCK_MODE = false;

// Mock storage for documents (simulates database)
const mockDocuments = new Map<string, SubProcesoDocumento>();

// Helper function to generate UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper function to increment version
const incrementVersion = (currentVersion: string): string => {
  const [major, minor] = currentVersion.split('.').map(Number);
  return `${major}.${minor + 1}`;
};

// Helper function to get user name by ID
const getUserName = async (userId: string): Promise<string> => {
  try {
    const users = await usersService.getUsers();
    const user = users.find(u => u.id === userId);
    return user ? `${user.name} ${user.lastName}` : 'Usuario Desconocido';
  } catch (error) {
    console.error('Error al obtener nombre de usuario:', error);
    return 'Usuario Desconocido';
  }
};

// Helper function to format date only (without time)
const formatDateTime = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// Mock implementation
const mockDocumentoService = {
  async getDocumento(subProcesoId: string): Promise<SubProcesoDocumento | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const documento = mockDocuments.get(subProcesoId);
    return documento || null;
  },

  async createDocumento(
    subProcesoId: string,
    data: CreateDocumentoRequest
  ): Promise<SubProcesoDocumento> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get actual user names
    const elaboradoPorNombre = await getUserName(data.elaboradoPor.usuarioId);
    const revisadoPorNombre = await getUserName(data.revisadoPor.usuarioId);
    const aprobadoPorNombre = await getUserName(data.aprobadoPor.usuarioId);

    // Generate IDs for definitions
    const definicionesConId = data.definiciones.map((def) => ({
      id: generateUUID(),
      termino: def.termino,
      descripcion: def.descripcion,
    }));

    const now = new Date();

    // Generate codigo based on area
    const codigo = `${data.areaCodigo}-XX-PRO-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;

    // Create mock document
    const documento: SubProcesoDocumento = {
      _id: generateUUID(),
      subProcesoId: data.subProcesoId,
      subProcesoNombre: data.descripcionDocumento,
      codigo,
      version: '1.0',
      objetivo: data.objetivo,
      alcance: data.alcance,
      definiciones: definicionesConId,
      elaboradoPor: {
        usuarioId: data.elaboradoPor.usuarioId,
        nombre: elaboradoPorNombre,
      },
      revisadoPor: {
        usuarioId: data.revisadoPor.usuarioId,
        nombre: revisadoPorNombre,
      },
      aprobadoPor: {
        usuarioId: data.aprobadoPor.usuarioId,
        nombre: aprobadoPorNombre,
      },
      controlCambios: [
        {
          item: 1,
          modificacion: 'Actualización inicial del proceso',
          version: '1.0',
          fecha: formatDateTime(now),
        },
      ],
      companyId: 'mock-company-id',
      createdBy: data.elaboradoPor.usuarioId,
      updatedBy: data.elaboradoPor.usuarioId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Store in mock database
    mockDocuments.set(subProcesoId, documento);

    return documento;
  },

  async updateDocumento(
    documentoId: string,
    data: UpdateDocumentoRequest
  ): Promise<SubProcesoDocumento> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find document by ID
    let existingDoc: SubProcesoDocumento | undefined;
    let subProcesoId: string | undefined;
    
    for (const [spId, doc] of mockDocuments.entries()) {
      if (doc._id === documentoId) {
        existingDoc = doc;
        subProcesoId = spId;
        break;
      }
    }
    
    if (!existingDoc || !subProcesoId) {
      throw new Error('Documento no encontrado');
    }

    // Get actual user names
    const elaboradoPorNombre = await getUserName(data.elaboradoPor.usuarioId);
    const revisadoPorNombre = await getUserName(data.revisadoPor.usuarioId);
    const aprobadoPorNombre = await getUserName(data.aprobadoPor.usuarioId);

    // Generate IDs for new definitions
    const definicionesConId = data.definiciones.map((def) => ({
      id: (def as any).id || generateUUID(),
      termino: def.termino,
      descripcion: def.descripcion,
    }));

    // Increment version
    const newVersion = incrementVersion(existingDoc.version);

    const now = new Date();

    // Update document
    const updatedDoc: SubProcesoDocumento = {
      ...existingDoc,
      areaId: data.areaId,
      areaCodigo: data.areaCodigo,
      objetivo: data.objetivo,
      alcance: data.alcance,
      definiciones: definicionesConId,
      elaboradoPor: {
        usuarioId: data.elaboradoPor.usuarioId,
        nombre: elaboradoPorNombre,
      },
      revisadoPor: {
        usuarioId: data.revisadoPor.usuarioId,
        nombre: revisadoPorNombre,
      },
      aprobadoPor: {
        usuarioId: data.aprobadoPor.usuarioId,
        nombre: aprobadoPorNombre,
      },
      version: newVersion,
      controlCambios: [
        ...existingDoc.controlCambios,
        {
          item: existingDoc.controlCambios.length + 1,
          modificacion: data.modificacion,
          version: newVersion,
          fecha: formatDateTime(now),
        },
      ],
      updatedBy: data.elaboradoPor.usuarioId,
      updatedAt: now.toISOString(),
    };

    // Store updated document
    mockDocuments.set(subProcesoId, updatedDoc);

    return updatedDoc;
  },
};

// Real implementation
const realDocumentoService = {
  async getDocumento(subProcesoId: string): Promise<SubProcesoDocumento | null> {
    try {
      const response = await httpClient.get<SubProcesoDocumento>(
        `/api/matrizprocesos/documentos/subproceso/${subProcesoId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createDocumento(
    subProcesoId: string,
    data: CreateDocumentoRequest
  ): Promise<SubProcesoDocumento> {
    const response = await httpClient.post<{ _id: string }>(
      `/api/matrizprocesos/documentos`,
      data
    );
    
    // Después de crear, obtener el documento completo
    const documentoCompleto = await this.getDocumento(subProcesoId);
    if (!documentoCompleto) {
      throw new Error('No se pudo obtener el documento creado');
    }
    
    return documentoCompleto;
  },

  async updateDocumento(
    documentoId: string,
    data: UpdateDocumentoRequest
  ): Promise<SubProcesoDocumento> {
    const response = await httpClient.put<SubProcesoDocumento>(
      `/api/matrizprocesos/documentos/${documentoId}`,
      data
    );
    return response.data;
  },
};

// Export the appropriate service based on mode
export const documentoService = USE_MOCK_MODE ? mockDocumentoService : realDocumentoService;
