import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { matrizProcesosService, type Cargo, type PuestoCargo } from '@/services/matrizProcesosService';
import { asistenciaService, type TrabajadorAsistencia } from '@/services/asistenciaService';
import { puestosService } from '@/services/puestosService';
import { useMessage } from '@/contexts/MessageContext';

interface PuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (puestoId: string, puestoNombre: string, trabajadorId: string | null) => void;
  initialPuestoId?: string | null;
  initialTrabajadorId?: string | number | null;
  isEdit?: boolean;
}

const PuestoFormDialog: React.FC<PuestoFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialPuestoId,
  initialTrabajadorId,
  isEdit = false,
}) => {
  const { showMessage } = useMessage();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [puestos, setPuestos] = useState<PuestoCargo[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');
  const [selectedPuestoId, setSelectedPuestoId] = useState<string>('');
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [isLoadingPuestos, setIsLoadingPuestos] = useState(false);

  // Atajo: elegir directamente a la persona (Trabajador) en vez de navegar
  // Cargo -> Puesto manualmente. Al elegir, se autocompletan Cargo y Puesto
  // usando el vínculo configurado en Mantenimiento de Asistencias.
  const [trabajadores, setTrabajadores] = useState<TrabajadorAsistencia[]>([]);
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState<string>('');
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);

  // Inicialización: UNA sola función explícita por cada apertura del
  // diálogo, sin efectos reactivos encadenados (el diseño anterior tenía
  // un useEffect que reaccionaba a cambios de selectedCargoId, más una
  // bandera "omitir una vez" para no pisar la selección inicial -- frágil
  // por diseño, y además `isInitialized` quedaba con un valor viejo
  // (stale closure) cuando el diálogo se reutilizaba para editar una
  // segunda actividad sin desmontarse, saltándose la inicialización por
  // completo). Ahora todo pasa por acá, de punta a punta, cada vez que
  // `open` pasa a true.
  useEffect(() => {
    if (!open) return;

    // Si el diálogo se vuelve a abrir (otra actividad) antes de que esta
    // inicialización termine, `cancelado` evita que la respuesta vieja
    // pise el estado de la apertura nueva.
    let cancelado = false;

    const inicializar = async () => {
      setSelectedCargoId('');
      setSelectedPuestoId('');
      setSelectedTrabajadorId('');
      setPuestos([]);
      setIsLoadingCargos(true);
      setIsLoadingTrabajadores(true);

      try {
        const [trabajadoresData, cargosData] = await Promise.all([
          asistenciaService.getTrabajadores(),
          matrizProcesosService.getCargos(),
        ]);
        if (cancelado) return;
        setTrabajadores(trabajadoresData);
        setCargos(cargosData);

        if (isEdit && initialPuestoId) {
          // Antes esto recorría TODOS los cargos buscando en cuál vivía
          // el Puesto -- lento (N llamadas) y, sobre todo, si el Puesto ya
          // estaba desactivado (IsActive: false) nunca aparecía en esas
          // listas y la búsqueda fallaba en silencio, dejando todo en
          // blanco. Ahora se busca el Puesto directo por su ID,
          // incluyendo inactivos -- así siempre se puede mostrar lo que
          // ya está asignado, aunque haya sido desactivado después.
          try {
            const puestoAsignado = await puestosService.getPuestoById(initialPuestoId, true);
            if (cancelado) return;

            const puestosDelCargo = await matrizProcesosService.getPuestosByCargo(puestoAsignado.CargoId);
            if (cancelado) return;

            const yaEstaEnLaLista = puestosDelCargo.some((p) => p._id === puestoAsignado._id);
            const listaFinal = yaEstaEnLaLista
              ? puestosDelCargo
              : [
                  ...puestosDelCargo,
                  {
                    ...puestoAsignado,
                    // Se marca en el nombre para que quede claro en el
                    // dropdown por qué no estaba en la lista normal.
                    Nombre: puestoAsignado.IsActive === false
                      ? `${puestoAsignado.Nombre} (inactivo)`
                      : puestoAsignado.Nombre,
                  } as PuestoCargo,
                ];

            setSelectedCargoId(puestoAsignado.CargoId);
            setPuestos(listaFinal);
            setSelectedPuestoId(initialPuestoId);
            setSelectedTrabajadorId(initialTrabajadorId ? String(initialTrabajadorId) : '');
          } catch (error: any) {
            // El puesto fue eliminado por completo (no solo desactivado)
            // -- no hay nada que precargar, se deja en blanco para que el
            // usuario elija uno nuevo, con un aviso de qué pasó.
            showMessage('warning', 'El puesto asignado anteriormente ya no existe. Selecciona uno nuevo.');
          }
        }
      } catch (error: any) {
        if (!cancelado) {
          showMessage('error', error.message || 'Error al cargar los datos del formulario');
        }
      } finally {
        if (!cancelado) {
          setIsLoadingCargos(false);
          setIsLoadingTrabajadores(false);
        }
      }
    };

    inicializar();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initialPuestoId, initialTrabajadorId]);

  // Al elegir un Trabajador, buscamos su Puesto asignado (configurado en
  // Mantenimiento de Asistencias) y autocompletamos Cargo + Puesto, sin
  // que el usuario tenga que navegar manualmente la cascada.
  const handleSelectTrabajador = async (trabajadorId: string) => {
    setSelectedTrabajadorId(trabajadorId);
    const trabajador = trabajadores.find((t) => String(t._id) === trabajadorId);
    if (!trabajador?.puesto) {
      showMessage('warning', 'Este trabajador no tiene un Puesto asignado todavía (revisa Mantenimiento de Asistencias)');
      return;
    }
    try {
      setIsLoadingPuestos(true);
      const puesto = await puestosService.getPuestoById(trabajador.puesto, true);
      const puestosData = await matrizProcesosService.getPuestosByCargo(puesto.CargoId);
      const yaEstaEnLaLista = puestosData.some((p) => p._id === puesto._id);
      const listaFinal = yaEstaEnLaLista
        ? puestosData
        : [
            ...puestosData,
            {
              ...puesto,
              Nombre: puesto.IsActive === false ? `${puesto.Nombre} (inactivo)` : puesto.Nombre,
            } as PuestoCargo,
          ];
      setSelectedCargoId(puesto.CargoId);
      setPuestos(listaFinal);
      setSelectedPuestoId(puesto._id);
    } catch (error: any) {
      showMessage('error', error.message || 'No se pudo cargar el puesto asignado a este trabajador');
    } finally {
      setIsLoadingPuestos(false);
    }
  };

  // Cambio manual de Cargo (llamada directa desde el Select, no un efecto
  // reactivo -- así no hay dos mecanismos compitiendo por escribir
  // selectedPuestoId al mismo tiempo).
  const handleCargoChange = async (cargoId: string) => {
    setSelectedCargoId(cargoId);
    setSelectedPuestoId('');
    if (!cargoId) {
      setPuestos([]);
      return;
    }
    try {
      setIsLoadingPuestos(true);
      const data = await matrizProcesosService.getPuestosByCargo(cargoId);
      setPuestos(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los puestos');
    } finally {
      setIsLoadingPuestos(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPuestoId) {
      showMessage('warning', 'Debe seleccionar un puesto');
      return;
    }

    // Encontrar el nombre del puesto seleccionado
    const selectedPuesto = puestos.find(p => p._id === selectedPuestoId);
    const puestoNombre = selectedPuesto?.Nombre || 'Desconocido';

    onSubmit(selectedPuestoId, puestoNombre, selectedTrabajadorId || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Puesto' : 'Agregar Puesto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trabajador">Elegir por persona (opcional)</Label>
            <Select
              value={selectedTrabajadorId}
              onValueChange={handleSelectTrabajador}
              disabled={isLoadingTrabajadores}
            >
              <SelectTrigger id="trabajador">
                <SelectValue placeholder={isLoadingTrabajadores ? 'Cargando...' : 'Selecciona un trabajador'} />
              </SelectTrigger>
              <SelectContent>
                {trabajadores.map((t) => (
                  <SelectItem key={t._id} value={String(t._id)}>
                    {t.nombres}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Al elegir a la persona, se completan Cargo y Puesto automáticamente. También puedes
              elegirlos manualmente abajo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Select
              value={selectedCargoId}
              onValueChange={handleCargoChange}
              disabled={isLoadingCargos}
            >
              <SelectTrigger id="cargo">
                <SelectValue placeholder="Seleccione un cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargos.map((cargo) => (
                  <SelectItem key={cargo._id} value={cargo._id}>
                    {cargo.Nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="puesto">Puesto</Label>
            <Select
              value={selectedPuestoId}
              onValueChange={setSelectedPuestoId}
              disabled={!selectedCargoId || isLoadingPuestos}
            >
              <SelectTrigger id="puesto">
                <SelectValue placeholder={selectedCargoId ? 'Seleccione un puesto' : 'Primero seleccione un cargo'} />
              </SelectTrigger>
              <SelectContent>
                {puestos.length === 0 && selectedCargoId && !isLoadingPuestos ? (
                  <SelectItem value="no-puestos" disabled>
                    No hay puestos disponibles
                  </SelectItem>
                ) : (
                  puestos.map((puesto) => (
                    <SelectItem key={puesto._id} value={puesto._id}>
                      {puesto.Nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PuestoFormDialog;
