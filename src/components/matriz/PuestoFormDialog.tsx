import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { matrizProcesosService, type Cargo, type PuestoCargo } from '@/services/matrizProcesosService';
import { useMessage } from '@/contexts/MessageContext';

interface PuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (puestoId: string, puestoNombre: string) => void;
  initialPuestoId?: string | null;
  isEdit?: boolean;
}

const PuestoFormDialog: React.FC<PuestoFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialPuestoId,
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

  useEffect(() => {
    if (open) {
      loadCargos();
      setIsInitialized(false);
      if (!isEdit) {
        setSelectedCargoId('');
        setSelectedPuestoId('');
        setPuestos([]);
      }
    }
  }, [open, isEdit]);

  useEffect(() => {
    if (selectedCargoId) {
      loadPuestos(selectedCargoId);
    } else {
      setPuestos([]);
      setSelectedPuestoId('');
    }
  }, [selectedCargoId]);

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
    
    onSubmit(selectedPuestoId, puestoNombre);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Puesto' : 'Agregar Puesto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
