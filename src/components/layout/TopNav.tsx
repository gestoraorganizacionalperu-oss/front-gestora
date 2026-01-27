import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessage } from '@/contexts/MessageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';

const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const { showMessage } = useMessage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showMessage('information', 'Sesión cerrada correctamente');
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.nombre?.charAt(0) || '';
    const lastInitial = user.apellido?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Espacio para el botón hamburguesa en mobile */}
          <div className="xl:hidden w-10" />
          <h1 className="text-xl font-semibold text-foreground">
            {user?.empresa_nombre || 'ToolGestora S.A.'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block text-sm">
              <p className="font-medium text-foreground">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-muted-foreground">{user?.rol}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
