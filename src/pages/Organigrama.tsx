import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import { usePermissions } from '@/hooks/use-permissions';
import { puestosService, type Puesto } from '@/services/puestosService';
import PuestoNode from '@/components/organigrama/PuestoNode';
import AddPuestoNode from '@/components/organigrama/AddPuestoNode';
import PuestoQuickFormDialog from '@/components/organigrama/PuestoQuickFormDialog';
import DeletePuestoDialog from '@/components/cargos/DeletePuestoDialog';
import { generateOrganigramaPDF } from '@/utils/organigramaPdfGenerator';

const nodeTypes = {
  puestoNode: PuestoNode,
  addPuestoNode: AddPuestoNode,
};

interface TreeNode {
  puesto: Puesto;
  children: TreeNode[];
  level: number;
}

const Organigrama: React.FC = () => {
  const { showMessage } = useMessage();
  const { canCreate } = usePermissions();
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedPuesto, setSelectedPuesto] = useState<Puesto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [puestoToDelete, setPuestoToDelete] = useState<Puesto | null>(null);

  useEffect(() => {
    loadPuestos();
  }, []);

  const loadPuestos = async () => {
    try {
      setIsLoading(true);
      const data = await puestosService.getAllPuestos();
      setPuestos(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los puestos');
    } finally {
      setIsLoading(false);
    }
  };

  // Construir árbol jerárquico
  const buildTree = useCallback((puestos: Puesto[]): TreeNode[] => {
    const puestoMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Crear nodos del árbol
    puestos.forEach((puesto) => {
      puestoMap.set(puesto._id, {
        puesto,
        children: [],
        level: 0,
      });
    });

    // Construir relaciones padre-hijo
    puestos.forEach((puesto) => {
      const node = puestoMap.get(puesto._id);
      if (!node) return;

      if (puesto.puestoParentId && puestoMap.has(puesto.puestoParentId)) {
        const parent = puestoMap.get(puesto.puestoParentId);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  // Calcular posiciones de los nodos
  const calculateNodePositions = useCallback((tree: TreeNode[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const horizontalSpacing = 320;
    const verticalSpacing = 180;
    const nodeWidth = 270;

    // Calcular el ancho total de cada subárbol
    const calculateTreeWidth = (node: TreeNode): number => {
      if (node.children.length === 0) return 1;
      return node.children.reduce((sum, child) => sum + calculateTreeWidth(child), 0);
    };

    // Handlers para editar y eliminar
    const handleEdit = (puesto: Puesto) => {
      setSelectedPuesto(puesto);
      setSelectedParentId(null);
      setIsDialogOpen(true);
    };

    const handleDelete = (puesto: Puesto) => {
      setPuestoToDelete(puesto);
      setIsDeleteDialogOpen(true);
    };

    // Posicionar nodos recursivamente
    const positionNode = (
      node: TreeNode,
      x: number,
      y: number,
      parentId?: string
    ): number => {
      const nodeId = node.puesto._id;

      // Agregar nodo del puesto
      nodes.push({
        id: nodeId,
        type: 'puestoNode',
        position: { x, y },
        data: {
          label: node.puesto.Nombre,
          description: node.puesto.Descripcion,
          responsiblesCount: node.puesto.responsibles?.length || 0,
          onEdit: () => handleEdit(node.puesto),
          onDelete: () => handleDelete(node.puesto),
        },
      });

      // Agregar edge si tiene padre
      if (parentId) {
        edges.push({
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'hsl(var(--primary))',
          },
        });
      }

      // Posicionar hijos
      if (node.children.length > 0) {
        const childrenWidth = node.children.reduce(
          (sum, child) => sum + calculateTreeWidth(child),
          0
        );
        let currentX = x - ((childrenWidth - 1) * horizontalSpacing) / 2;

        node.children.forEach((child) => {
          const childWidth = calculateTreeWidth(child);
          const childX = currentX + ((childWidth - 1) * horizontalSpacing) / 2;
          positionNode(child, childX, y + verticalSpacing, nodeId);
          currentX += childWidth * horizontalSpacing;
        });

        // Agregar nodo "+" para agregar hijos
        const addNodeId = `add-${nodeId}`;
        const addNodeX = currentX;
        const addNodeY = y + verticalSpacing;

        nodes.push({
          id: addNodeId,
          type: 'addPuestoNode',
          position: { x: addNodeX, y: addNodeY },
          data: {
            onClick: () => handleAddPuesto(nodeId),
            parentId: nodeId,
          },
        });

        edges.push({
          id: `${nodeId}-${addNodeId}`,
          source: nodeId,
          target: addNodeId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5,5' },
        });
      } else {
        // Si no tiene hijos, agregar nodo "+" directamente debajo
        const addNodeId = `add-${nodeId}`;
        nodes.push({
          id: addNodeId,
          type: 'addPuestoNode',
          position: { x, y: y + verticalSpacing },
          data: {
            onClick: () => handleAddPuesto(nodeId),
            parentId: nodeId,
          },
        });

        edges.push({
          id: `${nodeId}-${addNodeId}`,
          source: nodeId,
          target: addNodeId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5,5' },
        });
      }

      return x + nodeWidth;
    };

    // Posicionar árboles raíz
    let currentX = 0;
    tree.forEach((root, index) => {
      const treeWidth = calculateTreeWidth(root);
      const startX = currentX + ((treeWidth - 1) * horizontalSpacing) / 2;
      positionNode(root, startX, 0);
      currentX += treeWidth * horizontalSpacing + horizontalSpacing;
    });

    return { nodes, edges };
  }, []);

  // Actualizar nodos y edges cuando cambian los puestos
  useEffect(() => {
    if (puestos.length === 0) {
      // Si no hay puestos, mostrar solo un nodo "+" para agregar el primer puesto raíz
      setNodes([
        {
          id: 'add-root',
          type: 'addPuestoNode',
          position: { x: 250, y: 100 },
          data: {
            onClick: () => handleAddPuesto(null),
            parentId: null,
          },
        },
      ]);
      setEdges([]);
      return;
    }

    const tree = buildTree(puestos);
    const { nodes: newNodes, edges: newEdges } = calculateNodePositions(tree);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [puestos, buildTree, calculateNodePositions, setNodes, setEdges]);

  const handleAddPuesto = (parentId: string | null) => {
    setSelectedParentId(parentId);
    setSelectedPuesto(null);
    setIsDialogOpen(true);
  };

  const handleAddRootPuesto = () => {
    setSelectedParentId(null);
    setSelectedPuesto(null);
    setIsDialogOpen(true);
  };

  const handlePuestoSuccess = () => {
    loadPuestos();
  };

  const handleDeleteSuccess = () => {
    loadPuestos();
    showMessage('success', 'Puesto eliminado exitosamente');
  };

  const handleDownloadPDF = async () => {
    if (puestos.length === 0) {
      showMessage('warning', 'No hay puestos para generar el organigrama');
      return;
    }

    try {
      setIsGeneratingPDF(true);
      await generateOrganigramaPDF(puestos);
      showMessage('success', 'Organigrama descargado exitosamente');
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      showMessage('error', error.message || 'Error al generar el PDF del organigrama');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organigrama</h1>
          <p className="text-muted-foreground mt-1">Estructura organizacional de la empresa</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadPDF} 
            variant="outline"
            disabled={isGeneratingPDF || puestos.length === 0}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
          {canCreate && (
            <Button onClick={handleAddRootPuesto}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Puesto Raíz
            </Button>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="border rounded-lg bg-card" style={{ height: 'calc(100vh - 200px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Dialog para agregar/editar puesto */}
      <PuestoQuickFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handlePuestoSuccess}
        parentId={selectedParentId}
        puesto={selectedPuesto}
      />

      {/* Dialog para eliminar puesto */}
      {puestoToDelete && (
        <DeletePuestoDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          puesto={puestoToDelete}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default Organigrama;
