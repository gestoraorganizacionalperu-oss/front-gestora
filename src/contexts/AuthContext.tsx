import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { companyService } from '@/services/companyService';
import type { User, MenuItem, LoginCredentials } from '@/types';

interface AuthContextType {
  user: User | null;
  menus: MenuItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    const storedMenus = authService.getStoredMenus();
    const storedToken = authService.getStoredToken();

    if (storedUser && storedToken) {
      setUser(storedUser);
      setMenus(storedMenus);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<string | null> => {
    const response = await authService.login(credentials);
    
    if (response.success && response.data) {
      const { usuario, token, menus: userMenus } = response.data;
      authService.storeAuthData(token, usuario, userMenus);
      setUser(usuario);
      setMenus(userMenus);

      // Obtener información de la empresa y guardar el logo
      try {
        if (usuario.empresa_id) {
          const companyData = await companyService.getCompanyById(usuario.empresa_id);
          if (companyData.logo) {
            localStorage.setItem('companyLogo', companyData.logo);
          }
        }
      } catch (error) {
        console.error('Error al obtener información de la empresa:', error);
        // No lanzar error, continuar con el login
      }

      // Perfiles que no sean Super Administrador (1) o Administrador (2)
      // entran directo a Gestión de Producción, sin importar el orden
      // de sus menús.
      const PERFILES_ADMIN = [1, 2];
      if (usuario.profileId && !PERFILES_ADMIN.includes(usuario.profileId)) {
        return '/gestion-produccion';
      }

      // Retornar la ruta del primer menú disponible
      if (userMenus && userMenus.length > 0) {
        const firstMenu = userMenus[0];
        // Si el primer menú tiene hijos, retornar la ruta del primer hijo
        if (firstMenu.hijos && firstMenu.hijos.length > 0) {
          return firstMenu.hijos[0].ruta;
        }
        // Si no tiene hijos, retornar su propia ruta
        return firstMenu.ruta;
      }
      
      // Si no hay menús, retornar null (ir a dashboard por defecto)
      return null;
    } else {
      throw new Error(response.message || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('companyLogo');
    setUser(null);
    setMenus([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        menus,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
