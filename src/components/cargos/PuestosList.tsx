import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import type { Puesto } from '@/services/puestosService';
import PuestoFormDialog from './PuestoFormDialog';
import DeletePuestoDialog from './DeletePuestoDialog';

interface PuestosListProps {
  puestos: Puesto[];
  selectedCargoId: string;
  isLoading: boolean;
  onPuestoCreated: () => void;
  onPuestoUpdated: () => void;
  onPuestoDeleted: () => void;
}

const PuestosList: React.FC<PuestosListProps> = ({
  puestos,
  selectedCargoId,
  isLoading,
  onPuestoCreated,
  onPuestoUpdated,
  onPuestoDeleted,
}) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [puestoToEdit, setPuestoToEdit] = useState<Puesto | null>(null);
  const [puestoToDelete, setPuestoToDelete] = useState<Puesto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleEdit = (puesto: Puesto) => {
    setPuestoToEdit(puesto);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (puesto: Puesto) => {
    setPuestoToDelete(puesto);
    setIsDeleteDialogOpen(true);
  };

  // Paginación
  const totalPages = Math.ceil(puestos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPuestos = puestos.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón Nuevo */}
      {canCreate && (
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      )}

      {/* Lista de puestos */}
      <div className="space-y-3">
        {currentPuestos.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron puestos para este cargo
          </div>
        ) : (
          currentPuestos.map((puesto) => (
            <div
              key={puesto._id}
              className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {puesto.Nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {puesto.Descripcion}
                  </p>
                </div>
                
                {(canUpdate || canDelete) && (
                  <div className="flex items-center gap-2 ml-2">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(puesto)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(puesto)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PuestoFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={onPuestoCreated}
        cargoId={selectedCargoId}
      />

      {puestoToEdit && (
        <PuestoFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={onPuestoUpdated}
          puesto={puestoToEdit}
          cargoId={selectedCargoId}
        />
      )}

      {puestoToDelete && (
        <DeletePuestoDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          puesto={puestoToDelete}
          onSuccess={onPuestoDeleted}
        />
      )}
    </div>
  );
};

export default PuestosList;
