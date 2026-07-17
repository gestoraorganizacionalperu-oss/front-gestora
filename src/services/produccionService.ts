import httpClient from './httpClient';

// ============================================================
// Estructura real confirmada desde el backend (respuesta de
// GET /api/config_ctrl_produccion vista en producción, 04/07/2026)
// ============================================================

export interface DiaProgramado {
  hProg: string; // horas programadas en decimal (ej. "4.5") -- se sigue
  // guardando así para no romper los reportes/totales que ya suman este
  // campo con Number(hProg). Se calcula automáticamente a partir de
  // horaInicio/horaFin; ya no se escribe a mano.
  cantPro: string;
  // Hora en que debería iniciar/terminar la actividad ese día ("HH:mm").
  // A partir de estos dos, se calcula hProg automáticamente.
  horaInicio?: string;
  horaFin?: string;
  // Responsable asignado para ese día en particular. Reemplaza el antiguo
  // responsable único por actividad: ahora cada día puede tener alguien distinto.
  responsableId?: string;
}

// Calcula la cantidad de horas (en decimal, ej. "4.50") entre horaInicio y
// horaFin ("HH:mm"). Si cruza medianoche (fin < inicio), asume que termina
// al día siguiente. Devuelve '' si falta alguno de los dos.
export function calcularHorasDecimal(horaInicio?: string, horaFin?: string): string {
  if (!horaInicio || !horaFin) return '';
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return '';
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minutos < 0) minutos += 24 * 60; // cruza medianoche
  return (minutos / 60).toFixed(2);
}

