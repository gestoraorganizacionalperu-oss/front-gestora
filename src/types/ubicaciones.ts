export interface Area {
  id?: string;
  nombre: string;
  Codigo?: string;
  isActive: boolean;
}

export interface Ubicacion {
  id?: string;
  nombre: string;
  isActive: boolean;
  areas: Area[];
}

export type UbicacionesResponse = Ubicacion[];
export type UbicacionesRequest = Ubicacion[];
