import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import type { Cargo } from '@/services/cargosService';
import CargoFormDialog from './CargoFormDialog';
import DeleteCargoDialog from './DeleteCargoDialog';

interface CargosListProps {
  cargos: Cargo[];
  selectedCargo: Cargo | null;
  isLoading: boolean;
  onCargoSelect: (cargo: Cargo) => void;
  onCargoCreated: () => void;
  onCargoUpdated: () => void;
  onCargoDeleted: () => void;
}

const CargosList: React.FC<CargosListProps> = ({
  cargos,
  selectedCargo,
  isLoading,
  onCargoSelect,
  onCargoCreated,
  onCargoUpdated,
  onCargoDeleted,
}) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cargoToEdit, setCargoToEdit] = useState<Cargo | null>(null);
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleEdit = (cargo: Cargo, e: React.MouseEvent) => {
    e.stopPropagation();
    setCargoToEdit(cargo);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (cargo: Cargo, e: React.MouseEvent) => {
    e.stopPropagation();
    setCargoToDelete(cargo);
    setIsDeleteDialogOpen(true);
  };

  // Paginación
  const totalPages = Math.ceil(cargos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCargos = cargos.slice(startIndex, endIndex);

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

      {/* Lista de cargos */}
      <div className="space-y-2">
        {currentCargos.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron cargos
          </div>
        ) : (
          currentCargos.map((cargo) => (
            <div
              key={cargo._id}
              onClick={() => onCargoSelect(cargo)}
              className={cn(
                'p-4 rounded-lg border cursor-pointer transition-colors',
                'hover:bg-muted/50',
                selectedCargo?._id === cargo._id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {cargo.Nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {cargo.Descripcion}
                  </p>
                </div>
                {(canUpdate || canDelete) && (
                  <div className="flex items-center gap-2 ml-2">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEdit(cargo, e)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(cargo, e)}
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
      <CargoFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={onCargoCreated}
        allCargos={cargos}
      />

      {cargoToEdit && (
        <CargoFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={onCargoUpdated}
          cargo={cargoToEdit}
          allCargos={cargos}
        />
      )}

      {cargoToDelete && (
        <DeleteCargoDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          cargo={cargoToDelete}
          onSuccess={onCargoDeleted}
        />
      )}
    </div>
  );
};

export default CargosList;
