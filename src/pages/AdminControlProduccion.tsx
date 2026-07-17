import React, { useState, useEffect } from 'react';
import { Save, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  produccionService,
  aplanarMatrizProcesos,
  calcularHorasDecimal,
  calcularLunesDeSemana,
  sumarSemanas,
  type ConfigCtrlProduccion,
  type ActividadProduccion,
  type DiaSemana,
  type Trabajador,
} from '@/services/produccionService';

const DIAS: {
  key: DiaSemana;
  label: string;
  headerBg: string; // fondo del encabezado (más saturado)
  cellBg: string; // fondo de las celdas de datos (más sutil)
  text: string; // color de texto del encabezado, mismo tono oscuro que el fondo
}[] = [
  { key: 'lunes', label: 'Lunes', headerBg: 'bg-teal-100 dark:bg-teal-950', cellBg: 'bg-teal-50/70 dark:bg-teal-950/30', text: 'text-teal-900 dark:text-teal-200' },
  { key: 'martes', label: 'Martes', headerBg: 'bg-orange-100 dark:bg-orange-950', cellBg: 'bg-orange-50/70 dark:bg-orange-950/30', text: 'text-orange-900 dark:text-orange-200' },
  { key: 'miercoles', label: 'Miércoles', headerBg: 'bg-amber-100 dark:bg-amber-950', cellBg: 'bg-amber-50/70 dark:bg-amber-950/30', text: 'text-amber-900 dark:text-amber-200' },
  { key: 'jueves', label: 'Jueves', headerBg: 'bg-blue-100 dark:bg-blue-950', cellBg: 'bg-blue-50/70 dark:bg-blue-950/30', text: 'text-blue-900 dark:text-blue-200' },
  { key: 'viernes', label: 'Viernes', headerBg: 'bg-violet-100 dark:bg-violet-950', cellBg: 'bg-violet-50/70 dark:bg-violet-950/30', text: 'text-violet-900 dark:text-violet-200' },
  { key: 'sabado', label: 'Sábado', headerBg: 'bg-pink-100 dark:bg-pink-950', cellBg: 'bg-pink-50/70 dark:bg-pink-950/30', text: 'text-pink-900 dark:text-pink-200' },
];

const celdaEstilo = 'border border-border px-1 py-1 text-xs';
const celdaHeaderEstilo = 'border border-border px-2 py-1.5 text-xs font-semibold uppercase whitespace-nowrap';

const CampoNumero: React.FC<{
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  disabled?: boolean;
}> = ({ valor, onChange, placeholder, disabled }) => (
  <input
    type="text"
    inputMode="decimal"
    value={valor}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-12 text-center text-xs border border-input rounded px-1 py-0.5 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
  />
);

