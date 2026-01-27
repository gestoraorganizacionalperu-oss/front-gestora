import React from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface AddPuestoNodeProps {
  data: {
    onClick: () => void;
    parentId: string | null;
  };
}

const AddPuestoNode: React.FC<AddPuestoNodeProps> = ({ data }) => {
  const { canCreate } = usePermissions();

  // No mostrar el nodo si el usuario no puede crear
  if (!canCreate) {
    return null;
  }

  return (
    <div className="bg-card border-2 border-dashed border-primary/40 rounded-lg min-w-[200px] max-w-[250px] hover:border-primary/60 transition-colors cursor-pointer">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary/40" />
      
      <div 
        className="p-4 flex flex-col items-center justify-center gap-2"
        onClick={data.onClick}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          Agregar Puesto
        </span>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary/40" />
    </div>
  );
};

export default AddPuestoNode;
