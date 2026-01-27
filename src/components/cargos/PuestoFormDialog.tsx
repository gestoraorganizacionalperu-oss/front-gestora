import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessage } from '@/contexts/MessageContext';
import { usePermissions } from '@/hooks/use-permissions';
import { puestosService, type Puesto } from '@/services/puestosService';
import { maestrosService, type Ubicacion } from '@/services/maestrosService';

interface PuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  cargoId: string;
  puesto?: Puesto;
}

const PuestoFormDialog: React.FC<PuestoFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  cargoId,
  puesto,
}) => {
  const { showMessage } = useMessage();
  const { canCreate, canUpdate } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [allPuestos, setAllPuestos] = useState<Puesto[]>([]);
  const [newRequisito, setNewRequisito] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    ubicacionId: '',
    areaId: '',
    puestoParentId: '',
    requisitosTecnicos: [] as string[],
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          setIsLoadingData(true);
          
          // Cargar ubicaciones y puestos en paralelo
          const [ubicacionesData, puestosData] = await Promise.all([
            maestrosService.getUbicacionesYAreas(),
            puestosService.getAllPuestos(),
          ]);
          
          // Establecer las opciones en los estados
          setUbicaciones(ubicacionesData);
          setAllPuestos(puestosData);
          
          // Establecer los valores del formulario
          if (puesto) {
            setFormData({
              nombre: puesto.Nombre,
              descripcion: puesto.Descripcion || '',
              ubicacionId: puesto.UbicacionId,
              areaId: puesto.AreaId,
              puestoParentId: puesto.puestoParentId || '',
              requisitosTecnicos: puesto.requisitos?.map(r => r.Requisito) || [],
            });
          } else {
            setFormData({
              nombre: '',
              descripcion: '',
              ubicacionId: '',
              areaId: '',
              puestoParentId: '',
              requisitosTecnicos: [],
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
  }, [open, puesto]);

  const handleUbicacionChange = (ubicacionId: string) => {
    setFormData({
      ...formData,
      ubicacionId,
      areaId: '', // Reset area cuando cambia ubicación
    });
  };

  const handleAddRequisito = () => {
    if (newRequisito.trim()) {
      setFormData({
        ...formData,
        requisitosTecnicos: [...formData.requisitosTecnicos, newRequisito.trim()],
      });
      setNewRequisito('');
    }
  };

  const handleRemoveRequisito = (index: number) => {
    setFormData({
      ...formData,
      requisitosTecnicos: formData.requisitosTecnicos.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        description: formData.descripcion.trim(),
        cargoId: cargoId,
        locationId: formData.ubicacionId,
        areaId: formData.areaId,
        puestoParentId: formData.puestoParentId || null,
        technicalRequirements: formData.requisitosTecnicos,
        // responsibleIds eliminado - ya no se envía al backend
      };

      if (puesto) {
        await puestosService.updatePuesto(puesto._id, payload);
      } else {
        await puestosService.createPuesto(payload);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" key={puesto?._id || 'new'}>
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
          {/* Nombre y Ubicación en fila */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Puesto</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Analista de Marketing"
                disabled={isSubmitting}
              />
            </div>

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

          {/* Puesto Padre */}
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

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe las funciones del puesto..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Requisitos Técnicos */}
          <div className="space-y-2">
            <Label>Requisitos Técnicos</Label>
            <div className="flex gap-2">
              <Input
                value={newRequisito}
                onChange={(e) => setNewRequisito(e.target.value)}
                placeholder="Agregar requisito..."
                disabled={isSubmitting}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRequisito();
                  }
                }}
              />
              {canCreate && (
                <Button
                  type="button"
                  onClick={handleAddRequisito}
                  disabled={isSubmitting || !newRequisito.trim()}
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {formData.requisitosTecnicos.length > 0 && (
              <div className="space-y-2 mt-2">
                {formData.requisitosTecnicos.map((requisito, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{requisito}</span>
                    {canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRequisito(index)}
                        disabled={isSubmitting}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Responsables - Solo lectura cuando se edita */}
          {puesto && puesto.responsibles && puesto.responsibles.length > 0 && (
            <div className="space-y-2">
              <Label>Responsables (Solo lectura)</Label>
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="space-y-2">
                  {puesto.responsibles.map((responsible) => (
                    <div key={responsible.Id} className="flex items-center space-x-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <span className="font-medium">{responsible.Name}</span>
                      <span className="text-muted-foreground">({responsible.Email})</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Los responsables se gestionan desde otro módulo del sistema
                </p>
              </div>
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
            {(canCreate || canUpdate) && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : puesto ? 'Actualizar' : 'Crear'}
              </Button>
            )}
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PuestoFormDialog;
