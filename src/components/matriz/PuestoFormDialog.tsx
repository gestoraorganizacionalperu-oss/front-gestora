import React, { useState, useEffect, useRef } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Atajo: elegir directamente a la persona (Trabajador) en vez de navegar
  // Cargo -> Puesto manualmente. Al elegir, se autocompletan Cargo y Puesto
  // usando el vínculo configurado en Mantenimiento de Asistencias.
  const [trabajadores, setTrabajadores] = useState<TrabajadorAsistencia[]>([]);
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState<string>('');
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const omitirResetPuesto = useRef(false);

  useEffect(() => {
    if (open) {
      loadCargos();
      loadTrabajadores();
      setIsInitialized(false);
      // Reiniciamos SIEMPRE (edición o no) para no arrastrar la selección
      // de una edición anterior. Si es edición, initializeEditMode se
      // encarga de volver a completar Cargo/Puesto/Trabajador correctos
      // para esta actividad específica.
      setSelectedCargoId('');
      setSelectedPuestoId('');
      setSelectedTrabajadorId('');
      setPuestos([]);
    }
  }, [open, isEdit]);

  useEffect(() => {
    if (omitirResetPuesto.current) {
      omitirResetPuesto.current = false;
      return;
    }
    if (selectedCargoId) {
      loadPuestos(selectedCargoId);
    } else {
      setPuestos([]);
      setSelectedPuestoId('');
    }
  }, [selectedCargoId]);

  const loadTrabajadores = async () => {
    try {
      setIsLoadingTrabajadores(true);
      const data = await asistenciaService.getTrabajadores();
      setTrabajadores(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los trabajadores');
    } finally {
      setIsLoadingTrabajadores(false);
    }
  };

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
      const puesto = await puestosService.getPuestoById(trabajador.puesto);
      const puestosData = await matrizProcesosService.getPuestosByCargo(puesto.CargoId);
      omitirResetPuesto.current = true;
      setSelectedCargoId(puesto.CargoId);
      setPuestos(puestosData);
      setSelectedPuestoId(puesto._id);
    } catch (error: any) {
      showMessage('error', error.message || 'No se pudo cargar el puesto asignado a este trabajador');
    } finally {
      setIsLoadingPuestos(false);
    }
  };

  const loadCargos = async () => {
    try {
      setIsLoadingCargos(true);
      const data = await matrizProcesosService.getCargos();
      setCargos(data);
      
      // If editing and we have an initial puesto ID, find its cargo
      if (isEdit && initialPuestoId && !isInitialized) {
        await initializeEditMode(data);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los cargos');
    } finally {
      setIsLoadingCargos(false);
    }
  };

  const initializeEditMode = async (cargosData: Cargo[]) => {
    if (!initialPuestoId) return;

    try {
      // Try to find the puesto in each cargo
      for (const cargo of cargosData) {
        const puestosData = await matrizProcesosService.getPuestosByCargo(cargo._id);
        const foundPuesto = puestosData.find(p => p._id === initialPuestoId);
        
        if (foundPuesto) {
          setSelectedCargoId(cargo._id);
          setPuestos(puestosData);
          setSelectedPuestoId(initialPuestoId);
          // Siempre asignamos explícitamente (incluso vacío) para no
          // arrastrar la persona seleccionada en una edición anterior.
          setSelectedTrabajadorId(initialTrabajadorId ? String(initialTrabajadorId) : '');
          setIsInitialized(true);
          break;
        }
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al inicializar el formulario');
    }
  };

  const loadPuestos = async (cargoId: string) => {
    try {
      setIsLoadingPuestos(true);
      const data = await matrizProcesosService.getPuestosByCargo(cargoId);
      setPuestos(data);
      setSelectedPuestoId('');
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
              onValueChange={setSelectedCargoId}
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
