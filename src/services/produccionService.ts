import httpClient from './httpClient';

// ============================================================
// Estructura real confirmada desde el backend (respuesta de
// GET /api/config_ctrl_produccion vista en producción, 04/07/2026)
// ============================================================

export interface DiaProgramado {
  hProg: string;
  cantPro: string;
}

export interface ActividadProduccion {
  actividadId: string;
  actividadNombre: string;
  procesoNombre: string;
  subprocesoNombre: string;
  responsableId: string;
  lunes: DiaProgramado;
  martes: DiaProgramado;
  miercoles: DiaProgramado;
  jueves: DiaProgramado;
  viernes: DiaProgramado;
  sabado: DiaProgramado;
}

export interface ProyectoOtro {
  descripcion: string;
  responsableId: string;
  lunes: DiaProgramado;
  martes: DiaProgramado;
  miercoles: DiaProgramado;
  jueves: DiaProgramado;
  viernes: DiaProgramado;
  sabado: DiaProgramado;
}

export interface ConfigCtrlProduccion {
  _id: string;
  companyId: string;
  actividades: ActividadProduccion[];
  proyectoOtro: ProyectoOtro;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// ---- Registros diarios (forma real confirmada, 04/07/2026) ----
export interface RegistroProduccion {
  _id: string;
  companyId: string;
  actividadId: string;
  actividadNombre: string;
  procesoNombre: string;
  subprocesoNombre: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string;
  horaFin: string;
  logrados: number;
  observados: number;
  duracionMinutos: number;
  observaciones?: string;
  responsableId: string;
  estado: string; // valores vistos: 'completado' (confirmar otros posibles)
  createdAt: string;
  updatedAt: string;
}

// ---- Indicadores para Reportes de Producción ----
export interface IndicadoresProduccion {
  totalActividades: number;
  completadas: number;
  enProgreso: number;
  totalLogrados: number;
  cumplimientoProduccion: number;
  cumplimientoHorasHombre: number;
  productividadReal: number;
  eficienciaProductiva: number;
  horasHombrePorUnidad: number;
}

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

function getDiaSemana(fecha: string): DiaSemana | null {
  const dias: (DiaSemana | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const d = new Date(`${fecha}T00:00:00`);
  return dias[d.getDay()];
}

// Calcula los indicadores cruzando los registros reales con las metas
// programadas (config.actividades[].{lunes..sabado}.{cantPro,hProg})
// Calcula los indicadores cruzando los registros reales con las metas
// programadas. El objetivo (cantidad/horas programadas) se calcula
// recorriendo TODAS las actividades configuradas para cada día del rango
// [desde, hasta] -- no solo las actividades que tienen un registro real
// ese día (así coincide con el cálculo real visto en producción).
export function calcularIndicadores(
  registros: RegistroProduccion[],
  config: ConfigCtrlProduccion | null,
  desde?: string,
  hasta?: string
): IndicadoresProduccion {
  const totalActividades = registros.length;
  const completadas = registros.filter((r) => r.estado === 'completado').length;
  const enProgreso = registros.filter((r) => r.estado === 'en_progreso' || r.estado === 'pendiente').length;
  const totalLogrados = registros.reduce((sum, r) => sum + (Number(r.logrados) || 0), 0);
  const horasTrabajadasTotal = registros.reduce((sum, r) => sum + (Number(r.duracionMinutos) || 0), 0) / 60;

  let cantidadProgramadaTotal = 0;
  let horasProgramadasTotal = 0;

  if (config && desde && hasta) {
    const fechaInicio = new Date(`${desde}T00:00:00`);
    const fechaFin = new Date(`${hasta}T00:00:00`);
    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const dia = getDiaSemana(d.toISOString().split('T')[0]);
      if (!dia) continue; // domingo, sin programación
      config.actividades.forEach((actividad) => {
        const programado = actividad[dia];
        if (programado?.cantPro || programado?.hProg) {
          cantidadProgramadaTotal += Number(programado.cantPro) || 0;
          horasProgramadasTotal += Number(programado.hProg) || 0;
        }
      });
    }
    console.log(`✅ Total programado en el rango ${desde} a ${hasta}: cantidad=${cantidadProgramadaTotal} horas=${horasProgramadasTotal}`);
  }

  const cumplimientoProduccion =
    cantidadProgramadaTotal > 0 ? (totalLogrados / cantidadProgramadaTotal) * 100 : 0;
  const cumplimientoHorasHombre =
    horasTrabajadasTotal > 0 ? (horasProgramadasTotal / horasTrabajadasTotal) * 100 : 0;
  const productividadReal = horasTrabajadasTotal > 0 ? totalLogrados / horasTrabajadasTotal : 0;
  const productividadProgramada =
    horasProgramadasTotal > 0 ? cantidadProgramadaTotal / horasProgramadasTotal : 0;
  const eficienciaProductiva =
    productividadProgramada > 0 ? (productividadReal / productividadProgramada) * 100 : 0;
  const horasHombrePorUnidad = totalLogrados > 0 ? horasTrabajadasTotal / totalLogrados : 0;

  return {
    totalActividades,
    completadas,
    enProgreso,
    totalLogrados,
    cumplimientoProduccion,
    cumplimientoHorasHombre,
    productividadReal,
    eficienciaProductiva,
    horasHombrePorUnidad,
  };
}

// Helper: siempre devuelve un array aunque el backend cambie de forma
function extractArray<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  console.warn('Respuesta inesperada, no se encontró un array en:', data);
  return [];
}

export const produccionService = {
  // ---- Configuración (Administración Control de Producción) ----
  // Devuelve el documento único de configuración de la empresa (con su
  // array interno "actividades"), no una lista de configuraciones.
  async getConfiguracion(): Promise<ConfigCtrlProduccion | null> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion');
    const data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    // Por si en algún momento el backend devuelve un array con un solo doc
    if (Array.isArray(data) && data.length > 0) return data[0];
    return null;
  },

  async updateConfiguracion(data: Partial<ConfigCtrlProduccion>): Promise<ConfigCtrlProduccion> {
    const response = await httpClient.put<ConfigCtrlProduccion>('/api/config_ctrl_produccion', data);
    return response.data;
  },

  // ---- Registros (Gestión de Producción) ----
  async getRegistros(): Promise<RegistroProduccion[]> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion/registros');
    return extractArray<RegistroProduccion>(response.data, ['data', 'items', 'registros']);
  },

  async createRegistro(data: Partial<RegistroProduccion>): Promise<RegistroProduccion> {
    const response = await httpClient.post<RegistroProduccion>('/api/config_ctrl_produccion/registros', data);
    return response.data;
  },

  // ---- Reportes (Reportes de Producción) ----
  // Devuelve el array de registros reales del rango; los indicadores se
  // calculan en el frontend con calcularIndicadores().
  async getRegistrosPorRango(desde: string, hasta: string, responsableId?: string): Promise<RegistroProduccion[]> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion/registros/rango', {
      params: {
        desde,
        hasta,
        ...(responsableId && responsableId !== 'todos' ? { responsableId } : {}),
      },
    });
    return extractArray<RegistroProduccion>(response.data, ['data', 'items', 'registros']);
  },
};