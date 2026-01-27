import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessage } from '@/contexts/MessageContext';
import { puestosService, type Puesto } from '@/services/puestosService';
import { maestrosService, type Ubicacion } from '@/services/maestrosService';
import { cargosService, type Cargo } from '@/services/cargosService';

interface PuestoQuickFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  parentId: string | null;
  puesto?: Puesto | null;
}

const PuestoQuickFormDialog: React.FC<PuestoQuickFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  parentId,
  puesto,
}) => {
  const { showMessage } = useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [allPuestos, setAllPuestos] = useState<Puesto[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  
  const [formData, setFormData] = useState({
    cargoId: '',
    nombre: '',
    ubicacionId: '',
    areaId: '',
    puestoParentId: parentId || '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          setIsLoadingData(true);
          
          // 1. PRIMERO: Cargar todas las opciones en paralelo
          const [ubicacionesData, puestosData, cargosData] = await Promise.all([
            maestrosService.getUbicacionesYAreas(),
            puestosService.getAllPuestos(),
            cargosService.getCargos(),
          ]);
          
          // 2. Establecer las opciones en los estados
          setUbicaciones(ubicacionesData);
          setAllPuestos(puestosData);
          setCargos(cargosData);
          
          // 3. DESPUÉS: Establecer los valores del formulario
          if (puesto) {
            // Modo edición: cargar datos del puesto
            setFormData({
              cargoId: puesto.CargoId,
              nombre: puesto.Nombre,
              ubicacionId: puesto.UbicacionId,
              areaId: puesto.AreaId,
              puestoParentId: puesto.puestoParentId || '',
            });
          } else {
            // Modo creación: usar parentId si existe
            setFormData({
              cargoId: '',
              nombre: '',
              ubicacionId: '',
              areaId: '',
              puestoParentId: parentId || '',
            });
          }
        } catch (error: any) {
          showMessage('error', 'Error al cargar datos del formulario');
          console.error('Error loading form data:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      loadData();
    }
  }, [open, puesto, parentId]);

  const handleUbicacionChange = (ubicacionId: string) => {
    setFormData({
      ...formData,
      ubicacionId,
      areaId: '', // Reset area cuando cambia ubicación
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cargoId) {
      showMessage('warning', 'El cargo es requerido');
      return;
    }

    if (!formData.nombre.trim()) {
      showMessage('warning', 'El nombre del puesto es requerido');
      return;
    }

    if (!formData.ubicacionId) {
      showMessage('warning', 'La ubicación es requerida');
      return;
    }

    if (!formData.areaId) {
      showMessage('warning', 'El área es requerida');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: formData.nombre.trim(),
        description: '',
        cargoId: formData.cargoId,
        locationId: formData.ubicacionId,
        areaId: formData.areaId,
        puestoParentId: formData.puestoParentId || null,
        technicalRequirements: [],
        responsibleIds: [],
      };

      if (puesto) {
        // Actualizar puesto existente
        await puestosService.updatePuesto(puesto._id, payload);
        showMessage('success', 'Puesto actualizado exitosamente');
      } else {
        // Crear nuevo puesto
        await puestosService.createPuesto(payload);
        showMessage('success', 'Puesto creado exitosamente');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar el puesto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUbicacion = ubicaciones.find(u => u.id === formData.ubicacionId);
  const areas = selectedUbicacion?.areas || [];

  // Filter puestos: exclude current puesto when editing
  const availablePuestos = allPuestos.filter(p => p._id !== puesto?._id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" key={puesto?._id || 'new'}>
        <DialogHeader>
          <DialogTitle>{puesto ? 'Editar Puesto' : 'Nuevo Puesto'}</DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cargo */}
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Select
                key={`cargo-${formData.cargoId}`}
                value={formData.cargoId}
                onValueChange={(value) => setFormData({ ...formData, cargoId: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
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

            {/* Nombre del Puesto */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Puesto</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Gerente de Operaciones"
                disabled={isSubmitting}
              />
            </div>

            {/* Ubicación */}
            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Select
                key={`ubicacion-${formData.ubicacionId}`}
                value={formData.ubicacionId}
                onValueChange={handleUbicacionChange}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((ubicacion) => (
                    <SelectItem key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Área */}
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select
                key={`area-${formData.areaId}`}
                value={formData.areaId}
                onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                disabled={isSubmitting || !formData.ubicacionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Puesto Padre - Solo mostrar en modo edición */}
            {puesto && (
              <div className="space-y-2">
                <Label htmlFor="puestoParent">Puesto Padre</Label>
                <Select
                  key={`puesto-parent-${formData.puestoParentId}`}
                  value={formData.puestoParentId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, puestoParentId: value === 'none' ? '' : value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin puesto padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin puesto padre</SelectItem>
                    {availablePuestos.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : puesto ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PuestoQuickFormDialog;
