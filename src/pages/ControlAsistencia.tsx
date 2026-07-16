import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import {
  asistenciaService,
  parseFechaAsistencia,
  fechaInputAFecha,
  getDiaSemanaHorario,
  formatoMinutosHHMM,
  calcularFilaControlAsistencia,
  type TrabajadorAsistencia,
  type RegistroAsistencia,
  type HorarioTrabajador,
  type FilaControlAsistencia,
} from '@/services/asistenciaService';

const MESES = [
  { value: '', label: 'Todos' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function hoyComoInputDate(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function descargarCSV(filas: (FilaControlAsistencia & { fecha: string })[], nombreArchivo: string) {
  const headers = [
    'Fecha', 'Trabajador',
    'Ingreso Mañana', 'Salida Mañana', 'Tardanza Mañana (min)',
    'Ingreso Tarde', 'Salida Tarde', 'Tardanza Tarde (min)',
    'Tardanza Total (hh:mm)', 'Tiempo Excedente (hh:mm)', 'Tiempo Pendiente (hh:mm)',
    '% Compensada', 'Saldo Neto (hh:mm)', 'Tipo de Saldo',
  ];
  const filasCSV = filas.map((f) => [
    f.fecha, f.nombre,
    f.ingresoManana, f.salidaManana, String(f.tardanzaMananaMin),
    f.ingresoTarde, f.salidaTarde, String(f.tardanzaTardeMin),
    formatoMinutosHHMM(f.tardanzaTotalMin), formatoMinutosHHMM(f.excedenteMin), formatoMinutosHHMM(f.pendienteMin),
    `${f.porcentajeCompensada}%`, formatoMinutosHHMM(f.saldoNetoMin), f.tipoSaldo,
  ]);
  const csv = [headers, ...filasCSV]
    .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  // BOM para que Excel detecte UTF-8 y no rompa las tildes
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const celdaHeader = 'px-3 py-2 border border-white text-xs font-semibold';
const celda = 'px-3 py-2 border border-border text-xs text-center';

const ControlAsistencia: React.FC = () => {
  const { showMessage } = useMessage();

  const [trabajadores, setTrabajadores] = useState<TrabajadorAsistencia[]>([]);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [horarios, setHorarios] = useState<HorarioTrabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  const [fechaFiltro, setFechaFiltro] = useState(hoyComoInputDate());
  const [mesFiltro, setMesFiltro] = useState('');
  const [trabajadorExportId, setTrabajadorExportId] = useState('all');
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    cargarTodo();
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarTodo = async () => {
    try {
      setIsLoading(true);
      const [trabs, regs, hors] = await Promise.all([
        asistenciaService.getTrabajadores(),
        asistenciaService.getTodasAsistencias(),
        asistenciaService.getAllHorarios(),
      ]);
      setTrabajadores(trabs);
      setRegistros(regs);
      setHorarios(hors);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar el control de asistencia');
    } finally {
      setIsLoading(false);
    }
  };

  const registrosParaFecha = (dni: string, day: number, month: number, year: number) =>
    registros.filter((r) => {
      if (r.dni !== dni) return false;
      const f = parseFechaAsistencia(r.fecha);
      return !!f && f.day === day && f.month === month && f.year === year;
    });

  const calcularFilasParaFecha = (day: number, month: number, year: number): FilaControlAsistencia[] => {
    const diaSemana = getDiaSemanaHorario(day, month, year);
    return trabajadores.map((t) => {
      const registrosDia = registrosParaFecha(t.nro_doc, day, month, year);
      const horario = horarios.find((h) => h.trabajadorId === t.nro_doc);
      return calcularFilaControlAsistencia(t, registrosDia, horario, diaSemana);
    });
  };

  const fechaSeleccionada = useMemo(() => fechaInputAFecha(fechaFiltro), [fechaFiltro]);

  const filasDelDia = useMemo(() => {
    if (!fechaSeleccionada || isLoading) return [];
    return calcularFilasParaFecha(fechaSeleccionada.day, fechaSeleccionada.month, fechaSeleccionada.year);
  }, [fechaSeleccionada, trabajadores, registros, horarios, isLoading]);

  const handleExportar = () => {
    if (!fechaSeleccionada) return;
    try {
      setExportando(true);
      const trabajadoresAExportar =
        trabajadorExportId === 'all' ? trabajadores : trabajadores.filter((t) => t.nro_doc === trabajadorExportId);

      let fechas: { day: number; month: number; year: number }[];
      if (mesFiltro) {
        const mesNum = parseInt(mesFiltro, 10);
        const year = fechaSeleccionada.year;
        const diasEnMes = new Date(year, mesNum, 0).getDate();
        fechas = [];
        for (let d = 1; d <= diasEnMes; d++) {
          if (new Date(year, mesNum - 1, d).getDay() === 0) continue; // domingo sin horario
          fechas.push({ day: d, month: mesNum, year });
        }
      } else {
        fechas = [fechaSeleccionada];
      }

      const filas: (FilaControlAsistencia & { fecha: string })[] = [];
      fechas.forEach((f) => {
        const diaSemana = getDiaSemanaHorario(f.day, f.month, f.year);
        trabajadoresAExportar.forEach((t) => {
          const registrosDia = registrosParaFecha(t.nro_doc, f.day, f.month, f.year);
          const horario = horarios.find((h) => h.trabajadorId === t.nro_doc);
          const fila = calcularFilaControlAsistencia(t, registrosDia, horario, diaSemana);
          filas.push({ ...fila, fecha: `${f.day}/${f.month}/${f.year}` });
        });
      });

      const sufijo = mesFiltro ? `mes-${mesFiltro}-${fechaSeleccionada.year}` : fechaFiltro;
      descargarCSV(filas, `control-asistencia-${sufijo}.csv`);
      showMessage('success', 'Archivo exportado correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  const horaTexto = ahora.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const fechaTexto = ahora
    .toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-6xl mb-6 gap-4">
        <h1 className="text-2xl font-bold">Control de Asistencia</h1>
        <div className="flex flex-col items-end">
          <span className="font-mono text-2xl font-bold text-primary tabular-nums">{horaTexto}</span>
          <span className="font-mono text-xs text-muted-foreground">{fechaTexto}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-6xl mb-4">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1">Filtrar por fecha</label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="rounded border px-2 py-1 text-xs sm:text-sm w-40"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1">
            Filtrar por mes <span className="font-normal">(para exportar)</span>
          </label>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="rounded border px-2 py-1 text-xs sm:text-sm w-32"
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-wrap justify-end items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Exportar por trabajador:</label>
          <select
            value={trabajadorExportId}
            onChange={(e) => setTrabajadorExportId(e.target.value)}
            className="rounded border px-2 py-1 text-xs sm:text-sm"
          >
            <option value="all">Todos los trabajadores</option>
            {trabajadores.map((t) => (
              <option key={t._id} value={t.nro_doc}>{t.nombres}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleExportar} disabled={exportando || isLoading} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {exportando ? 'Exportando...' : 'Exportar a Excel'}
        </Button>
      </div>

      <div className="overflow-x-auto w-full max-w-6xl">
        <table className="min-w-full border border-gray-300 rounded-lg shadow text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className={`${celdaHeader} bg-blue-900 text-white align-middle`}>Trabajador</th>
              <th colSpan={3} className={`${celdaHeader} bg-green-700 text-white`}>PRIMER TURNO</th>
              <th colSpan={3} className={`${celdaHeader} bg-blue-700 text-white`}>SEGUNDO TURNO</th>
              <th rowSpan={2} className={`${celdaHeader} text-red-600 bg-white align-middle`}>Tardanza Total<br /><span className="font-normal">(hh:mm)</span></th>
              <th rowSpan={2} className={`${celdaHeader} text-green-700 bg-white align-middle`}>Tiempo Excedente<br /><span className="font-normal">(hh:mm)</span></th>
              <th rowSpan={2} className={`${celdaHeader} text-yellow-700 bg-white align-middle`}>Tiempo Pendiente<br /><span className="font-normal">(hh:mm)</span></th>
              <th rowSpan={2} className={`${celdaHeader} bg-white align-middle`}>% Compensada</th>
              <th colSpan={2} className={`${celdaHeader} bg-blue-900 text-white`}>SALDO A FAVOR DEL TRABAJADOR</th>
            </tr>
            <tr>
              <th className={`${celdaHeader} bg-green-100 text-green-900`}>Ingreso Mañana</th>
              <th className={`${celdaHeader} bg-green-100 text-green-900`}>Salida Mañana</th>
              <th className={`${celdaHeader} bg-green-100 text-green-900`}>Tardanza Mañana</th>
              <th className={`${celdaHeader} bg-blue-100 text-blue-900`}>Ingreso Tarde</th>
              <th className={`${celdaHeader} bg-blue-100 text-blue-900`}>Salida Tarde</th>
              <th className={`${celdaHeader} bg-blue-100 text-blue-900`}>Tardanza Tarde</th>
              <th className={`${celdaHeader} bg-blue-100 text-blue-900`}>Saldo Neto</th>
              <th className={`${celdaHeader} bg-blue-100 text-blue-900`}>Tipo de saldo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className={`${celda} py-4 text-muted-foreground`}>Cargando...</td>
              </tr>
            ) : filasDelDia.length === 0 ? (
              <tr>
                <td colSpan={11} className={`${celda} py-4 text-muted-foreground`}>No hay registros para mostrar.</td>
              </tr>
            ) : (
              filasDelDia.map((f) => (
                <tr key={f.dni}>
                  <td className={`${celda} text-left font-medium`}>{f.nombre}</td>
                  <td className={celda}>{f.ingresoManana}</td>
                  <td className={celda}>{f.salidaManana}</td>
                  <td className={celda}>{f.tardanzaMananaMin > 0 ? f.tardanzaMananaMin : '--:--'}</td>
                  <td className={celda}>{f.ingresoTarde}</td>
                  <td className={celda}>{f.salidaTarde}</td>
                  <td className={celda}>{f.tardanzaTardeMin > 0 ? f.tardanzaTardeMin : '--:--'}</td>
                  <td className={`${celda} font-semibold text-red-600`}>{formatoMinutosHHMM(f.tardanzaTotalMin)}</td>
                  <td className={`${celda} font-semibold text-green-700`}>{formatoMinutosHHMM(f.excedenteMin)}</td>
                  <td className={`${celda} font-semibold text-yellow-700`}>{formatoMinutosHHMM(f.pendienteMin)}</td>
                  <td className={celda}>{f.porcentajeCompensada}%</td>
                  <td className={`${celda} font-semibold`}>{formatoMinutosHHMM(f.saldoNetoMin)}</td>
                  <td className={celda}>{f.tipoSaldo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ControlAsistencia;
