import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  produccionService,
  aplanarMatrizProcesos,
  type ConfigCtrlProduccion,
  type ActividadProduccion,
  type DiaSemana,
  type Trabajador,
} from '@/services/produccionService';

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
];

const celdaEstilo = 'border border-border px-1 py-1 text-xs';
const celdaHeaderEstilo = 'border border-border px-2 py-1.5 text-xs font-semibold text-primary uppercase whitespace-nowrap';

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
}> = ({ valor, onChange, trabajadores, disabled }) => (
  <select
    value={valor}
    onChange={(e) => onChange(e.target.value)}
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

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      setIsLoading(true);
      const [cfg, macroprocesos, trabs] = await Promise.all([
        produccionService.getConfiguracion(),
        produccionService.getMatrizProcesos(),
        produccionService.getTrabajadores(),
      ]);
      setConfig(cfg);
      setTrabajadores(trabs);

      // La Matriz de Procesos es la lista MAESTRA de actividades -- nunca
      // se pierde ni se edita desde aquí. config_ctrl_produccion solo aporta
      // horario/responsable si existen; si a una actividad le falta esa
      // info, se completa vacía (o con el responsable sugerido por la
      // matriz) en vez de desaparecer.
      const maestras = aplanarMatrizProcesos(macroprocesos);
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
          const conResponsablePorDia = (dia?: { hProg: string; cantPro: string; responsableId?: string }) => ({
            hProg: dia?.hProg || '',
            cantPro: dia?.cantPro || '',
            responsableId: dia?.responsableId ?? legado ?? '',
          });

          return {
            ...existente,
            lunes: conResponsablePorDia(existente.lunes),
            martes: conResponsablePorDia(existente.martes),
            miercoles: conResponsablePorDia(existente.miercoles),
            jueves: conResponsablePorDia(existente.jueves),
            viernes: conResponsablePorDia(existente.viernes),
            sabado: conResponsablePorDia(existente.sabado),
          };
        }

        // Sin datos guardados: intenta sugerir el responsable por nombre,
        // cruzando el "puesto" de la matriz con la lista de trabajadores.
        const sugerido = trabs.find(
          (t) => m.puestoNombre && t.nombres.toUpperCase().includes(m.puestoNombre.toUpperCase().split(' ')[0])
        );
        const sugeridoId = sugerido ? String(sugerido._id) : '';
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
    campo: 'hProg' | 'cantPro',
    valor: string
  ) => {
    setActividades((prev) =>
      prev.map((a) =>
        a.actividadId === actividadId
          ? { ...a, [dia]: { ...a[dia], [campo]: valor } }
          : a
      )
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

  const actualizarResponsableDiaProyectoOtro = (dia: DiaSemana, responsableId: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const actualizado = {
        ...prev,
        proyectoOtro: {
          ...prev.proyectoOtro,
          [dia]: { ...prev.proyectoOtro?.[dia], responsableId },
        },
      };
      return actualizado;
    });
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
        actividades,
        proyectoOtro: config?.proyectoOtro,
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
            <Button onClick={handleGuardar} disabled={!hayCambios || guardando}>
              <Save className="w-4 h-4 mr-2" />
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className={`${celdaHeaderEstilo} text-left`} rowSpan={2}>Proceso</th>
              <th className={`${celdaHeaderEstilo} text-left`} rowSpan={2}>Subproceso</th>
              <th className={`${celdaHeaderEstilo} text-left`} rowSpan={2}>Actividades</th>
              {DIAS.map((d) => (
                <th key={d.key} className={`${celdaHeaderEstilo} text-center`} colSpan={3}>{d.label}</th>
              ))}
            </tr>
            <tr>
              {DIAS.map((d) => (
                <React.Fragment key={d.key}>
                  <th className={`${celdaHeaderEstilo} text-center`}>H.Prog</th>
                  <th className={`${celdaHeaderEstilo} text-center`}>Cant.Pro</th>
                  <th className={`${celdaHeaderEstilo} text-center`}>Resp.</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={21} className={`${celdaEstilo} text-center text-muted-foreground py-6`}>
                  Cargando configuración...
                </td>
              </tr>
            ) : actividades.length === 0 ? (
              <tr>
                <td colSpan={21} className={`${celdaEstilo} text-center text-muted-foreground py-6`}>
                  No hay actividades en la Matriz de Procesos todavía
                </td>
              </tr>
            ) : (
              actividades.map((act) => (
                <tr key={act.actividadId}>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{act.procesoNombre}</td>
                  <td className={`${celdaEstilo} text-muted-foreground`}>{act.subprocesoNombre}</td>
                  <td className={`${celdaEstilo} font-medium`}>{act.actividadNombre}</td>
                  {DIAS.map((d) => (
                    <React.Fragment key={d.key}>
                      <td className={celdaEstilo}>
                        <CampoNumero
                          valor={act[d.key]?.hProg || ''}
                          onChange={(v) => actualizarCelda(act.actividadId, d.key, 'hProg', v)}
                          placeholder="—"
                        disabled={!puedeEditar}
                        />
                      </td>
                      <td className={celdaEstilo}>
                        <CampoNumero
                          valor={act[d.key]?.cantPro || ''}
                          onChange={(v) => actualizarCelda(act.actividadId, d.key, 'cantPro', v)}
                          placeholder="—"
                        disabled={!puedeEditar}
                        />
                      </td>
                      <td className={celdaEstilo}>
                        <SelectorResponsable
                          valor={act[d.key]?.responsableId || ''}
                          onChange={(v) => actualizarResponsableDia(act.actividadId, d.key, v)}
                          trabajadores={trabajadores}
                          disabled={!puedeEditar}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))
            )}
            {config && (
              <tr className="bg-muted/30">
                <td colSpan={2} className={`${celdaEstilo} font-semibold uppercase`}>Proyectos / Otros</td>
                <td className={celdaEstilo}>
                  <input
                    type="text"
                    value={config.proyectoOtro?.descripcion || ''}
                    onChange={(e) =>
                      setConfig((prev) =>
                        prev ? { ...prev, proyectoOtro: { ...prev.proyectoOtro, descripcion: e.target.value } } : prev
                      )
                    }
                    onBlur={() => setHayCambios(true)}
                    placeholder="Descripción..."
                    disabled={!puedeEditar}
                    className="w-full text-xs border border-input rounded px-2 py-1 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </td>
                {DIAS.map((d) => (
                  <React.Fragment key={d.key}>
                    <td className={celdaEstilo}>
                      <CampoNumero
                        valor={config.proyectoOtro?.[d.key]?.hProg || ''}
                        onChange={(v) =>
                          setConfig((prev) => {
                            if (!prev) return prev;
                            const actualizado = {
                              ...prev,
                              proyectoOtro: {
                                ...prev.proyectoOtro,
                                [d.key]: { ...prev.proyectoOtro?.[d.key], hProg: v },
                              },
                            };
                            setHayCambios(true);
                            return actualizado;
                          })
                        }
                        placeholder="—"
                      disabled={!puedeEditar}
                      />
                    </td>
                    <td className={celdaEstilo}>
                      <CampoNumero
                        valor={config.proyectoOtro?.[d.key]?.cantPro || ''}
                        onChange={(v) =>
                          setConfig((prev) => {
                            if (!prev) return prev;
                            const actualizado = {
                              ...prev,
                              proyectoOtro: {
                                ...prev.proyectoOtro,
                                [d.key]: { ...prev.proyectoOtro?.[d.key], cantPro: v },
                              },
                            };
                            setHayCambios(true);
                            return actualizado;
                          })
                        }
                        placeholder="—"
                      disabled={!puedeEditar}
                      />
                    </td>
                    <td className={celdaEstilo}>
                      <SelectorResponsable
                        valor={config.proyectoOtro?.[d.key]?.responsableId || ''}
                        onChange={(v) => actualizarResponsableDiaProyectoOtro(d.key, v)}
                        trabajadores={trabajadores}
                        disabled={!puedeEditar}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
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
