import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Download, Plus, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import {
  matrizProcesosService,
  type DocumentoMatrizResponse,
  type TipoDocumento,
  type SubProcesoPadre,
  type ControlCambio,
  type Adjunto,
} from '@/services/matrizProcesosService';
import { maestrosService, type AreaCompleta } from '@/services/maestrosService';
import { usersService, type UserData } from '@/services/usersService';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PoliticasEditFormProps {
  documentoId?: string; // Optional for create mode
  onBack: () => void;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  users: UserData[];
  label: string;
  required?: boolean;
  disabled?: boolean;
}

const UserSelect = ({ value, onChange, users, label, required, disabled }: UserSelectProps) => {
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
            className="w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={disabled}
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

const PoliticasEditForm = ({ documentoId, onBack }: PoliticasEditFormProps) => {
  const { toast } = useToast();
  const { canCreate, canUpdate, canDelete, isReadOnly } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documento, setDocumento] = useState<DocumentoMatrizResponse | null>(null);
  const isEditMode = !!documentoId;
  
  // Opciones para selects
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [subProcesos, setSubProcesos] = useState<SubProcesoPadre[]>([]);
  const [areas, setAreas] = useState<AreaCompleta[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    tipoDocumentoId: '',
    subProcesoId: '',
    areaId: '',
    //descripcionDocumento: '',
    objetivo: '',
    alcance: '',
    elaboradoPorId: '',
    revisadoPorId: '',
    aprobadoPorId: '',
    cambiosNuevo: '',
  });

  // Adjuntos
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);

  // Modal de agregar archivo
  const [showFileModal, setShowFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Constante para tipo de documento MANUAL
  const TIPO_DOCUMENTO_MANUAL = '6573c05c088f170e060c4001';

  // Verificar si es tipo MANUAL
  const isManual = formData.tipoDocumentoId === TIPO_DOCUMENTO_MANUAL;

  // Verificar si el documento viene desde Matriz de Procesos
  const desdeMatrizProceso = documento?.desdeMatrizProceso === true;

  // Si viene desde Matriz de Procesos, solo se pueden editar adjuntos y cambios
  const isFormReadOnly = isReadOnly || desdeMatrizProceso;

  // Deshabilitar Subproceso y Área si:
  // 1. Viene desde Matriz de Procesos (desdeMatrizProceso === true), O
  // 2. Es tipo Manual Y NO viene desde Matriz (isManual === true && desdeMatrizProceso === false)
  const disableSubprocesoArea = desdeMatrizProceso || (isManual && !desdeMatrizProceso);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar opciones de selects
        const [tipos, subs, areasData, usersData] = await Promise.all([
          matrizProcesosService.getTiposDocumento(),
          matrizProcesosService.getSubProcesosPadres(),
          maestrosService.getAreas(),
          usersService.getUsers(),
        ]);
        
        setTiposDocumento(tipos);
        setSubProcesos(subs);
        setAreas(areasData);
        setUsers(usersData);
        
        // Si es modo edición, cargar documento
        if (isEditMode && documentoId) {
          const doc = await matrizProcesosService.getDocumentoById(documentoId);
          setDocumento(doc);
          
          // Inicializar form data
          setFormData({
            tipoDocumentoId: doc.tipoDocumentoId || '',
            subProcesoId: doc.subProcesoId || '',
            areaId: doc.areaId || '',
            //descripcionDocumento: doc.descripcionDocumento || '',
            objetivo: doc.objetivo || '',
            alcance: doc.alcance || '',
            elaboradoPorId: doc.elaboradoPor?.usuarioId || '',
            revisadoPorId: doc.revisadoPor?.usuarioId || '',
            aprobadoPorId: doc.aprobadoPor?.usuarioId || '',
            cambiosNuevo: '',
          });
          
          setAdjuntos(doc.adjuntos || []);
        }
      } catch (error: any) {
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
  }, [documentoId, isEditMode, toast]);

  const handleDownloadFile = (nombreArchivo: string, base64: string) => {
    try {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${base64}`;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Éxito',
        description: 'Archivo descargado correctamente',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo',
        variant: 'destructive',
      });
    }
  };

  const handleOpenFileModal = () => {
    setNewFileName('');
    setSelectedFile(null);
    setShowFileModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddFileFromModal = () => {
    // Validar nombre de archivo
    if (!newFileName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese un nombre para el archivo',
        variant: 'destructive',
      });
      return;
    }

    // Validar que solo contenga caracteres alfanuméricos
    const alphanumericRegex = /^[a-zA-Z0-9\s-_]+$/;
    if (!alphanumericRegex.test(newFileName)) {
      toast({
        title: 'Error',
        description: 'El nombre del archivo solo puede contener letras, números, espacios, guiones y guiones bajos',
        variant: 'destructive',
      });
      return;
    }

    // Validar longitud máxima
    if (newFileName.length > 30) {
      toast({
        title: 'Error',
        description: 'El nombre del archivo no puede exceder 30 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Validar que se haya seleccionado un archivo
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un archivo',
        variant: 'destructive',
      });
      return;
    }

    // Obtener extensión del archivo
    const fileExtension = selectedFile.name.split('.').pop() || '';
    
    // Leer archivo y convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remover el prefijo data:...;base64,
      
      const newAdjunto: Adjunto = {
        nombreArchivo: `${newFileName}.${fileExtension}`,
        idGoogle: '', // Vacío para archivos nuevos
        base64: base64Data,
      };
      
      setAdjuntos([...adjuntos, newAdjunto]);
      
      toast({
        title: 'Éxito',
        description: 'Archivo agregado correctamente',
      });

      // Cerrar modal
      setShowFileModal(false);
      setNewFileName('');
      setSelectedFile(null);
    };
    
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveFile = (index: number) => {
    const newAdjuntos = adjuntos.filter((_, i) => i !== index);
    setAdjuntos(newAdjuntos);
    
    toast({
      title: 'Éxito',
      description: 'Archivo eliminado correctamente',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones específicas
    if (!formData.tipoDocumentoId) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor seleccione el tipo de documento',
        variant: 'destructive',
      });
      return;
    }

    // Validar subproceso y área solo si NO es Manual Y NO viene desde Matriz de Procesos
    if (!isManual && !desdeMatrizProceso) {
      if (!formData.subProcesoId) {
        toast({
          title: 'Campo requerido',
          description: 'Por favor seleccione un procedimiento (subproceso)',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.areaId) {
        toast({
          title: 'Campo requerido',
          description: 'Por favor seleccione un área',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!formData.elaboradoPorId) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor seleccione quién elaboró el documento',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.revisadoPorId) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor seleccione quién revisó el documento',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.aprobadoPorId) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor seleccione quién aprobó el documento',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode && !formData.cambiosNuevo.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor ingrese una descripción de los cambios realizados',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Obtener el código del área
      let areaCodigo = '';
      
      // Si el documento ya tiene areaCodigo (precargado), usarlo
      if (documento?.areaCodigo) {
        areaCodigo = documento.areaCodigo;
      } 
      // Si no, obtenerlo del área seleccionada si hay área seleccionada
      else if (formData.areaId) {
        const areaSeleccionada = areas.find(a => a._id === formData.areaId);
        if (areaSeleccionada && areaSeleccionada.Codigo) {
          areaCodigo = areaSeleccionada.Codigo;
        }
      }

      // Preparar adjuntos: enviar solo los campos necesarios
      const adjuntosParaEnviar = adjuntos.map(adj => {
        if (adj.idGoogle) {
          // Archivo existente: enviar tal cual
          return adj;
        } else {
          // Archivo nuevo: enviar sin idGoogle
          return {
            nombreArchivo: adj.nombreArchivo,
            base64: adj.base64,
          };
        }
      });

      // Determinar el valor de desdeMatrizProceso
      const desdeMatrizProcesoValue = documento?.desdeMatrizProceso === true ? true : false;

      const requestData = {
        tipoDocumentoId: formData.tipoDocumentoId,
        subProcesoId: formData.subProcesoId, // Siempre enviar el valor (puede estar vacío para Manual)
        areaId: formData.areaId, // Siempre enviar el valor (puede estar vacío para Manual)
        areaCodigo: areaCodigo,
        desdeMatrizProceso: desdeMatrizProcesoValue,
        descripcionDocumento: "N/A", //formData.descripcionDocumento,
        objetivo: isManual ? formData.objetivo : '',
        alcance: isManual ? formData.alcance : '',
        definiciones: documento?.definiciones || [],
        elaboradoPor: {
          usuarioId: formData.elaboradoPorId,
        },
        revisadoPor: {
          usuarioId: formData.revisadoPorId,
        },
        aprobadoPor: {
          usuarioId: formData.aprobadoPorId,
        },
        adjuntos: adjuntosParaEnviar,
      };

      if (isEditMode && documentoId) {
        // Actualizar documento existente
        const updateData = {
          ...requestData,
          modificacion: formData.cambiosNuevo,
        };
        
        await matrizProcesosService.updateDocumentoMatriz(documentoId, updateData);
        
        toast({
          title: 'Éxito',
          description: 'Documento actualizado correctamente',
        });
      } else {
        // Crear nuevo documento
        await matrizProcesosService.createDocumentoMatriz(requestData);
        
        toast({
          title: 'Éxito',
          description: 'Documento creado correctamente',
        });
      }

      // Volver al listado
      onBack();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando datos...</span>
      </div>
    );
  }

  if (isEditMode && !documento) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No se encontró el documento</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? 'Editar Documento' : 'Nuevo Documento'}
          </h1>
          {isEditMode && documento && (
            <p className="text-muted-foreground mt-2">
              Código: {documento.codigo} - Versión: {documento.version}
            </p>
          )}
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al listado
        </Button>
      </div>

      {/* Advertencia si viene desde Matriz de Procesos */}
      {desdeMatrizProceso && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-2">
              <div className="text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                Documento registrado desde la Matriz de Procesos
              </h3>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Primera fila: Procedimientos y Tipo de Documento */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subProcesoId">
                  Procedimientos (Subprocesos) {!disableSubprocesoArea && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={formData.subProcesoId}
                  onValueChange={(value) => setFormData({ ...formData, subProcesoId: value })}
                  disabled={isFormReadOnly || disableSubprocesoArea}
                >
                  <SelectTrigger className={cn(disableSubprocesoArea && "opacity-50 cursor-not-allowed")}>
                    <SelectValue placeholder={disableSubprocesoArea ? "No aplica para este documento" : "Seleccionar procedimiento..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {subProcesos.map((sp) => (
                      <SelectItem key={sp._id} value={sp._id}>
                        {sp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {disableSubprocesoArea && !desdeMatrizProceso && (
                  <p className="text-xs text-muted-foreground">
                    Este campo no es requerido para documentos tipo Procedimiento
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoDocumentoId">
                  Tipo de Documento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipoDocumentoId}
                  onValueChange={(value) => setFormData({ ...formData, tipoDocumentoId: value })}
                  disabled={isFormReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDocumento.map((tipo) => (
                      <SelectItem key={tipo._id} value={tipo._id}>
                        {tipo.tipo_documento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Segunda fila: Área */}
            <div className="space-y-2">
              <Label htmlFor="areaId">
                Área {!disableSubprocesoArea && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={formData.areaId}
                onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                disabled={isFormReadOnly || disableSubprocesoArea}
              >
                <SelectTrigger className={cn(disableSubprocesoArea && "opacity-50 cursor-not-allowed")}>
                  <SelectValue placeholder={disableSubprocesoArea ? "No aplica para este documento" : "Seleccionar área..."} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area._id} value={area._id}>
                      {area.Codigo} - {area.Nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {disableSubprocesoArea && !desdeMatrizProceso && (
                <p className="text-xs text-muted-foreground">
                  Este campo no es requerido para documentos tipo Procedimiento
                </p>
              )}
            </div>

            {/* Tercera fila: Objetivo y Alcance (mostrar solo si es MANUAL) */}
            {isManual && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objetivo">Objetivo</Label>
                  <Input
                    id="objetivo"
                    value={formData.objetivo}
                    onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                    placeholder="Ingrese el objetivo..."
                    disabled={isFormReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alcance">Alcance</Label>
                  <Input
                    id="alcance"
                    value={formData.alcance}
                    onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                    placeholder="Ingrese el alcance..."
                    disabled={isFormReadOnly}
                  />
                </div>
              </div>
            )}

            {/* Descripción */}
            {/*<div className="space-y-2">
              <Label htmlFor="descripcionDocumento">DESCRIPCION</Label>
              <Textarea
                id="descripcionDocumento"
                value={formData.descripcionDocumento}
                onChange={(e) => setFormData({ ...formData, descripcionDocumento: e.target.value })}
                className="min-h-[80px] resize-none"
                placeholder="Descripción del documento..."
                disabled={isFormReadOnly}
              />
            </div>*/}

            {/* Elaborado, Revisado, Aprobado */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <UserSelect
                value={formData.elaboradoPorId}
                onChange={(value) => setFormData({ ...formData, elaboradoPorId: value })}
                users={users}
                label="Elaborado por"
                required
                disabled={isFormReadOnly}
              />

              <UserSelect
                value={formData.revisadoPorId}
                onChange={(value) => setFormData({ ...formData, revisadoPorId: value })}
                users={users}
                label="Revisado por"
                required
                disabled={isFormReadOnly}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <UserSelect
                value={formData.aprobadoPorId}
                onChange={(value) => setFormData({ ...formData, aprobadoPorId: value })}
                users={users}
                label="Aprobado por"
                required
                disabled={isFormReadOnly}
              />
            </div>

            {/* Listado de cambios - Solo en modo edición */}
            {isEditMode && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-destructive">Listado de cambios</Label>
                <div className="border-2 border-destructive rounded-lg p-4 min-h-[120px]">
                  {documento && documento.controlCambios && documento.controlCambios.length > 0 ? (
                    <div className="space-y-2">
                      {documento.controlCambios.map((cambio: ControlCambio, index: number) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">v{cambio.version}</span> - {cambio.modificacion}
                          <span className="text-muted-foreground ml-2">
                            ({new Date(cambio.fecha).toLocaleDateString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No hay cambios registrados</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cambiosNuevo">
                    Cambios <span className="text-sm text-destructive">(requerido para actualización)</span>
                  </Label>
                  <Input
                    id="cambiosNuevo"
                    value={formData.cambiosNuevo}
                    onChange={(e) => setFormData({ ...formData, cambiosNuevo: e.target.value })}
                    placeholder="Descripción de los cambios realizados..."
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            )}

            {/* Archivos adjuntos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Archivos adjuntos</Label>
                {!isReadOnly && (
                  <Button 
                    type="button" 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleOpenFileModal}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar archivo
                  </Button>
                )}
              </div>

              {adjuntos.length > 0 ? (
                <div className="space-y-2">
                  {adjuntos.map((adjunto, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{adjunto.nombreArchivo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {adjunto.base64 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFile(adjunto.nombreArchivo, adjunto.base64)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {!isReadOnly && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay archivos adjuntos</p>
              )}
            </div>

            {/* Botón guardar */}
            {!isReadOnly && (
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 px-12"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'GUARDAR'
                )}
              </Button>
            </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* Modal de agregar archivo */}
      <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Archivo</DialogTitle>
            <DialogDescription>
              Ingrese el nombre del archivo y seleccione el archivo a cargar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">
                Nombre del archivo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Ej: documento-importante"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                Máximo 30 caracteres. Solo letras, números, espacios, guiones y guiones bajos.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileInput">
                Archivo <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fileInput"
                  type="file"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFileModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddFileFromModal}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoliticasEditForm;
