import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MOFDetalle } from '@/services/puestosService';
import { generateSingleMOFPDF } from '@/utils/mofPdfGenerator';
import { useCompany } from '@/contexts/CompanyContext';

interface MOFViewerProps {
  open: boolean;
  onClose: () => void;
  data: MOFDetalle | null;
}

const MOFViewer: React.FC<MOFViewerProps> = ({ open, onClose, data }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { getCompanyLogo } = useCompany();

  const handleDownload = () => {
    if (!data) return;

    // Obtener el logo de la empresa
    const companyLogo = getCompanyLogo();
    
    console.log('Logo de empresa para PDF:', companyLogo ? 'Logo encontrado' : 'No hay logo');

    // Generar PDF directamente
    generateSingleMOFPDF(
      {
        Nombre: data.Nombre,
        NombreCargo: data.NombreCargo,
        requisitos: data.requisitos,
        actividades: data.actividades.map(act => ({
          id: act.id,
          nombre: act.nombre,
          descripcion: act.descripcion,
        })),
      },
      companyLogo
    );
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-end pr-8">
            <Button
              onClick={handleDownload}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar MOF
            </Button>
          </div>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 p-6 border-2 rounded-xl">
          {/* Header */}
          <div className="text-center pb-4 border-b-2">
            <h2 className="text-2xl font-bold">FICHA DE PUESTO</h2>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border p-4 rounded-lg bg-muted/30">
              <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                Puesto
              </div>
              <div className="text-base font-semibold">{data.Nombre}</div>
            </div>
            <div className="border border-border p-4 rounded-lg bg-muted/30">
              <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                Cargo
              </div>
              <div className="text-base font-semibold">{data.NombreCargo}</div>
            </div>
          </div>

          {/* Actividades */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold pb-2 border-b-2 uppercase tracking-wide">
              Actividades
            </h3>
            <div className="space-y-2">
              {data.actividades.length > 0 ? (
                data.actividades.map((actividad) => (
                  <div
                    key={actividad.id}
                    className="border border-border p-3 rounded-lg bg-muted/30"
                  >
                    <div className="font-semibold">
                      {actividad.nombre}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm italic text-center py-3">
                  No hay actividades registradas
                </p>
              )}
            </div>
          </div>

          {/* Requisitos Técnicos */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold pb-2 border-b-2 uppercase tracking-wide">
              Requisitos Técnicos
            </h3>
            <div className="space-y-2">
              {data.requisitos.length > 0 ? (
                data.requisitos.map((requisito, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-foreground pl-4 py-2 bg-muted/30 rounded-r"
                  >
                    {requisito}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm italic text-center py-3">
                  No hay requisitos registrados
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MOFViewer;
