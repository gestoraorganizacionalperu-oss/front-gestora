import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gestionar permisos de usuario basados en ProfileId
 * 
 * Perfiles:
 * - ProfileId 3 (Responsable): Solo lectura
 * - ProfileId 4 (Observador): Solo lectura
 * - Otros perfiles: Permisos completos
 */
export const usePermissions = () => {
  const { user } = useAuth();

  // Perfiles de solo lectura
   const READ_ONLY_PROFILES = [3, 4, 5, 6];

  // Verificar si el usuario tiene un perfil de solo lectura
  const isReadOnly = user?.profileId ? READ_ONLY_PROFILES.includes(user.profileId) : false;

  return {
    // Permisos de acciones
    canCreate: !isReadOnly,
    canUpdate: !isReadOnly,
    canDelete: !isReadOnly,
    
    // Permisos siempre disponibles
    canView: true,
    canDownload: true,
    
    // Estado del perfil
    isReadOnly,
    profileId: user?.profileId || null,
  };
};
