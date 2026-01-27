import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import type { SubProcesoDocumento, Definicion } from '@/types/documento';
import type { UserData } from '@/services/usersService';
import { usersService } from '@/services/usersService';
import { maestrosService, type AreaCompleta } from '@/services/maestrosService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentoFormProps {
  documento: SubProcesoDocumento | null;
  subProcesoNombre: string;
  onSubmit: (data: DocumentoFormData) => Promise<void>;
  loading?: boolean;
}

export interface DocumentoFormData {
  areaId: string;
  areaCodigo: string;
  descripcionDocumento: string;
  objetivo: string;
  alcance: string;
  definiciones: Omit<Definicion, 'id'>[];
  elaboradoPorId: string;
  revisadoPorId: string;
  aprobadoPorId: string;
  modificacion?: string;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  users: UserData[];
  label: string;
  required?: boolean;
}

const UserSelect = ({ value, onChange, users, label, required }: UserSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find(u => u.id === value);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUser
              ? `${selectedUser.name} ${selectedUser.lastName}`
              : `Seleccionar ${label.toLowerCase()}...`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
            <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {users.map(user => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.lastName}`}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {user.name} {user.lastName}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const DocumentoForm = ({
  documento,
  subProcesoNombre,
  onSubmit,
  loading = false,
}: DocumentoFormProps) => {
  const { toast } = useToast();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [areas, setAreas] = useState<AreaCompleta[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Form state
  const [areaId, setAreaId] = useState('');
  const [descripcionDocumento, setDescripcionDocumento] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [alcance, setAlcance] = useState('');
  const [definiciones, setDefiniciones] = useState<Omit<Definicion, 'id'>[]>([]);
  const [elaboradoPorId, setElaboradoPorId] = useState('');
  const [revisadoPorId, setRevisadoPorId] = useState('');
  const [aprobadoPorId, setAprobadoPorId] = useState('');
  const [modificacion, setModificacion] = useState('');

  // Nueva definición temporal
  const [nuevoTermino, setNuevoTermino] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');

  const isFirstVersion = !documento;
  const isModificacionRequired = !isFirstVersion;

  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersService.getUsers();
        setUsers(data.filter(u => u.isActive));
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los usuarios',
          variant: 'destructive',
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Cargar áreas
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await maestrosService.getAreas();
        setAreas(data.filter(a => a.IsActive));
      } catch (error) {
        console.error('Error al cargar áreas:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las áreas',
          variant: 'destructive',
        });
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [toast]);

  // Cargar datos del documento existente
  useEffect(() => {
    if (documento) {
      if (documento.areaId) {
        setAreaId(documento.areaId);
      }
      setObjetivo(documento.objetivo);
      setAlcance(documento.alcance);
      setDefiniciones(
        documento.definiciones.map(d => ({
          termino: d.termino,
          descripcion: d.descripcion,
        }))
      );
      setElaboradoPorId(documento.elaboradoPor.usuarioId);
      setRevisadoPorId(documento.revisadoPor.usuarioId);
      setAprobadoPorId(documento.aprobadoPor.usuarioId);
    }
  }, [documento]);

  const agregarDefinicion = () => {
    if (!nuevoTermino.trim() || !nuevaDescripcion.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Debe completar el término y la descripción',
        variant: 'destructive',
      });
      return;
    }

    setDefiniciones([
      ...definiciones,
      {
        termino: nuevoTermino.trim(),
        descripcion: nuevaDescripcion.trim(),
      },
    ]);

    setNuevoTermino('');
    setNuevaDescripcion('');

    toast({
      title: 'Definición agregada',
      description: 'La definición se agregó correctamente',
    });
  };

  const eliminarDefinicion = (index: number) => {
    setDefiniciones(definiciones.filter((_, i) => i !== index));
    toast({
      title: 'Definición eliminada',
      description: 'La definición se eliminó correctamente',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!areaId) {
      toast({
        title: 'Campo requerido',
        description: 'El área es obligatoria',
        variant: 'destructive',
      });
      return;
    }

    if (isFirstVersion && !descripcionDocumento.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'La descripción del documento es obligatoria',
        variant: 'destructive',
      });
      return;
    }

    if (!objetivo.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El objetivo es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (!alcance.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El alcance es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (!elaboradoPorId || !revisadoPorId || !aprobadoPorId) {
      toast({
        title: 'Campos requeridos',
        description: 'Debe seleccionar elaborador, revisor y aprobador',
        variant: 'destructive',
      });
      return;
    }

    if (isModificacionRequired && !modificacion.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'La descripción de la modificación es obligatoria para actualizaciones',
        variant: 'destructive',
      });
      return;
    }

    // Obtener código del área seleccionada
    const selectedArea = areas.find(a => a._id === areaId);
    const areaCodigo = selectedArea?.Codigo || '';

    const formData: DocumentoFormData = {
      areaId,
      areaCodigo,
      descripcionDocumento: descripcionDocumento.trim(),
      objetivo: objetivo.trim(),
      alcance: alcance.trim(),
      definiciones,
      elaboradoPorId,
      revisadoPorId,
      aprobadoPorId,
    };

    if (isModificacionRequired) {
      formData.modificacion = modificacion.trim();
    }

    await onSubmit(formData);
  };

  if (loadingUsers || loadingAreas) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando formulario...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Área - Siempre visible */}
        <div className="space-y-2">
          <Label htmlFor="area">
            Área <span className="text-destructive">*</span>
          </Label>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar área" />
            </SelectTrigger>
            <SelectContent>
              {areas.map(area => (
                <SelectItem key={area._id} value={area._id}>
                  {area.Nombre} ({area.Codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descripción del Documento - Solo para primera versión */}
        {isFirstVersion && (
          <div className="space-y-2">
            <Label htmlFor="descripcionDocumento">
              Descripción del Documento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="descripcionDocumento"
              value={descripcionDocumento}
              onChange={e => setDescripcionDocumento(e.target.value)}
              placeholder="Descripción detallada del propósito de este documento."
              rows={2}
              required
            />
          </div>
        )}

        {/* Objetivo */}
        <div className="space-y-2">
          <Label htmlFor="objetivo">
            Objetivo <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="objetivo"
            value={objetivo}
            onChange={e => setObjetivo(e.target.value)}
            placeholder="Asegurar el control y registro adecuado de los inventarios."
            rows={3}
            required
          />
        </div>

        {/* Alcance */}
        <div className="space-y-2">
          <Label htmlFor="alcance">
            Alcance <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="alcance"
            value={alcance}
            onChange={e => setAlcance(e.target.value)}
            placeholder="Aplica a todas las áreas donde se maneje inventario físico."
            rows={3}
            required
          />
        </div>

        {/* Elaborado por */}
        <UserSelect
          value={elaboradoPorId}
          onChange={setElaboradoPorId}
          users={users}
          label="Elaborado por"
          required
        />

        {/* Revisado por */}
        <UserSelect
          value={revisadoPorId}
          onChange={setRevisadoPorId}
          users={users}
          label="Revisado por"
          required
        />

        {/* Aprobado por */}
        <UserSelect
          value={aprobadoPorId}
          onChange={setAprobadoPorId}
          users={users}
          label="Aprobado por"
          required
        />

        {/* Definiciones */}
        <div className="space-y-3">
          <Label>Definiciones</Label>

          {/* Lista de definiciones existentes */}
          {definiciones.length > 0 && (
            <div className="space-y-2">
              {definiciones.map((def, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{def.termino}</p>
                    <p className="text-sm text-muted-foreground mt-1">{def.descripcion}</p>
                  </div>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarDefinicion(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar nueva definición */}
          {canCreate && (
            <div className="border rounded-lg p-4 space-y-3 bg-background">
              <div className="space-y-2">
                <Label htmlFor="nuevoTermino">Término</Label>
                <Input
                  id="nuevoTermino"
                  value={nuevoTermino}
                  onChange={e => setNuevoTermino(e.target.value)}
                  placeholder="Ej: Ventana Horaria (VH)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevaDescripcion">Descripción</Label>
                <Textarea
                  id="nuevaDescripcion"
                  value={nuevaDescripcion}
                  onChange={e => setNuevaDescripcion(e.target.value)}
                  placeholder="Ej: Franja de tiempo acordada entre el proveedor y el área de almacén..."
                  rows={2}
                />
              </div>
              <Button type="button" onClick={agregarDefinicion} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Definición
              </Button>
            </div>
          )}
        </div>

        {/* Control de Cambios */}
        <div className="space-y-2">
          <Label htmlFor="modificacion">
            Descripción de la Modificación
            {isModificacionRequired && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id="modificacion"
            value={modificacion}
            onChange={e => setModificacion(e.target.value)}
            placeholder={
              isFirstVersion
                ? 'Deshabilitado para la primera versión (se agregará automáticamente "Actualización inicial del proceso")'
                : 'Describa los cambios realizados en esta versión'
            }
            rows={2}
            disabled={isFirstVersion}
            required={isModificacionRequired}
          />
          {isFirstVersion && (
            <p className="text-xs text-muted-foreground">
              Para la primera versión (1.0), se agregará automáticamente: "Actualización inicial
              del proceso"
            </p>
          )}
        </div>
      </div>

      {/* Control de Cambios Table Preview */}
      {documento && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-semibold mb-3">Vista Previa - Control de Cambios</h4>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-2 text-left w-16">Ítem</th>
                  <th className="border p-2 text-left">Modificación</th>
                  <th className="border p-2 text-left w-24">Versión</th>
                </tr>
              </thead>
              <tbody className="bg-background">
                {documento.controlCambios.map(cambio => (
                  <tr key={cambio.item}>
                    <td className="border p-2">{cambio.item}</td>
                    <td className="border p-2">{cambio.modificacion}</td>
                    <td className="border p-2">{cambio.version}</td>
                  </tr>
                ))}
                {modificacion.trim() && (
                  <tr className="bg-primary/5">
                    <td className="border p-2">{documento.controlCambios.length + 1}</td>
                    <td className="border p-2">{modificacion}</td>
                    <td className="border p-2">
                      {(() => {
                        const [major, minor] = documento.version.split('.').map(Number);
                        return `${major}.${minor + 1}`;
                      })()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {(canCreate || canUpdate) && (
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isFirstVersion ? 'Guardar Primera Versión' : 'Guardar Nueva Versión'}
        </Button>
      )}
    </form>
  );
};
