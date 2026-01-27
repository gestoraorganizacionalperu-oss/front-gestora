import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Empresa',
      value: user?.empresa_nombre || 'N/A',
      icon: <Building2 className="w-8 h-8 text-primary" />,
      description: 'Organización actual',
    },
    {
      title: 'Rol',
      value: user?.rol || 'N/A',
      icon: <Users className="w-8 h-8 text-secondary" />,
      description: 'Nivel de acceso',
    },
    {
      title: 'Documentos',
      value: '0',
      icon: <FileText className="w-8 h-8 text-accent" />,
      description: 'Total de documentos',
    },
    {
      title: 'Actividad',
      value: 'Activo',
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      description: 'Estado del sistema',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido, {user?.nombre} {user?.apellido}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>
            Sistema de gestión documental multi-empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Usuario</span>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Empresa</span>
              <span className="text-sm text-muted-foreground">{user?.empresa_nombre}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-foreground">Rol</span>
              <span className="text-sm text-muted-foreground">{user?.rol}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
