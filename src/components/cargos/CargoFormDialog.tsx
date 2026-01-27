import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessage } from '@/contexts/MessageContext';
import { cargosService, type Cargo } from '@/services/cargosService';

interface CargoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  cargo?: Cargo;
  allCargos: Cargo[];
}

const CargoFormDialog: React.FC<CargoFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  cargo,
  allCargos,
}) => {
  const { showMessage } = useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
  });

  useEffect(() => {
    if (cargo) {
      setFormData({
        name: cargo.Nombre,
        description: cargo.Descripcion,
        parentId: cargo.ParentId || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parentId: '',
      });
    }
  }, [cargo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showMessage('warning', 'El nombre del cargo es requerido');
      return;
    }

    try {
      setIsSubmitting(true);

      if (cargo) {
        // Actualizar
        await cargosService.updateCargo(cargo._id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
        });
      } else {
        // Crear
        await cargosService.createCargo({
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: formData.parentId || null,
          level: 1,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar el cargo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar cargos para evitar seleccionar el mismo cargo como padre
  const availableParentCargos = allCargos.filter(c => c._id !== cargo?._id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{cargo ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del Cargo */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Cargo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Gerencia de Operaciones"
              disabled={isSubmitting}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe las responsabilidades del cargo..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Cargo Padre */}
          <div className="space-y-2">
            <Label htmlFor="parentId">Cargo Padre</Label>
            <Select
              value={formData.parentId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin padre (Raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (Raíz)</SelectItem>
                {availableParentCargos.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.Nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              {isSubmitting ? 'Guardando...' : cargo ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CargoFormDialog;