const SelectorResponsable: React.FC<{
  valor: string;
  onChange: (valor: string) => void;
  trabajadores: Trabajador[];
  disabled?: boolean;
}> = ({ valor, onChange, trabajadores, disabled }) => {
  const [editando, setEditando] = useState(false);
  const nombre = trabajadores.find((t) => String(t._id) === valor)?.nombres;

  if (editando) {
    return (
      <select
        autoFocus
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setEditando(false);
        }}
        onBlur={() => setEditando(false)}
        disabled={disabled}
        className="text-xs border border-input rounded px-1 py-1 bg-background w-full min-w-[110px] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">Sin asignar</option>
        {trabajadores.map((t) => (
          <option key={t._id} value={String(t._id)}>
            {t.nombres}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditando(true)}
      disabled={disabled}
      title={disabled ? undefined : 'Clic para cambiar responsable'}
      className="text-xs w-full flex items-center justify-between gap-1 px-1 py-1 rounded truncate hover:bg-muted/60 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      <span className="truncate">{nombre || <span className="text-muted-foreground">Sin asignar</span>}</span>
      {!disabled && <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />}
    </button>
  );
};

const AdminControlProduccion: React.FC = () => {
  const { showMessage } = useMessage();
  const { user } = useAuth();
  // Solo Super Administrador (1) y Administrador (2) pueden editar esta
  // pantalla. El resto de perfiles (Responsable, Observador, Gestor,
  // Trabajador) la ven en modo solo lectura.
  const PERFILES_EDITORES = [1, 2];
  const puedeEditar = !!user?.profileId && PERFILES_EDITORES.includes(user.profileId);

  const [config, setConfig] = useState<ConfigCtrlProduccion | null>(null);
  const [actividades, setActividades] = useState<ActividadProduccion[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);
  // trabajadorId sugerido por Matriz de Procesos para cada actividad (por
  // actividadId) -- se usa solo para el botón "Rellenar vacíos desde
  // Matriz", nunca se aplica automáticamente sobre datos ya guardados.
  const [trabajadorIdPorActividad, setTrabajadorIdPorActividad] = useState<Map<string, string>>(new Map());
  const [rellenando, setRellenando] = useState(false);
  // Por defecto, la columna "Resp." de cada día queda oculta (colapsada)
  // para que la tabla se vea más limpia -- se muestra solo al presionar
  // el botón "Editar responsables".
  const [mostrarResponsables, setMostrarResponsables] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Semana que se está viendo/editando (Lunes de esa semana, "YYYY-MM-DD").
  // Cada semana guarda su propia configuración por separado.
  const [semanaInicio, setSemanaInicio] = useState(() => calcularLunesDeSemana(new Date().toISOString().split('T')[0]));

  useEffect(() => {
    cargarTodo();
  }, [semanaInicio]);

  const cargarTodo = async () => {
    try {
      setIsLoading(true);
      const [cfg, macroprocesos, trabs] = await Promise.all([
        produccionService.getConfiguracion(semanaInicio),
        produccionService.getMatrizProcesos(),
        produccionService.getTrabajadores(),
      ]);
      // Normaliza cada fila de "Proyectos/Otros" (por si viene con algún
      // día sin inicializar desde el backend) y le asegura un id -- por
      // si algún documento viejo se coló sin pasar por la migración.
      const diaLimpio = (dia?: { hProg: string; cantPro: string; responsableId?: string; horaInicio?: string; horaFin?: string }) => ({
        hProg: dia?.hProg || '',
        cantPro: dia?.cantPro || '',
        horaInicio: dia?.horaInicio || '',
        horaFin: dia?.horaFin || '',
        responsableId: dia?.responsableId || '',
      });
      const proyectosOtrosLimpios = (cfg?.proyectosOtros || []).map((p: any) => ({
        id: p.id || `temp-${Math.random().toString(36).slice(2)}`,
        descripcion: p.descripcion || '',
        lunes: diaLimpio(p.lunes),
        martes: diaLimpio(p.martes),
        miercoles: diaLimpio(p.miercoles),
        jueves: diaLimpio(p.jueves),
        viernes: diaLimpio(p.viernes),
        sabado: diaLimpio(p.sabado),
      }));
      setConfig(cfg ? { ...cfg, proyectosOtros: proyectosOtrosLimpios } : cfg);
      setTrabajadores(trabs);

      // La Matriz de Procesos es la lista MAESTRA de actividades -- nunca
      // se pierde ni se edita desde aquí. config_ctrl_produccion solo aporta
      // horario/responsable si existen; si a una actividad le falta esa
      // info, se completa vacía (o con el responsable sugerido por la
      // matriz) en vez de desaparecer.
      const maestras = aplanarMatrizProcesos(macroprocesos);
      const trabajadorIdPorActividadTemp = new Map<string, string>();
      maestras.forEach((m) => {
        if (m.trabajadorId != null) trabajadorIdPorActividadTemp.set(m.actividadId, String(m.trabajadorId));
      });
      setTrabajadorIdPorActividad(trabajadorIdPorActividadTemp);
      const configPorId = new Map((cfg?.actividades || []).map((a) => [a.actividadId, a]));

      const fusionadas: ActividadProduccion[] = maestras.map((m) => {
        const existente = configPorId.get(m.actividadId);

        if (existente) {
          // Migración suave: documentos guardados antes de este cambio
          // tenían un único "responsableId" por fila (no por día). Si un
          // día todavía no tiene su propio responsable asignado, se usa
          // ese valor legado como punto de partida para no perder la
          // asignación previa.
          const legado = (existente as any).responsableId as string | undefined;
          const conResponsablePorDia = (dia?: {
            hProg: string;
            cantPro: string;
            horaInicio?: string;
            horaFin?: string;
            responsableId?: string;
          }) => ({
            hProg: dia?.hProg || '',
            cantPro: dia?.cantPro || '',
            horaInicio: dia?.horaInicio || '',
            horaFin: dia?.horaFin || '',
            responsableId: dia?.responsableId ?? legado ?? '',
          });

          return {
            actividadId: existente.actividadId,
            actividadNombre: existente.actividadNombre,
            procesoNombre: existente.procesoNombre,
            subprocesoNombre: existente.subprocesoNombre,
            lunes: conResponsablePorDia(existente.lunes),
            martes: conResponsablePorDia(existente.martes),
            miercoles: conResponsablePorDia(existente.miercoles),
            jueves: conResponsablePorDia(existente.jueves),
            viernes: conResponsablePorDia(existente.viernes),
            sabado: conResponsablePorDia(existente.sabado),
          };
        }

        // Sin datos guardados: sugerimos el responsable usando el
        // trabajadorId real que viene de Matriz de Procesos (ya no
        // adivinamos por coincidencia de texto en el nombre).
        const sugeridoId =
          m.trabajadorId != null && trabs.some((t) => String(t._id) === String(m.trabajadorId))
            ? String(m.trabajadorId)
            : '';
        const diaConSugerido = () => ({ hProg: '', cantPro: '', responsableId: sugeridoId });

        return {
          actividadId: m.actividadId,
          actividadNombre: m.actividadNombre,
          procesoNombre: m.procesoNombre,
          subprocesoNombre: m.subprocesoNombre,
          lunes: diaConSugerido(),
          martes: diaConSugerido(),
          miercoles: diaConSugerido(),
          jueves: diaConSugerido(),
          viernes: diaConSugerido(),
          sabado: diaConSugerido(),
        };
      });

      setActividades(fusionadas);
      setHayCambios(false);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar la configuración de producción');
    } finally {
      setIsLoading(false);
    }
  };

  const actualizarCelda = (
    actividadId: string,
    dia: DiaSemana,
    campo: 'hProg' | 'cantPro' | 'horaInicio' | 'horaFin',
    valor: string
  ) => {
    setActividades((prev) =>
      prev.map((a) => {
        if (a.actividadId !== actividadId) return a;
        const diaActualizado = { ...a[dia], [campo]: valor };
        // H.Prog se recalcula automáticamente si se editó Hora Inicio u
        // Hora Fin (para no dejarlo desactualizado). Pero también se puede
        // escribir directamente a mano (por ejemplo, cuando no hay un
        // horario fijo pero sí se sabe cuántas horas programadas tiene la
        // actividad ese día) -- en ese caso, editar hProg no toca Hora
        // Inicio/Fin.
        if (campo === 'horaInicio' || campo === 'horaFin') {
          diaActualizado.hProg = calcularHorasDecimal(diaActualizado.horaInicio, diaActualizado.horaFin);
        }
        return { ...a, [dia]: diaActualizado };
      })
    );
    setHayCambios(true);
  };

  // El responsable ahora se asigna por día: cada actividad puede tener una
  // persona distinta el lunes, otra el martes, etc.
  const actualizarResponsableDia = (actividadId: string, dia: DiaSemana, responsableId: string) => {
    setActividades((prev) =>
      prev.map((a) =>
        a.actividadId === actividadId
          ? { ...a, [dia]: { ...a[dia], responsableId } }
          : a
      )
    );
    setHayCambios(true);
  };

  const actualizarResponsableDiaProyectoOtro = (proyectoId: string, dia: DiaSemana, responsableId: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        proyectosOtros: prev.proyectosOtros.map((p) =>
          p.id === proyectoId ? { ...p, [dia]: { ...p[dia], responsableId } } : p
        ),
      };
    });
    setHayCambios(true);
  };

  const actualizarCampoProyectoOtro = (
    proyectoId: string,
    dia: DiaSemana,
    campo: 'hProg' | 'cantPro' | 'horaInicio' | 'horaFin',
    valor: string
  ) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        proyectosOtros: prev.proyectosOtros.map((p) => {
          if (p.id !== proyectoId) return p;
          const diaActualizado = { ...p[dia], [campo]: valor };
          if (campo === 'horaInicio' || campo === 'horaFin') {
            diaActualizado.hProg = calcularHorasDecimal(diaActualizado.horaInicio, diaActualizado.horaFin);
          }
          return { ...p, [dia]: diaActualizado };
        }),
      };
    });
    setHayCambios(true);
  };

  const actualizarDescripcionProyectoOtro = (proyectoId: string, descripcion: string) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            proyectosOtros: prev.proyectosOtros.map((p) => (p.id === proyectoId ? { ...p, descripcion } : p)),
          }
        : prev
    );
    setHayCambios(true);
  };

  const diaVacio = () => ({ hProg: '', cantPro: '', horaInicio: '', horaFin: '', responsableId: '' });

  const agregarFilaProyectoOtro = () => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            proyectosOtros: [
              ...prev.proyectosOtros,
              {
                id: `temp-${Math.random().toString(36).slice(2)}`,
                descripcion: '',
                lunes: diaVacio(),
                martes: diaVacio(),
                miercoles: diaVacio(),
                jueves: diaVacio(),
                viernes: diaVacio(),
                sabado: diaVacio(),
              },
            ],
          }
        : prev
    );
    setHayCambios(true);
  };

  const eliminarFilaProyectoOtro = (proyectoId: string) => {
    setConfig((prev) =>
      prev ? { ...prev, proyectosOtros: prev.proyectosOtros.filter((p) => p.id !== proyectoId) } : prev
    );
    setHayCambios(true);
  };

  // Guarda únicamente en config_ctrl_produccion. Este módulo ya NO escribe
  // en Matriz de Procesos bajo ninguna circunstancia -- Matriz de Procesos
  // es la fuente maestra de actividades (qué existe), mientras que este
  // módulo solo coordina la planificación semanal (horas, cantidades y
  // quién es responsable cada día).
  const handleGuardar = async () => {
    try {
      setGuardando(true);
      await produccionService.updateConfiguracion({
        semanaInicio,
        actividades,
        proyectosOtros: config?.proyectosOtros || [],
      });
      showMessage('success', 'Configuración guardada correctamente');
      setHayCambios(false);
      await cargarTodo();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  // Rellena SOLO los días que dicen "Sin asignar" (responsableId vacío),
  // usando el trabajadorId sugerido por Matriz de Procesos para esa
  // actividad. Nunca toca un día que ya tenga alguien asignado -- eso
  // quedaría exactamente como estaba, aunque sea distinto al de la Matriz.
  // No escribe nada en Matriz de Procesos, solo lee de ahí.
  const handleRellenarVacios = async () => {
    try {
      setRellenando(true);
      let celdasRellenadas = 0;

      const actividadesActualizadas = actividades.map((act) => {
        const sugeridoId = trabajadorIdPorActividad.get(act.actividadId);
        if (!sugeridoId) return act;

        const rellenarDia = (dia: { hProg: string; cantPro: string; responsableId?: string }) => {
          if (dia.responsableId) return dia; // ya tiene alguien, no se toca
          celdasRellenadas += 1;
          return { ...dia, responsableId: sugeridoId };
        };

        return {
          ...act,
          lunes: rellenarDia(act.lunes),
          martes: rellenarDia(act.martes),
          miercoles: rellenarDia(act.miercoles),
          jueves: rellenarDia(act.jueves),
          viernes: rellenarDia(act.viernes),
          sabado: rellenarDia(act.sabado),
        };
      });

      setActividades(actividadesActualizadas);
      if (celdasRellenadas > 0) {
        setHayCambios(true);
        showMessage('success', `Se rellenaron ${celdasRellenadas} celda(s) vacía(s) desde Matriz de Procesos. Presiona "Guardar" para confirmar.`);
      } else {
        showMessage('success', 'No había celdas vacías con un responsable sugerido disponible en la Matriz.');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al rellenar los responsables');
    } finally {
      setRellenando(false);
    }
  };

  // Filtra por Proceso, Subproceso, Actividad, o el nombre del Responsable
  // asignado en cualquier día de la semana (sin distinguir mayúsculas).
  const actividadesFiltradas = busqueda.trim()
    ? actividades.filter((act) => {
        const termino = busqueda.trim().toLowerCase();
        const coincideDatosBasicos =
          act.procesoNombre.toLowerCase().includes(termino) ||
          act.subprocesoNombre.toLowerCase().includes(termino) ||
          act.actividadNombre.toLowerCase().includes(termino);
        if (coincideDatosBasicos) return true;

        return DIAS.some((d) => {
          const responsableId = act[d.key]?.responsableId;
          if (!responsableId) return false;
          const nombre = trabajadores.find((t) => String(t._id) === responsableId)?.nombres || '';
          return nombre.toLowerCase().includes(termino);
        });
      })
    : actividades;

  // Cambia de semana. delta=0 vuelve a la semana actual; delta=-1/1 mueve
  // una semana atrás/adelante. Si hay cambios sin guardar, confirma antes
  // de perder lo editado (cambiar de semana recarga los datos).
  const cambiarSemana = (delta: number) => {
    if (hayCambios) {
      const continuar = window.confirm('Tienes cambios sin guardar en esta semana. Si cambias de semana, se van a perder. ¿Continuar de todas formas?');
      if (!continuar) return;
    }
    if (delta === 0) {
      setSemanaInicio(calcularLunesDeSemana(new Date().toISOString().split('T')[0]));
    } else {
      setSemanaInicio((actual) => sumarSemanas(actual, delta));
    }
    setHayCambios(false);
  };

  const finDeSemana = (lunes: string): string => {
    const d = new Date(`${lunes}T00:00:00`);
    d.setDate(d.getDate() + 5); // Lunes + 5 días = Sábado
    return d.toISOString().split('T')[0];
  };

  const formatoFechaCorta = (fecha: string): string => {
    const [, mes, dia] = fecha.split('-');
    return `${dia}/${mes}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administración Control de Producción</h1>
          <p className="text-muted-foreground mt-1">
            Metas semanales de producción por actividad (cantidad y horas programadas)
          </p>
        </div>
        {!puedeEditar && (
          <span className="text-xs text-muted-foreground italic">Modo solo lectura</span>
        )}
        {puedeEditar && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarResponsables((v) => !v)}
            >
              {mostrarResponsables ? 'Ocultar responsables' : 'Editar responsables'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRellenarVacios}
              disabled={rellenando || guardando}
              title="Rellena solo las celdas 'Sin asignar' usando el responsable definido en Matriz de Procesos. Nunca toca los días que ya tienen alguien asignado."
            >
              {rellenando ? 'Rellenando...' : 'Rellenar vacíos desde Matriz'}
            </Button>
            <Button onClick={handleGuardar} disabled={!hayCambios || guardando}>
              <Save className="w-4 h-4 mr-2" />
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 bg-card">
          <button
            type="button"
            onClick={() => cambiarSemana(-1)}
            className="px-2 py-1 rounded hover:bg-muted text-sm"
            title="Semana anterior"
          >
            ←
          </button>
          <span className="text-sm font-medium whitespace-nowrap px-2">
            Semana del {formatoFechaCorta(semanaInicio)} al {formatoFechaCorta(finDeSemana(semanaInicio))}
          </span>
          <button
            type="button"
            onClick={() => cambiarSemana(1)}
            className="px-2 py-1 rounded hover:bg-muted text-sm"
            title="Semana siguiente"
          >
            →
          </button>
        </div>
        {semanaInicio !== calcularLunesDeSemana(new Date().toISOString().split('T')[0]) && (
          <Button variant="outline" size="sm" onClick={() => cambiarSemana(0)}>
            Volver a esta semana
          </Button>
        )}
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por proceso, subproceso, actividad o responsable..."
        className="w-full max-w-md text-sm border border-input rounded-md px-3 py-2 bg-background"
      />

      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={`${celdaHeaderEstilo} text-primary text-left`} rowSpan={2}>Proceso</th>
              <th className={`${celdaHeaderEstilo} text-primary text-left`} rowSpan={2}>Subproceso</th>
              <th className={`${celdaHeaderEstilo} text-primary text-left`} rowSpan={2}>Actividades</th>
              {DIAS.map((d) => (
                <th
                  key={d.key}
                  className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}
                  colSpan={mostrarResponsables ? 5 : 4}
                >
                  {d.label}
                </th>
              ))}
            </tr>
            <tr>
              {DIAS.map((d) => (
                <React.Fragment key={d.key}>
                  <th className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}>Hora Inicio</th>
                  <th className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}>Hora Fin</th>
                  <th className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}>H.Prog</th>
                  <th className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}>Cant.Pro</th>
                  {mostrarResponsables && <th className={`${celdaHeaderEstilo} ${d.headerBg} ${d.text} text-center`}>Resp.</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3 + DIAS.length * (mostrarResponsables ? 5 : 4)} className={`${celdaEstilo} text-center text-muted-foreground py-6`}>
                  Cargando configuración...
                </td>
              </tr>
            ) : actividadesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={3 + DIAS.length * (mostrarResponsables ? 5 : 4)} className={`${celdaEstilo} text-center text-muted-foreground py-6`}>
                  {busqueda.trim()
                    ? `No se encontraron actividades para "${busqueda}".`
                    : 'No hay actividades en la Matriz de Procesos todavía'}
                </td>
              </tr>
            ) : (
              actividadesFiltradas.map((act) => (
                <tr key={act.actividadId}>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{act.procesoNombre}</td>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{act.subprocesoNombre}</td>
                  <td className={`${celdaEstilo} font-medium`}>{act.actividadNombre}</td>
                  {DIAS.map((d) => (
                    <React.Fragment key={d.key}>
                      <td className={`${celdaEstilo} ${d.cellBg}`}>
                        <input
                          type="time"
                          value={act[d.key]?.horaInicio || ''}
                          onChange={(e) => actualizarCelda(act.actividadId, d.key, 'horaInicio', e.target.value)}
                          disabled={!puedeEditar}
                          className="w-full text-xs border border-input rounded px-1 py-1 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className={`${celdaEstilo} ${d.cellBg}`}>
                        <input
                          type="time"
                          value={act[d.key]?.horaFin || ''}
                          onChange={(e) => actualizarCelda(act.actividadId, d.key, 'horaFin', e.target.value)}
                          disabled={!puedeEditar}
                          className="w-full text-xs border border-input rounded px-1 py-1 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className={`${celdaEstilo} ${d.cellBg}`}>
                        <CampoNumero
                          valor={act[d.key]?.hProg || ''}
                          onChange={(v) => actualizarCelda(act.actividadId, d.key, 'hProg', v)}
                          placeholder="—"
                          disabled={!puedeEditar}
                        />
                      </td>
                      <td className={`${celdaEstilo} ${d.cellBg}`}>
                        <CampoNumero
                          valor={act[d.key]?.cantPro || ''}
                          onChange={(v) => actualizarCelda(act.actividadId, d.key, 'cantPro', v)}
                          placeholder="—"
                        disabled={!puedeEditar}
                        />
                      </td>
                      {mostrarResponsables && (
                        <td className={`${celdaEstilo} ${d.cellBg}`}>
                          <SelectorResponsable
                            valor={act[d.key]?.responsableId || ''}
                            onChange={(v) => actualizarResponsableDia(act.actividadId, d.key, v)}
                            trabajadores={trabajadores}
                            disabled={!puedeEditar}
                          />
                        </td>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              ))
            )}
            {config && (
              <>
                <tr className="bg-muted/50">
                  <td colSpan={3} className={`${celdaEstilo} font-semibold uppercase`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>Proyectos / Otros</span>
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={agregarFilaProyectoOtro}
                          className="text-xs font-normal normal-case text-primary hover:underline whitespace-nowrap"
                        >
                          + Agregar actividad
                        </button>
                      )}
                    </div>
                  </td>
                  <td colSpan={DIAS.length * (mostrarResponsables ? 5 : 4)} className={`${celdaEstilo} bg-muted/50`} />
                </tr>
                {config.proyectosOtros.length === 0 && (
                  <tr>
                    <td
                      colSpan={3 + DIAS.length * (mostrarResponsables ? 5 : 4)}
                      className={`${celdaEstilo} text-center text-muted-foreground py-3`}
                    >
                      No hay actividades fuera de la Matriz esta semana.
                    </td>
                  </tr>
                )}
                {config.proyectosOtros.map((proyecto) => (
                  <tr key={proyecto.id} className="bg-muted/30">
                    {/* Antes la descripción vivía en una sola celda angosta
                        (la columna "Actividades"), quedando muy pegada al
                        borde donde empieza el scroll horizontal de los
                        días. Ahora ocupa las 3 columnas de identificación
                        (Proceso + Subproceso + Actividades), con bastante
                        más espacio para escribir y leer. */}
                    <td colSpan={3} className={celdaEstilo}>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={proyecto.descripcion}
                          onChange={(e) => actualizarDescripcionProyectoOtro(proyecto.id, e.target.value)}
                          placeholder="Describe la actividad fuera de la Matriz..."
                          disabled={!puedeEditar}
                          className="flex-1 min-w-[220px] text-xs border border-input rounded px-2 py-1.5 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => eliminarFilaProyectoOtro(proyecto.id)}
                            title="Eliminar esta actividad"
                            className="text-destructive hover:opacity-70 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    {DIAS.map((d) => (
                      <React.Fragment key={d.key}>
                        <td className={`${celdaEstilo} ${d.cellBg}`}>
                          <input
                            type="time"
                            value={proyecto[d.key]?.horaInicio || ''}
                            onChange={(e) => actualizarCampoProyectoOtro(proyecto.id, d.key, 'horaInicio', e.target.value)}
                            disabled={!puedeEditar}
                            className="w-full text-xs border border-input rounded px-1 py-1 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className={`${celdaEstilo} ${d.cellBg}`}>
                          <input
                            type="time"
                            value={proyecto[d.key]?.horaFin || ''}
                            onChange={(e) => actualizarCampoProyectoOtro(proyecto.id, d.key, 'horaFin', e.target.value)}
                            disabled={!puedeEditar}
                            className="w-full text-xs border border-input rounded px-1 py-1 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className={`${celdaEstilo} ${d.cellBg}`}>
                          <CampoNumero
                            valor={proyecto[d.key]?.hProg || ''}
                            onChange={(v) => actualizarCampoProyectoOtro(proyecto.id, d.key, 'hProg', v)}
                            placeholder="—"
                            disabled={!puedeEditar}
                          />
                        </td>
                        <td className={`${celdaEstilo} ${d.cellBg}`}>
                          <CampoNumero
                            valor={proyecto[d.key]?.cantPro || ''}
                            onChange={(v) => actualizarCampoProyectoOtro(proyecto.id, d.key, 'cantPro', v)}
                            placeholder="—"
                            disabled={!puedeEditar}
                          />
                        </td>
                        {mostrarResponsables && (
                          <td className={`${celdaEstilo} ${d.cellBg}`}>
                            <SelectorResponsable
                              valor={proyecto[d.key]?.responsableId || ''}
                              onChange={(v) => actualizarResponsableDiaProyectoOtro(proyecto.id, d.key, v)}
                              trabajadores={trabajadores}
                              disabled={!puedeEditar}
                            />
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {hayCambios && <span className="text-amber-600 font-medium">Tienes cambios sin guardar.</span>}
      </p>
    </div>
  );
};

export default AdminControlProduccion;
