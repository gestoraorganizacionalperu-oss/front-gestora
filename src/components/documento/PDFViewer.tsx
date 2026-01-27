import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  onDownload?: () => void;
}

export const PDFViewer = ({ pdfUrl, onDownload }: PDFViewerProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Reset loading state when pdfUrl changes
    setLoading(true);
    setError('');

    // Verificar que el URL es válido
    if (!pdfUrl || pdfUrl.trim() === '') {
      setError('URL del PDF no válida');
      setLoading(false);
      return;
    }

    // Simular carga exitosa después de un breve delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pdfUrl]);

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vista Previa</h3>
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-destructive mb-2">Error al cargar el PDF</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con botón de descarga */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Vista Previa</h3>
        {onDownload && !loading && (
          <Button onClick={onDownload} variant="default" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        )}
      </div>

      {/* Visor de PDF */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-muted/30 flex flex-col relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Cargando documento...</p>
            </div>
          </div>
        )}
        
        {/* Object tag para mostrar el PDF - más compatible que iframe */}
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full border-0"
          title="Vista previa del documento PDF"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError('No se pudo cargar el documento PDF');
          }}
        >
          {/* Fallback si el navegador no puede mostrar PDFs */}
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Su navegador no puede mostrar el PDF directamente.
            </p>
            {onDownload && (
              <Button onClick={onDownload} variant="default">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}
          </div>
        </object>
      </div>
    </div>
  );
};
