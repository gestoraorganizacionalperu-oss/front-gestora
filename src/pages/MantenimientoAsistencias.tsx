import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessage } from '@/contexts/MessageContext';
import {
  asistenciaService,
  DIAS_HORARIO,
  type TrabajadorAsistencia,
  type HorarioTrabajador,
  type DiaSemanaHorario,
} from '@/services/asistenciaService';
import { puestosService, type Puesto } from '@/services/puestosService';

const turnoDefecto = (entrada: string, salida: string) => ({ entrada, salida });

const diaPorDefecto = () => ({
  manana: turnoDefecto('08:00', '13:00'),
  tarde: turnoDefecto('14:00', '17:30'),
});

const horarioVacio = (): HorarioTrabajador['horarios'] => ({
  lunes: diaPorDefecto(),
  martes: diaPorDefecto(),
  miercoles: diaPorDefecto(),
  jueves: diaPorDefecto(),
  viernes: diaPorDefecto(),
  sabado: diaPorDefecto(),
});

// Migración suave: documentos guardados antes de este cambio tenían un solo
// turno por día ({entrada, salida}), no separado en mañana/tarde. Si viene
// en ese formato legado, lo acomodamos como mejor esfuerzo (entrada legada
// -> entrada de la mañana, salida legada -> salida de la tarde) en vez de
// perder el dato guardado.
const normalizarDia = (dia: any) => {
  if (dia?.manana || dia?.tarde) {
    return {
      manana: { entrada: dia.manana?.entrada || '', salida: dia.manana?.salida || '' },
      tarde: { entrada: dia.tarde?.entrada || '', salida: dia.tarde?.salida || '' },
    };
  }
  if (dia?.entrada || dia?.salida) {
    return {
      manana: { entrada: dia.entrada || '', salida: '' },
      tarde: { entrada: '', salida: dia.salida || '' },
    };
  }
  return diaPorDefecto();
};

