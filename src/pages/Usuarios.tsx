import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessage } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/use-permissions';
import { usersService, type UserData } from '@/services/usersService';
import UserFormDialog from '@/components/users/UserFormDialog';
import DeleteUserDialog from '@/components/users/DeleteUserDialog';

const Usuarios: React.FC = () => {
  const { showMessage } = useMessage();
  const { user: currentUser } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const itemsPerPage = 7;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersService.getUsers();
      
      // Filtrar usuarios según el perfil del usuario actual
      let filteredData = data;
      
      // Si el usuario actual NO es Super Administrador (profileId !== 1),
      // ocultar todos los usuarios con profileId = 1
      if (currentUser?.profileId !== 1) {
        filteredData = data.filter(user => user.profileId !== 1);
      }
      
      setUsers(filteredData);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.username?.toLowerCase().includes(term) ||
        user.dni.includes(term)
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (user: UserData) => {
    setUserToEdit(user);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: UserData) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los usuarios del sistema</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por nombre, apellido o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground">Nombre</th>
                <th className="text-left p-4 font-semibold text-foreground">Email</th>
                <th className="text-left p-4 font-semibold text-foreground">Usuario</th>
                <th className="text-left p-4 font-semibold text-foreground">DNI</th>
                <th className="text-left p-4 font-semibold text-foreground">Perfil</th>
                <th className="text-left p-4 font-semibold text-foreground">Credenciales</th>
                <th className="text-left p-4 font-semibold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">
                        {user.name} {user.lastName}
                      </div>
                    </td>
                    <td className="p-4 text-foreground">{user.email || '-'}</td>
                    <td className="p-4 text-foreground">{user.username || '-'}</td>
                    <td className="p-4 text-foreground">{user.dni}</td>
                    <td className="p-4 text-foreground">{user.profileName}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.hasCredentials
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {user.hasCredentials ? 'Activo' : 'Sin acceso'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Ocultar botón de eliminar si es el mismo usuario o no tiene permisos */}
                        {canDelete && currentUser?.id !== user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <UserFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadUsers}
      />

      {userToEdit && (
        <UserFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={loadUsers}
          user={userToEdit}
        />
      )}

      {userToDelete && (
        <DeleteUserDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          user={userToDelete}
          onSuccess={loadUsers}
        />
      )}
    </div>
  );
};

export default Usuarios;
