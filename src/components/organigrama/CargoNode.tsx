import React from 'react';
import { Handle, Position } from 'reactflow';
import { Building2 } from 'lucide-react';

interface CargoNodeProps {
  data: {
    label: string;
    description?: string;
  };
}

const CargoNode: React.FC<CargoNodeProps> = ({ data }) => {
  return (
    <div className="bg-card border-2 border-primary rounded-lg shadow-lg min-w-[200px] max-w-[250px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      
      <div className="p-4">
        <div className="flex items-start gap-2">
          <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight break-words">
              {data.label}
            </h3>
            {data.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </div>
  );
};

export default CargoNode;
