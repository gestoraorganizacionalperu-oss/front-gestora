import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMessage } from '@/contexts/MessageContext';
import { produccionService, type RegistroProduccion } from '@/services/produccionService';

const estadoStyle: Record<string, string> = {
  completado: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  en_progreso: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pendiente: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const GestionProduccion: React.FC = () => {
  const { showMessage } = useMessage();
  const [registros, setRegistros] = useState<RegistroProduccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRegistros();
  }, []);

  const loadRegistros = async () => {
    try {
      setIsLoading(true);
      const data = await produccionService.getRegistros();
      setRegistros(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los registros de producción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestión de Producción</h1>
        <p className="text-muted-foreground mt-1">Registro diario de avance por actividad</p>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead className="text-center">Logrados</TableHead>
              <TableHead className="text-center">Observados</TableHead>
              <TableHead className="text-center">Duración</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Cargando registros...
                </TableCell>
              </TableRow>
            ) : registros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay registros de producción todavía
                </TableCell>
              </TableRow>
            ) : (
              registros.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{new Date(`${r.fecha}T00:00:00`).toLocaleDateString('es-PE')}</TableCell>
                  <TableCell className="font-medium">{r.actividadNombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.procesoNombre}</TableCell>
                  <TableCell className="text-center">{r.logrados}</TableCell>
                  <TableCell className="text-center">{r.observados}</TableCell>
                  <TableCell className="text-center">{r.duracionMinutos} min</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${estadoStyle[r.estado] || estadoStyle.pendiente}`}>
                      {r.estado}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GestionProduccion;