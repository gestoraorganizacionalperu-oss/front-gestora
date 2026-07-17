import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Play, Square, Save, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMessage } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  produccionService,
  getDiaSemana,
  calcularDuracion,
  calcularLunesDeSemana,
  todasLasFilas,
  type ConfigCtrlProduccion,
  type RegistroProduccion,
  type Trabajador,
  type ActividadProduccion,
} from '@/services/produccionService';

const hoy = new Date();
const hoyStr = hoy.toISOString().split('T')[0];
const diaHoy = getDiaSemana(hoyStr);

const nombreDia = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(hoy);
const nombreDiaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

function horaActualStr(): string {
  return new Date().toTimeString().slice(0, 8);
}

function formatearSegundos(totalSegundos: number): string {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const GestionProduccion: React.FC = () => {
  const { showMessage } = useMessage();
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigCtrlProduccion | null>(null);
  const [actividadesTodas, setActividadesTodas] = useState<ActividadProduccion[]>([]);
  const [registros, setRegistros] = useState<RegistroProduccion[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formResultados, setFormResultados] = useState({ logrados: '', observados: '', observaciones: '' });

  // Sesión activa en curso para la actividad expandida (mientras no se
  // presione "Guardar", no queda persistida como completada en backend).
  const [sesionActiva, setSesionActiva] = useState<{ registroId: string; horaInicio: string; terminada: boolean } | null>(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      setIsLoading(true);
      const [cfg, regs, trabs] = await Promise.all([
        produccionService.getConfiguracion(calcularLunesDeSemana(hoyStr)),
        produccionService.getRegistrosPorFecha(hoyStr),
        produccionService.getTrabajadores(),
      ]);
      setConfig(cfg);
      setRegistros(regs);
      setTrabajadores(trabs);
      setActividadesTodas(todasLasFilas(cfg));
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar Gestión de Producción');
    } finally {
      setIsLoading(false);
    }
  };

  // Cronómetro: corre mientras haya una sesión activa sin terminar
  useEffect(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    if (sesionActiva && !sesionActiva.terminada) {
      const actualizar = () => {
        const { segundos } = calcularDuracion(sesionActiva.horaInicio, horaActualStr());
        setSegundosTranscurridos(segundos);
      };
      actualizar();
      intervaloRef.current = setInterval(actualizar, 1000);
    }
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [sesionActiva]);

  const nombrePorId = new Map(trabajadores.map((t) => [String(t._id), t.nombres]));
  const nombreResponsable = (id: string) => nombrePorId.get(id) || `Responsable ${id}`;

  // Todos los registros de hoy, agrupados por actividad y ordenados por hora de inicio
  const registrosPorActividad = new Map<string, RegistroProduccion[]>();
  registros.forEach((r) => {
    const lista = registrosPorActividad.get(r.actividadId) || [];
    lista.push(r);
    registrosPorActividad.set(r.actividadId, lista);
  });
  registrosPorActividad.forEach((lista) => lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));

  const trabajadorActual = trabajadores.find((t) => t.nro_doc && t.nro_doc === user?.dni);
  const miResponsableId = trabajadorActual ? String(trabajadorActual._id) : null;

  const [verTodas, setVerTodas] = useState(false);
  // El responsable ahora se asigna por día: "mis actividades" son las que
  // tienen a este trabajador como responsable en el día de HOY.
  const actividadesDelTrabajador = actividadesTodas.filter(
    (a) => miResponsableId && diaHoy && a[diaHoy]?.responsableId === miResponsableId
  );
  const actividadesAMostrar = verTodas ? actividadesTodas : actividadesDelTrabajador;

  const toggleExpandir = (actividadId: string) => {
    if (expandidoId === actividadId) {
      setExpandidoId(null);
      setSesionActiva(null);
    } else {
      setExpandidoId(actividadId);
      setFormResultados({ logrados: '', observados: '', observaciones: '' });

      // Si ya hay un registro de hoy sin terminar (horaFin vacía), retoma esa sesión
      const lista = registrosPorActividad.get(actividadId) || [];
      const abierto = lista.find((r) => !r.horaFin);
      if (abierto) {
        setSesionActiva({ registroId: abierto._id, horaInicio: abierto.horaInicio, terminada: false });
      } else {
        setSesionActiva(null);
      }
    }
  };

  const handleIniciar = async (actividad: ActividadProduccion) => {
    if (!miResponsableId) {
      showMessage('error', 'No pudimos identificar tu usuario en la lista de trabajadores');
      return;
    }
    try {
      setGuardando(true);
      // Importante: se registra al usuario logueado como quien ejecuta,
      // no al responsable originalmente asignado en la configuración.
      const nuevoRegistro = await produccionService.iniciarActividad(actividad, miResponsableId);
      setSesionActiva({ registroId: nuevoRegistro._id, horaInicio: nuevoRegistro.horaInicio, terminada: false });
      setFormResultados({ logrados: '', observados: '', observaciones: '' });
      showMessage('success', 'Actividad iniciada');
      await cargarTodo();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al iniciar la actividad');
    } finally {
      setGuardando(false);
    }
  };

  // "Terminar actividad": congela el cronómetro localmente y habilita Guardar.
  // Todavía no persiste nada en el backend -- eso pasa recién al Guardar.
  const handleTerminarLocal = () => {
    if (!sesionActiva) return;
    setSesionActiva({ ...sesionActiva, terminada: true });
  };

  const handleGuardar = async (actividad: ActividadProduccion) => {
    if (!sesionActiva) return;
    if (!formResultados.logrados) {
      showMessage('warning', 'Ingresa la cantidad lograda antes de guardar');
      return;
    }
    if (!miResponsableId) {
      showMessage('error', 'No pudimos identificar tu usuario en la lista de trabajadores');
      return;
    }
    try {
      setGuardando(true);
      await produccionService.terminarActividad(
        actividad,
        { fecha: hoyStr, horaInicio: sesionActiva.horaInicio },
        miResponsableId,
        {
          logrados: Number(formResultados.logrados) || 0,
          observados: Number(formResultados.observados) || 0,
          observaciones: formResultados.observaciones,
        }
      );
      showMessage('success', 'Actividad guardada correctamente');
      setSesionActiva(null);
      setFormResultados({ logrados: '', observados: '', observaciones: '' });
      await cargarTodo();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar la actividad');
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Cargando actividades del día...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Producción</h1>
          <p className="text-muted-foreground mt-1">
            {nombreDiaCapitalizado}
            {!diaHoy && ' — sin programación'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? 'Ver solo mis actividades' : 'Ver todas las actividades'}
        </Button>
      </div>

      <div className="space-y-2">
        {!miResponsableId && (
          <div className="border rounded-lg p-4 text-sm text-muted-foreground bg-muted/30">
            No pudimos identificar tu usuario en la lista de trabajadores (no encontramos tu DNI
            registrado en Asistencia). Puedes usar "Ver todas las actividades" mientras se
            confirma esa relación.
          </div>
        )}
        {miResponsableId && !verTodas && actividadesDelTrabajador.length === 0 && (
          <div className="border rounded-lg p-4 text-sm text-muted-foreground bg-muted/30 text-center">
            No tienes actividades asignadas para hoy
          </div>
        )}

        {actividadesAMostrar.map((actividad) => {
          const listaRegistros = registrosPorActividad.get(actividad.actividadId) || [];
          const historial = listaRegistros.filter((r) => r.horaFin); // sesiones ya finalizadas
          const registroAbierto = listaRegistros.find((r) => !r.horaFin); // sesión sin terminar

          const estaExpandido = expandidoId === actividad.actividadId;
          const esLaActivaExpandida = estaExpandido && sesionActiva && sesionActiva.registroId === registroAbierto?._id;

          const enProgreso = !!registroAbierto && !(esLaActivaExpandida && sesionActiva?.terminada);
          const completadoHoy = !enProgreso && historial.length > 0;

          const programado = diaHoy ? actividad[diaHoy] : undefined;
          const puedeGuardar = estaExpandido && sesionActiva?.terminada;

          return (
            <div key={actividad.actividadId} className="border rounded-lg bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpandir(actividad.actividadId)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="font-semibold text-foreground">{actividad.actividadNombre}</div>
                  <div className="text-xs text-primary">
                    {actividad.procesoNombre} <span className="text-muted-foreground">›</span> {actividad.subprocesoNombre}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {enProgreso && (
                    <span className="text-xs font-mono px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {estaExpandido && sesionActiva ? formatearSegundos(segundosTranscurridos) : ''}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      enProgreso
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : completadoHoy
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                    }`}
                  >
                    {enProgreso ? 'En progreso' : completadoHoy ? 'Completado' : 'Pendiente'}
                  </span>
                  {estaExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {estaExpandido && (
                <div className="border-t px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3 text-center">
                      <div className="text-xs text-primary font-medium">H. Programadas</div>
                      <div className="text-lg font-bold mt-1">{programado?.hProg || '—'}</div>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <div className="text-xs text-primary font-medium">Cant. Programada</div>
                      <div className="text-lg font-bold mt-1">{programado?.cantPro || '—'}</div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Responsable asignado hoy: </span>
                    <span className="font-medium">{nombreResponsable(programado?.responsableId || '')}</span>
                  </div>
                  {miResponsableId && programado?.responsableId && programado.responsableId !== miResponsableId && !completadoHoy && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
                      Esta actividad está asignada hoy a {nombreResponsable(programado.responsableId)}. Si la inicias,
                      quedará registrado que la realizaste tú ({nombreResponsable(miResponsableId)}).
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Panel izquierdo: cronómetro / estado */}
                    <div className="border rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      {sesionActiva ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-1">
                            {sesionActiva.terminada ? 'Tiempo final' : 'Tiempo transcurrido'}
                          </p>
                          <p className="text-3xl font-mono font-bold text-foreground">
                            {formatearSegundos(segundosTranscurridos)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Inicio: {sesionActiva.horaInicio}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4">Aún no inicia esta actividad hoy</p>
                      )}
                    </div>

                    {/* Panel derecho: Logrados / Observados / Observaciones */}
                    <div className="border rounded-lg p-4 space-y-3">
                      {sesionActiva ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="logrados">Logrados</Label>
                              <input
                                id="logrados"
                                type="number"
                                value={formResultados.logrados}
                                onChange={(e) => setFormResultados({ ...formResultados, logrados: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="observados">Observados</Label>
                              <input
                                id="observados"
                                type="number"
                                value={formResultados.observados}
                                onChange={(e) => setFormResultados({ ...formResultados, observados: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="obs">Observaciones</Label>
                            <textarea
                              id="obs"
                              value={formResultados.observaciones}
                              onChange={(e) => setFormResultados({ ...formResultados, observaciones: e.target.value })}
                              placeholder="Ingrese observaciones..."
                              className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Inicia la actividad para registrar resultados y observaciones.
                        </p>
                      )}
                    </div>
                  </div>

                  {(
                    <div className="flex gap-3">
                      <Button className="flex-1" disabled={!!sesionActiva || guardando} onClick={() => handleIniciar(actividad)}>
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar actividad
                      </Button>
                      <Button
                        className="flex-1"
                        variant="secondary"
                        disabled={!sesionActiva || sesionActiva.terminada || guardando}
                        onClick={handleTerminarLocal}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Terminar actividad
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!puedeGuardar || guardando}
                        onClick={() => handleGuardar(actividad)}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </Button>
                    </div>
                  )}

                  {/* Historial de sesiones ya finalizadas hoy */}
                  {historial.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <History className="w-3.5 h-3.5" />
                        Historial de hoy · {historial.length} sesión{historial.length > 1 ? 'es' : ''} anterior{historial.length > 1 ? 'es' : ''}
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left px-3 py-1.5 font-medium">Horario</th>
                              <th className="text-center px-3 py-1.5 font-medium">Tiempo</th>
                              <th className="text-center px-3 py-1.5 font-medium">Cantidad</th>
                              <th className="text-left px-3 py-1.5 font-medium">Obs.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historial.map((r) => {
                              const { texto } = calcularDuracion(r.horaInicio, r.horaFin);
                              return (
                                <tr key={r._id} className="border-t">
                                  <td className="px-3 py-1.5 font-mono">{r.horaInicio} → {r.horaFin}</td>
                                  <td className="px-3 py-1.5 text-center">{texto}</td>
                                  <td className="px-3 py-1.5 text-center">{r.logrados}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{r.observaciones || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GestionProduccion;
