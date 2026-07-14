import httpClient from './httpClient';

// Puesto (ID reference to Cargo with optional nombre)
export interface Puesto {
  id: string | null;
  nombre?: string;
  // ID del Trabajador específico que ocupa este Puesto en esta actividad
  // (un mismo Puesto/cargo puede tener varias personas asignadas).
  trabajadorId?: string | number | null;
}

// Descripción
export interface Descripcion {
  _id?: string;
  texto: string;
  puestos: Puesto[];
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Actividad
export interface Actividad {
  _id?: string;
  nombre: string;
  descripciones: Descripcion[];
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Sub Proceso Hijo
export interface SubProcesoHijo {
  _id?: string;
  nombre: string;
  actividades: Actividad[];
  subprocesos: SubProcesoHijo[];
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Sub Proceso (PADRE)
export interface SubProceso {
  _id?: string;
  nombre: string;
  actividades: Actividad[];
  subprocesos: SubProcesoHijo[];
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Proceso
export interface Proceso {
  _id?: string;
  nombre: string;
  subprocesos: SubProceso[];
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

// Macro Proceso
export interface MacroProceso {
  _id?: string;
  nombre: string;
  procesos: Proceso[];
  CompanyId?: string;
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  __v?: number;
}

// Cargo (from /api/cargos)
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

// Puesto de Cargo (from /api/puestos?cargoId=X)
export interface PuestoCargo {
  _id: string;
  Nombre: string;
  Descripcion: string;
  CompanyId: string;
  IsActive: boolean;
  CargoId: string;
  CreatedBy: string;
  UpdatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

// Definición para crear documento
export interface Definicion {
  termino: string;
  descripcion: string;
}

// Request para crear documento desde matriz de procesos
export interface CreateDocumentoMatrizRequest {
  tipoDocumentoId: string;
  subProcesoId: string;
  areaId: string;
  areaCodigo: string;
  desdeMatrizProceso: boolean;
  descripcionDocumento: string;
  objetivo: string;
  alcance: string;
  definiciones: Definicion[];
  elaboradoPor: {
    usuarioId: string;
  };
  revisadoPor: {
    usuarioId: string;
  };
  aprobadoPor: {
    usuarioId: string;
  };
}

// Request para actualizar documento
export interface UpdateDocumentoMatrizRequest extends CreateDocumentoMatrizRequest {
  modificacion: string;
}

// Control de cambios
export interface ControlCambio {
  item: number;
  modificacion: string;
  version: string;
  fecha: string;
}

// Response del documento
export interface DocumentoMatrizResponse {
  _id: string;
  codigo: string;
  tipoDocumentoId: string;
  subProcesoId: string;
  subProcesoNombre?: string;
  areaId?: string;
  areaCodigo?: string;
  desdeMatrizProceso?: boolean;
  version: string;
  descripcionDocumento?: string;
  objetivo: string;
  alcance: string;
  definiciones: Definicion[];
  elaboradoPor: {
    usuarioId: string;
  };
  revisadoPor: {
    usuarioId: string;
  };
  aprobadoPor: {
    usuarioId: string;
  };
  controlCambios: ControlCambio[];
  adjuntos?: Adjunto[];
  vbElaborado?: boolean;
  vbRevisado?: boolean;
  vbAprobado?: boolean;
  companyId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  __v?: number;
}

// Response del listado de documentos
export interface DocumentoListadoItem {
  _id: string;
  codigo: string;
  tipoDocumentoId: string;
  subProcesoId: string;
  areaId: string;
  desdeMatrizProceso: boolean;
  version: string;
  descripcionDocumento: string;
  objetivo: string;
  alcance: string;
  definiciones: Definicion[];
  elaboradoPor: {
    usuarioId: string;
  };
  revisadoPor: {
    usuarioId: string;
  };
  aprobadoPor: {
    usuarioId: string;
  };
  vbElaborado: boolean;
  vbRevisado: boolean;
  vbAprobado: boolean;
  descripcionSubProceso?: string;
  tipoDocumentoDescripcion: string;
  areaDescripcion: string;
  Cambios: string;
}

// Tipo de documento
export interface TipoDocumento {
  _id: string;
  tipo_documento: string;
  codigo: string;
}

// Sub proceso padre
export interface SubProcesoPadre {
  _id: string;
  nombre: string;
}

// Adjunto
export interface Adjunto {
  nombreArchivo: string;
  idGoogle: string;
  base64: string;
}

// Service
export const matrizProcesosService = {
  // Get entire matrix
  async getMatriz(): Promise<MacroProceso[]> {
    const response = await httpClient.get<MacroProceso[]>('/api/matrizprocesos');
    return Array.isArray(response.data) ? response.data : [];
  },

  // Update entire matrix
  async updateMatriz(matriz: MacroProceso[]): Promise<{ message: string }> {
    const response = await httpClient.put<{ message: string }>('/api/matrizprocesos', matriz);
    return response.data;
  },

  // Get all cargos
  async getCargos(): Promise<Cargo[]> {
    const response = await httpClient.get<Cargo[]>('/api/cargos');
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get puestos by cargo
  async getPuestosByCargo(cargoId: string): Promise<PuestoCargo[]> {
    const response = await httpClient.get<PuestoCargo[]>(`/api/puestos?cargoId=${cargoId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  // Obtener documento por subProcesoId
  async getDocumentoBySubProceso(subProcesoId: string): Promise<DocumentoMatrizResponse | null> {
    console.log('🔍 Buscando documento para subProcesoId:', subProcesoId);
    
    try {
      const response = await httpClient.get<DocumentoMatrizResponse>(
        `/api/matrizprocesos/documentos/subproceso/${subProcesoId}`
      );
      console.log('✅ Documento encontrado:', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No existe documento para este subproceso (primera versión)');
        return null;
      }
      console.error('❌ Error al buscar documento:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      throw error;
    }
  },

  // Crear documento desde matriz de procesos
  async createDocumentoMatriz(data: CreateDocumentoMatrizRequest): Promise<DocumentoMatrizResponse> {
    console.log('🚀 Llamando a POST /api/matrizprocesos/documentos');
    console.log('📦 Datos enviados:', data);
    
    try {
      const response = await httpClient.post<DocumentoMatrizResponse>('/api/matrizprocesos/documentos', data);
      console.log('✅ Respuesta del backend:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al crear documento:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      throw error;
    }
  },

  // Actualizar documento existente
  async updateDocumentoMatriz(
    documentoId: string,
    data: UpdateDocumentoMatrizRequest
  ): Promise<DocumentoMatrizResponse> {
    console.log('🔄 Llamando a PUT /api/matrizprocesos/documentos/' + documentoId);
    console.log('📦 Datos enviados:', data);
    
    try {
      const response = await httpClient.put<DocumentoMatrizResponse>(
        `/api/matrizprocesos/documentos/${documentoId}`,
        data
      );
      console.log('✅ Respuesta del backend:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al actualizar documento:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      throw error;
    }
  },

  // Obtener listado de documentos
  async getListadoDocumentos(): Promise<DocumentoListadoItem[]> {
    console.log('📋 Obteniendo listado de documentos');
    
    try {
      const response = await httpClient.get<DocumentoListadoItem[]>('/api/matrizprocesos/documentos/listado');
      console.log('✅ Listado obtenido:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('❌ Error al obtener listado:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      throw error;
    }
  },

  // Obtener documento por ID
  async getDocumentoById(documentoId: string): Promise<DocumentoMatrizResponse> {
    console.log('🔍 Obteniendo documento por ID:', documentoId);
    
    try {
      const response = await httpClient.get<DocumentoMatrizResponse>(
        `/api/matrizprocesos/documentos/${documentoId}`
      );
      console.log('✅ Documento obtenido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener documento:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      throw error;
    }
  },

  // Obtener tipos de documento
  async getTiposDocumento(): Promise<TipoDocumento[]> {
    console.log('📋 Obteniendo tipos de documento');
    
    try {
      const response = await httpClient.get<TipoDocumento[]>('/api/maestros/tipo-documentos');
      console.log('✅ Tipos de documento obtenidos:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('❌ Error al obtener tipos de documento:', error);
      throw error;
    }
  },

  // Obtener subprocesos padres
  async getSubProcesosPadres(): Promise<SubProcesoPadre[]> {
    console.log('📋 Obteniendo subprocesos padres');
    
    try {
      const response = await httpClient.get<SubProcesoPadre[]>('/api/matrizprocesos/subprocesos-padres');
      console.log('✅ Subprocesos padres obtenidos:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('❌ Error al obtener subprocesos padres:', error);
      throw error;
    }
  },

  // Aprobar VB Elaborado
  async aprobarVBElaborado(documentoId: string): Promise<void> {
    console.log('✅ Aprobando VB Elaborado para documento:', documentoId);
    
    try {
      await httpClient.put(`/api/matrizprocesos/documentos/${documentoId}/visto-bueno-elaborado`);
      console.log('✅ VB Elaborado aprobado correctamente');
    } catch (error: any) {
      console.error('❌ Error al aprobar VB Elaborado:', error);
      throw error;
    }
  },

  // Aprobar VB Revisado
  async aprobarVBRevisado(documentoId: string): Promise<void> {
    console.log('✅ Aprobando VB Revisado para documento:', documentoId);
    
    try {
      await httpClient.put(`/api/matrizprocesos/documentos/${documentoId}/visto-bueno-revisado`);
      console.log('✅ VB Revisado aprobado correctamente');
    } catch (error: any) {
      console.error('❌ Error al aprobar VB Revisado:', error);
      throw error;
    }
  },

  // Aprobar VB Aprobado
  async aprobarVBAprobado(documentoId: string): Promise<void> {
    console.log('✅ Aprobando VB Aprobado para documento:', documentoId);
    
    try {
      await httpClient.put(`/api/matrizprocesos/documentos/${documentoId}/visto-bueno-aprobado`);
      console.log('✅ VB Aprobado aprobado correctamente');
    } catch (error: any) {
      console.error('❌ Error al aprobar VB Aprobado:', error);
      throw error;
    }
  },
};