const MantenimientoAsistencias: React.FC = () => {
  const { showMessage } = useMessage();

  const [trabajadores, setTrabajadores] = useState<TrabajadorAsistencia[]>([]);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState<string>('');
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(true);
  const [isLoadingHorario, setIsLoadingHorario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [isLoadingPuestos, setIsLoadingPuestos] = useState(true);
  const [puestoSeleccionadoId, setPuestoSeleccionadoId] = useState<string>('');

  const [toleranciaMinutos, setToleranciaMinutos] = useState('10');
  const [toleranciaMensualMax, setToleranciaMensualMax] = useState('120');
  const [horarios, setHorarios] = useState<HorarioTrabajador['horarios']>(horarioVacio());

  useEffect(() => {
    cargarTrabajadores();
    cargarPuestos();
  }, []);

  useEffect(() => {
    if (trabajadorSeleccionadoId) {
      cargarHorario(trabajadorSeleccionadoId);
      const trabajador = trabajadores.find((t) => t.nro_doc === trabajadorSeleccionadoId);
      setPuestoSeleccionadoId(trabajador?.puesto || '');
    }
  }, [trabajadorSeleccionadoId]);

  const cargarPuestos = async () => {
    try {
      setIsLoadingPuestos(true);
      const data = await puestosService.getAllPuestos();
      setPuestos(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los puestos');
    } finally {
      setIsLoadingPuestos(false);
    }
  };

  const cargarTrabajadores = async () => {
    try {
      setIsLoadingTrabajadores(true);
      const data = await asistenciaService.getTrabajadores();
      setTrabajadores(data);
      if (data.length > 0) {
        setTrabajadorSeleccionadoId(data[0].nro_doc);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los colaboradores');
    } finally {
      setIsLoadingTrabajadores(false);
    }
  };

  const cargarHorario = async (trabajadorId: string) => {
    try {
      setIsLoadingHorario(true);
      const horario = await asistenciaService.getHorarioPorTrabajador(trabajadorId);
      if (horario) {
        setToleranciaMinutos(String(horario.toleranciaMinutos ?? 10));
        setToleranciaMensualMax(String(horario.toleranciaMensualMax ?? 120));
        const normalizado: HorarioTrabajador['horarios'] = {};
        DIAS_HORARIO.forEach((d) => {
          normalizado[d.key] = normalizarDia(horario.horarios?.[d.key]);
        });
        setHorarios(normalizado);
      } else {
        // Trabajador sin horario configurado todavía: valores por defecto
        setToleranciaMinutos('10');
        setToleranciaMensualMax('120');
        setHorarios(horarioVacio());
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar el horario del colaborador');
    } finally {
      setIsLoadingHorario(false);
    }
  };

  const actualizarHorarioDia = (
    dia: DiaSemanaHorario,
    turno: 'manana' | 'tarde',
    campo: 'entrada' | 'salida',
    valor: string
  ) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: {
        ...prev?.[dia],
        [turno]: { ...prev?.[dia]?.[turno], [campo]: valor },
      },
    }));
  };

  const handleGuardar = async () => {
    if (!trabajadorSeleccionadoId || !trabajadorSeleccionado) return;
    try {
      setGuardando(true);
      await Promise.all([
        asistenciaService.guardarHorario({
          trabajadorId: trabajadorSeleccionadoId,
          horarios,
          toleranciaMinutos: Number(toleranciaMinutos) || 0,
          toleranciaMensualMax: Number(toleranciaMensualMax) || 0,
        }),
        asistenciaService.actualizarPuestoTrabajador(trabajadorSeleccionado._id, puestoSeleccionadoId || null),
      ]);
      setTrabajadores((prev) =>
        prev.map((t) => (t._id === trabajadorSeleccionado._id ? { ...t, puesto: puestoSeleccionadoId || null } : t))
      );
      showMessage('success', 'Cambios guardados correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const trabajadorSeleccionado = trabajadores.find(
    (t) => t.nro_doc === trabajadorSeleccionadoId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mantenimiento de Asistencias</h1>
        <p className="text-muted-foreground mt-1">
          Configura los horarios por trabajador y día para el control de asistencia
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Panel izquierdo: selector de colaborador */}
        <div className="space-y-2">
          <Label>Colaboradores</Label>
          <Select
            value={trabajadorSeleccionadoId}
            onValueChange={setTrabajadorSeleccionadoId}
            disabled={isLoadingTrabajadores || trabajadores.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingTrabajadores ? 'Cargando...' : 'Selecciona un colaborador'} />
            </SelectTrigger>
            <SelectContent>
              {trabajadores.map((t) => (
                <SelectItem key={t._id} value={t.nro_doc}>
                  {t.nombres} — {t.nro_doc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Panel derecho: configuración de horarios */}
        <div className="border rounded-lg bg-card p-6 space-y-6">
          {!trabajadorSeleccionado ? (
            <p className="text-sm text-muted-foreground">Selecciona un colaborador para configurar su horario.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Configuración de Horarios</h2>
                <p className="text-sm text-muted-foreground">
                  {trabajadorSeleccionado.nombres} (DNI: {trabajadorSeleccionado.nro_doc})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Tolerancia (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={toleranciaMinutos}
                    onChange={(e) => setToleranciaMinutos(e.target.value)}
                    disabled={isLoadingHorario}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tolerancia mensual máxima</Label>
                  <Input
                    type="number"
                    min={0}
                    value={toleranciaMensualMax}
                    onChange={(e) => setToleranciaMensualMax(e.target.value)}
                    disabled={isLoadingHorario}
                  />
                </div>
              </div>

              <div className="max-w-md space-y-2">
                <Label>Puesto asignado</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Este Puesto es el mismo que se usa en Matriz de Procesos — permite sugerir
                  automáticamente al responsable correcto en Adm. Control de Producción.
                </p>
                <Select
                  value={puestoSeleccionadoId || 'sin_asignar'}
                  onValueChange={(v) => setPuestoSeleccionadoId(v === 'sin_asignar' ? '' : v)}
                  disabled={isLoadingPuestos}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPuestos ? 'Cargando...' : 'Selecciona un puesto'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {puestos.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left font-semibold px-4 py-2" rowSpan={2}>Día</th>
                      <th className="text-center font-semibold px-4 py-2 border-l" colSpan={2}>Turno Mañana</th>
                      <th className="text-center font-semibold px-4 py-2 border-l" colSpan={2}>Turno Tarde</th>
                    </tr>
                    <tr className="bg-muted/50">
                      <th className="text-left font-normal px-4 py-1 border-l text-xs text-muted-foreground">Entrada</th>
                      <th className="text-left font-normal px-4 py-1 text-xs text-muted-foreground">Salida</th>
                      <th className="text-left font-normal px-4 py-1 border-l text-xs text-muted-foreground">Entrada</th>
                      <th className="text-left font-normal px-4 py-1 text-xs text-muted-foreground">Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIAS_HORARIO.map((d) => (
                      <tr key={d.key} className="border-t">
                        <td className="px-4 py-2 font-medium">{d.label}</td>
                        <td className="px-4 py-2 border-l">
                          <Input
                            type="time"
                            className="w-32"
                            value={horarios?.[d.key]?.manana?.entrada || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'manana', 'entrada', e.target.value)}
                            disabled={isLoadingHorario}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            className="w-32"
                            value={horarios?.[d.key]?.manana?.salida || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'manana', 'salida', e.target.value)}
                            disabled={isLoadingHorario}
                          />
                        </td>
                        <td className="px-4 py-2 border-l">
                          <Input
                            type="time"
                            className="w-32"
                            value={horarios?.[d.key]?.tarde?.entrada || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'tarde', 'entrada', e.target.value)}
                            disabled={isLoadingHorario}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            className="w-32"
                            value={horarios?.[d.key]?.tarde?.salida || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'tarde', 'salida', e.target.value)}
                            disabled={isLoadingHorario}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleGuardar} disabled={guardando || isLoadingHorario}>
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MantenimientoAsistencias;
