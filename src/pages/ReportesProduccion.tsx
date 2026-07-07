import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Target, Gauge, Timer, Activity } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useMessage } from '@/contexts/MessageContext';
import {
  produccionService,
  calcularIndicadores,
  construirReporteResumida,
  construirReporteDetallada,
  construirRendimientoPorResponsable,
  type IndicadoresProduccion,
  type ConfigCtrlProduccion,
  type FilaResumida,
  type FilaDetallada,
  type FilaResponsable,
  type Trabajador,
} from '@/services/produccionService';

const hoy = new Date();
const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

const toInputDate = (d: Date) => d.toISOString().split('T')[0];

const fechaLarga = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}).format(hoy);

const INDICADORES_VACIOS: IndicadoresProduccion = {
  totalActividades: 0,
  completadas: 0,
  enProgreso: 0,
  totalLogrados: 0,
  cumplimientoProduccion: 0,
  cumplimientoHorasHombre: 0,
  productividadReal: 0,
  eficienciaProductiva: 0,
  horasHombrePorUnidad: 0,
};

// Calcula, para cada fila, cuántas filas debe "abarcar" (rowSpan) su celda
// de Proceso y Subproceso, agrupando filas consecutivas con el mismo valor
// -- igual al efecto visual de celdas combinadas que se ve en producción.
function conRowSpans<T extends { procesoNombre: string; subprocesoNombre: string }>(
  filas: T[]
): (T & { procesoRowSpan: number; subprocesoRowSpan: number })[] {
  return filas.map((fila, i) => {
    const esInicioProceso = i === 0 || filas[i - 1].procesoNombre !== fila.procesoNombre;
    const esInicioSubproceso =
      i === 0 ||
      filas[i - 1].subprocesoNombre !== fila.subprocesoNombre ||
      filas[i - 1].procesoNombre !== fila.procesoNombre;

    let procesoRowSpan = 0;
    if (esInicioProceso) {
      let j = i;
      while (j < filas.length && filas[j].procesoNombre === fila.procesoNombre) j++;
      procesoRowSpan = j - i;
    }
    let subprocesoRowSpan = 0;
    if (esInicioSubproceso) {
      let j = i;
      while (
        j < filas.length &&
        filas[j].subprocesoNombre === fila.subprocesoNombre &&
        filas[j].procesoNombre === fila.procesoNombre
      )
        j++;
      subprocesoRowSpan = j - i;
    }
    return { ...fila, procesoRowSpan, subprocesoRowSpan };
  });
}

// Verde = el trabajador ya empezó a marcar su avance hoy en esa actividad.
// Amarillo = todavía no ha registrado nada hoy.
function colorEstadoResponsable(yaIniciado: boolean): string {
  return yaIniciado
    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
}

const celdaEstilo = 'border border-border px-2 py-1.5 text-xs';
const celdaHeaderEstilo = 'border border-border px-2 py-1.5 text-xs font-semibold text-primary uppercase whitespace-nowrap';

