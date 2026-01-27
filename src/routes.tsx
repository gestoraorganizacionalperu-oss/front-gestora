import type { ReactNode } from 'react';
import Dashboard from './pages/Dashboard';
import Empresa from './pages/Empresa';
import Usuarios from './pages/Usuarios';
import CargosYPuestos from './pages/CargosYPuestos';
import Parametros from './pages/Parametros';
import UbicacionesPage from './pages/mantenimiento/UbicacionesPage';
import Organigrama from './pages/Organigrama';
import MatrizProcesos from './pages/MatrizProcesos';
import MOF from './pages/MOF';
import Politicas from './pages/Politicas';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <Dashboard />
  },
  {
    name: 'Empresa',
    path: '/empresa',
    element: <Empresa />
  },
  {
    name: 'Empresa',
    path: '/mantenimiento/empresa',
    element: <Empresa />
  },
  {
    name: 'Usuarios',
    path: '/usuarios',
    element: <Usuarios />
  },
  {
    name: 'Usuarios',
    path: '/mantenimiento/usuarios',
    element: <Usuarios />
  },
  {
    name: 'Cargos y Puestos',
    path: '/cargos',
    element: <CargosYPuestos />
  },
  {
    name: 'Cargos y Puestos',
    path: '/mantenimiento/cargos',
    element: <CargosYPuestos />
  },
  {
    name: 'Parametros',
    path: '/parametros',
    element: <Parametros />
  },
  {
    name: 'Parametros',
    path: '/mantenimiento/parametros',
    element: <Parametros />
  },
  {
    name: 'Ubicaciones y Areas',
    path: '/mantenimiento/ubicaciones',
    element: <UbicacionesPage />
  },
  {
    name: 'Organigrama',
    path: '/organigrama',
    element: <Organigrama />
  },
  {
    name: 'Matriz de Procesos',
    path: '/matriz-procesos',
    element: <MatrizProcesos />
  },
  {
    name: 'MOF',
    path: '/mof',
    element: <MOF />
  },
  {
    name: 'Politicas',
    path: '/politicas',
    element: <Politicas />
  },
  {
    name: 'Politicas y Procedimientos',
    path: '/politicas-procedimientos',
    element: <Politicas />
  }
];

export default routes;
