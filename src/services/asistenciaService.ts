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
  // ID real del Puesto (colección `puestos`, la misma que usa Matriz de
  // Procesos). Antes de esto, el campo existía en la base de datos pero
  // nunca se llenaba desde ninguna pantalla.
  puesto?: string | null;
}

export type DiaSemanaHorario =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface TurnoHorario {
  entrada: string; // "HH:mm"
  salida: string; // "HH:mm"
}

export interface HorarioDia {
  manana: TurnoHorario;
  tarde: TurnoHorario;
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

export interface RegistroAsistencia {
  _id: string;
  nombre: string;
  dni: string;
  fecha: string; // formato "D/M/YYYY", sin padding consistente
  entrada?: string; // "HH:mm"
  salida?: string; // "HH:mm"
  horario_esperado?: string; // "08:00" = turno mañana, "14:00" = turno tarde
  tardanza?: boolean;
  minutos_tardanza?: number;
  trabajador_id?: string;
  empresa_id?: string;
}

export type TipoSaldo = 'A favor' | 'En contra';

export interface FilaControlAsistencia {
  dni: string;
  nombre: string;
  ingresoManana: string;
  salidaManana: string;
  tardanzaMananaMin: number;
  ingresoTarde: string;
  salidaTarde: string;
  tardanzaTardeMin: number;
  tardanzaTotalMin: number;
  excedenteMin: number;
  pendienteMin: number;
  porcentajeCompensada: number;
  saldoNetoMin: number;
  tipoSaldo: TipoSaldo;
}

// ---- Helpers de fecha/hora ----

// El campo "fecha" en asistencia viene como "D/M/YYYY" sin padding
// consistente (a veces "4/5/2026", a veces "01/6/2026"). Comparamos por
// valores numéricos, no por texto, para no depender del padding.
export function parseFechaAsistencia(fechaStr: string): { day: number; month: number; year: number } | null {
  const partes = fechaStr?.split('/').map((p) => parseInt(p, 10));
  if (!partes || partes.length !== 3 || partes.some((p) => Number.isNaN(p))) return null;
  const [day, month, year] = partes;
  return { day, month, year };
}

export function fechaInputAFecha(fechaInput: string): { day: number; month: number; year: number } | null {
  // fechaInput viene de <input type="date">, formato "YYYY-MM-DD"
  const partes = fechaInput?.split('-').map((p) => parseInt(p, 10));
  if (!partes || partes.length !== 3 || partes.some((p) => Number.isNaN(p))) return null;
  const [year, month, day] = partes;
  return { day, month, year };
}

export function getDiaSemanaHorario(day: number, month: number, year: number): DiaSemanaHorario | null {
  const dias: (DiaSemanaHorario | null)[] = ['domingo' as any, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const dow = new Date(year, month - 1, day).getDay(); // 0=domingo...6=sábado
  return dow === 0 ? null : (dias[dow] as DiaSemanaHorario);
}

function minutosDesdeHora(hora?: string): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function formatoMinutosHHMM(totalMinutos: number): string {
  const min = Math.max(0, Math.round(totalMinutos));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---- Cálculo principal ----
// Fórmulas validadas cruzando datos reales de mayo/junio 2026:
//   tardanzaTurno   = max(0, entradaReal - entradaEsperada - toleranciaMin)
//   excedenteTurno  = max(0, salidaReal - salidaEsperada)              (sin tolerancia)
//   tardanzaTotal   = tardanzaMañana + tardanzaTarde
//   excedenteTotal  = excedenteMañana + excedenteTarde
//   pendiente       = max(0, tardanzaTotal - excedenteTotal)
//   %Compensada     = tardanzaTotal > 0 ? round(excedenteTotal / tardanzaTotal * 100) : 0
//   saldoNeto       = |excedenteTotal - tardanzaTotal|
//   tipoSaldo       = excedenteTotal >= tardanzaTotal ? "A favor" : "En contra"
export function calcularFilaControlAsistencia(
  trabajador: TrabajadorAsistencia,
  registrosDelDia: RegistroAsistencia[],
  horarioTrabajador: HorarioTrabajador | undefined,
  diaSemana: DiaSemanaHorario | null
): FilaControlAsistencia {
  const registroManana = registrosDelDia.find((r) => (r.horario_esperado ? parseInt(r.horario_esperado.split(':')[0], 10) < 12 : false));
  const registroTarde = registrosDelDia.find((r) => (r.horario_esperado ? parseInt(r.horario_esperado.split(':')[0], 10) >= 12 : false));

  const horarioDia = diaSemana ? horarioTrabajador?.horarios?.[diaSemana] : undefined;
  const tolerancia = horarioTrabajador?.toleranciaMinutos ?? 10;

  const calcularTurno = (
    registro: RegistroAsistencia | undefined,
    esperado: { entrada: string; salida: string } | undefined
  ) => {
    const entradaMin = minutosDesdeHora(registro?.entrada);
    const salidaMin = minutosDesdeHora(registro?.salida);
    const entradaEsperadaMin = minutosDesdeHora(esperado?.entrada);
    const salidaEsperadaMin = minutosDesdeHora(esperado?.salida);

    const tardanza =
      entradaMin !== null && entradaEsperadaMin !== null
        ? Math.max(0, entradaMin - entradaEsperadaMin - tolerancia)
        : 0;
    const excedente =
      salidaMin !== null && salidaEsperadaMin !== null ? Math.max(0, salidaMin - salidaEsperadaMin) : 0;

    return { tardanza, excedente };
  };

  const turnoManana = calcularTurno(registroManana, horarioDia?.manana);
  const turnoTarde = calcularTurno(registroTarde, horarioDia?.tarde);

  const tardanzaTotalMin = turnoManana.tardanza + turnoTarde.tardanza;
  const excedenteMin = turnoManana.excedente + turnoTarde.excedente;
  const pendienteMin = Math.max(0, tardanzaTotalMin - excedenteMin);
  const porcentajeCompensada = tardanzaTotalMin > 0 ? Math.round((excedenteMin / tardanzaTotalMin) * 100) : 0;
  const saldoNetoMin = Math.abs(excedenteMin - tardanzaTotalMin);
  const tipoSaldo: TipoSaldo = excedenteMin >= tardanzaTotalMin ? 'A favor' : 'En contra';

  return {
    dni: trabajador.nro_doc,
    nombre: trabajador.nombres,
    ingresoManana: registroManana?.entrada || '--:--',
    salidaManana: registroManana?.salida || '--:--',
    tardanzaMananaMin: turnoManana.tardanza,
    ingresoTarde: registroTarde?.entrada || '--:--',
    salidaTarde: registroTarde?.salida || '--:--',
    tardanzaTardeMin: turnoTarde.tardanza,
    tardanzaTotalMin,
    excedenteMin,
    pendienteMin,
    porcentajeCompensada,
    saldoNetoMin,
    tipoSaldo,
  };
}

export const asistenciaService = {
  async getTrabajadores(): Promise<TrabajadorAsistencia[]> {
    const response = await httpClient.get<any>('/api/asistencia/trabajadores');
    return extractArray<TrabajadorAsistencia>(response.data, ['data', 'items', 'trabajadores']);
  },

  async getTodasAsistencias(): Promise<RegistroAsistencia[]> {
    const response = await httpClient.get<any>('/api/asistencia/todas');
    return extractArray<RegistroAsistencia>(response.data, ['data', 'items', 'asistencias']);
  },

  async getAllHorarios(): Promise<HorarioTrabajador[]> {
    const response = await httpClient.get<any>('/api/asistencia/horario-trabajador');
    return extractArray<HorarioTrabajador>(response.data, ['data', 'items', 'horarios']);
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

  // El "id" aquí es el _id real de MongoDB del documento Trabajador (un
  // entero simple en esta base de datos, ej. 2) -- NO el DNI. Es distinto
  // al identificador que usa horario-trabajador (que sí usa el DNI).
  async actualizarPuestoTrabajador(trabajadorMongoId: string, puestoId: string | null): Promise<TrabajadorAsistencia> {
    const response = await httpClient.put<{ data: TrabajadorAsistencia }>(
      `/api/asistencia/trabajadores/${trabajadorMongoId}/puesto`,
      { puesto: puestoId || undefined }
    );
    return response.data.data;
  },
};
