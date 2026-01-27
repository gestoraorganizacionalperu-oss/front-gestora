import React from 'react';
import { Handle, Position } from 'reactflow';
import { Briefcase, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';

interface PuestoNodeProps {
  data: {
    label: string;
    description?: string;
    responsiblesCount: number;
    onEdit: () => void;
    onDelete: () => void;
  };
}

const PuestoNode: React.FC<PuestoNodeProps> = ({ data }) => {
  const { canUpdate, canDelete } = usePermissions();

  return (
    <div className="bg-card border-2 border-primary rounded-lg shadow-lg min-w-[220px] max-w-[270px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight break-words">
              {data.label}
            </h3>
          </div>
        </div>

        {/* Responsables Count */}
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-muted/50 rounded-md">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Responsables: <span className="text-foreground">{data.responsiblesCount}</span>
          </span>
        </div>

        {/* Action Buttons */}
        {(canUpdate || canDelete) && (
          <div className="flex gap-2">
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onEdit();
                }}
              >
                <Pencil className="w-3 h-3 mr-1" />
                <span className="text-xs">Editar</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete();
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                <span className="text-xs">Eliminar</span>
              </Button>
            )}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </div>
  );
};

export default PuestoNode;
