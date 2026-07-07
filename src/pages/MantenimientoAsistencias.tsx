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

const horarioVacio = (): HorarioTrabajador['horarios'] => ({
  lunes: { entrada: '08:00', salida: '18:00' },
  martes: { entrada: '08:00', salida: '18:00' },
  miercoles: { entrada: '08:00', salida: '18:00' },
  jueves: { entrada: '08:00', salida: '18:00' },
  viernes: { entrada: '08:00', salida: '18:00' },
  sabado: { entrada: '08:00', salida: '18:00' },
});

const MantenimientoAsistencias: React.FC = () => {
  const { showMessage } = useMessage();

  const [trabajadores, setTrabajadores] = useState<TrabajadorAsistencia[]>([]);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState<string>('');
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(true);
  const [isLoadingHorario, setIsLoadingHorario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [toleranciaMinutos, setToleranciaMinutos] = useState('10');
  const [toleranciaMensualMax, setToleranciaMensualMax] = useState('90');
  const [horarios, setHorarios] = useState<HorarioTrabajador['horarios']>(horarioVacio());

  useEffect(() => {
    cargarTrabajadores();
  }, []);

  useEffect(() => {
    if (trabajadorSeleccionadoId) {
      cargarHorario(trabajadorSeleccionadoId);
    }
  }, [trabajadorSeleccionadoId]);

  const cargarTrabajadores = async () => {
    try {
      setIsLoadingTrabajadores(true);
      const data = await asistenciaService.getTrabajadores();
      setTrabajadores(data);
      if (data.length > 0) {
        setTrabajadorSeleccionadoId(String(data[0]._id));
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
        setToleranciaMensualMax(String(horario.toleranciaMensualMax ?? 90));
        setHorarios({ ...horarioVacio(), ...horario.horarios });
      } else {
        // Trabajador sin horario configurado todavía: valores por defecto
        setToleranciaMinutos('10');
        setToleranciaMensualMax('90');
        setHorarios(horarioVacio());
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar el horario del colaborador');
    } finally {
      setIsLoadingHorario(false);
    }
  };

  const actualizarHorarioDia = (dia: DiaSemanaHorario, campo: 'entrada' | 'salida', valor: string) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev?.[dia], [campo]: valor },
    }));
  };

  const handleGuardar = async () => {
    if (!trabajadorSeleccionadoId) return;
    try {
      setGuardando(true);
      await asistenciaService.guardarHorario({
        trabajadorId: trabajadorSeleccionadoId,
        horarios,
        toleranciaMinutos: Number(toleranciaMinutos) || 0,
        toleranciaMensualMax: Number(toleranciaMensualMax) || 0,
      });
      showMessage('success', 'Horario guardado correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar el horario');
    } finally {
      setGuardando(false);
    }
  };

  const trabajadorSeleccionado = trabajadores.find(
    (t) => String(t._id) === trabajadorSeleccionadoId
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
                <SelectItem key={t._id} value={String(t._id)}>
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

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left font-semibold px-4 py-2">Día</th>
                      <th className="text-left font-semibold px-4 py-2">Hora Ingreso</th>
                      <th className="text-left font-semibold px-4 py-2">Hora Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIAS_HORARIO.map((d) => (
                      <tr key={d.key} className="border-t">
                        <td className="px-4 py-2 font-medium">{d.label}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            className="w-36"
                            value={horarios?.[d.key]?.entrada || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'entrada', e.target.value)}
                            disabled={isLoadingHorario}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            className="w-36"
                            value={horarios?.[d.key]?.salida || ''}
                            onChange={(e) => actualizarHorarioDia(d.key, 'salida', e.target.value)}
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
