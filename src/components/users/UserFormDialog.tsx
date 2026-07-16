import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useMessage } from '@/contexts/MessageContext';
import { usersService, type UserData } from '@/services/usersService';
import { perfilesService, type Perfil } from '@/services/perfilesService';
import { puestosService, type Puesto } from '@/services/puestosService';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user?: UserData;
}

const UserFormDialog: React.FC<UserFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  user,
}) => {
  const { showMessage } = useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    dni: '',
    profileId: 0,
    hasCredentials: true,
    email: '',
    username: '',
    password: '',
    puestoId: '',
    esTrabajador: false,
  });

  useEffect(() => {
    if (open) {
      loadInitialData();
      
      if (user) {
        setFormData({
          name: user.name,
          lastName: user.lastName,
          dni: user.dni,
          profileId: user.profileId,
          hasCredentials: user.hasCredentials,
          email: user.email || '',
          username: user.username || '',
          password: '',
          puestoId: user.puestoId || '',
          esTrabajador: false,
        });
      } else {
        setFormData({
          name: '',
          lastName: '',
          dni: '',
          profileId: 0,
          hasCredentials: true,
          email: '',
          username: '',
          password: '',
          puestoId: '',
          esTrabajador: false,
        });
      }
    }
  }, [open, user]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      // Cargar perfiles y puestos en paralelo
      const [perfilesData, puestosData] = await Promise.all([
        perfilesService.getPerfiles(),
        puestosService.getAllPuestos(),
      ]);
      
      // Excluir el perfil "Super Administrador" (IdPerfil = 1)
      const filteredPerfiles = perfilesData.filter(perfil => perfil.IdPerfil !== 1);
      setPerfiles(filteredPerfiles);
      
      // Filtrar solo puestos activos
      const activePuestos = puestosData.filter(puesto => puesto.IsActive);
      setPuestos(activePuestos);
    } catch (error: any) {
      showMessage('error', 'Error al cargar los datos del formulario');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showMessage('warning', 'El nombre es requerido');
      return;
    }

    if (!formData.lastName.trim()) {
      showMessage('warning', 'El apellido es requerido');
      return;
    }

    if (!formData.dni.trim()) {
      showMessage('warning', 'El DNI es requerido');
      return;
    }

    if (!formData.profileId) {
      showMessage('warning', 'El perfil es requerido');
      return;
    }

    // Validar puesto si el perfil es "Responsable" (profileId === 3)
    if (formData.profileId === 3 && !formData.puestoId) {
      showMessage('warning', 'El puesto es requerido para el perfil Responsable');
      return;
    }

    if (formData.hasCredentials) {
      if (!formData.email.trim()) {
        showMessage('warning', 'El email es requerido cuando se gestionan credenciales');
        return;
      }

      if (!formData.username.trim()) {
        showMessage('warning', 'El usuario es requerido cuando se gestionan credenciales');
        return;
      }

      if (!user && !formData.password.trim()) {
        showMessage('warning', 'La contraseña es requerida para nuevos usuarios');
        return;
      }

      if (formData.password && formData.password.length < 8) {
        showMessage('warning', 'La contraseña debe tener al menos 8 caracteres');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        dni: formData.dni.trim(),
        profileId: formData.profileId,
        hasCredentials: formData.hasCredentials,
      };

      if (formData.hasCredentials) {
        payload.email = formData.email.trim();
        payload.username = formData.username.trim();
        if (formData.password) {
          payload.password = formData.password;
        }
      }

      // Solo incluir puestoId si el perfil es "Responsable" (profileId === 3)
      if (formData.profileId === 3 && formData.puestoId) {
        payload.puestoId = formData.puestoId;
      }

      // esTrabajador solo aplica al crear -- la homologación con
      // `trabajador` todavía no está soportada al editar un usuario existente.
      if (!user && formData.esTrabajador) {
        payload.esTrabajador = true;
      }

      if (user) {
        await usersService.updateUser(user.id, payload);
        showMessage('success', 'Usuario actualizado exitosamente');
      } else {
        const creado = await usersService.createUser(payload);
        if (creado?.trabajadorVinculado?.creado) {
          showMessage('success', 'Usuario creado, y se generó su ficha de trabajador para asistencia/producción.');
        } else if (creado?.trabajadorVinculado && !creado.trabajadorVinculado.creado) {
          showMessage('success', 'Usuario creado y vinculado a un trabajador existente con el mismo DNI.');
        } else {
          showMessage('success', 'Usuario creado exitosamente');
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombres</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* DNI y Perfil */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileId">Perfil</Label>
              <Select
                value={formData.profileId ? formData.profileId.toString() : ''}
                onValueChange={(value) => {
                  const newProfileId = parseInt(value);
                  setFormData({ 
                    ...formData, 
                    profileId: newProfileId,
                    // Limpiar puestoId si se cambia a un perfil que no es Responsable
                    puestoId: newProfileId === 3 ? formData.puestoId : ''
                  });
                }}
                disabled={isSubmitting || isLoadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {perfiles.map((perfil) => (
                    <SelectItem key={perfil.IdPerfil} value={perfil.IdPerfil.toString()}>
                      {perfil.NamePerfil}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Puesto - Solo visible cuando el perfil es "Responsable" (profileId === 3) */}
          {formData.profileId === 3 && (
            <div className="space-y-2">
              <Label htmlFor="puestoId">
                Puesto <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.puestoId}
                onValueChange={(value) => setFormData({ ...formData, puestoId: value })}
                disabled={isSubmitting || isLoadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un puesto..." />
                </SelectTrigger>
                <SelectContent>
                  {puestos.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No hay puestos disponibles
                    </div>
                  ) : (
                    puestos.map((puesto) => (
                      <SelectItem key={puesto._id} value={puesto._id}>
                        {puesto.Nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gestionar credenciales */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasCredentials"
              checked={formData.hasCredentials}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, hasCredentials: checked as boolean })
              }
              disabled={isSubmitting}
            />
            <label
              htmlFor="hasCredentials"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              🔑 Gestionar credenciales de acceso
            </label>
          </div>

          {/* También es trabajador de planta -- solo al crear. Vincula o
              crea el registro en `trabajador` (asistencia, producción)
              usando el mismo DNI, sin duplicar si ya existe uno. */}
          {!user && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="esTrabajador"
                  checked={formData.esTrabajador}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, esTrabajador: checked as boolean })
                  }
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="esTrabajador"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  👷 Este usuario también es trabajador de planta
                </label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Aparecerá en Mantenimiento de Asistencias y Adm. Control de Producción, usando el mismo DNI.
              </p>
            </div>
          )}

          {/* Campos de credenciales */}
          {formData.hasCredentials && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña {user && '(Dejar en blanco para no cambiar)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isSubmitting}
                  placeholder={user ? 'Dejar en blanco para no cambiar' : ''}
                />
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
