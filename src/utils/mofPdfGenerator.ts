import jsPDF from 'jspdf';

export interface MOFPuestoData {
  _id: string;
  Nombre: string;
  CargoId: string;
  NombreCargo: string;
  AreaId: string;
  NombreArea: string;
  requisitos: string[];
  actividades: {
    id: string;
    nombre: string;
    descripcion: string;
  }[];
  cantidadResponsables: number;
  puestoPadre: string;
}

interface GroupedPuestos {
  [areaName: string]: MOFPuestoData[];
}

export class MOFPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private primaryColor: [number, number, number] = [18, 3, 104]; // #120368
  private secondaryColor: [number, number, number] = [107, 33, 168]; // #6b21a8
  private redColor: [number, number, number] = [185, 28, 28]; // #b91c1c

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addNewPage();
      return true;
    }
    return false;
  }

  private drawHeaderWithLogo(logoBase64: string | null) {
    if (logoBase64) {
      try {
        // Draw logo in top left corner
        this.doc.addImage(logoBase64, 'PNG', this.margin, 10, 40, 15);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }

    // Draw horizontal line
    this.doc.setDrawColor(0, 0, 0); // Negro
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, 28, this.pageWidth - this.margin, 28);
    
    this.currentY = 35;
  }

  private generateCoverPage(
    logoBase64: string | null,
    companyName: string,
    currentDate: { month: string; year: string }
  ) {
    // Add logo in top left
    if (logoBase64) {
      try {
        this.doc.addImage(logoBase64, 'PNG', this.margin, 20, 50, 20);
      } catch (error) {
        console.error('Error adding logo to cover:', error);
      }
    }

    // Add main title in center
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(0, 0, 0); // Negro

    const titleLines = [
      'MANUAL DE ORGANIZACIÓN',
      'Y FUNCIONES - MOF',
      companyName.toUpperCase(),
    ];

    let titleY = 100;
    titleLines.forEach((line) => {
      const textWidth = this.doc.getTextWidth(line);
      const textX = (this.pageWidth - textWidth) / 2;
      this.doc.text(line, textX, titleY);
      titleY += 10;
    });

    // Add date at bottom
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0); // Negro
    const dateText = `${currentDate.month.toUpperCase()} ${currentDate.year}`;
    const dateWidth = this.doc.getTextWidth(dateText);
    const dateX = (this.pageWidth - dateWidth) / 2;
    this.doc.text(dateText, dateX, this.pageHeight - 40);
  }

  private drawSectionTitle(areaName: string, sectionNumber: string) {
    this.checkPageBreak(15);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(`${sectionNumber} ${areaName.toUpperCase()}`, this.margin, this.currentY);
    this.currentY += 10;
  }

  private drawPuestoHeader(puestoName: string) {
    this.checkPageBreak(12);

    // Draw white box with border
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'FD');

    // Add centered text
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    const textWidth = this.doc.getTextWidth(puestoName.toUpperCase());
    const textX = (this.pageWidth - textWidth) / 2;
    this.doc.text(puestoName.toUpperCase(), textX, this.currentY + 5.5);
    this.currentY += 10;
  }

  private drawRedSectionHeader(title: string, centered: boolean = false) {
    this.checkPageBreak(10);

    // Draw red header box
    this.doc.setFillColor(...this.redColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');

    // Add white text (centered or left-aligned)
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(255, 255, 255);
    
    if (centered) {
      const textWidth = this.doc.getTextWidth(title);
      const textX = (this.pageWidth - textWidth) / 2;
      this.doc.text(title, textX, this.currentY + 5.5);
    } else {
      this.doc.text(title, this.margin + 2, this.currentY + 5.5);
    }
    
    this.currentY += 10;
  }

  private drawIdentificationSection(puesto: MOFPuestoData) {
    this.drawRedSectionHeader('IDENTIFICACIÓN DEL PUESTO');

    const rows = [
      { label: 'Unidad Orgánica:', value: puesto.NombreArea },
      { label: 'Nombre del puesto:', value: puesto.Nombre },
      { label: 'N° de posiciones del puesto:', value: puesto.cantidadResponsables.toString() },
      { label: 'Dependencia jerárquica:', value: puesto.puestoPadre || 'ninguno' },
    ];

    rows.forEach((row) => {
      this.checkPageBreak(8);

      // Draw row background
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 7, 'F');

      // Draw label
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(row.label, this.margin + 2, this.currentY + 4.5);

      // Draw value with proper spacing (aumentado a 4mm para mejor visibilidad)
      this.doc.setFont('helvetica', 'normal');
      const labelWidth = this.doc.getTextWidth(row.label);
      
      // Calcular ancho disponible para el valor
      const availableWidth = this.pageWidth - 2 * this.margin - labelWidth - 8; // 8mm = 2mm padding left + 2mm padding right + 4mm spacing
      const valueX = this.margin + 2 + labelWidth + 4; // Espacio de 4mm entre label y value
      
      // Dividir texto largo en múltiples líneas si es necesario
      const lines = this.doc.splitTextToSize(row.value, availableWidth);
      this.doc.text(lines[0], valueX, this.currentY + 4.5);

      this.currentY += 7;
    });

    this.currentY += 3;
  }

  private drawTable(
    title: string,
    items: string[],
    emptyMessage: string
  ) {
    this.drawRedSectionHeader(title);

    if (items.length === 0) {
      this.checkPageBreak(10);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(9);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(emptyMessage, this.margin + 2, this.currentY + 5);
      this.currentY += 10;
      return;
    }

    items.forEach((item, index) => {
      // Calcular altura necesaria primero
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const maxWidth = this.pageWidth - 2 * this.margin - 15;
      const lines = this.doc.splitTextToSize(item, maxWidth);
      // Altura dinámica: 3mm padding top + (líneas * 4mm) + 3mm padding bottom
      const rowHeight = Math.max(10, lines.length * 4 + 6);
      
      this.checkPageBreak(rowHeight + 5);

      // Draw table row con altura dinámica
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.1);
      this.doc.rect(this.margin, this.currentY, 10, rowHeight);
      this.doc.rect(this.margin + 10, this.currentY, this.pageWidth - 2 * this.margin - 10, rowHeight);

      // Draw number
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text((index + 1).toString(), this.margin + 4, this.currentY + 6);

      // Draw item text with wrapping
      this.doc.setFont('helvetica', 'normal');
      
      let textY = this.currentY + 6;
      lines.forEach((line: string) => {
        this.doc.text(line, this.margin + 12, textY);
        textY += 4;
      });

      this.currentY += rowHeight;
    });

    this.currentY += 3;
  }

  public async generateMOFDocument(
    puestosData: MOFPuestoData[],
    logoBase64: string | null,
    companyName: string
  ): Promise<void> {
    // Get current date
    const now = new Date();
    const months = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const currentDate = {
      month: months[now.getMonth()],
      year: now.getFullYear().toString(),
    };

    // Generate cover page
    this.generateCoverPage(logoBase64, companyName, currentDate);

    // Group puestos by area
    const groupedPuestos: GroupedPuestos = {};
    puestosData.forEach((puesto) => {
      if (!groupedPuestos[puesto.NombreArea]) {
        groupedPuestos[puesto.NombreArea] = [];
      }
      groupedPuestos[puesto.NombreArea].push(puesto);
    });

    // Generate content pages
    const areaNames = Object.keys(groupedPuestos).sort();
    areaNames.forEach((areaName, areaIndex) => {
      this.addNewPage();
      this.drawHeaderWithLogo(logoBase64);

      // Draw area section title
      const sectionNumber = `${areaIndex + 1}.1.`;
      this.drawSectionTitle(areaName, sectionNumber);

      // Draw each puesto in the area
      const puestos = groupedPuestos[areaName];
      puestos.forEach((puesto) => {
        this.drawPuestoHeader(puesto.Nombre);
        this.drawRedSectionHeader('PERFIL DE PUESTO', true);
        this.drawIdentificationSection(puesto);

        // Draw functions table
        const actividadesNombres = puesto.actividades.map((act) => act.nombre);
        this.drawTable(
          'FUNCIONES DEL PUESTO',
          actividadesNombres,
          'Sin actividades para el puesto'
        );

        // Draw technical requirements table
        this.drawTable(
          'REQUISITOS TÉCNICOS',
          puesto.requisitos,
          'Sin requisitos técnicos'
        );

        this.currentY += 5;
      });
    });
  }

  public save(filename: string) {
    this.doc.save(filename);
  }
}