// Convierte horas en decimal (ej. "4.5") a un texto legible tipo "4h 30min"
// (ej. "5h", "30min", "4h 30min"), para mostrar en pantalla.
// Devuelve '—' si no hay valor.
export function formatoDecimalAHoraMin(decimalStr?: string): string {
  const decimal = Number(decimalStr);
  if (!decimalStr || Number.isNaN(decimal)) return '—';
  const totalMin = Math.round(decimal * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export interface ActividadProduccion {
  actividadId: string;
  actividadNombre: string;
  procesoNombre: string;
  subprocesoNombre: string;
  lunes: DiaProgramado;
  martes: DiaProgramado;
  miercoles: DiaProgramado;
  jueves: DiaProgramado;
  viernes: DiaProgramado;
  sabado: DiaProgramado;
}

export interface ProyectoOtro {
  // Identificador propio de cada fila (antes no hacía falta porque solo
  // podía haber una). Se genera en el frontend al crear una fila nueva.
  id: string;
  descripcion: string;
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
  // Lunes de la semana que representa este documento ("YYYY-MM-DD"). Cada
  // semana tiene su propio documento -- antes había uno solo por empresa.
  semanaInicio?: string;
  actividades: ActividadProduccion[];
  // Antes era un solo objeto (proyectoOtro); ahora es una lista, para
  // poder tener varias actividades "fuera de la Matriz" por semana.
  proyectosOtros: ProyectoOtro[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Convierte un ProyectoOtro (actividad "fuera de la Matriz") al mismo
// shape que ActividadProduccion, para poder tratarlas de forma uniforme
// en reportes, Gestión de Producción, e iniciar/terminar registros --
// todo ese código ya sabe trabajar con ActividadProduccion, así no hay
// que duplicar lógica para un segundo tipo parecido.
export function normalizarProyectoOtro(p: ProyectoOtro): ActividadProduccion {
  return {
    actividadId: p.id,
    actividadNombre: p.descripcion || '(Proyecto/Otro sin descripción)',
    procesoNombre: 'Proyectos / Otros',
    subprocesoNombre: '',
    lunes: p.lunes,
    martes: p.martes,
    miercoles: p.miercoles,
    jueves: p.jueves,
    viernes: p.viernes,
    sabado: p.sabado,
  };
}

// Actividades de la Matriz + Proyectos/Otros, todas en un solo array con
// el mismo shape -- lo que casi todo el código de reportes/gestión
// realmente necesita ("todas las filas programadas de la semana").
export function todasLasFilas(config: ConfigCtrlProduccion | null | undefined): ActividadProduccion[] {
  if (!config) return [];
  return [...config.actividades, ...(config.proyectosOtros || []).map(normalizarProyectoOtro)];
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

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

export function getDiaSemana(fecha: string): DiaSemana | null {
  const dias: (DiaSemana | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const d = new Date(`${fecha}T00:00:00`);
  return dias[d.getDay()];
}

// Calcula el Lunes de la semana a la que pertenece una fecha dada, en
// formato "YYYY-MM-DD". Es el identificador que usa cada semana en
// config_ctrl_produccion (cada semana tiene su propio documento guardado).
export function calcularLunesDeSemana(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  const diaSemana = d.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
  // Si es domingo (0), el lunes de "su" semana fue hace 6 días.
  const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - diasDesdeElLunes);
  return d.toISOString().split('T')[0];
}

// Suma/resta semanas a una fecha "YYYY-MM-DD" (formato Lunes de semana).
export function sumarSemanas(semanaInicio: string, cantidad: number): string {
  const d = new Date(`${semanaInicio}T00:00:00`);
  d.setDate(d.getDate() + cantidad * 7);
  return d.toISOString().split('T')[0];
}

// Calcula la diferencia entre dos horas en formato "HH:MM:SS" y devuelve
// el total en segundos y un texto legible ("12 min 45 seg", "1h 05min", etc.)
export function calcularDuracion(horaInicio: string, horaFin: string): { segundos: number; texto: string } {
  const [h1, m1, s1] = horaInicio.split(':').map(Number);
  const [h2, m2, s2] = horaFin.split(':').map(Number);
  let segundos = (h2 * 3600 + m2 * 60 + (s2 || 0)) - (h1 * 3600 + m1 * 60 + (s1 || 0));
  if (segundos < 0) segundos += 24 * 3600; // por si cruza medianoche
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  let texto = '';
  if (horas > 0) texto += `${horas}h `;
  texto += `${minutos}min`;
  if (horas === 0) texto += ` ${segs}seg`;
  return { segundos, texto: texto.trim() };
}

// Calcula los indicadores cruzando los registros reales con las metas
// programadas. El objetivo (cantidad/horas programadas) se calcula
// recorriendo TODAS las actividades configuradas para cada día del rango
// [desde, hasta] -- no solo las actividades que tienen un registro real
// ese día (así coincide con el cálculo real visto en producción).
export function calcularIndicadores(
  registros: RegistroProduccion[],
  configsPorSemana: ConfigCtrlProduccion[],
  desde?: string,
  hasta?: string,
  responsableIdFiltro?: string
): IndicadoresProduccion {
  const registrosFiltrados = responsableIdFiltro
    ? registros.filter((r) => r.responsableId === responsableIdFiltro)
    : registros;

  const totalActividades = registrosFiltrados.length;
  const completadas = registrosFiltrados.filter((r) => r.estado === 'completado').length;
  const enProgreso = registrosFiltrados.filter((r) => r.estado === 'en_progreso' || r.estado === 'pendiente').length;
  const totalLogrados = registrosFiltrados.reduce((sum, r) => sum + (Number(r.logrados) || 0), 0);
  const horasTrabajadasTotal = registrosFiltrados.reduce((sum, r) => sum + (Number(r.duracionMinutos) || 0), 0) / 60;

  let cantidadProgramadaTotal = 0;
  let horasProgramadasTotal = 0;

  if (configsPorSemana && configsPorSemana.length > 0 && desde && hasta) {
    const configPorSemana = new Map<string, ConfigCtrlProduccion>();
    configsPorSemana.forEach((c) => {
      if (c.semanaInicio) configPorSemana.set(c.semanaInicio, c);
    });

    const fechaInicio = new Date(`${desde}T00:00:00`);
    const fechaFin = new Date(`${hasta}T00:00:00`);
    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const fechaStr = d.toISOString().split('T')[0];
      const dia = getDiaSemana(fechaStr);
      if (!dia) continue; // domingo, sin programación
      const configDeEstaSemana = configPorSemana.get(calcularLunesDeSemana(fechaStr));
      if (!configDeEstaSemana) continue;
      todasLasFilas(configDeEstaSemana).forEach((actividad) => {
        const programado = actividad[dia];
        if (responsableIdFiltro && (programado?.responsableId || '') !== responsableIdFiltro) return;
        if (programado?.cantPro || programado?.hProg) {
          cantidadProgramadaTotal += Number(programado.cantPro) || 0;
          horasProgramadasTotal += Number(programado.hProg) || 0;
        }
      });
    }
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

// ---- Tabla "Reporte de Producción Resumida" (por actividad, día actual) ----
export interface FilaResumida {
  actividadId: string;
  procesoNombre: string;
  subprocesoNombre: string;
  actividadNombre: string;
  hProg: string; // horas programadas del día (texto tal cual, puede venir vacío "")
  minutosTrabajados: number; // suma real de duracionMinutos de los registros de hoy
  cantPro: string; // cantidad programada del día (texto tal cual)
  cantReal: number; // suma real de logrados de los registros de hoy
  observaciones: string;
  responsableId: string;
  yaIniciado: boolean; // true si ya existe al menos un registro real hoy
}

function formatoHoraMin(minutos: number): string {
  if (!minutos) return '—';
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function construirReporteResumida(
  config: ConfigCtrlProduccion | null,
  registrosHoy: RegistroProduccion[],
  fecha?: string
): FilaResumida[] {
  if (!config) return [];
  const hoyStr = fecha || new Date().toISOString().split('T')[0];
  const diaHoy = getDiaSemana(hoyStr);

  const registrosPorActividad = new Map<string, RegistroProduccion[]>();
  registrosHoy.forEach((r) => {
    const lista = registrosPorActividad.get(r.actividadId) || [];
    lista.push(r);
    registrosPorActividad.set(r.actividadId, lista);
  });

  return todasLasFilas(config).map((a) => {
    const programado = diaHoy ? a[diaHoy] : undefined;
    const registrosActividad = registrosPorActividad.get(a.actividadId) || [];
    const minutosTrabajados = registrosActividad.reduce((s, r) => s + (Number(r.duracionMinutos) || 0), 0);
    const cantReal = registrosActividad.reduce((s, r) => s + (Number(r.logrados) || 0), 0);
    const observaciones = registrosActividad.map((r) => r.observaciones).filter(Boolean).join('; ');

    return {
      actividadId: a.actividadId,
      procesoNombre: a.procesoNombre,
      subprocesoNombre: a.subprocesoNombre,
      actividadNombre: a.actividadNombre,
      hProg: programado?.hProg || '',
      minutosTrabajados,
      cantPro: programado?.cantPro || '',
      cantReal,
      observaciones,
      responsableId: programado?.responsableId || '',
      yaIniciado: registrosActividad.length > 0,
    };
  });
}

// ---- Tabla "Reporte de Producción Detallada" (por actividad, día actual) ----
export interface FilaDetallada {
  actividadId: string;
  procesoNombre: string;
  subprocesoNombre: string;
  actividadNombre: string;
  horaInicioProg: string;
  horaInicioReal: string;
  horaFinProg: string;
  horaFinReal: string;
  cantPro: string;
  cantReal: number;
  observaciones: string;
  responsableId: string;
  yaIniciado: boolean;
  // Detalle de cada sesión individual del historial de hoy para esta
  // actividad, ordenadas de la primera a la última -- para poder mostrar
  // el desglose completo (no solo el acumulado) si se expande la fila.
  sesiones: RegistroProduccion[];
}

export function construirReporteDetallada(
  config: ConfigCtrlProduccion | null,
  registrosHoy: RegistroProduccion[],
  fecha?: string
): FilaDetallada[] {
  if (!config) return [];
  const hoyStr = fecha || new Date().toISOString().split('T')[0];
  const diaHoy = getDiaSemana(hoyStr);

  // Agrupamos TODAS las sesiones de hoy por actividad (no solo la más
  // reciente) para poder calcular: hora de inicio = la primera sesión del
  // día, hora fin = la última, y cantidad real = la suma de todas.
  const sesionesPorActividad = new Map<string, RegistroProduccion[]>();
  registrosHoy.forEach((r) => {
    const lista = sesionesPorActividad.get(r.actividadId) || [];
    lista.push(r);
    sesionesPorActividad.set(r.actividadId, lista);
  });

  return todasLasFilas(config).map((a) => {
    const programado = diaHoy ? a[diaHoy] : undefined;
    const sesiones = (sesionesPorActividad.get(a.actividadId) || [])
      .slice()
      .sort((x, y) => x.horaInicio.localeCompare(y.horaInicio));

    const primeraSesion = sesiones[0];
    const ultimaSesion = sesiones[sesiones.length - 1];
    const cantRealAcumulada = sesiones.reduce((total, s) => total + (s.logrados || 0), 0);
    // Observaciones: se concatenan todas las que tengan texto, separadas
    // por " | ", para no perder ninguna sesión.
    const observacionesAcumuladas = sesiones
      .map((s) => s.observaciones)
      .filter((o): o is string => !!o && o.trim().length > 0)
      .join(' | ');

    return {
      actividadId: a.actividadId,
      procesoNombre: a.procesoNombre,
      subprocesoNombre: a.subprocesoNombre,
      actividadNombre: a.actividadNombre,
      horaInicioProg: programado?.horaInicio || '',
      horaInicioReal: primeraSesion?.horaInicio || '',
      horaFinProg: programado?.horaFin || '',
      horaFinReal: ultimaSesion?.horaFin || '',
      cantPro: programado?.cantPro || '',
      cantReal: cantRealAcumulada,
      observaciones: observacionesAcumuladas,
      responsableId: programado?.responsableId || '',
      yaIniciado: sesiones.length > 0,
      sesiones,
    };
  });
}

// ---- Tabla "Rendimiento y Cumplimiento por Responsable" (rango de fechas) ----
export interface FilaResponsable {
  responsableId: string;
  cantProgramado: number;
  cantReal: number;
  cumplimiento: number; // %
  horasTrabajadas: number;
  rendimiento: number; // und/HH
}

export function construirRendimientoPorResponsable(
  configsPorSemana: ConfigCtrlProduccion[],
  registrosRango: RegistroProduccion[],
  desde: string,
  hasta: string
): FilaResponsable[] {
  if (!configsPorSemana || configsPorSemana.length === 0) return [];

  // Mapa: semanaInicio ("YYYY-MM-DD" del Lunes) -> su documento de config.
  const configPorSemana = new Map<string, ConfigCtrlProduccion>();
  configsPorSemana.forEach((c) => {
    if (c.semanaInicio) configPorSemana.set(c.semanaInicio, c);
  });

  // Cantidad programada por responsable: recorre cada día del rango y suma
  // el cantPro de cada actividad asignada a ese responsable ESE día,
  // usando la configuración de la semana a la que pertenece ese día
  // específico (no siempre la misma).
  const programadoPorResponsable = new Map<string, number>();
  const fechaInicio = new Date(`${desde}T00:00:00`);
  const fechaFin = new Date(`${hasta}T00:00:00`);
  for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
    const fechaStr = d.toISOString().split('T')[0];
    const dia = getDiaSemana(fechaStr);
    if (!dia) continue;
    const configDeEstaSemana = configPorSemana.get(calcularLunesDeSemana(fechaStr));
    if (!configDeEstaSemana) continue;
    todasLasFilas(configDeEstaSemana).forEach((a) => {
      const programado = a[dia];
      if (programado?.cantPro) {
        const respId = programado?.responsableId || '';
        const acumulado = programadoPorResponsable.get(respId) || 0;
        programadoPorResponsable.set(respId, acumulado + (Number(programado.cantPro) || 0));
      }
    });
  }

  // Cantidad real y horas trabajadas por responsable: desde los registros reales
  const realPorResponsable = new Map<string, { cantReal: number; minutos: number }>();
  registrosRango.forEach((r) => {
    const actual = realPorResponsable.get(r.responsableId) || { cantReal: 0, minutos: 0 };
    actual.cantReal += Number(r.logrados) || 0;
    actual.minutos += Number(r.duracionMinutos) || 0;
    realPorResponsable.set(r.responsableId, actual);
  });

  const idsResponsables = new Set([...programadoPorResponsable.keys(), ...realPorResponsable.keys()]);

  return Array.from(idsResponsables).map((responsableId) => {
    const cantProgramado = programadoPorResponsable.get(responsableId) || 0;
    const real = realPorResponsable.get(responsableId) || { cantReal: 0, minutos: 0 };
    const horasTrabajadas = real.minutos / 60;
    return {
      responsableId,
      cantProgramado,
      cantReal: real.cantReal,
      cumplimiento: cantProgramado > 0 ? (real.cantReal / cantProgramado) * 100 : 0,
      horasTrabajadas,
      rendimiento: horasTrabajadas > 0 ? real.cantReal / horasTrabajadas : 0,
    };
  });
}
// ---- Matriz de Procesos (fuente maestra de actividades, no depende de config_ctrl_produccion) ----
export interface PuestoRef {
  id: string;
  nombre?: string;
  // ID real del Trabajador (colección `trabajador`) asignado a este Puesto
  // para esta actividad en particular. Reemplaza la necesidad de "adivinar"
  // por nombre -- viene directo de Matriz de Procesos.
  trabajadorId?: string | number | null;
}

export interface DescripcionActividad {
  texto: string;
  puestos: PuestoRef[];
}

export interface ActividadMatriz {
  _id: string;
  nombre: string;
  descripciones: DescripcionActividad[];
}

export interface SubprocesoMatriz {
  _id: string;
  nombre: string;
  actividades: ActividadMatriz[];
  subprocesos: SubprocesoMatriz[];
}

export interface ProcesoMatriz {
  _id: string;
  nombre: string;
  subprocesos: SubprocesoMatriz[];
}

export interface MacroprocesoMatriz {
  _id: string;
  nombre: string;
  procesos: ProcesoMatriz[];
}

// Actividad "maestra" aplanada, tal como viene de Matriz de Procesos,
// independiente de si tiene o no configuración de horario en config_ctrl_produccion.
export interface ActividadMaestra {
  actividadId: string;
  actividadNombre: string;
  procesoNombre: string;
  subprocesoNombre: string;
  descripcionOriginal: string;
  puestoNombre: string;
  // ID real del Trabajador asignado a esta actividad en Matriz de Procesos
  // (ver PuestoRef.trabajadorId). Es el dato confiable para sugerir un
  // responsable por defecto -- ya no hace falta adivinar por nombre.
  trabajadorId?: string | number | null;
}

function aplanarSubprocesos(subprocesos: SubprocesoMatriz[], proceso: string, base = ''): ActividadMaestra[] {
  const resultado: ActividadMaestra[] = [];
  for (const sub of subprocesos || []) {
    const nombreSub = base ? `${base} / ${sub.nombre}` : sub.nombre;
    for (const act of sub.actividades || []) {
      const desc = act.descripciones?.[0];
      resultado.push({
        actividadId: act._id,
        actividadNombre: act.nombre,
        procesoNombre: proceso,
        subprocesoNombre: nombreSub,
        descripcionOriginal: desc?.texto || '',
        puestoNombre: desc?.puestos?.[0]?.nombre || '',
        trabajadorId: desc?.puestos?.[0]?.trabajadorId ?? null,
      });
    }
    if (sub.subprocesos?.length) {
      resultado.push(...aplanarSubprocesos(sub.subprocesos, proceso, nombreSub));
    }
  }
  return resultado;
}

export function aplanarMatrizProcesos(macroprocesos: MacroprocesoMatriz[]): ActividadMaestra[] {
  const resultado: ActividadMaestra[] = [];
  for (const macro of macroprocesos || []) {
    for (const proceso of macro.procesos || []) {
      resultado.push(...aplanarSubprocesos(proceso.subprocesos || [], proceso.nombre));
    }
  }
  return resultado;
}

// ---- Trabajadores (mapeo responsableId -> nombre real) ----
export interface Trabajador {
  _id: number;
  nombres: string;
  tipo_doc?: number;
  nro_doc?: string;
  puesto?: string | null;
  hora_ingreso?: string;
  hora_salida?: string;
}

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
  async getConfiguracion(semanaInicio: string): Promise<ConfigCtrlProduccion | null> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion', { params: { semanaInicio } });
    const data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    // Por si en algún momento el backend devuelve un array con un solo doc
    if (Array.isArray(data) && data.length > 0) return data[0];
    return null;
  },

  // Trae los documentos de TODAS las semanas que se superponen con el rango
  // [desde, hasta] -- para reportes que abarcan varias semanas.
  async getConfiguracionesRango(desde: string, hasta: string): Promise<ConfigCtrlProduccion[]> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion/rango', { params: { desde, hasta } });
    return extractArray<ConfigCtrlProduccion>(response.data, ['data', 'items']);
  },

  async updateConfiguracion(data: Partial<ConfigCtrlProduccion> & { semanaInicio: string }): Promise<ConfigCtrlProduccion> {
    const response = await httpClient.put<ConfigCtrlProduccion>('/api/config_ctrl_produccion', data);
    return response.data;
  },

  // ---- Trabajadores (mapeo responsableId -> nombre real) ----
  async getTrabajadores(): Promise<Trabajador[]> {
    const response = await httpClient.get<any>('/api/asistencia/trabajadores');
    return extractArray<Trabajador>(response.data, ['data', 'items', 'trabajadores']);
  },

  // ---- Matriz de Procesos (lista maestra de actividades, no se pierde
  // aunque config_ctrl_produccion quede incompleto o vacío) ----
  async getMatrizProcesos(): Promise<MacroprocesoMatriz[]> {
    const response = await httpClient.get<any>('/api/matrizprocesos');
    return extractArray<MacroprocesoMatriz>(response.data, ['data', 'items']);
  },

  // ---- Registros de un día específico (Reportes de Producción, tarjetas "hoy") ----
  async getRegistrosPorFecha(fecha: string): Promise<RegistroProduccion[]> {
    const response = await httpClient.get<any>('/api/config_ctrl_produccion/registros', {
      params: { fecha },
    });
    return extractArray<RegistroProduccion>(response.data, ['data', 'items', 'registros']);
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

  // Crea el registro del día para una actividad, marcando la hora de inicio.
  // NOTA: endpoint/campos inferidos, no confirmados aún contra el backend real.
  async iniciarActividad(actividad: ActividadProduccion, responsableId: string): Promise<RegistroProduccion> {
    const ahora = new Date();
    const horaInicio = ahora.toTimeString().slice(0, 8);
    const fecha = ahora.toISOString().split('T')[0];
    const response = await httpClient.post<RegistroProduccion>('/api/config_ctrl_produccion/registros', {
      actividadId: actividad.actividadId,
      actividadNombre: actividad.actividadNombre,
      procesoNombre: actividad.procesoNombre,
      subprocesoNombre: actividad.subprocesoNombre,
      responsableId,
      fecha,
      horaInicio,
      estado: 'en_progreso',
    });
    return response.data;
  },

  // Cierra un registro ya iniciado, con los resultados capturados.
  // NOTA: endpoint/campos inferidos, no confirmados aún contra el backend real.
  // Cierra un registro ya iniciado. El backend identifica la sesión a
  // actualizar por la combinación {actividadId, fecha, horaInicio} -- por
  // eso hay que reenviar los mismos datos de la actividad y el horaInicio
  // original, junto con horaFin y los resultados capturados.
  async terminarActividad(
    actividad: ActividadProduccion,
    sesion: { fecha: string; horaInicio: string },
    responsableId: string,
    data: { logrados: number; observados: number; observaciones?: string }
  ): Promise<RegistroProduccion> {
    const horaFin = new Date().toTimeString().slice(0, 8);
    const response = await httpClient.post<RegistroProduccion>('/api/config_ctrl_produccion/registros', {
      actividadId: actividad.actividadId,
      actividadNombre: actividad.actividadNombre,
      procesoNombre: actividad.procesoNombre,
      subprocesoNombre: actividad.subprocesoNombre,
      fecha: sesion.fecha,
      horaInicio: sesion.horaInicio,
      responsableId,
      horaFin,
      estado: 'completado',
      ...data,
    });
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
