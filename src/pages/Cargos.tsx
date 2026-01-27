import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

const Cargos: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cargos y Puestos</h1>
        <p className="text-muted-foreground mt-2">
          Administración de cargos y puestos de trabajo
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Cargos y Puestos</CardTitle>
              <CardDescription>
                Módulo de gestión de cargos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este módulo permite gestionar los cargos y puestos de trabajo en la organización.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cargos;
