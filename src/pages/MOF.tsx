import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cargosService, Cargo } from '@/services/cargosService';
import { puestosService, Puesto, MOFListItem, MOFDetalle } from '@/services/puestosService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { companyService } from '@/services/companyService';
import MOFViewer from '@/components/mof/MOFViewer';
import { generateMOFPDF } from '@/utils/mofPdfGenerator';

const ITEMS_PER_PAGE = 10;

const MOF: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para datos
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [mofListado, setMofListado] = useState<MOFListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  // Estados para filtros
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');
  const [selectedPuestoId, setSelectedPuestoId] = useState<string>('');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para visor MOF
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mofDetalle, setMofDetalle] = useState<MOFDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cargar puestos cuando cambia el cargo seleccionado
  useEffect(() => {
    if (selectedCargoId && selectedCargoId !== 'all') {
      loadPuestosByCargo(selectedCargoId);
    } else {
      setPuestos([]);
      setSelectedPuestoId('');
    }
  }, [selectedCargoId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cargosData, mofData] = await Promise.all([
        cargosService.getCargos(),
        puestosService.getMOFListado(),
      ]);
      setCargos(cargosData);
      setMofListado(mofData);
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

  const loadPuestosByCargo = async (cargoId: string) => {
    try {
      const puestosData = await puestosService.getPuestosByCargoId(cargoId);
      setPuestos(puestosData);
    } catch (error) {
      console.error('Error al cargar puestos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los puestos',
        variant: 'destructive',
      });
    }
  };

  const handleCargoChange = (value: string) => {
    setSelectedCargoId(value);
    setSelectedPuestoId('');
    setCurrentPage(1);
  };

  const handlePuestoChange = (value: string) => {
    setSelectedPuestoId(value);
    setCurrentPage(1);
  };

  const handleViewMOF = async (puestoId: string) => {
    try {
      setLoadingDetalle(true);
      const detalle = await puestosService.getMOFDetalle(puestoId);
      setMofDetalle(detalle);
      setViewerOpen(true);
    } catch (error) {
      console.error('Error al cargar detalle MOF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el detalle del MOF',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleDownloadMOF = async () => {
    try {
      setDownloadingPDF(true);

      // Get IDs of filtered puestos
      const puestoIds = filteredData.map((item) => item._id);

      if (puestoIds.length === 0) {
        toast({
          title: 'Advertencia',
          description: 'No hay puestos para descargar',
          variant: 'destructive',
        });
        return;
      }

      // Fetch MOF data for all filtered puestos
      const mofData = await puestosService.getMOFMasivo(puestoIds);

      // Get company logo and name
      let companyLogo: string | null = null;
      let companyName = 'EMPRESA';

      if (user?.empresa_id) {
        try {
          const companyData = await companyService.getCompanyById(user.empresa_id);
          companyLogo = companyData.logo;
          companyName = companyData.businessName;
        } catch (error) {
          console.error('Error al obtener datos de la empresa:', error);
          // Continue with default values
        }
      }

      // Generate PDF
      await generateMOFPDF(mofData, companyLogo, companyName);

      toast({
        title: 'Éxito',
        description: 'MOF descargado correctamente',
      });
    } catch (error) {
      console.error('Error al descargar MOF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el documento MOF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Filtrar datos según selección
  const filteredData = useMemo(() => {
    let filtered = [...mofListado];

    if (selectedCargoId && selectedCargoId !== 'all') {
      filtered = filtered.filter((item) => item.CargoId === selectedCargoId);
    }

    if (selectedPuestoId && selectedPuestoId !== 'all') {
      filtered = filtered.filter((item) => item._id === selectedPuestoId);
    }

    return filtered;
  }, [mofListado, selectedCargoId, selectedPuestoId]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">MOF</h1>
        <p className="text-muted-foreground mt-2">
          Manual de Organización y Funciones
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Filtros y botón descargar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select value={selectedCargoId} onValueChange={handleCargoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cargos</SelectItem>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo._id} value={cargo._id}>
                      {cargo.Nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select
                value={selectedPuestoId}
                onValueChange={handlePuestoChange}
                disabled={!selectedCargoId || selectedCargoId === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Puesto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los puestos</SelectItem>
                  {puestos.map((puesto) => (
                    <SelectItem key={puesto._id} value={puesto._id}>
                      {puesto.Nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="default" className="md:w-auto" onClick={handleDownloadMOF} disabled={downloadingPDF || filteredData.length === 0}>
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar MOF
                </>
              )}
            </Button>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Cargo</TableHead>
                  <TableHead className="font-bold">Puesto</TableHead>
                  <TableHead className="font-bold text-center">MOF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.NombreCargo}</TableCell>
                      <TableCell>{item.Nombre}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMOF(item._id)}
                          disabled={loadingDetalle}
                        >
                          <FileText className="w-5 h-5 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} - {Math.min(endIndex, filteredData.length)} de{' '}
                {filteredData.length} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visor MOF */}
      <MOFViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        data={mofDetalle}
      />
    </div>
  );
};

export default MOF;
