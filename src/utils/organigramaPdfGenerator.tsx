import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Puesto } from '@/services/puestosService';
import { Users, Briefcase, Building2, UserCheck } from 'lucide-react';

interface TreeNode {
  puesto: Puesto;
  children: TreeNode[];
  level: number;
}

// Construir árbol jerárquico
const buildTree = (puestos: Puesto[]): TreeNode[] => {
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
};

// Obtener color según nivel jerárquico
const getLevelColor = (level: number): { bg: string; text: string; border: string } => {
  const colors = [
    { bg: '#1e3a8a', text: '#ffffff', border: '#1e3a8a' }, // Nivel 0 - Azul oscuro
    { bg: '#0f766e', text: '#ffffff', border: '#0f766e' }, // Nivel 1 - Verde azulado
    { bg: '#5b8c9e', text: '#ffffff', border: '#5b8c9e' }, // Nivel 2 - Azul medio
    { bg: '#1e3a5f', text: '#ffffff', border: '#1e3a5f' }, // Nivel 3 - Azul marino
    { bg: '#2d5a6e', text: '#ffffff', border: '#2d5a6e' }, // Nivel 4 - Azul grisáceo
  ];
  
  return colors[Math.min(level, colors.length - 1)];
};

// Crear elemento HTML del organigrama
const createOrganigramaHTML = (puestos: Puesto[]): HTMLElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 1123px;
    min-height: 794px;
    background: white;
    padding: 25px 30px;
    font-family: Arial, sans-serif;
    box-sizing: border-box;
  `;

  // Título
  const title = document.createElement('div');
  title.style.cssText = `
    text-align: center;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 3px solid #1e3a8a;
  `;
  title.innerHTML = `
    <h1 style="margin: 0; font-size: 20px; color: #1e3a8a; font-weight: bold;">
      Organigrama Organizacional
    </h1>
    <p style="margin: 4px 0 0 0; font-size: 10px; color: #666;">
      Estructura jerárquica de puestos
    </p>
  `;
  container.appendChild(title);

  // Contenedor del organigrama
  const orgChart = document.createElement('div');
  orgChart.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  `;

  const tree = buildTree(puestos);

  // Función recursiva para renderizar nodos
  const renderNode = (node: TreeNode, isLast: boolean = false): HTMLElement => {
    const nodeContainer = document.createElement('div');
    nodeContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;

    const colors = getLevelColor(node.level);

    // Caja del puesto - ancho aumentado
    const box = document.createElement('div');
    box.style.cssText = `
      background: ${colors.bg};
      color: ${colors.text};
      border: 2px solid ${colors.border};
      border-radius: 6px;
      padding: 10px 12px;
      width: 130px;
      min-height: 60px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 6px;
    `;

    const responsiblesCount = node.puesto.responsibles?.length || 0;
    
    box.innerHTML = `
      <div style="font-weight: bold; font-size: 11px; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; width: 100%;">
        ${node.puesto.Nombre}
      </div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 10px;">
        <span style="line-height: 1;">👥</span>
        <span style="line-height: 1; font-weight: bold; color: white;">${responsiblesCount}</span>
      </div>
    `;

    nodeContainer.appendChild(box);

    // Si tiene hijos, renderizarlos
    if (node.children.length > 0) {
      // Línea vertical
      const verticalLine = document.createElement('div');
      verticalLine.style.cssText = `
        width: 2px;
        height: 12px;
        background: #1e3a8a;
      `;
      nodeContainer.appendChild(verticalLine);

      // Contenedor de hijos
      const childrenContainer = document.createElement('div');
      childrenContainer.style.cssText = `
        display: flex;
        gap: 15px;
        align-items: flex-start;
        justify-content: center;
        position: relative;
      `;

      node.children.forEach((child, index) => {
        const childWrapper = document.createElement('div');
        childWrapper.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        `;

        // Línea vertical para conectar con la línea horizontal
        if (node.children.length > 1) {
          const connector = document.createElement('div');
          connector.style.cssText = `
            width: 2px;
            height: 12px;
            background: #1e3a8a;
            margin-bottom: 0;
          `;
          childWrapper.appendChild(connector);
        }

        const childNode = renderNode(child, index === node.children.length - 1);
        childWrapper.appendChild(childNode);
        childrenContainer.appendChild(childWrapper);
      });

      // Línea horizontal superior - dibujada después para que esté encima
      if (node.children.length > 1) {
        // Calcular el ancho total de los hijos
        const totalWidth = (130 * node.children.length) + (15 * (node.children.length - 1));
        const singleChildWidth = 130 + 15; // ancho de card + gap
        const leftOffset = (totalWidth - singleChildWidth * node.children.length + 15 * (node.children.length - 1)) / 2;
        
        const horizontalLine = document.createElement('div');
        horizontalLine.style.cssText = `
          position: absolute;
          top: 0;
          left: calc(50% - ${totalWidth / 2}px + 65px);
          height: 2px;
          background: #1e3a8a;
          width: calc(${totalWidth}px - 130px);
          pointer-events: none;
        `;
        childrenContainer.appendChild(horizontalLine);
      }

      nodeContainer.appendChild(childrenContainer);
    }

    return nodeContainer;
  };

  // Renderizar todos los árboles raíz
  tree.forEach((root, index) => {
    const rootNode = renderNode(root, index === tree.length - 1);
    orgChart.appendChild(rootNode);
    
    // Separador entre árboles raíz
    if (index < tree.length - 1) {
      const separator = document.createElement('div');
      separator.style.cssText = `
        width: 100%;
        height: 1px;
        background: #e5e7eb;
        margin: 12px 0;
      `;
      orgChart.appendChild(separator);
    }
  });

  container.appendChild(orgChart);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 15px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 8px;
    color: #999;
  `;
  footer.innerHTML = `
    <p style="margin: 0;">Generado el ${new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</p>
  `;
  container.appendChild(footer);

  return container;
};

// Generar PDF del organigrama
export const generateOrganigramaPDF = async (puestos: Puesto[]): Promise<void> => {
  try {
    // Crear elemento HTML temporal
    const organigramaElement = createOrganigramaHTML(puestos);
    
    // Agregar al DOM temporalmente (oculto)
    organigramaElement.style.position = 'absolute';
    organigramaElement.style.left = '-9999px';
    document.body.appendChild(organigramaElement);

    // Esperar un momento para que se renderice
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convertir a canvas
    const canvas = await html2canvas(organigramaElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Remover elemento temporal
    document.body.removeChild(organigramaElement);

    // Crear PDF en orientación horizontal
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 297; // A4 landscape width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Si la imagen es más alta que una página A4 horizontal, ajustar
    if (imgHeight > 210) {
      const pageHeight = 210;
      let heightLeft = imgHeight;
      let position = 0;

      // Primera página
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;

      // Páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }
    } else {
      // Cabe en una página
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight
      );
    }

    // Descargar PDF
    const fileName = `organigrama_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw new Error('No se pudo generar el PDF del organigrama');
  }
};
