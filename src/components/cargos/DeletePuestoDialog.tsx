import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import { puestosService, type Puesto } from '@/services/puestosService';

interface DeletePuestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puesto: Puesto;
  onSuccess: () => void;
}

const DeletePuestoDialog: React.FC<DeletePuestoDialogProps> = ({
  open,
  onOpenChange,
  puesto,
  onSuccess,
}) => {
  const { showMessage } = useMessage();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await puestosService.deletePuesto(puesto._id);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al eliminar el puesto');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>¿Estás seguro?</DialogTitle>
              <DialogDescription className="mt-1">
                Esta acción desactivará el puesto
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium text-foreground">
              "{puesto.Nombre}"
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {puesto.Descripcion}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePuestoDialog;
