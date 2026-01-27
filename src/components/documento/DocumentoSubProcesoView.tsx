import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { DocumentoForm, type DocumentoFormData } from '@/components/documento/DocumentoForm';
import { PDFViewer } from '@/components/documento/PDFViewer';
import { PDFDocumento } from '@/components/documento/PDFDocumento';
import { pdf } from '@react-pdf/renderer';
import { documentoService } from '@/services/documentoService';
import { puestosService } from '@/services/puestosService';
import { maestrosService } from '@/services/maestrosService';
import type { SubProceso } from '@/services/matrizProcesosService';
import type { SubProcesoDocumento } from '@/types/documento';
import {
  extractPuestoIds,
  getPuestosConDescripcion,
  generarActividadesJerarquicas,
} from '@/utils/documentHelpers';

interface DocumentoSubProcesoViewProps {
  subProceso: SubProceso;
  onBack: () => void;
}

export const DocumentoSubProcesoView = ({ subProceso, onBack }: DocumentoSubProcesoViewProps) => {
  const { toast } = useToast();
  const { getCompanyLogo } = useCompany();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documento, setDocumento] = useState<SubProcesoDocumento | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Limpiar URL del blob cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      if (!subProceso._id) {
        toast({
          title: 'Error',
          description: 'ID de subproceso no válido',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);

        // Cargar documento existente (si existe)
        const doc = await documentoService.getDocumento(subProceso._id);
        setDocumento(doc);

        // Si existe documento, generar PDF
        if (doc) {
          await generatePDF(doc, subProceso);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subProceso, toast]);

  // Generar PDF
  const generatePDF = async (doc: SubProcesoDocumento, sp: SubProceso) => {
    try {
      console.log('Iniciando generación de PDF...');
      
      // Obtener todos los puestos
      const todosPuestos = await puestosService.getAllPuestos();
      console.log('Puestos obtenidos:', todosPuestos.length);

      // Extraer IDs de puestos del subproceso
      const puestoIds = extractPuestoIds(sp);
      console.log('IDs de puestos extraídos:', puestoIds);

      // Obtener puestos con descripciones
      const puestosResponsables = getPuestosConDescripcion(puestoIds, todosPuestos);
      console.log('Puestos responsables:', puestosResponsables);

      // Generar actividades jerárquicas
      const actividadesJerarquicas = generarActividadesJerarquicas(sp);
      console.log('Actividades jerárquicas:', actividadesJerarquicas.length);

      // Obtener logo de la empresa
      const companyLogo = getCompanyLogo();
      const logoUrl = companyLogo || 'https://resource-static.cdn.bcebos.com/img/dynamic-qr-code/feedback.png';

      // Generar PDF
      console.log('Generando blob del PDF...');
      const blob = await pdf(
        <PDFDocumento
          documento={doc}
          puestosResponsables={puestosResponsables}
          actividadesJerarquicas={actividadesJerarquicas}
          logoUrl={logoUrl}
        />
      ).toBlob();

      console.log('Blob generado:', blob.size, 'bytes');

      // Limpiar URL anterior si existe
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Crear nuevo URL
      const url = URL.createObjectURL(blob);
      console.log('URL del PDF creado:', url);
      setPdfUrl(url);

      toast({
        title: 'PDF generado',
        description: 'El documento se ha generado correctamente',
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF. Revise la consola para más detalles.',
        variant: 'destructive',
      });
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (formData: DocumentoFormData) => {
    if (!subProceso._id) return;

    try {
      setSaving(true);

      let savedDoc: SubProcesoDocumento;

      if (documento) {
        // Actualizar documento existente - usar el ID del documento
        if (!documento._id) {
          throw new Error('ID de documento no válido');
        }
        
        // Obtener código del área seleccionada
        const selectedArea = await maestrosService.getAreas();
        const area = selectedArea.find(a => a._id === formData.areaId);
        const areaCodigo = area?.Codigo || formData.areaCodigo;
        
        savedDoc = await documentoService.updateDocumento(documento._id, {
          areaId: formData.areaId,
          areaCodigo: areaCodigo,
          objetivo: formData.objetivo,
          alcance: formData.alcance,
          definiciones: formData.definiciones,
          elaboradoPor: {
            usuarioId: formData.elaboradoPorId,
          },
          revisadoPor: {
            usuarioId: formData.revisadoPorId,
          },
          aprobadoPor: {
            usuarioId: formData.aprobadoPorId,
          },
          modificacion: formData.modificacion!,
        });

        toast({
          title: 'Documento actualizado',
          description: `Nueva versión ${savedDoc.version} guardada correctamente`,
        });
      } else {
        // Crear primera versión con la estructura requerida por la API
        const createRequest = {
          tipoDocumentoId: '6573c05c088f170e060c4001', // Valor por defecto
          subProcesoId: subProceso._id,
          areaId: formData.areaId,
          areaCodigo: formData.areaCodigo,
          desdeMatrizProceso: true,
          descripcionDocumento: formData.descripcionDocumento,
          objetivo: formData.objetivo,
          alcance: formData.alcance,
          definiciones: formData.definiciones,
          elaboradoPor: {
            usuarioId: formData.elaboradoPorId,
          },
          revisadoPor: {
            usuarioId: formData.revisadoPorId,
          },
          aprobadoPor: {
            usuarioId: formData.aprobadoPorId,
          },
          adjuntos: [],
        };

        savedDoc = await documentoService.createDocumento(subProceso._id, createRequest);

        toast({
          title: 'Documento creado',
          description: 'Primera versión del documento guardada correctamente',
        });
      }

      setDocumento(savedDoc);
      await generatePDF(savedDoc, subProceso);
    } catch (error: any) {
      console.error('Error al guardar documento:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo guardar el documento',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Descargar PDF
  const handleDownload = () => {
    if (!pdfUrl || !documento) return;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${documento.codigo}_v${documento.version}.pdf`;
    link.click();

    toast({
      title: 'Descarga iniciada',
      description: 'El documento se está descargando',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la Matriz
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Procedimiento: {subProceso.nombre}</h1>
          {documento && (
            <p className="text-sm text-muted-foreground mt-1">
              Código: {documento.codigo} | Versión: {documento.version}
            </p>
          )}
          {!documento && (
            <p className="text-sm text-muted-foreground mt-1">
              Vista funcionando en modo demo.
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Editar Documentación</h2>
          <DocumentoForm
            documento={documento}
            subProcesoNombre={subProceso.nombre}
            onSubmit={handleSubmit}
            loading={saving}
          />
        </div>

        {/* Vista Previa */}
        <div className="bg-card border rounded-lg p-6">
          {pdfUrl ? (
            <PDFViewer pdfUrl={pdfUrl} onDownload={handleDownload} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-muted-foreground mb-4">No hay vista previa disponible</p>
              <p className="text-sm text-muted-foreground">
                Complete el formulario y guarde para generar el documento
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
