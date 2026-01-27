import React from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';

interface AddCargoNodeProps {
  data: {
    onClick: () => void;
    parentId?: string | null;
  };
}

const AddCargoNode: React.FC<AddCargoNodeProps> = ({ data }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary opacity-0" />
      
      <button
        onClick={data.onClick}
        className="bg-card border-2 border-dashed border-primary/50 rounded-lg min-w-[200px] max-w-[250px] p-8 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center group"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
            Agregar Cargo
          </span>
        </div>
      </button>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary opacity-0" />
    </div>
  );
};

export default AddCargoNode;
