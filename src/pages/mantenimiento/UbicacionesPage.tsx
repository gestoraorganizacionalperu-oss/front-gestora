import { useState, useEffect } from 'react';
import { Plus, MapPin, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ubicacionesService } from '@/services/ubicacionesService';
import type { Ubicacion, Area } from '@/types/ubicaciones';
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

export default function UbicacionesPage() {
  const { toast } = useToast();
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedUbicaciones, setExpandedUbicaciones] = useState<Set<string>>(new Set());

  // Estados para diálogos de ubicación
  const [ubicacionDialogOpen, setUbicacionDialogOpen] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  const [ubicacionNombre, setUbicacionNombre] = useState('');

  // Estados para diálogos de área
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<{ ubicacionId: string; area: Area } | null>(null);
  const [areaNombre, setAreaNombre] = useState('');
  const [areaCodigo, setAreaCodigo] = useState('');
  const [selectedUbicacionId, setSelectedUbicacionId] = useState<string>('');

  // Estados para confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'ubicacion' | 'area';
    ubicacionId: string;
    areaId?: string;
  } | null>(null);

  // Cargar ubicaciones
  useEffect(() => {
    fetchUbicaciones();
  }, []);

  const fetchUbicaciones = async () => {
    try {
      setLoading(true);
      const data = await ubicacionesService.getUbicaciones();
      setUbicaciones(data);
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ubicaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveUbicaciones = async (updatedUbicaciones: Ubicacion[]) => {
    try {
      setSaving(true);
      const result = await ubicacionesService.updateUbicaciones(updatedUbicaciones);
      
      // Asegurar que result sea un array antes de actualizar el estado
      if (Array.isArray(result)) {
        setUbicaciones(result);
      } else {
        // Si el backend devuelve un objeto, recargar los datos
        console.warn('Backend no devolvió un array, recargando datos...');
        await fetchUbicaciones();
      }
      
      toast({
        title: 'Éxito',
        description: 'Los cambios se guardaron correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error al guardar ubicaciones:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Manejo de expansión/colapso
  const toggleUbicacion = (ubicacionId: string) => {
    const newExpanded = new Set(expandedUbicaciones);
    if (newExpanded.has(ubicacionId)) {
      newExpanded.delete(ubicacionId);
    } else {
      newExpanded.add(ubicacionId);
    }
    setExpandedUbicaciones(newExpanded);
  };

  // CRUD de Ubicaciones
  const handleCreateUbicacion = () => {
    setEditingUbicacion(null);
    setUbicacionNombre('');
    setUbicacionDialogOpen(true);
  };

  const handleEditUbicacion = (ubicacion: Ubicacion) => {
    setEditingUbicacion(ubicacion);
    setUbicacionNombre(ubicacion.nombre);
    setUbicacionDialogOpen(true);
  };

  const handleSaveUbicacion = async () => {
    if (!ubicacionNombre.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El nombre de la ubicación es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    let updatedUbicaciones: Ubicacion[];

    if (editingUbicacion) {
      // Editar ubicación existente
      updatedUbicaciones = ubicaciones.map((ub) =>
        ub.id === editingUbicacion.id ? { ...ub, nombre: ubicacionNombre.trim() } : ub
      );
    } else {
      // Crear nueva ubicación
      const newUbicacion: Ubicacion = {
        nombre: ubicacionNombre.trim(),
        isActive: true,
        areas: [],
      };
      updatedUbicaciones = [...ubicaciones, newUbicacion];
    }

    const success = await saveUbicaciones(updatedUbicaciones);
    if (success) {
      setUbicacionDialogOpen(false);
    }
  };

  const handleDeleteUbicacion = (ubicacion: Ubicacion) => {
    if (!ubicacion.id) return;
    setDeleteTarget({ type: 'ubicacion', ubicacionId: ubicacion.id });
    setDeleteDialogOpen(true);
  };

  // CRUD de Áreas
  const handleCreateArea = (ubicacionId: string) => {
    setSelectedUbicacionId(ubicacionId);
    setEditingArea(null);
    setAreaNombre('');
    setAreaCodigo('');
    setAreaDialogOpen(true);
  };

  const handleEditArea = (ubicacionId: string, area: Area) => {
    setEditingArea({ ubicacionId, area });
    setAreaNombre(area.nombre);
    setAreaCodigo(area.Codigo || '');
    setAreaDialogOpen(true);
  };

  const handleSaveArea = async () => {
    if (!areaNombre.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El nombre del área es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    // Validar código: debe tener 2 o 3 caracteres
    if (!areaCodigo.trim() || areaCodigo.trim().length < 2 || areaCodigo.trim().length > 3) {
      toast({
        title: 'Código inválido',
        description: 'El código debe tener 2 o 3 caracteres',
        variant: 'destructive',
      });
      return;
    }

    let updatedUbicaciones: Ubicacion[];

    if (editingArea) {
      // Editar área existente
      updatedUbicaciones = ubicaciones.map((ub) => {
        if (ub.id === editingArea.ubicacionId) {
          return {
            ...ub,
            areas: ub.areas.map((area) =>
              area.id === editingArea.area.id 
                ? { ...area, nombre: areaNombre.trim(), Codigo: areaCodigo.trim().toUpperCase() } 
                : area
            ),
          };
        }
        return ub;
      });
    } else {
      // Crear nueva área
      updatedUbicaciones = ubicaciones.map((ub) => {
        if (ub.id === selectedUbicacionId) {
          const newArea: Area = {
            nombre: areaNombre.trim(),
            Codigo: areaCodigo.trim().toUpperCase(),
            isActive: true,
          };
          return {
            ...ub,
            areas: [...ub.areas, newArea],
          };
        }
        return ub;
      });
    }

    const success = await saveUbicaciones(updatedUbicaciones);
    if (success) {
      setAreaDialogOpen(false);
    }
  };

  const handleDeleteArea = (ubicacionId: string, areaId: string) => {
    setDeleteTarget({ type: 'area', ubicacionId, areaId });
    setDeleteDialogOpen(true);
  };

  // Confirmación de eliminación
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    let updatedUbicaciones: Ubicacion[];

    if (deleteTarget.type === 'ubicacion') {
      // Eliminación lógica de ubicación
      updatedUbicaciones = ubicaciones.map((ub) =>
        ub.id === deleteTarget.ubicacionId ? { ...ub, isActive: false } : ub
      );
    } else {
      // Eliminación lógica de área
      updatedUbicaciones = ubicaciones.map((ub) => {
        if (ub.id === deleteTarget.ubicacionId) {
          return {
            ...ub,
            areas: ub.areas.map((area) =>
              area.id === deleteTarget.areaId ? { ...area, isActive: false } : area
            ),
          };
        }
        return ub;
      });
    }

    const success = await saveUbicaciones(updatedUbicaciones);
    if (success) {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // Filtrar solo ubicaciones activas
  const activeUbicaciones = Array.isArray(ubicaciones) 
    ? ubicaciones.filter((ub) => ub.isActive)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando ubicaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ubicaciones y Áreas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las ubicaciones de la empresa y sus áreas asociadas
          </p>
        </div>
        <Button onClick={handleCreateUbicacion} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ubicación
        </Button>
      </div>

      {/* Lista de Ubicaciones */}
      <div className="space-y-4">
        {activeUbicaciones.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No hay ubicaciones registradas</p>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza agregando una nueva ubicación
              </p>
              <Button onClick={handleCreateUbicacion}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Ubicación
              </Button>
            </CardContent>
          </Card>
        ) : (
          activeUbicaciones.map((ubicacion) => {
            const isExpanded = ubicacion.id ? expandedUbicaciones.has(ubicacion.id) : false;
            const activeAreas = ubicacion.areas.filter((area) => area.isActive);

            return (
              <Card key={ubicacion.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => ubicacion.id && toggleUbicacion(ubicacion.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{ubicacion.nombre}</CardTitle>
                        <CardDescription>
                          {activeAreas.length} {activeAreas.length === 1 ? 'área' : 'áreas'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ubicacion.id && handleCreateArea(ubicacion.id)}
                        disabled={saving}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Área
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUbicacion(ubicacion)}
                        disabled={saving}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUbicacion(ubicacion)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-6">
                    {activeAreas.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No hay áreas en esta ubicación</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => ubicacion.id && handleCreateArea(ubicacion.id)}
                          disabled={saving}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Primera Área
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {activeAreas.map((area) => (
                          <div
                            key={area.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-primary"></div>
                              <span className="font-medium">
                                {area.nombre}
                                {area.Codigo && (
                                  <span className="ml-2 text-sm text-muted-foreground font-normal">
                                    ({area.Codigo})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => ubicacion.id && handleEditArea(ubicacion.id, area)}
                                disabled={saving}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  ubicacion.id && area.id && handleDeleteArea(ubicacion.id, area.id)
                                }
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Diálogo de Ubicación */}
      <Dialog open={ubicacionDialogOpen} onOpenChange={setUbicacionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
            </DialogTitle>
            <DialogDescription>
              {editingUbicacion
                ? 'Modifica los datos de la ubicación'
                : 'Ingresa los datos de la nueva ubicación'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ubicacion-nombre">
                Nombre de la Ubicación <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ubicacion-nombre"
                value={ubicacionNombre}
                onChange={(e) => setUbicacionNombre(e.target.value)}
                placeholder="Ej: Planta de Producción"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUbicacionDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUbicacion} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Área */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
            <DialogDescription>
              {editingArea ? 'Modifica los datos del área' : 'Ingresa los datos de la nueva área'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-nombre">
                Nombre del Área <span className="text-destructive">*</span>
              </Label>
              <Input
                id="area-nombre"
                value={areaNombre}
                onChange={(e) => setAreaNombre(e.target.value)}
                placeholder="Ej: Área de Mantenimiento"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-codigo">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="area-codigo"
                value={areaCodigo}
                onChange={(e) => setAreaCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: GG"
                maxLength={3}
                disabled={saving}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                El código debe tener 2 o 3 caracteres (Ej: GG, GI, TI)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveArea} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'ubicacion'
                ? 'Esta acción desactivará la ubicación y todas sus áreas asociadas. Los datos no se eliminarán permanentemente.'
                : 'Esta acción desactivará el área. Los datos no se eliminarán permanentemente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
