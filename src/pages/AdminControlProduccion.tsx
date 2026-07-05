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
import { produccionService, type ConfigCtrlProduccion, type DiaProgramado } from '@/services/produccionService';

const DIAS: { key: keyof Pick<ConfigCtrlProduccion['actividades'][number], 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'>; label: string }[] = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
];

const CeldaDia: React.FC<{ dia?: DiaProgramado }> = ({ dia }) => (
  <div className="text-xs leading-tight text-center min-w-[52px]">
    <div className="font-semibold text-foreground">{dia?.cantPro || '-'}</div>
    <div className="text-muted-foreground">{dia?.hProg ? `${dia.hProg}h` : ''}</div>
  </div>
);

const AdminControlProduccion: React.FC = () => {
  const { showMessage } = useMessage();
  const [config, setConfig] = useState<ConfigCtrlProduccion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfiguracion();
  }, []);

  const loadConfiguracion = async () => {
    try {
      setIsLoading(true);
      const data = await produccionService.getConfiguracion();
      setConfig(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar la configuración de producción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Administración Control de Producción</h1>
        <p className="text-muted-foreground mt-1">
          Metas semanales de producción por actividad (cantidad y horas programadas)
        </p>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Actividad</TableHead>
              <TableHead className="min-w-[180px]">Proceso</TableHead>
              {DIAS.map((d) => (
                <TableHead key={d.key} className="text-center">{d.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Cargando configuración...
                </TableCell>
              </TableRow>
            ) : !config || config.actividades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay actividades configuradas todavía
                </TableCell>
              </TableRow>
            ) : (
              config.actividades.map((act) => (
                <TableRow key={act.actividadId}>
                  <TableCell className="font-medium">{act.actividadNombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{act.procesoNombre}</TableCell>
                  {DIAS.map((d) => (
                    <TableCell key={d.key} className="p-2">
                      <CeldaDia dia={act[d.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {config?.proyectoOtro?.descripcion && (
              <TableRow>
                <TableCell className="font-medium italic">
                  {config.proyectoOtro.descripcion || 'Proyecto adicional'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">-</TableCell>
                {DIAS.map((d) => (
                  <TableCell key={d.key} className="p-2">
                    <CeldaDia dia={config.proyectoOtro[d.key]} />
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada celda muestra la cantidad programada (arriba) y las horas programadas (abajo) para ese día.
      </p>
    </div>
  );
};

export default AdminControlProduccion;