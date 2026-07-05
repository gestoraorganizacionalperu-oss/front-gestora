import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Target, Gauge, Timer, Activity } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useMessage } from '@/contexts/MessageContext';
import {
  produccionService,
  calcularIndicadores,
  type IndicadoresProduccion,
  type ConfigCtrlProduccion,
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
      .getRegistrosPorRango(hoyStr, hoyStr)
      .then((registrosHoy) => {
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
      const calculados = calcularIndicadores(registros, config, desde, hasta);
      setIndicadores(calculados);
    } catch (error: any) {
      setIndicadores(INDICADORES_VACIOS);
      showMessage('error', error.message || 'Error al cargar el reporte de producción');
    } finally {
      setIsLoading(false);
    }
  };

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
    </div>
  );
};

export default ReportesProduccion;