import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  Building2, 
  Users, 
  Briefcase, 
  Sliders,
  Network,
  Grid3x3,
  FileText,
  BookOpen,
  MapPin,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import type { MenuItem } from '@/types';

const iconMap: Record<string, React.ReactNode> = {
  // Iconos del backend (lowercase)
  settings: <Settings className="w-5 h-5" />,
  building: <Building2 className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  briefcase: <Briefcase className="w-5 h-5" />,
  slidershorizontal: <Sliders className="w-5 h-5" />,
  sitemap: <Network className="w-5 h-5" />,
  grid3x3: <Grid3x3 className="w-5 h-5" />,
  filetext: <FileText className="w-5 h-5" />,
  bookopen: <BookOpen className="w-5 h-5" />,
  ubicaciones: <MapPin className="w-5 h-5" />,
  // Iconos legacy (por compatibilidad)
  mantenimiento: <Settings className="w-5 h-5" />,
  empresa: <Building2 className="w-5 h-5" />,
  usuarios: <Users className="w-5 h-5" />,
  cargos: <Briefcase className="w-5 h-5" />,
  parametros: <Sliders className="w-5 h-5" />,
  organigrama: <Network className="w-5 h-5" />,
  matriz: <Grid3x3 className="w-5 h-5" />,
  mof: <FileText className="w-5 h-5" />,
  politicas: <BookOpen className="w-5 h-5" />,
};

const Sidebar: React.FC = () => {
  const { menus } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // Debug: mostrar todos los menús cargados
  useEffect(() => {
    console.log('📋 Menús cargados:', menus);
    menus.forEach(menu => {
      console.log(`  - ${menu.nombre}: ${menu.ruta}`);
      if (menu.hijos) {
        menu.hijos.forEach(hijo => {
          console.log(`    - ${hijo.nombre}: ${hijo.ruta}`);
        });
      }
    });
  }, [menus]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const renderMenuItem = (menu: MenuItem, level: number = 0) => {
    const hasChildren = menu.hijos && menu.hijos.length > 0;
    const isExpanded = expandedMenus.has(menu.id);
    const isActive = location.pathname === menu.ruta;
    const icon = menu.icono ? iconMap[menu.icono.toLowerCase()] : null;

    // No mostrar submenús cuando está colapsado
    if (isCollapsed && level > 0) {
      return null;
    }

    if (hasChildren) {
      return (
        <div key={menu.id} className="mb-1">
          <button
            type="button"
            onClick={() => !isCollapsed && toggleMenu(menu.id)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 text-white/90 hover:bg-white/10 transition-all duration-200 rounded-md group',
              isExpanded && 'bg-white/5',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? menu.nombre : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="text-white/80 group-hover:text-white transition-colors">
                {icon}
              </span>
              {!isCollapsed && <span className="font-medium text-sm">{menu.nombre}</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown 
                className={cn(
                  'w-4 h-4 text-white/60 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )} 
              />
            )}
          </button>
          {isExpanded && !isCollapsed && (
            <div className="mt-1 ml-3 pl-3 border-l-2 border-white/10 space-y-1">
              {menu.hijos?.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const handleClick = () => {
      // Debug: mostrar la ruta que se está navegando
      console.log('🔗 Navegando a:', menu.ruta, '| Nombre:', menu.nombre);
      
      // Cerrar el menú en mobile al seleccionar un item
      if (window.innerWidth < 1280) {
        setIsOpen(false);
      }
    };

    return (
      <Link
        key={menu.id}
        to={menu.ruta}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-md group relative',
          level > 0 && 'text-sm',
          isActive && 'bg-white/15 text-white font-medium shadow-sm',
          isCollapsed && 'justify-center'
        )}
        title={isCollapsed ? menu.nombre : undefined}
      >
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-400 rounded-r-full" />
        )}
        <span className={cn(
          'transition-colors',
          isActive ? 'text-yellow-400' : 'text-white/70 group-hover:text-white'
        )}>
          {icon}
        </span>
        {!isCollapsed && <span>{menu.nombre}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 xl:hidden bg-primary text-white p-2.5 rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-primary transition-all duration-300 z-40 shadow-2xl',
          isOpen ? 'w-72' : 'w-0',
          'xl:relative',
          isCollapsed ? 'xl:w-16' : 'xl:w-72'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors xl:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              {(isOpen && !isCollapsed) && <h2 className="text-xl font-bold text-white">ToolGestora</h2>}
            </div>
            {/* Desktop toggle button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden xl:block text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {menus.map((menu) => renderMenuItem(menu))}
          </nav>

          {/* Footer */}
          {!isCollapsed && (
            <div className="px-6 py-4 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                © 2025 ToolGestora
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
