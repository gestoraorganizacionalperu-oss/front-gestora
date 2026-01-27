// Tipos para el sistema de gestión de documentos de subprocesos

export interface Definicion {
  id: string;
  termino: string;
  descripcion: string;
}

export interface ControlCambio {
  item: number;
  modificacion: string;
  version: string;
  fecha: string;
}

export interface Usuario {
  usuarioId: string;
  nombre: string;
}

export interface Adjunto {
  nombreArchivo: string;
  idGoogle?: string;
  base64?: string;
  IsActive?: boolean;
}

export interface SubProcesoDocumento {
  _id: string;
  subProcesoId: string;
  subProcesoNombre: string;
  codigo: string;
  version: string;
  areaId?: string;
  areaCodigo?: string;
  objetivo: string;
  alcance: string;
  definiciones: Definicion[];
  elaboradoPor: Usuario;
  revisadoPor: Usuario;
  aprobadoPor: Usuario;
  controlCambios: ControlCambio[];
  adjuntos?: Adjunto[];
  companyId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Nuevos campos con los nombres de los usuarios
  NombreElaborado?: string;
  NombreRevisado?: string;
  NombreAprobado?: string;
}

export interface CreateDocumentoRequest {
  tipoDocumentoId: string;
  subProcesoId: string;
  areaId: string;
  areaCodigo: string;
  desdeMatrizProceso: boolean;
  descripcionDocumento: string;
  objetivo: string;
  alcance: string;
  definiciones: Omit<Definicion, 'id'>[];
  elaboradoPor: {
    usuarioId: string;
  };
  revisadoPor: {
    usuarioId: string;
  };
  aprobadoPor: {
    usuarioId: string;
  };
  adjuntos: any[];
}

export interface UpdateDocumentoRequest {
  areaId: string;
  areaCodigo: string;
  objetivo: string;
  alcance: string;
  definiciones: Omit<Definicion, 'id'>[];
  elaboradoPor: {
    usuarioId: string;
  };
  revisadoPor: {
    usuarioId: string;
  };
  aprobadoPor: {
    usuarioId: string;
  };
  modificacion: string;
}

export interface PuestoEmpresa {
  _id: string;
  Nombre: string;
  Descripcion: string;
  CompanyId: string;
  IsActive: boolean;
  AreaId: string;
  UbicacionId: string;
  CargoId: string;
  CreatedAt: string;
  UpdatedAt: string;
}
