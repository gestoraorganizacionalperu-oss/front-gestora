import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sliders } from 'lucide-react';

const Parametros: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Parámetros</h1>
        <p className="text-muted-foreground mt-2">
          Configuración de parámetros del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sliders className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>Parámetros</CardTitle>
              <CardDescription>
                Módulo de configuración de parámetros
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este módulo permite configurar los parámetros generales del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Parametros;