const ReportesProduccion: React.FC = () => {
  const { showMessage } = useMessage();
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ConfigCtrlProduccion | null>(null);
  const [desde, setDesde] = useState(toInputDate(primerDiaDelMes));
  const [hasta, setHasta] = useState(toInputDate(hoy));
  const [indicadores, setIndicadores] = useState<IndicadoresProduccion>(INDICADORES_VACIOS);

  // Tarjetas superiores: SIEMPRE reflejan el día de HOY, independiente
  // del filtro de fechas de la sección "Indicadores de Producción".
  const [totalActividadesHoy, setTotalActividadesHoy] = useState(0);
  const [completadasHoy, setCompletadasHoy] = useState(0);
  const [enProgresoHoy, setEnProgresoHoy] = useState(0);
  const [totalLogradosHoy, setTotalLogradosHoy] = useState(0);

  const [registrosHoyCompletos, setRegistrosHoyCompletos] = useState<any[]>([]);
  const [registrosRangoCompletos, setRegistrosRangoCompletos] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  // Carga la lista de trabajadores una sola vez (para mostrar nombres reales)
  useEffect(() => {
    produccionService.getTrabajadores().then(setTrabajadores).catch(() => {
      // Si falla, seguimos mostrando el ID como respaldo
    });
  }, []);

  // Carga la configuración (metas programadas) una sola vez
  useEffect(() => {
    produccionService.getConfiguracion().then(setConfig).catch(() => {
      showMessage('error', 'No se pudo cargar la configuración de metas de producción');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga el snapshot de HOY, una sola vez (no depende del filtro de fechas)
  useEffect(() => {
    const hoyStr = toInputDate(hoy);
    produccionService
      .getRegistrosPorFecha(hoyStr)
      .then((registrosHoy) => {
        setRegistrosHoyCompletos(registrosHoy);
        setTotalActividadesHoy(config?.actividades.length || registrosHoy.length);
        setCompletadasHoy(registrosHoy.filter((r) => r.estado === 'completado').length);
        setEnProgresoHoy(registrosHoy.filter((r) => r.estado === 'en_progreso' || r.estado === 'pendiente').length);
        setTotalLogradosHoy(registrosHoy.reduce((sum, r) => sum + (Number(r.logrados) || 0), 0));
      })
      .catch(() => {
        // Si falla, dejamos las tarjetas en 0 en vez de romper la página
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    loadReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, config]);

  const loadReporte = async () => {
    try {
      setIsLoading(true);
      const registros = await produccionService.getRegistrosPorRango(desde, hasta);
      setRegistrosRangoCompletos(registros);
      const calculados = calcularIndicadores(registros, config, desde, hasta);
      setIndicadores(calculados);
    } catch (error: any) {
      setIndicadores(INDICADORES_VACIOS);
      showMessage('error', error.message || 'Error al cargar el reporte de producción');
    } finally {
      setIsLoading(false);
    }
  };

  const filasResumida: FilaResumida[] = construirReporteResumida(config, registrosHoyCompletos);
  const filasDetallada: FilaDetallada[] = construirReporteDetallada(config, registrosHoyCompletos);
  const filasResponsable: FilaResponsable[] = construirRendimientoPorResponsable(
    config,
    registrosRangoCompletos,
    desde,
    hasta
  );
  const nombrePorId = new Map(trabajadores.map((t) => [String(t._id), t.nombres]));
  const nombreResponsable = (id: string) => nombrePorId.get(id) || `Responsable ${id}`;
  const filasResumidaAgrupadas = conRowSpans(filasResumida);
  const filasDetalladaAgrupadas = conRowSpans(filasDetallada);

  const resumenCards = [
    { label: 'Total Actividades', value: totalActividadesHoy, icon: ClipboardList, color: 'text-foreground' },
    { label: 'Completadas', value: completadasHoy, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
    { label: 'En Progreso', value: enProgresoHoy, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Total Logrados', value: totalLogradosHoy, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  ];

  const indicadorCards = [
    {
      label: 'CUMPLIMIENTO DE PRODUCCIÓN',
      value: `${indicadores.cumplimientoProduccion.toFixed(1)}%`,
      formula: 'Σ Cant. Real / Σ Cant. Programada × 100',
      icon: Target,
    },
    {
      label: 'CUMPLIMIENTO DE HORAS HOMBRE',
      value: `${indicadores.cumplimientoHorasHombre.toFixed(1)}%`,
      formula: 'Σ Horas Programadas / Σ Horas Trabajadas × 100',
      icon: Clock,
    },
    {
      label: 'PRODUCTIVIDAD REAL',
      value: `${indicadores.productividadReal.toFixed(2)} und/H`,
      formula: 'Σ Cant. Real / Σ Horas Trabajadas',
      icon: Gauge,
    },
    {
      label: 'EFICIENCIA PRODUCTIVA',
      value: `${indicadores.eficienciaProductiva.toFixed(1)}%`,
      formula: 'Productividad Real / Productividad Programada × 100',
      icon: Activity,
    },
    {
      label: 'HORAS HOMBRE POR UNIDAD',
      value: `${indicadores.horasHombrePorUnidad.toFixed(2)} HH/und`,
      formula: 'Σ Horas Trabajadas / Σ Cant. Real',
      icon: Timer,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportes de Producción</h1>
        <p className="text-muted-foreground mt-1 capitalize">{fechaLarga}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {resumenCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`border rounded-lg p-4 ${bg || 'bg-card'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 ${color}`}>{isLoading ? '—' : value}</div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm">
          INDICADORES DE PRODUCCIÓN
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="desde">Desde</Label>
            <input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hasta">Hasta</Label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0">
          {indicadorCards.map(({ label, value, formula, icon: Icon }) => (
            <div key={label} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-2 text-foreground">{isLoading ? '—' : value}</div>
              <p className="text-xs text-muted-foreground mt-1">{formula}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rendimiento y Cumplimiento por Responsable */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm">
          RENDIMIENTO Y CUMPLIMIENTO POR RESPONSABLE
        </div>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={celdaHeaderEstilo}>Trabajador</th>
              <th className={`${celdaHeaderEstilo} text-right`}>Cant. Prog.</th>
              <th className={`${celdaHeaderEstilo} text-right`}>Cant. Real</th>
              <th className={`${celdaHeaderEstilo} text-right`}>Cumplimiento</th>
              <th className={`${celdaHeaderEstilo} text-right`}>Horas Trab.</th>
              <th className={`${celdaHeaderEstilo} text-right`}>Rendimiento (und/HH)</th>
            </tr>
          </thead>
          <tbody>
            {filasResponsable.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${celdaEstilo} text-center text-muted-foreground py-4`}>
                  Sin datos para este rango
                </td>
              </tr>
            ) : (
              filasResponsable.map((f) => (
                <tr key={f.responsableId}>
                  <td className={`${celdaEstilo} font-medium`}>{nombreResponsable(f.responsableId)}</td>
                  <td className={`${celdaEstilo} text-right`}>{f.cantProgramado}</td>
                  <td className={`${celdaEstilo} text-right`}>{f.cantReal || '—'}</td>
                  <td className={`${celdaEstilo} text-right`}>{f.cumplimiento.toFixed(1)}%</td>
                  <td className={`${celdaEstilo} text-right`}>{f.horasTrabajadas.toFixed(1)}</td>
                  <td className={`${celdaEstilo} text-right`}>{f.rendimiento > 0 ? f.rendimiento.toFixed(2) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reporte de Producción Resumida (del día de hoy) */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm flex justify-between">
          <span>REPORTE DE PRODUCCIÓN RESUMIDA</span>
          <span className="capitalize font-normal">{fechaLarga}</span>
        </div>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={celdaHeaderEstilo}>Proceso</th>
              <th className={celdaHeaderEstilo}>Subproceso</th>
              <th className={celdaHeaderEstilo}>Actividades</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.Prog</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.Trab</th>
              <th className={`${celdaHeaderEstilo} text-center`}>Cant.Pro</th>
              <th className={`${celdaHeaderEstilo} text-center`}>Cant. Real</th>
              <th className={celdaHeaderEstilo}>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {filasResumidaAgrupadas.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${celdaEstilo} text-center text-muted-foreground py-4`}>
                  Cargando actividades...
                </td>
              </tr>
            ) : (
              filasResumidaAgrupadas.map((f) => (
                <tr key={f.actividadId}>
                  {f.procesoRowSpan > 0 && (
                    <td rowSpan={f.procesoRowSpan} className={`${celdaEstilo} font-medium align-top`}>
                      {f.procesoNombre}
                    </td>
                  )}
                  {f.subprocesoRowSpan > 0 && (
                    <td rowSpan={f.subprocesoRowSpan} className={`${celdaEstilo} align-top`}>
                      {f.subprocesoNombre}
                    </td>
                  )}
                  <td className={`${celdaEstilo} font-medium`}>{f.actividadNombre}</td>
                  <td className={`${celdaEstilo} text-center`}>{f.hProg ? `${f.hProg}h` : '—'}</td>
                  <td className={`${celdaEstilo} text-center`}>
                    {f.minutosTrabajados > 0
                      ? `${Math.floor(f.minutosTrabajados / 60)}:${Math.round(f.minutosTrabajados % 60).toString().padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td className={`${celdaEstilo} text-center`}>{f.cantPro || '—'}</td>
                  <td className={`${celdaEstilo} text-center`}>{f.cantReal > 0 ? f.cantReal : '—'}</td>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{f.observaciones || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reporte de Producción Detallada (del día de hoy) */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 font-semibold text-sm flex justify-between">
          <span>REPORTE DE PRODUCCIÓN DETALLADA</span>
          <span className="capitalize font-normal">{fechaLarga}</span>
        </div>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={celdaHeaderEstilo}>Proceso</th>
              <th className={celdaHeaderEstilo}>Subproceso</th>
              <th className={celdaHeaderEstilo}>Actividades</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.INI Prog.</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.INI Real</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.FIN Prog.</th>
              <th className={`${celdaHeaderEstilo} text-center`}>H.FIN Real</th>
              <th className={`${celdaHeaderEstilo} text-center`}>Cant.Prog</th>
              <th className={`${celdaHeaderEstilo} text-center`}>Cant.Real</th>
              <th className={celdaHeaderEstilo}>Obs.</th>
              <th className={celdaHeaderEstilo}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {filasDetalladaAgrupadas.length === 0 ? (
              <tr>
                <td colSpan={11} className={`${celdaEstilo} text-center text-muted-foreground py-4`}>
                  Cargando actividades...
                </td>
              </tr>
            ) : (
              filasDetalladaAgrupadas.map((f) => (
                <tr key={f.actividadId}>
                  {f.procesoRowSpan > 0 && (
                    <td rowSpan={f.procesoRowSpan} className={`${celdaEstilo} font-medium align-top`}>
                      {f.procesoNombre}
                    </td>
                  )}
                  {f.subprocesoRowSpan > 0 && (
                    <td rowSpan={f.subprocesoRowSpan} className={`${celdaEstilo} align-top`}>
                      {f.subprocesoNombre}
                    </td>
                  )}
                  <td className={`${celdaEstilo} font-medium`}>{f.actividadNombre}</td>
                  <td className={`${celdaEstilo} text-center`}>—</td>
                  <td className={`${celdaEstilo} text-center`}>{f.horaInicioReal || '—'}</td>
                  <td className={`${celdaEstilo} text-center`}>—</td>
                  <td className={`${celdaEstilo} text-center`}>{f.horaFinReal || '—'}</td>
                  <td className={`${celdaEstilo} text-center`}>{f.cantPro || '—'}</td>
                  <td className={`${celdaEstilo} text-center`}>{f.cantReal > 0 ? f.cantReal : '—'}</td>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{f.observaciones}</td>
                  <td className={celdaEstilo}>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${colorEstadoResponsable(f.yaIniciado)}`}>
                      {nombreResponsable(f.responsableId)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportesProduccion;
