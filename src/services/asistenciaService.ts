import httpClient from './httpClient';

// ============================================================
// Endpoints confirmados en Swagger (backend-gestora.onrender.com/api-docs):
//   GET  /api/asistencia/trabajadores
//   POST /api/asistencia/horario-trabajador/set
//   GET  /api/asistencia/horario-trabajador/{trabajadorId}
//   GET  /api/asistencia/horario-trabajador
// ============================================================

export interface TrabajadorAsistencia {
  _id: string;
  nombres: string;
  nro_doc: string;
  empresa_id?: string;
  hora_ingreso?: string;
  hora_salida?: string;
}

export type DiaSemanaHorario =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface HorarioDia {
  entrada: string; // "HH:mm"
  salida: string; // "HH:mm"
}

export interface HorarioTrabajador {
  _id?: string;
  trabajadorId: string;
  horarios: Partial<Record<DiaSemanaHorario, HorarioDia>>;
  toleranciaMinutos: number;
  toleranciaMensualMax: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DIAS_HORARIO: { key: DiaSemanaHorario; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
];

function extractArray<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export const asistenciaService = {
  async getTrabajadores(): Promise<TrabajadorAsistencia[]> {
    const response = await httpClient.get<any>('/api/asistencia/trabajadores');
    return extractArray<TrabajadorAsistencia>(response.data, ['data', 'items', 'trabajadores']);
  },

  async getHorarioPorTrabajador(trabajadorId: string): Promise<HorarioTrabajador | null> {
    try {
      const response = await httpClient.get<HorarioTrabajador>(
        `/api/asistencia/horario-trabajador/${trabajadorId}`
      );
      return response.data ?? null;
    } catch (error: any) {
      // Si el trabajador todavía no tiene horario configurado, el backend
      // puede devolver 404 -- lo tratamos como "sin horario aún", no como error.
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async guardarHorario(data: HorarioTrabajador): Promise<HorarioTrabajador> {
    const response = await httpClient.post<HorarioTrabajador>(
      '/api/asistencia/horario-trabajador/set',
      data
    );
    return response.data;
  },
};