export const generateMOFPDF = async (
  puestosData: MOFPuestoData[],
  logoBase64: string | null,
  companyName: string
): Promise<void> => {
  const generator = new MOFPDFGenerator();
  await generator.generateMOFDocument(puestosData, logoBase64, companyName);
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  generator.save(`MOF_${companyName.replace(/\s+/g, '_')}_${dateStr}.pdf`);
};

/**
 * Genera un PDF para una sola ficha de puesto
 */
export const generateSingleMOFPDF = (
  puestoData: {
    Nombre: string;
    NombreCargo: string;
    requisitos: string[];
    actividades: { id: string; nombre: string; descripcion: string }[];
  },
  logoBase64: string | null
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = margin;

  // Función auxiliar para verificar salto de página
  const checkPageBreak = (requiredSpace: number) => {
    if (currentY + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Contenedor principal con borde
  const containerX = margin;
  const containerWidth = pageWidth - 2 * margin;
  const containerY = margin;
  
  // Dibujar borde del contenedor
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(containerX, containerY, containerWidth, 260, 3, 3);

  currentY = containerY + 10;

  // Header con logo y título
  const headerY = currentY;
  
  // Logo a la izquierda
  if (logoBase64) {
    try {
      // Detectar el formato de la imagen desde el base64
      let imageFormat = 'PNG';
      if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
        imageFormat = 'JPEG';
      } else if (logoBase64.includes('data:image/png')) {
        imageFormat = 'PNG';
      } else if (logoBase64.includes('data:image/gif')) {
        imageFormat = 'GIF';
      }
      
      // Si el base64 no tiene el prefijo data:image, agregarlo
      let imageData = logoBase64;
      if (!logoBase64.startsWith('data:image')) {
        imageData = `data:image/png;base64,${logoBase64}`;
      }
      
      doc.addImage(imageData, imageFormat, containerX + 10, headerY, 40, 15);
    } catch (error) {
      console.error('Error al agregar logo al PDF:', error);
      // Si falla, intentar con formato PNG por defecto
      try {
        const fallbackData = logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`;
        doc.addImage(fallbackData, 'PNG', containerX + 10, headerY, 40, 15);
      } catch (fallbackError) {
        console.error('Error en fallback de logo:', fallbackError);
      }
    }
  }

  // Título "FICHA DE PUESTO" centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const title = 'FICHA DE PUESTO';
  const titleWidth = doc.getTextWidth(title);
  const titleX = containerX + (containerWidth - titleWidth) / 2;
  doc.text(title, titleX, headerY + 10);

  // Línea separadora debajo del header
  currentY = headerY + 18;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(containerX + 10, currentY, containerX + containerWidth - 10, currentY);

  currentY += 10;

  // Grid de información (Puesto y Cargo)
  const gridY = currentY;
  const cellWidth = (containerWidth - 30) / 2;
  const cellHeight = 20;

  // Celda Puesto
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(containerX + 10, gridY, cellWidth, cellHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('PUESTO', containerX + 15, gridY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(34, 34, 34);
  const puestoLines = doc.splitTextToSize(puestoData.Nombre, cellWidth - 10);
  doc.text(puestoLines, containerX + 15, gridY + 12);

  // Celda Cargo
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(containerX + 15 + cellWidth, gridY, cellWidth, cellHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('CARGO', containerX + 20 + cellWidth, gridY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(34, 34, 34);
  const cargoLines = doc.splitTextToSize(puestoData.NombreCargo, cellWidth - 10);
  doc.text(cargoLines, containerX + 20 + cellWidth, gridY + 12);

  currentY = gridY + cellHeight + 15;

  // Sección ACTIVIDADES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(34, 34, 34);
  doc.text('ACTIVIDADES', containerX + 10, currentY);
  
  // Línea debajo del título
  currentY += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(containerX + 10, currentY, containerX + containerWidth - 10, currentY);
  
  currentY += 8;

  // Listar actividades
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);

  puestoData.actividades.forEach((actividad, index) => {
    checkPageBreak(20);
    
    // Calcular altura solo para el nombre (sin descripción)
    const actividadLines = doc.splitTextToSize(actividad.nombre, containerWidth - 50);
    const actividadHeight = actividadLines.length * 5 + 10; // Padding vertical
    
    // Dibujar marco sutil como en el modal
    doc.setDrawColor(220, 220, 220); // Border color similar al modal
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 249, 250); // bg-muted/30 similar
    doc.roundedRect(containerX + 15, currentY - 3, containerWidth - 30, actividadHeight, 2, 2, 'FD');
    
    // Nombre de la actividad (solo el nombre, sin descripción)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(34, 34, 34);
    doc.text(actividadLines, containerX + 20, currentY + 2);
    currentY += actividadLines.length * 5 + 7;
    
    // Espacio entre actividades (margen)
    currentY += 5;
  });

  currentY += 5;
  checkPageBreak(30);

  // Sección REQUISITOS TÉCNICOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(34, 34, 34);
  doc.text('REQUISITOS TÉCNICOS', containerX + 10, currentY);
  
  // Línea debajo del título
  currentY += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(containerX + 10, currentY, containerX + containerWidth - 10, currentY);
  
  currentY += 8;

  // Listar requisitos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);

  if (puestoData.requisitos.length > 0) {
    puestoData.requisitos.forEach((requisito) => {
      checkPageBreak(10);
      
      // Barra lateral de color
      doc.setFillColor(107, 33, 168); // Color secundario
      doc.rect(containerX + 15, currentY - 3, 2, 5, 'F');
      
      const requisitoLines = doc.splitTextToSize(requisito, containerWidth - 35);
      doc.text(requisitoLines, containerX + 20, currentY);
      currentY += requisitoLines.length * 5 + 3;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('No se han definido requisitos técnicos.', containerX + 15, currentY);
  }

  // Guardar PDF
  const fileName = `Ficha_Puesto_${puestoData.Nombre.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
