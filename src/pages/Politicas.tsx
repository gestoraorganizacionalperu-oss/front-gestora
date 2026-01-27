import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Loader2, Edit, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { matrizProcesosService, type DocumentoListadoItem } from '@/services/matrizProcesosService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PoliticasEditForm from '@/components/politicas/PoliticasEditForm';
import { useAuth } from '@/contexts/AuthContext';

const Politicas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canCreate, canUpdate } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<DocumentoListadoItem[]>([]);
  const [editingDocumentoId, setEditingDocumentoId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Estados para el diálogo de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    documentoId: string;
    type: 'elaborado' | 'revisado' | 'aprobado';
  } | null>(null);

  // Cargar listado de documentos
  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        const data = await matrizProcesosService.getListadoDocumentos();
        setDocumentos(data);
      } catch (error: any) {
        console.error('Error al cargar documentos:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los documentos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, [toast]);

  // Filtrar documentos por búsqueda
  const filteredDocumentos = useMemo(() => {
    if (!searchTerm.trim()) return documentos;

    const searchLower = searchTerm.toLowerCase().trim();
    return documentos.filter((doc) => {
      return (
        doc.codigo?.toLowerCase().includes(searchLower) ||
        doc.descripcionDocumento?.toLowerCase().includes(searchLower) ||
        doc.descripcionSubProceso?.toLowerCase().includes(searchLower) ||
        doc.Cambios?.toLowerCase().includes(searchLower) ||
        doc.areaDescripcion?.toLowerCase().includes(searchLower) ||
        doc.tipoDocumentoDescripcion?.toLowerCase().includes(searchLower)
      );
    });
  }, [documentos, searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredDocumentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocumentos = filteredDocumentos.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleEdit = (documentoId: string) => {
    setEditingDocumentoId(documentoId);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingDocumentoId(null);
  };

  const handleBackToList = () => {
    setEditingDocumentoId(null);
    setIsCreating(false);
    // Recargar listado
    const fetchDocumentos = async () => {
      try {
        const data = await matrizProcesosService.getListadoDocumentos();
        setDocumentos(data);
      } catch (error: any) {
        console.error('Error al cargar documentos:', error);
      }
    };
    fetchDocumentos();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Verificar si el usuario puede aprobar
  const canUserApprove = (doc: DocumentoListadoItem, type: 'elaborado' | 'revisado' | 'aprobado'): boolean => {
    if (!user?.id) return false;

    switch (type) {
      case 'elaborado':
        return doc.elaboradoPor.usuarioId === user.id;
      case 'revisado':
        return doc.revisadoPor.usuarioId === user.id;
      case 'aprobado':
        return doc.aprobadoPor.usuarioId === user.id;
      default:
        return false;
    }
  };

  // Manejar click en checkbox
  const handleCheckboxClick = (doc: DocumentoListadoItem, type: 'elaborado' | 'revisado' | 'aprobado') => {
    // Verificar si el usuario puede aprobar
    if (!canUserApprove(doc, type)) {
      return;
    }

    // Verificar si ya está aprobado
    if (
      (type === 'elaborado' && doc.vbElaborado) ||
      (type === 'revisado' && doc.vbRevisado) ||
      (type === 'aprobado' && doc.vbAprobado)
    ) {
      toast({
        title: 'Ya aprobado',
        description: 'Este visto bueno ya ha sido aprobado',
        variant: 'default',
      });
      return;
    }

    // Verificar orden de aprobación
    if (type === 'revisado' && !doc.vbElaborado) {
      toast({
        title: 'Aprobación pendiente',
        description: 'Debe aprobarse primero el VB Elaborado antes de aprobar el VB Revisado',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'aprobado' && (!doc.vbElaborado || !doc.vbRevisado)) {
      toast({
        title: 'Aprobaciones pendientes',
        description: 'Deben aprobarse primero el VB Elaborado y el VB Revisado antes de aprobar el VB Aprobado',
        variant: 'destructive',
      });
      return;
    }

    // Mostrar diálogo de confirmación
    setPendingApproval({ documentoId: doc._id, type });
    setShowConfirmDialog(true);
  };

  // Confirmar aprobación
  const handleConfirmApproval = async () => {
    if (!pendingApproval) return;

    try {
      const { documentoId, type } = pendingApproval;

      // Llamar al servicio correspondiente
      switch (type) {
        case 'elaborado':
          await matrizProcesosService.aprobarVBElaborado(documentoId);
          break;
        case 'revisado':
          await matrizProcesosService.aprobarVBRevisado(documentoId);
          break;
        case 'aprobado':
          await matrizProcesosService.aprobarVBAprobado(documentoId);
          break;
      }

      toast({
        title: 'Aprobación exitosa',
        description: `El visto bueno ${type} ha sido aprobado correctamente`,
      });

      // Recargar listado
      const data = await matrizProcesosService.getListadoDocumentos();
      setDocumentos(data);
    } catch (error: any) {
      console.error('Error al aprobar:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo aprobar el visto bueno',
        variant: 'destructive',
      });
    } finally {
      setShowConfirmDialog(false);
      setPendingApproval(null);
    }
  };

  // Cancelar aprobación
  const handleCancelApproval = () => {
    setShowConfirmDialog(false);
    setPendingApproval(null);
  };

  // Si estamos creando o editando, mostrar el formulario
  if (isCreating || editingDocumentoId) {
    return <PoliticasEditForm documentoId={editingDocumentoId || undefined} onBack={handleBackToList} />;
  }

  // Mostrar listado
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Políticas y Procedimientos</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de políticas y procedimientos organizacionales
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <CardTitle>Listado de Documentos</CardTitle>
            </div>
            {canCreate && (
              <Button 
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código, descripción, cambios, área o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Cargando documentos...</span>
            </div>
          ) : filteredDocumentos.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron documentos que coincidan con la búsqueda' : 'No hay documentos registrados'}
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Editar</TableHead>
                      <TableHead className="w-[150px]">Código</TableHead>
                      <TableHead className="min-w-[250px] max-w-[400px]">Descripción del documento</TableHead>
                      <TableHead className="w-[150px]">Área</TableHead>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead className="w-[100px]">Versión</TableHead>
                      <TableHead className="min-w-[200px] max-w-[300px]">Cambios</TableHead>
                      <TableHead className="w-[120px] text-center">VB Elaborado</TableHead>
                      <TableHead className="w-[120px] text-center">VB Revisado</TableHead>
                      <TableHead className="w-[120px] text-center">VB Aprobado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocumentos.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc._id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{doc.codigo}</TableCell>
                        <TableCell className="whitespace-normal break-words min-w-[250px] max-w-[400px]">
                          {doc.descripcionSubProceso || doc.descripcionDocumento}
                        </TableCell>
                        <TableCell>{doc.areaDescripcion}</TableCell>
                        <TableCell>{doc.tipoDocumentoDescripcion}</TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell className="whitespace-normal break-words min-w-[200px] max-w-[300px]">
                          {doc.Cambios || '-'}
                        </TableCell>
                        <TableCell className={`text-center ${canUserApprove(doc, 'elaborado') && !doc.vbElaborado ? 'bg-primary/5' : ''}`}>
                          {(doc.vbElaborado || canUserApprove(doc, 'elaborado')) && (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={doc.vbElaborado}
                                onCheckedChange={() => handleCheckboxClick(doc, 'elaborado')}
                                disabled={doc.vbElaborado}
                                className="border-2 border-foreground/40"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={`text-center ${canUserApprove(doc, 'revisado') && !doc.vbRevisado ? 'bg-primary/5' : ''}`}>
                          {(doc.vbRevisado || canUserApprove(doc, 'revisado')) && (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={doc.vbRevisado}
                                onCheckedChange={() => handleCheckboxClick(doc, 'revisado')}
                                disabled={doc.vbRevisado}
                                className="border-2 border-foreground/40"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={`text-center ${canUserApprove(doc, 'aprobado') && !doc.vbAprobado ? 'bg-primary/5' : ''}`}>
                          {(doc.vbAprobado || canUserApprove(doc, 'aprobado')) && (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={doc.vbAprobado}
                                onCheckedChange={() => handleCheckboxClick(doc, 'aprobado')}
                                disabled={doc.vbAprobado}
                                className="border-2 border-foreground/40"
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredDocumentos.length)} de {filteredDocumentos.length} documentos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Mostrar solo páginas cercanas a la actual
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Visto Bueno</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea dar su visto bueno {pendingApproval?.type}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelApproval}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApproval}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Politicas;
