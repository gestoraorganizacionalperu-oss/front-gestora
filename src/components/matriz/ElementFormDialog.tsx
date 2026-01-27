import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ElementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { nombre: string; descripcion: string }) => Promise<void>;
  title: string;
  isSubmitting: boolean;
  initialValue?: string;
  formType?: 'macro' | 'proceso' | 'subproceso' | 'subprocesohijo' | 'actividad' | 'descripcion' | 'puesto';
}

const ElementFormDialog: React.FC<ElementFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  title,
  isSubmitting,
  initialValue,
  formType,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        nombre: initialValue || '',
        descripcion: initialValue || '',
      });
    }
  }, [open, initialValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Determinar el tipo de campo y configuración según formType
  const isTextareaType = formType === 'descripcion' || formType === 'proceso' || formType === 'subproceso' || formType === 'subprocesohijo';
  
  // Configurar filas según el tipo
  let textareaRows = 4;
  let dialogWidth = "sm:max-w-[450px]";
  
  if (formType === 'descripcion') {
    textareaRows = 8; // Doble de tamaño para descripción
    dialogWidth = "sm:max-w-[600px]"; // Dialog más ancho para descripción
  } else if (formType === 'proceso' || formType === 'subproceso' || formType === 'subprocesohijo') {
    textareaRows = 5; // 5 líneas para proceso y subprocesos
  }
  
  const fieldLabel = formType === 'descripcion' ? 'Descripción' : 'Nombre';
  const fieldPlaceholder = formType === 'descripcion' ? 'Ingrese la descripción' : 'Ingrese el nombre';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">{fieldLabel}</Label>
            {isTextareaType ? (
              <Textarea
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value, descripcion: e.target.value })}
                disabled={isSubmitting}
                placeholder={fieldPlaceholder}
                required
                rows={textareaRows}
                className="resize-none"
                autoComplete="off"
              />
            ) : (
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value, descripcion: e.target.value })}
                disabled={isSubmitting}
                placeholder={fieldPlaceholder}
                required
                autoComplete="off"
              />
            )}
          </div>

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
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ElementFormDialog;
