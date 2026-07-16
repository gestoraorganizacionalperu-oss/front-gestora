import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessage } from '@/contexts/MessageContext';
import { usePermissions } from '@/hooks/use-permissions';
import {
  matrizProcesosService,
  type MacroProceso,
  type Proceso,
  type SubProceso,
  type SubProcesoHijo,
  type Actividad,
  type Descripcion,
  type Cargo,
  type PuestoCargo,
} from '@/services/matrizProcesosService';
import ElementFormDialog from '@/components/matriz/ElementFormDialog';
import DeleteConfirmDialog from '@/components/matriz/DeleteConfirmDialog';
import PuestoFormDialog from '@/components/matriz/PuestoFormDialog';
import { DocumentoSubProcesoView } from '@/components/documento/DocumentoSubProcesoView';
import { asistenciaService } from '@/services/asistenciaService';

interface CellData {
  content: React.ReactNode;
  rowSpan: number;
  path: number[];
  type: 'macro' | 'proceso' | 'subproceso' | 'subprocesohijo' | 'actividad' | 'descripcion' | 'puesto' | 'empty';
  nombre?: string;
  hasChildren?: boolean;
}

interface MatrizRow {
  cells: (CellData | null)[];
}

const MatrizProcesos: React.FC = () => {
  const { showMessage } = useMessage();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [matriz, setMatriz] = useState<MacroProceso[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [puestosMap, setPuestosMap] = useState<Map<string, string>>(new Map());
  // Mapa inverso: puestoId -> nombre del Trabajador que tiene ese Puesto
  // asignado (configurado en Mantenimiento de Asistencias). La columna
  // "Puesto" de la tabla muestra este nombre en vez del nombre genérico
  // del Puesto, para que en una empresa pequeña se vea directamente
  // "quién" hace la actividad.
  const [trabajadorPorPuestoMap, setTrabajadorPorPuestoMap] = useState<Map<string, string>>(new Map());
  // Mapa directo (sin ambigüedad): trabajadorId -> nombre. Se usa cuando la
  // actividad ya tiene guardado un trabajadorId específico (nuevo formato).
  // El mapa inverso de arriba (por puestoId) queda solo como respaldo para
  // datos guardados ANTES de este cambio, donde varias personas podían
  // compartir el mismo Puesto sin forma de distinguir cuál era.
  const [nombrePorTrabajadorId, setNombrePorTrabajadorId] = useState<Map<string, string>>(new Map());

  // Drag & drop para reordenar (macro/proceso/subproceso/subprocesohijo/actividad).
  // El orden se persiste tal cual el orden del arreglo JSON -- el backend no
  // reordena nada, solo guarda la matriz completa como se le envía.
  const [dragItem, setDragItem] = useState<{ type: CellData['type']; path: number[] } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Ref para el contenedor con scroll horizontal
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [scrollStart, setScrollStart] = useState(0);

  // View state
  const [viewMode, setViewMode] = useState<'matrix' | 'detail'>('matrix');
  const [selectedSubProceso, setSelectedSubProceso] = useState<{
    macro: MacroProceso;
    proceso: Proceso;
    subProceso: SubProceso;
    path: number[];
  } | null>(null);

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isPuestoDialogOpen, setIsPuestoDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form context
  const [formContext, setFormContext] = useState<{
    type: 'macro' | 'proceso' | 'subproceso' | 'subprocesohijo' | 'actividad' | 'descripcion' | 'puesto';
    title: string;
    path: number[];
    currentValue?: string;
    isEdit?: boolean;
  } | null>(null);

  // Puesto context
  const [puestoContext, setPuestoContext] = useState<{
    path: number[];
    currentPuestoId?: string | null;
    currentTrabajadorId?: string | number | null;
    isEdit?: boolean;
  } | null>(null);

  // Delete context
  const [deleteContext, setDeleteContext] = useState<{
    type: string;
    nombre: string;
    path: number[];
    hasChildren: boolean;
  } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [matrizData, cargosData] = await Promise.all([
        matrizProcesosService.getMatriz(),
        matrizProcesosService.getCargos(),
      ]);
      
      // Usar la matriz tal como viene del backend sin ordenamiento adicional
      setMatriz(matrizData);
      setCargos(cargosData);
      
      // Cargar todos los puestos de todos los cargos y crear un mapa
      const puestosMapTemp = new Map<string, string>();
      for (const cargo of cargosData) {
        try {
          const puestosData = await matrizProcesosService.getPuestosByCargo(cargo._id);
          puestosData.forEach((puesto: PuestoCargo) => {
            puestosMapTemp.set(puesto._id, puesto.Nombre);
          });
        } catch (error) {
          console.error(`Error al cargar puestos del cargo ${cargo.Nombre}:`, error);
        }
      }
      setPuestosMap(puestosMapTemp);

      // Construir el mapa inverso: puestoId -> nombre del Trabajador
      // (respaldo para datos guardados antes del campo trabajadorId)
      try {
        const trabajadores = await asistenciaService.getTrabajadores();
        const trabajadorPorPuestoTemp = new Map<string, string>();
        const nombrePorTrabajadorIdTemp = new Map<string, string>();
        trabajadores.forEach((t) => {
          if (t.puesto) trabajadorPorPuestoTemp.set(t.puesto, t.nombres);
          nombrePorTrabajadorIdTemp.set(String(t._id), t.nombres);
        });
        setTrabajadorPorPuestoMap(trabajadorPorPuestoTemp);
        setNombrePorTrabajadorId(nombrePorTrabajadorIdTemp);
      } catch (error) {
        console.error('Error al cargar trabajadores para mostrar nombre por puesto:', error);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMatriz = async () => {
    try {
      setIsRefreshing(true);
      const matrizData = await matrizProcesosService.getMatriz();
      
      // Usar la matriz tal como viene del backend sin ordenamiento adicional
      setMatriz(matrizData);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al actualizar la matriz');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Count total leaf rows for an element
  const countLeafRows = (
    macro: MacroProceso,
    procesoIndex?: number,
    subProcesoIndex?: number,
    subProcesoHijoIndex?: number,
    actividadIndex?: number,
    descripcionIndex?: number
  ): number => {
    if (descripcionIndex !== undefined && actividadIndex !== undefined) {
      let actividad: Actividad;
      if (subProcesoHijoIndex !== undefined && procesoIndex !== undefined && subProcesoIndex !== undefined) {
        actividad = macro.procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subProcesoHijoIndex].actividades[actividadIndex];
      } else if (procesoIndex !== undefined && subProcesoIndex !== undefined) {
        actividad = macro.procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[actividadIndex];
      } else {
        return 1;
      }
      const desc = actividad.descripciones[descripcionIndex];
      return Math.max(1, desc.puestos.length);
    }

    if (actividadIndex !== undefined) {
      let actividad: Actividad;
      if (subProcesoHijoIndex !== undefined && procesoIndex !== undefined && subProcesoIndex !== undefined) {
        actividad = macro.procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subProcesoHijoIndex].actividades[actividadIndex];
      } else if (procesoIndex !== undefined && subProcesoIndex !== undefined) {
        actividad = macro.procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[actividadIndex];
      } else {
        return 1;
      }
      if (actividad.descripciones.length === 0) return 1;
      return actividad.descripciones.reduce((sum, desc, descIndex) => {
        return sum + countLeafRows(macro, procesoIndex, subProcesoIndex, subProcesoHijoIndex, actividadIndex, descIndex);
      }, 0);
    }

    if (subProcesoHijoIndex !== undefined && procesoIndex !== undefined && subProcesoIndex !== undefined) {
      const subHijo = macro.procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subProcesoHijoIndex];
      if (subHijo.actividades.length === 0) return 1;
      return subHijo.actividades.reduce((sum, _, actIndex) => {
        return sum + countLeafRows(macro, procesoIndex, subProcesoIndex, subProcesoHijoIndex, actIndex);
      }, 0);
    }

    if (subProcesoIndex !== undefined && procesoIndex !== undefined) {
      const subProceso = macro.procesos[procesoIndex].subprocesos[subProcesoIndex];
      let total = 0;

      if (subProceso.subprocesos.length > 0) {
        total += subProceso.subprocesos.reduce((sum, _, subHijoIndex) => {
          return sum + countLeafRows(macro, procesoIndex, subProcesoIndex, subHijoIndex);
        }, 0);
      }

      if (subProceso.actividades.length > 0) {
        total += subProceso.actividades.reduce((sum, _, actIndex) => {
          return sum + countLeafRows(macro, procesoIndex, subProcesoIndex, undefined, actIndex);
        }, 0);
      }

      return Math.max(1, total);
    }

    if (procesoIndex !== undefined) {
      const proceso = macro.procesos[procesoIndex];
      if (proceso.subprocesos.length === 0) return 1;
      return proceso.subprocesos.reduce((sum, _, subIndex) => {
        return sum + countLeafRows(macro, procesoIndex, subIndex);
      }, 0);
    }

    if (macro.procesos.length === 0) return 1;
    return macro.procesos.reduce((sum, _, procIndex) => {
      return sum + countLeafRows(macro, procIndex);
    }, 0);
  };

  // Build matrix rows with rowspan
  interface FilaPlana {
    macro: string;
    proceso: string;
    subproceso1: string;
    subproceso2: string;
    actividad: string;
    descripcion: string;
    puesto: string;
  }

  // Construye una lista PLANA (sin celdas combinadas) de todas las filas
  // hoja de la matriz -- se usa únicamente cuando hay un texto de búsqueda,
  // sin tocar la lógica de rowSpan/paths de la vista normal (buildMatrixRows).
  const buildFilasPlanas = (): FilaPlana[] => {
    const filas: FilaPlana[] = [];

    const agregarActividad = (
      macroNombre: string,
      procesoNombre: string,
      sub1Nombre: string,
      sub2Nombre: string,
      actividad: Actividad
    ) => {
      if (actividad.descripciones.length === 0) {
        filas.push({
          macro: macroNombre,
          proceso: procesoNombre,
          subproceso1: sub1Nombre,
          subproceso2: sub2Nombre,
          actividad: actividad.nombre,
          descripcion: '',
          puesto: '',
        });
      } else {
        actividad.descripciones.forEach((desc) => {
          filas.push({
            macro: macroNombre,
            proceso: procesoNombre,
            subproceso1: sub1Nombre,
            subproceso2: sub2Nombre,
            actividad: actividad.nombre,
            descripcion: desc.texto,
            puesto: desc.puestos?.map((p) => p.nombre).filter(Boolean).join(', ') || '',
          });
        });
      }
    };

    matriz.forEach((macro) => {
      macro.procesos.forEach((proceso) => {
        proceso.subprocesos.forEach((sub1) => {
          sub1.actividades.forEach((act) => agregarActividad(macro.nombre, proceso.nombre, sub1.nombre, '', act));
          sub1.subprocesos.forEach((sub2) => {
            sub2.actividades.forEach((act) =>
              agregarActividad(macro.nombre, proceso.nombre, sub1.nombre, sub2.nombre, act)
            );
          });
        });
      });
    });

    return filas;
  };

  const filasFiltradas = React.useMemo(() => {
    if (!busqueda.trim()) return [];
    const termino = busqueda.trim().toLowerCase();
    return buildFilasPlanas().filter((f) =>
      [f.macro, f.proceso, f.subproceso1, f.subproceso2, f.actividad, f.descripcion, f.puesto]
        .join(' ')
        .toLowerCase()
        .includes(termino)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, matriz]);

  const buildMatrixRows = (): MatrizRow[] => {
    const rows: MatrizRow[] = [];

    matriz.forEach((macro, macroIndex) => {
      const macroRowSpan = countLeafRows(macro);
      let macroRowsProcessed = 0;

      if (macro.procesos.length === 0) {
        rows.push({
          cells: [
            {
              content: renderCell(macro.nombre, 'macro', [macroIndex], false),
              rowSpan: 1,
              path: [macroIndex],
              type: 'macro',
              nombre: macro.nombre,
              hasChildren: false,
            },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
            { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
          ],
        });
      } else {
        macro.procesos.forEach((proceso, procesoIndex) => {
          const procesoRowSpan = countLeafRows(macro, procesoIndex);
          let procesoRowsProcessed = 0;

          if (proceso.subprocesos.length === 0) {
            rows.push({
              cells: [
                macroRowsProcessed === 0
                  ? {
                      content: renderCell(macro.nombre, 'macro', [macroIndex], true),
                      rowSpan: macroRowSpan,
                      path: [macroIndex],
                      type: 'macro',
                      nombre: macro.nombre,
                      hasChildren: true,
                    }
                  : null,
                {
                  content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], false),
                  rowSpan: 1,
                  path: [macroIndex, procesoIndex],
                  type: 'proceso',
                  nombre: proceso.nombre,
                  hasChildren: false,
                },
                { content: renderSubprocesoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex], type: 'subproceso', nombre: '', hasChildren: false },
                { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
              ],
            });
            macroRowsProcessed += 1;
          } else {
            proceso.subprocesos.forEach((subProceso, subProcesoIndex) => {
              const subProcesoRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex);
              let subProcesoRowsProcessed = 0;

              const hasSubHijos = subProceso.subprocesos.length > 0;
              const hasActividades = subProceso.actividades.length > 0;

              if (!hasSubHijos && !hasActividades) {
                rows.push({
                  cells: [
                    macroRowsProcessed === 0
                      ? {
                          content: renderCell(macro.nombre, 'macro', [macroIndex], true),
                          rowSpan: macroRowSpan,
                          path: [macroIndex],
                          type: 'macro',
                          nombre: macro.nombre,
                          hasChildren: true,
                        }
                      : null,
                    procesoRowsProcessed === 0
                      ? {
                          content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true),
                          rowSpan: procesoRowSpan,
                          path: [macroIndex, procesoIndex],
                          type: 'proceso',
                          nombre: proceso.nombre,
                          hasChildren: true,
                        }
                      : null,
                    {
                      content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], false),
                      rowSpan: 1,
                      path: [macroIndex, procesoIndex, subProcesoIndex],
                      type: 'subproceso',
                      nombre: subProceso.nombre,
                      hasChildren: false,
                    },
                    { content: renderSubprocesoHijoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subprocesohijo', nombre: '', hasChildren: false },
                    { content: renderActividadVacia(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'actividad', nombre: '', hasChildren: false },
                    { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                    { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                  ],
                });
                macroRowsProcessed += 1;
                procesoRowsProcessed += 1;
              } else {
                // Process direct actividades FIRST (with empty Subproceso Nivel 2 cell)
                if (hasActividades) {
                  subProceso.actividades.forEach((actividad, actividadIndex) => {
                    const actividadRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex, undefined, actividadIndex);
                    let actividadRowsProcessed = 0;

                    if (actividad.descripciones.length === 0) {
                      rows.push({
                        cells: [
                          macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                          procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                          subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                          { content: renderSubprocesoHijoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subprocesohijo', nombre: '', hasChildren: false },
                          { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], false), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: false },
                          { content: renderDescripcionVacia(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, -1], type: 'descripcion', nombre: '', hasChildren: false },
                          { content: renderPuestoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'puesto', nombre: '', hasChildren: false },
                        ],
                      });
                      macroRowsProcessed += 1;
                      procesoRowsProcessed += 1;
                      subProcesoRowsProcessed += 1;
                    } else {
                      actividad.descripciones.forEach((descripcion, descripcionIndex) => {
                        const descripcionRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex, undefined, actividadIndex, descripcionIndex);
                        let descripcionRowsProcessed = 0;

                        if (descripcion.puestos.length === 0) {
                          rows.push({
                            cells: [
                              macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                              procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                              subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                              { content: renderSubprocesoHijoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subprocesohijo', nombre: '', hasChildren: false },
                              actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                              { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: false },
                              { content: renderPuestoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'puesto', nombre: '', hasChildren: false },
                            ],
                          });
                          macroRowsProcessed += 1;
                          procesoRowsProcessed += 1;
                          subProcesoRowsProcessed += 1;
                          actividadRowsProcessed += 1;
                        } else {
                          descripcion.puestos.forEach((puesto, puestoIndex) => {
                            rows.push({
                              cells: [
                                macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                                procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                                subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                                { content: renderSubprocesoHijoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subprocesohijo', nombre: '', hasChildren: false },
                                actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                                descripcionRowsProcessed === 0 ? { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex]), rowSpan: descripcionRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: true } : null,
                                { content: renderPuestoCell(puesto, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex, puestoIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'puesto', nombre: getPuestoName(puesto.id, puesto.nombre, puesto.trabajadorId), hasChildren: false },
                              ],
                            });
                            macroRowsProcessed += 1;
                            procesoRowsProcessed += 1;
                            subProcesoRowsProcessed += 1;
                            actividadRowsProcessed += 1;
                            descripcionRowsProcessed += 1;
                          });
                        }
                      });
                    }
                  });
                }

                // Process sub proceso hijos AFTER direct actividades
                if (hasSubHijos) {
                  subProceso.subprocesos.forEach((subHijo, subHijoIndex) => {
                    const subHijoRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex, subHijoIndex);
                    let subHijoRowsProcessed = 0;

                    if (subHijo.actividades.length === 0) {
                      rows.push({
                        cells: [
                          macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                          procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                          subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                          { content: renderCell(subHijo.nombre, 'subprocesohijo', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], false), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], type: 'subprocesohijo', nombre: subHijo.nombre, hasChildren: false },
                          { content: renderActividadVacia(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, -1], type: 'actividad', nombre: '', hasChildren: false },
                          { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                          { content: renderCeldaVaciaGenerica(), rowSpan: 1, path: [], type: 'empty' },
                        ],
                      });
                      macroRowsProcessed += 1;
                      procesoRowsProcessed += 1;
                      subProcesoRowsProcessed += 1;
                    } else {
                      subHijo.actividades.forEach((actividad, actividadIndex) => {
                        const actividadRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex);
                        let actividadRowsProcessed = 0;

                        if (actividad.descripciones.length === 0) {
                          rows.push({
                            cells: [
                              macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                              procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                              subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                              subHijoRowsProcessed === 0 ? { content: renderCell(subHijo.nombre, 'subprocesohijo', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], true), rowSpan: subHijoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], type: 'subprocesohijo', nombre: subHijo.nombre, hasChildren: true } : null,
                              { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], false), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: false },
                              { content: renderDescripcionVacia(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, -1], type: 'descripcion', nombre: '', hasChildren: false },
                              { content: renderPuestoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'puesto', nombre: '', hasChildren: false },
                            ],
                          });
                          macroRowsProcessed += 1;
                          procesoRowsProcessed += 1;
                          subProcesoRowsProcessed += 1;
                          subHijoRowsProcessed += 1;
                        } else {
                          actividad.descripciones.forEach((descripcion, descripcionIndex) => {
                            const descripcionRowSpan = countLeafRows(macro, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex);
                            let descripcionRowsProcessed = 0;

                            if (descripcion.puestos.length === 0) {
                              rows.push({
                                cells: [
                                  macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                                  procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                                  subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                                  subHijoRowsProcessed === 0 ? { content: renderCell(subHijo.nombre, 'subprocesohijo', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], true), rowSpan: subHijoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], type: 'subprocesohijo', nombre: subHijo.nombre, hasChildren: true } : null,
                                  actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                                  { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: false },
                                  { content: renderPuestoVacio(), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'puesto', nombre: '', hasChildren: false },
                                ],
                              });
                              macroRowsProcessed += 1;
                              procesoRowsProcessed += 1;
                              subProcesoRowsProcessed += 1;
                              subHijoRowsProcessed += 1;
                              actividadRowsProcessed += 1;
                            } else {
                              descripcion.puestos.forEach((puesto, puestoIndex) => {
                                rows.push({
                                  cells: [
                                    macroRowsProcessed === 0 ? { content: renderCell(macro.nombre, 'macro', [macroIndex], true), rowSpan: macroRowSpan, path: [macroIndex], type: 'macro', nombre: macro.nombre, hasChildren: true } : null,
                                    procesoRowsProcessed === 0 ? { content: renderCell(proceso.nombre, 'proceso', [macroIndex, procesoIndex], true), rowSpan: procesoRowSpan, path: [macroIndex, procesoIndex], type: 'proceso', nombre: proceso.nombre, hasChildren: true } : null,
                                    subProcesoRowsProcessed === 0 ? { content: renderSubProcesoCell(macro, proceso, subProceso, [macroIndex, procesoIndex, subProcesoIndex], true), rowSpan: subProcesoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex], type: 'subproceso', nombre: subProceso.nombre, hasChildren: true } : null,
                                    subHijoRowsProcessed === 0 ? { content: renderCell(subHijo.nombre, 'subprocesohijo', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], true), rowSpan: subHijoRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex], type: 'subprocesohijo', nombre: subHijo.nombre, hasChildren: true } : null,
                                    actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                                    descripcionRowsProcessed === 0 ? { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex]), rowSpan: descripcionRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: true } : null,
                                    { content: renderPuestoCell(puesto, [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex, puestoIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex], type: 'puesto', nombre: getPuestoName(puesto.id, puesto.nombre, puesto.trabajadorId), hasChildren: false },
                                  ],
                                });
                                macroRowsProcessed += 1;
                                procesoRowsProcessed += 1;
                                subProcesoRowsProcessed += 1;
                                subHijoRowsProcessed += 1;
                                actividadRowsProcessed += 1;
                                descripcionRowsProcessed += 1;
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              }
            });
          }
        });
      }
    });

    return rows;
  };

  // Render cell content with edit button
  const renderCell = (nombre: string, type: string, path: number[], hasChildren: boolean) => {
    const esReordenable = canUpdate && ['macro', 'proceso', 'subprocesohijo', 'actividad'].includes(type);
    return (
      <div className="min-w-[180px] flex items-start justify-between gap-2">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          {esReordenable && (
            <span className="p-1 -ml-1 mt-0.5 shrink-0 text-muted-foreground/50" title="Arrastra para reordenar">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <p className="font-medium text-sm text-justify">{nombre}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {canCreate && type === 'macro' && (
            <button
              onClick={() => handleAdd('proceso', path)}
              className="p-1 hover:bg-primary/10 rounded text-primary"
              title="Agregar Proceso"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {canCreate && type === 'proceso' && (
            <button
              onClick={() => handleAdd('subproceso', path)}
              className="p-1 hover:bg-primary/10 rounded text-primary"
              title="Agregar Subproceso Nivel 1"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {canCreate && type === 'subprocesohijo' && (
            <button
              onClick={() => handleAdd('actividad', path)}
              className="p-1 hover:bg-primary/10 rounded text-primary"
              title="Agregar Actividad"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {canCreate && type === 'actividad' && (
            <button
              onClick={() => handleAdd('descripcion', path)}
              className="p-1 hover:bg-primary/10 rounded text-primary"
              title="Agregar Descripción"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => handleEdit(type as any, nombre, path)}
              className="p-1 hover:bg-blue-100 rounded text-blue-600"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete({ type, nombre, path, hasChildren })}
              className="p-1 hover:bg-destructive/10 rounded text-destructive"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render sub proceso cell with "Ver detalle" link
  const renderSubProcesoCell = (macro: MacroProceso, proceso: Proceso, subProceso: SubProceso, path: number[], hasChildren: boolean) => {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-start gap-2">
          {canUpdate && (
            <span className="p-1 -ml-1 mt-0.5 shrink-0 text-muted-foreground/50" title="Arrastra para reordenar">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{subProceso.nombre}</p>
          </div>
          {(canUpdate || canDelete) && (
            <div className="flex gap-1">
              {canUpdate && (
                <button
                  onClick={() => handleEdit('subproceso', subProceso.nombre, path)}
                  className="p-1 hover:bg-blue-100 rounded text-blue-600"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete({ type: 'subproceso', nombre: subProceso.nombre, path, hasChildren })}
                  className="p-1 hover:bg-destructive/10 rounded text-destructive"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          </div>
        </div>
        
        {/* Botones de agregar en una sola fila */}
        {canCreate && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleAdd('subprocesohijo', path)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/5 hover:bg-primary/10 rounded border border-primary/20 text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="font-medium">Nivel 2</span>
            </button>
            <button
              onClick={() => handleAdd('actividad', path)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/5 hover:bg-primary/10 rounded border border-primary/20 text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="font-medium">Actividad</span>
            </button>
          </div>
        )}
        
        <button
          onClick={() => {
            setSelectedSubProceso({ macro, proceso, subProceso, path });
            setViewMode('detail');
          }}
          className="text-xs text-primary hover:underline text-left"
        >
          Ver detalle
        </button>
      </div>
    );
  };

  // Render descripcion cell as label with edit button
  const renderDescripcionCell = (descripcion: Descripcion, path: number[]) => {
    return (
      <div className="min-w-[200px] flex items-start justify-between gap-2">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          {canUpdate && (
            <span className="p-1 -ml-1 mt-0.5 shrink-0 text-muted-foreground/50" title="Arrastra para reordenar">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <p className="text-sm text-justify">{descripcion.texto}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {canCreate && (
            <button
              onClick={() => handleAddPuesto(path)}
              className="p-1 hover:bg-primary/10 rounded text-primary"
              title="Agregar Puesto"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => handleEdit('descripcion', descripcion.texto, path)}
              className="p-1 hover:bg-blue-100 rounded text-blue-600"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete({ type: 'descripcion', nombre: descripcion.texto, path, hasChildren: descripcion.puestos.length > 0 })}
              className="p-1 hover:bg-destructive/10 rounded text-destructive"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render puesto cell with edit button
  const renderPuestoCell = (puesto: { id: string | null; nombre?: string; trabajadorId?: string | number | null }, path: number[]) => {
    const puestoNombre = getPuestoName(puesto.id, puesto.nombre, puesto.trabajadorId);

    return (
      <div className="min-w-[150px] flex items-start justify-between gap-2">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          {canUpdate && (
            <span className="p-1 -ml-1 mt-0.5 shrink-0 text-muted-foreground/50" title="Arrastra para mover a otra actividad">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <p className="text-sm text-justify">{puestoNombre}</p>
        </div>
        {(canUpdate || canDelete) && (
          <div className="flex gap-1 shrink-0">
            {canUpdate && (
              <button
                onClick={() => handleEditPuesto(puesto.id, path, puesto.trabajadorId)}
                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete({ type: 'puesto', nombre: puestoNombre, path, hasChildren: false })}
                className="p-1 hover:bg-destructive/10 rounded text-destructive"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Celda vacía genérica: mismo formato visual que las zonas "Soltar aquí"
  // funcionales, para cuando la celda no tiene dato pero tampoco hay (todavía)
  // una acción de arrastre coherente que conectar ahí (ej. Puesto cuando ni
  // siquiera existe una Actividad en esa fila).
  const renderCeldaVaciaGenerica = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      Soltar aquí
    </div>
  );

  // Celda vacía en la columna Descripción: funciona como zona de "soltar
  // aquí" para mover una Descripción (con sus Puestos) desde otra
  // Actividad hacia esta, que no tiene ninguna todavía.
  const renderDescripcionVacia = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      {canUpdate ? 'Soltar aquí' : ''}
    </div>
  );

  // Celda vacía en la columna Actividad: funciona como zona de "soltar
  // aquí" para mover una Actividad (existente en otro lado de la matriz)
  // hacia este Subproceso que se quedó sin ninguna.
  const renderActividadVacia = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      {canUpdate ? 'Soltar aquí' : ''}
    </div>
  );

  // Celda vacía en la columna Subproceso Nivel 1: funciona como zona de
  // "soltar aquí" para mover un Subproceso Nivel 1 (existente en otro Proceso)
  // hacia este Proceso que se quedó sin ninguno.
  const renderSubprocesoVacio = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      {canUpdate ? 'Soltar aquí' : ''}
    </div>
  );

  // Celda vacía en la columna Subproceso Nivel 2: funciona como zona de
  // "soltar aquí" para mover un Subproceso Nivel 2 (existente en otro lado
  // de la matriz) hacia este Subproceso Nivel 1.
  const renderSubprocesoHijoVacio = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      {canUpdate ? 'Soltar aquí' : ''}
    </div>
  );

  // Celda vacía en la columna Puesto: funciona como zona de "soltar aquí"
  // para asignarle un puesto arrastrado desde otra actividad.
  const renderPuestoVacio = () => (
    <div className="min-h-[56px] w-full rounded-md border-2 border-dashed transition-all flex items-center justify-center text-xs border-slate-300 text-slate-400 bg-slate-50">
      {canUpdate ? 'Soltar aquí' : '—'}
    </div>
  );

  // Get cargo name by ID
  const getCargoName = (cargoId: string | null): string => {
    if (!cargoId) return 'Sin asignar';
    const cargo = cargos.find((c) => c._id === cargoId);
    return cargo ? cargo.Nombre : 'Desconocido';
  };

  // Get puesto name by ID
  const getPuestoName = (puestoId: string | null, nombreGuardado?: string, trabajadorId?: string | number | null): string => {
    // Prioridad 1: trabajadorId guardado directamente en la actividad (sin
    // ambigüedad, funciona aunque varias personas compartan el mismo Puesto).
    if (trabajadorId) {
      const nombreDirecto = nombrePorTrabajadorId.get(String(trabajadorId));
      if (nombreDirecto) return nombreDirecto;
    }
    if (!puestoId) return nombreGuardado || 'Sin asignar';
    // Prioridad 2 (respaldo para datos guardados antes de tener
    // trabajadorId): nombre de "alguna" persona que tiene este Puesto
    // asignado -- puede estar equivocado si el Puesto es compartido.
    const nombreTrabajador = trabajadorPorPuestoMap.get(puestoId);
    if (nombreTrabajador) return nombreTrabajador;
    const nombre = puestosMap.get(puestoId);
    return nombre || nombreGuardado || 'Desconocido';
  };

  // Dado un tipo y un path, devuelve el arreglo "hermano" donde vive ese
  // elemento (para poder reordenarlo) junto con su índice actual dentro de
  // ese arreglo. Replica exactamente la misma lógica de navegación por path
  // que ya usan handleFormSubmit/handleDeleteConfirm.
  const getSiblingArrayYIndex = (
    matrizClon: MacroProceso[],
    type: CellData['type'],
    path: number[]
  ): { arr: any[]; index: number } | null => {
    try {
      switch (type) {
        case 'macro':
          return { arr: matrizClon, index: path[0] };
        case 'proceso': {
          const [mi] = path;
          return { arr: matrizClon[mi].procesos, index: path[1] };
        }
        case 'subproceso': {
          const [mi, pi] = path;
          return { arr: matrizClon[mi].procesos[pi].subprocesos, index: path[2] };
        }
        case 'subprocesohijo': {
          const [mi, pi, si] = path;
          return { arr: matrizClon[mi].procesos[pi].subprocesos[si].subprocesos, index: path[3] };
        }
        case 'actividad': {
          const [mi, pi, si, a, b] = path;
          if (b !== undefined) {
            // Actividad bajo un Subproceso Nivel 2 (subprocesohijo)
            return { arr: (matrizClon[mi].procesos[pi].subprocesos[si] as any).subprocesos[a].actividades, index: b };
          }
          // Actividad directo bajo el Subproceso Nivel 1
          return { arr: matrizClon[mi].procesos[pi].subprocesos[si].actividades, index: a };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  const clavePath = (type: string, path: number[]) => `${type}:${path.join('-')}`;

  // Mueve un puesto desde la actividad de origen hacia la actividad de
  // destino (pueden estar en cualquier parte de la matriz, no necesitan
  // compartir padre). Siempre opera sobre descripciones[0] de cada
  // actividad -- si el destino no tiene ninguna descripción todavía, se
  // crea una vacía para poder alojar el puesto.
  const handleMoverPuesto = async (origenActividadPath: number[], destinoActividadPath: number[]) => {
    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];

      const obtenerActividad = (path: number[]): Actividad => {
        if (path.length === 5) {
          const [mi, pi, si, hi, ai] = path;
          return (nuevaMatriz[mi].procesos[pi].subprocesos[si] as any).subprocesos[hi].actividades[ai];
        }
        const [mi, pi, si, ai] = path;
        return nuevaMatriz[mi].procesos[pi].subprocesos[si].actividades[ai];
      };

      const actividadOrigen = obtenerActividad(origenActividadPath);
      const actividadDestino = obtenerActividad(destinoActividadPath);

      const puestoAMover = actividadOrigen?.descripciones?.[0]?.puestos?.[0];
      if (!puestoAMover) {
        showMessage('error', 'No se encontró el puesto de origen');
        return;
      }

      actividadOrigen.descripciones[0].puestos = [];
      if (!actividadDestino.descripciones || actividadDestino.descripciones.length === 0) {
        actividadDestino.descripciones = [{ texto: '', puestos: [puestoAMover] }];
      } else {
        actividadDestino.descripciones[0].puestos = [puestoAMover];
      }

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Puesto movido correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al mover el puesto');
    } finally {
      setIsReordering(false);
    }
  };

  // Mueve un Subproceso Nivel 2 hacia otro Subproceso Nivel 1 (puede ser el
  // mismo -- para reordenar entre hermanos -- o uno distinto, incluyendo
  // soltarlo sobre una zona vacía "Soltar aquí" para asignarlo ahí).
  const handleMoverSubProcesoHijo = async (origenPath: number[], destinoPath: number[]) => {
    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];
      const obtenerArregloSubHijos = (path: number[]) => {
        const [mi, pi, si] = path;
        return nuevaMatriz[mi].procesos[pi].subprocesos[si].subprocesos;
      };

      const origenArr = obtenerArregloSubHijos(origenPath);
      const origenIndex = origenPath[3];
      const [elementoMovido] = origenArr.splice(origenIndex, 1);

      const destinoArr = obtenerArregloSubHijos(destinoPath);
      let destinoIndex: number;
      if (destinoPath.length === 4) {
        // Se soltó sobre otro Subproceso Nivel 2 existente -> insertar en esa posición
        destinoIndex = destinoPath[3];
        if (origenArr === destinoArr && origenIndex < destinoIndex) destinoIndex -= 1;
      } else {
        // Se soltó sobre la zona vacía "Soltar aquí" -> agregar al final
        destinoIndex = destinoArr.length;
      }
      destinoArr.splice(destinoIndex, 0, elementoMovido);

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Subproceso Nivel 2 movido correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al mover el Subproceso Nivel 2');
    } finally {
      setIsReordering(false);
    }
  };

  // Mueve un Subproceso Nivel 1 hacia otro Proceso (puede ser el mismo --
  // para reordenar entre hermanos -- o uno distinto, para reasignarlo,
  // incluyendo soltarlo sobre un Proceso que se quedó sin ninguno).
  const handleMoverSubProceso = async (origenPath: number[], destinoPath: number[]) => {
    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];
      const obtenerArregloSubprocesos = (path: number[]) => {
        const [mi, pi] = path;
        return nuevaMatriz[mi].procesos[pi].subprocesos;
      };

      const origenArr = obtenerArregloSubprocesos(origenPath);
      const origenIndex = origenPath[2];
      const [elementoMovido] = origenArr.splice(origenIndex, 1);

      const destinoArr = obtenerArregloSubprocesos(destinoPath);
      let destinoIndex: number;
      if (destinoPath.length === 3) {
        // Se soltó sobre otro Subproceso Nivel 1 existente -> insertar en esa posición
        destinoIndex = destinoPath[2];
        if (origenArr === destinoArr && origenIndex < destinoIndex) destinoIndex -= 1;
      } else {
        // Se soltó sobre la zona vacía "Soltar aquí" de un Proceso sin
        // Subprocesos Nivel 1 todavía -> agregar al final
        destinoIndex = destinoArr.length;
      }
      destinoArr.splice(destinoIndex, 0, elementoMovido);

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Subproceso Nivel 1 movido correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al mover el Subproceso Nivel 1');
    } finally {
      setIsReordering(false);
    }
  };

  // Mueve una Actividad hacia otro padre (otro Subproceso Nivel 1 u otro
  // Subproceso Nivel 2 -- puede ser el mismo, para reordenar entre
  // hermanos, o uno distinto, para reasignarla). Reutiliza
  // getSiblingArrayYIndex, que ya sabe resolver ambas formas de path
  // (actividad directa bajo Subproceso Nivel 1, o bajo Subproceso Nivel 2).
  const handleMoverActividad = async (origenPath: number[], destinoPath: number[]) => {
    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];

      const origenInfo = getSiblingArrayYIndex(nuevaMatriz, 'actividad', origenPath);
      if (!origenInfo) {
        showMessage('error', 'No se encontró la actividad de origen');
        return;
      }
      const [elementoMovido] = origenInfo.arr.splice(origenInfo.index, 1);

      // destinoPath de 3 elementos = un Subproceso Nivel 1 sin NINGUNA
      // actividad ni Subproceso Nivel 2 todavía -> se agrega directo a
      // subproceso.actividades.
      if (destinoPath.length === 3) {
        const [mi, pi, si] = destinoPath;
        nuevaMatriz[mi].procesos[pi].subprocesos[si].actividades.push(elementoMovido);
      } else if (destinoPath.length === 5 && destinoPath[4] === -1) {
        // destinoPath de 5 elementos terminando en -1 (centinela) = un
        // Subproceso Nivel 2 sin ninguna actividad todavía -> se agrega
        // directo a subprocesohijo.actividades. El -1 evita confundirlo
        // con el path de una actividad real bajo ese mismo Subproceso
        // Nivel 2 (que también tiene 5 elementos, pero con un índice >= 0).
        const [mi, pi, si, hi] = destinoPath;
        (nuevaMatriz[mi].procesos[pi].subprocesos[si] as any).subprocesos[hi].actividades.push(elementoMovido);
      } else {
        const destinoInfo = getSiblingArrayYIndex(nuevaMatriz, 'actividad', destinoPath);
        if (!destinoInfo) {
          showMessage('error', 'No se encontró el destino');
          return;
        }
        let destinoIndex = destinoInfo.index;
        if (origenInfo.arr === destinoInfo.arr && origenInfo.index < destinoIndex) destinoIndex -= 1;
        destinoInfo.arr.splice(destinoIndex, 0, elementoMovido);
      }

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Actividad movida correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al mover la actividad');
    } finally {
      setIsReordering(false);
    }
  };

  // Mueve una Descripción (junto con los Puestos que tenga adentro) desde
  // su Actividad de origen hacia la Actividad de destino -- pueden ser
  // actividades completamente distintas, en cualquier parte de la matriz.
  const handleMoverDescripcion = async (origenPath: number[], destinoPath: number[]) => {
    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];

      const obtenerActividadObjeto = (path: number[]): Actividad => {
        if (path.length === 5) {
          const [mi, pi, si, hi, ai] = path;
          return (nuevaMatriz[mi].procesos[pi].subprocesos[si] as any).subprocesos[hi].actividades[ai];
        }
        const [mi, pi, si, ai] = path;
        return nuevaMatriz[mi].procesos[pi].subprocesos[si].actividades[ai];
      };

      const origenActividadPath = origenPath.slice(0, -1);
      const origenDescIndex = origenPath[origenPath.length - 1];
      const actividadOrigen = obtenerActividadObjeto(origenActividadPath);
      const [elementoMovido] = actividadOrigen.descripciones.splice(origenDescIndex, 1);

      const destinoEsPlaceholderVacio = destinoPath[destinoPath.length - 1] === -1;
      const destinoActividadPath = destinoPath.slice(0, -1);
      const actividadDestino = obtenerActividadObjeto(destinoActividadPath);

      if (destinoEsPlaceholderVacio) {
        // La actividad destino no tenía ninguna descripción todavía
        actividadDestino.descripciones.push(elementoMovido);
      } else {
        const destinoDescIndex = destinoPath[destinoPath.length - 1];
        let indiceDestinoAjustado = destinoDescIndex;
        if (actividadOrigen.descripciones === actividadDestino.descripciones && origenDescIndex < destinoDescIndex) {
          indiceDestinoAjustado -= 1;
        }
        actividadDestino.descripciones.splice(indiceDestinoAjustado, 0, elementoMovido);
      }

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Descripción movida correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al mover la descripción');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDrop = async (targetType: CellData['type'], targetPath: number[]) => {
    const origen = dragItem;
    setDragItem(null);
    setDragOverKey(null);
    if (!origen || origen.type !== targetType) return; // solo se reordena entre elementos del mismo tipo
    if (origen.path.join('-') === targetPath.join('-')) return; // soltó sobre sí mismo

    if (origen.type === 'puesto') {
      await handleMoverPuesto(origen.path, targetPath);
      return;
    }

    if (origen.type === 'descripcion') {
      await handleMoverDescripcion(origen.path, targetPath);
      return;
    }

    if (origen.type === 'subprocesohijo') {
      await handleMoverSubProcesoHijo(origen.path, targetPath);
      return;
    }

    if (origen.type === 'subproceso') {
      await handleMoverSubProceso(origen.path, targetPath);
      return;
    }

    if (origen.type === 'actividad') {
      await handleMoverActividad(origen.path, targetPath);
      return;
    }

    try {
      setIsReordering(true);
      const nuevaMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];
      const origenInfo = getSiblingArrayYIndex(nuevaMatriz, origen.type, origen.path);
      const destinoInfo = getSiblingArrayYIndex(nuevaMatriz, targetType, targetPath);
      if (!origenInfo || !destinoInfo || origenInfo.arr !== destinoInfo.arr) {
        // Solo permitimos reordenar dentro del mismo padre (mismos hermanos)
        showMessage('error', 'Solo puedes reordenar elementos dentro del mismo grupo (mismo padre)');
        return;
      }
      const [elementoMovido] = origenInfo.arr.splice(origenInfo.index, 1);
      // Si el elemento movido estaba antes del destino, el índice destino ya
      // se corrió una posición al hacer el splice de arriba.
      const indiceDestinoAjustado =
        origenInfo.index < destinoInfo.index ? destinoInfo.index - 1 : destinoInfo.index;
      origenInfo.arr.splice(indiceDestinoAjustado, 0, elementoMovido);

      await matrizProcesosService.updateMatriz(nuevaMatriz);
      showMessage('success', 'Orden actualizado correctamente');
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al reordenar');
    } finally {
      setIsReordering(false);
    }
  };

  // Handle add element
  const handleAdd = (
    type: 'macro' | 'proceso' | 'subproceso' | 'subprocesohijo' | 'actividad' | 'descripcion',
    path: number[]
  ) => {
    const titles = {
      macro: 'Nuevo Macro Proceso',
      proceso: 'Nuevo Proceso',
      subproceso: 'Nuevo Subproceso Nivel 1',
      subprocesohijo: 'Nuevo Subproceso Nivel 2',
      actividad: 'Nueva Actividad',
      descripcion: 'Nueva Descripción',
    };

    setFormContext({ type, title: titles[type], path, isEdit: false });
    setIsFormDialogOpen(true);
  };

  // Handle edit element
  const handleEdit = (
    type: 'macro' | 'proceso' | 'subproceso' | 'subprocesohijo' | 'actividad' | 'descripcion' | 'puesto',
    currentValue: string,
    path: number[]
  ) => {
    const titles = {
      macro: 'Editar Macro Proceso',
      proceso: 'Editar Proceso',
      subproceso: 'Editar Subproceso Nivel 1',
      subprocesohijo: 'Editar Subproceso Nivel 2',
      actividad: 'Editar Actividad',
      descripcion: 'Editar Descripción',
      puesto: 'Editar Puesto',
    };

    if (type === 'puesto') {
      setPuestoContext({ path });
      setIsPuestoDialogOpen(true);
    } else {
      setFormContext({ type, title: titles[type], path, currentValue, isEdit: true });
      setIsFormDialogOpen(true);
    }
  };

  // Handle edit puesto
  const handleEditPuesto = (currentPuestoId: string | null, path: number[], currentTrabajadorId?: string | number | null) => {
    setPuestoContext({ path, currentPuestoId, currentTrabajadorId, isEdit: true });
    setIsPuestoDialogOpen(true);
  };

  // Handle add puesto
  const handleAddPuesto = (path: number[]) => {
    setPuestoContext({ path, isEdit: false });
    setIsPuestoDialogOpen(true);
  };

  // Handle form submit
  const handleFormSubmit = async (data: { nombre: string; descripcion: string }) => {
    if (!formContext) return;

    try {
      setIsSubmitting(true);
      const newMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];

      const { type, path, isEdit } = formContext;

      if (isEdit) {
        // Update existing element
        if (type === 'macro') {
          const [macroIndex] = path;
          newMatriz[macroIndex].nombre = data.nombre;
        } else if (type === 'proceso') {
          const [macroIndex, procesoIndex] = path;
          newMatriz[macroIndex].procesos[procesoIndex].nombre = data.nombre;
        } else if (type === 'subproceso') {
          const [macroIndex, procesoIndex, subProcesoIndex] = path;
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].nombre = data.nombre;
        } else if (type === 'subprocesohijo') {
          const [macroIndex, procesoIndex, subProcesoIndex, subProcesoHijoIndex] = path;
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subProcesoHijoIndex].nombre = data.nombre;
        } else if (type === 'actividad') {
          const [macroIndex, procesoIndex, subProcesoIndex, subHijoOrActIndex, actividadIndex] = path;
          if (actividadIndex !== undefined) {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subHijoOrActIndex].actividades[actividadIndex].nombre = data.nombre;
          } else {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[subHijoOrActIndex].nombre = data.nombre;
          }
        } else if (type === 'descripcion') {
          const [macroIndex, procesoIndex, subProcesoIndex, subHijoOrActIndex, actOrDescIndex, descripcionIndex] = path;
          if (descripcionIndex !== undefined) {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[subHijoOrActIndex].actividades[actOrDescIndex].descripciones[descripcionIndex].texto = data.descripcion || data.nombre;
          } else {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[subHijoOrActIndex].descripciones[actOrDescIndex].texto = data.descripcion || data.nombre;
          }
        }
      } else {
        // Add new element
        if (type === 'macro') {
          newMatriz.push({
            nombre: data.nombre,
            procesos: [],
          });
        } else if (type === 'proceso') {
          const [macroIndex] = path;
          newMatriz[macroIndex].procesos.push({
            nombre: data.nombre,
            subprocesos: [],
          });
        } else if (type === 'subproceso') {
          const [macroIndex, procesoIndex] = path;
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos.push({
            nombre: data.nombre,
            actividades: [],
            subprocesos: [],
          });
        } else if (type === 'subprocesohijo') {
          const [macroIndex, procesoIndex, subProcesoIndex] = path;
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos.push({
            nombre: data.nombre,
            actividades: [],
            subprocesos: [],
          });
        } else if (type === 'actividad') {
          const [macroIndex, procesoIndex, subProcesoIndex, subProcesoHijoIndex] = path;
          if (subProcesoHijoIndex !== undefined) {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[
              subProcesoHijoIndex
            ].actividades.push({
              nombre: data.nombre,
              descripciones: [],
            });
          } else {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades.push({
              nombre: data.nombre,
              descripciones: [],
            });
          }
        } else if (type === 'descripcion') {
          const [macroIndex, procesoIndex, subProcesoIndex, subHijoOrActIndex, actividadIndex] = path;
          if (actividadIndex !== undefined) {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[
              subHijoOrActIndex
            ].actividades[actividadIndex].descripciones.push({
              texto: data.descripcion || data.nombre,
              puestos: [],
            });
          } else {
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[
              subHijoOrActIndex
            ].descripciones.push({
              texto: data.descripcion || data.nombre,
              puestos: [],
            });
          }
        }
      }

      await matrizProcesosService.updateMatriz(newMatriz);
      showMessage('success', isEdit ? 'Elemento actualizado exitosamente' : 'Elemento creado exitosamente');
      setIsFormDialogOpen(false);
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al guardar el elemento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle puesto submit - CON SubProcesoHijo
  const handlePuestoSubmitConSubHijo = async (
    newMatriz: MacroProceso[],
    path: number[],
    puestoId: string,
    puestoNombre: string,
    trabajadorId: string | null,
    isEdit: boolean
  ) => {
    // Path: [macro, proceso, subproceso, subHijo, actividad, descripcion, puesto?]
    const [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex, puestoIndex] = path;

    console.log('--- CASO: CON SubProcesoHijo ---');
    console.log('Indices:', { macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex, puestoIndex });
    console.log('Puesto:', { id: puestoId, nombre: puestoNombre });

    const subHijo = newMatriz[macroIndex]?.procesos[procesoIndex]?.subprocesos[subProcesoIndex]?.subprocesos[subHijoIndex];
    
    if (!subHijo) {
      throw new Error('SubProcesoHijo no encontrado');
    }

    const actividad = subHijo.actividades?.[actividadIndex];
    
    if (!actividad) {
      throw new Error('Actividad no encontrada en SubProcesoHijo');
    }

    const descripcion = actividad.descripciones?.[descripcionIndex];
    
    if (!descripcion) {
      throw new Error('Descripción no encontrada en SubProcesoHijo');
    }

    if (isEdit && puestoIndex !== undefined) {
      // EDITAR puesto existente
      const puestoActual = descripcion.puestos?.[puestoIndex];
      
      if (!puestoActual) {
        throw new Error(`Puesto no encontrado en índice ${puestoIndex}`);
      }

      // Actualizar el ID y nombre del puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .subprocesos[subHijoIndex].actividades[actividadIndex]
        .descripciones[descripcionIndex].puestos[puestoIndex] = {
          id: puestoId,
          nombre: puestoNombre,
          trabajadorId
        };
      
      console.log('Puesto actualizado exitosamente en SubHijo');
    } else {
      // AGREGAR nuevo puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .subprocesos[subHijoIndex].actividades[actividadIndex]
        .descripciones[descripcionIndex].puestos.push({
          id: puestoId,
          nombre: puestoNombre,
          trabajadorId
        });
      
      console.log('Nuevo puesto agregado exitosamente en SubHijo');
    }
  };

  // Handle puesto submit - SIN SubProcesoHijo
  const handlePuestoSubmitSinSubHijo = async (
    newMatriz: MacroProceso[],
    path: number[],
    puestoId: string,
    puestoNombre: string,
    trabajadorId: string | null,
    isEdit: boolean
  ) => {
    // Path: [macro, proceso, subproceso, actividad, descripcion, puesto?]
    const [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex, puestoIndex] = path;

    console.log('--- CASO: SIN SubProcesoHijo ---');
    console.log('Indices:', { macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex, puestoIndex });
    console.log('Puesto:', { id: puestoId, nombre: puestoNombre });

    const subProceso = newMatriz[macroIndex]?.procesos[procesoIndex]?.subprocesos[subProcesoIndex];
    
    if (!subProceso) {
      throw new Error('SubProceso no encontrado');
    }

    const actividad = subProceso.actividades?.[actividadIndex];
    
    if (!actividad) {
      throw new Error('Actividad no encontrada en SubProceso');
    }

    const descripcion = actividad.descripciones?.[descripcionIndex];
    
    if (!descripcion) {
      throw new Error('Descripción no encontrada en SubProceso');
    }

    if (isEdit && puestoIndex !== undefined) {
      // EDITAR puesto existente
      const puestoActual = descripcion.puestos?.[puestoIndex];
      
      if (!puestoActual) {
        throw new Error(`Puesto no encontrado en índice ${puestoIndex}`);
      }

      // Actualizar el ID y nombre del puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .actividades[actividadIndex].descripciones[descripcionIndex]
        .puestos[puestoIndex] = {
          id: puestoId,
          nombre: puestoNombre,
          trabajadorId
        };
      
      console.log('Puesto actualizado exitosamente sin SubHijo');
    } else {
      // AGREGAR nuevo puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .actividades[actividadIndex].descripciones[descripcionIndex]
        .puestos.push({
          id: puestoId,
          nombre: puestoNombre,
          trabajadorId
        });
      
      console.log('Nuevo puesto agregado exitosamente sin SubHijo');
    }
  };

  // Handle puesto submit - Main function
  const handlePuestoSubmit = async (puestoId: string, puestoNombre: string, trabajadorId: string | null) => {
    if (!puestoContext) return;

    try {
      const newMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];
      const { path, isEdit } = puestoContext;

      console.log('=== PUESTO SUBMIT DEBUG ===');
      console.log('Path completo:', path);
      console.log('Path length:', path.length);
      console.log('IsEdit:', isEdit);
      console.log('Puesto:', { id: puestoId, nombre: puestoNombre });

      const [macroIndex, procesoIndex, subProcesoIndex] = path;
      const subProceso = newMatriz[macroIndex]?.procesos[procesoIndex]?.subprocesos[subProcesoIndex];
      
      if (!subProceso) {
        throw new Error('SubProceso no encontrado en la ruta especificada');
      }

      console.log('SubProceso:', subProceso.nombre);

      // Determinar estructura basándose en la longitud del path
      let hasSubHijo = false;
      
      if (isEdit) {
        // Editando: path.length === 7 (con SubHijo) o 6 (sin SubHijo)
        hasSubHijo = path.length === 7;
      } else {
        // Agregando: path.length === 6 (con SubHijo) o 5 (sin SubHijo)
        if (path.length === 6) {
          // Verificar si path[3] es un índice válido de subprocesos
          const potentialSubHijoIndex = path[3];
          hasSubHijo = subProceso.subprocesos && 
                       subProceso.subprocesos[potentialSubHijoIndex] !== undefined;
        } else {
          hasSubHijo = false;
        }
      }

      console.log('Estructura detectada:', hasSubHijo ? 'CON SubProcesoHijo' : 'SIN SubProcesoHijo');

      // Llamar a la función correspondiente según la estructura
      if (hasSubHijo) {
        await handlePuestoSubmitConSubHijo(newMatriz, path, puestoId, puestoNombre, trabajadorId, isEdit || false);
      } else {
        await handlePuestoSubmitSinSubHijo(newMatriz, path, puestoId, puestoNombre, trabajadorId, isEdit || false);
      }

      console.log('=== GUARDANDO CAMBIOS ===');
      
      // Actualizar el mapa de puestos con el nuevo nombre
      setPuestosMap(prev => {
        const newMap = new Map(prev);
        newMap.set(puestoId, puestoNombre);
        return newMap;
      });
      
      await matrizProcesosService.updateMatriz(newMatriz);
      showMessage('success', isEdit ? 'Puesto actualizado exitosamente' : 'Puesto agregado exitosamente');
      setIsPuestoDialogOpen(false);
      await refreshMatriz();
      console.log('=== PROCESO COMPLETADO ===');
    } catch (error: any) {
      console.error('=== ERROR EN PUESTO SUBMIT ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      showMessage('error', error.message || 'Error al guardar el puesto');
    }
  };

  // Handle delete
  const handleDelete = (context: { type: string; nombre: string; path: number[]; hasChildren: boolean }) => {
    if (context.hasChildren) {
      showMessage('error', 'No se puede eliminar este elemento porque tiene elementos dependientes');
      return;
    }

    setDeleteContext(context);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deleteContext) return;

    try {
      setIsDeleting(true);
      const newMatriz = JSON.parse(JSON.stringify(matriz)) as MacroProceso[];
      const { type, path } = deleteContext;

      if (type === 'macro') {
        const [macroIndex] = path;
        newMatriz.splice(macroIndex, 1);
      } else if (type === 'proceso') {
        const [macroIndex, procesoIndex] = path;
        newMatriz[macroIndex].procesos.splice(procesoIndex, 1);
      } else if (type === 'subproceso') {
        const [macroIndex, procesoIndex, subProcesoIndex] = path;
        newMatriz[macroIndex].procesos[procesoIndex].subprocesos.splice(subProcesoIndex, 1);
      } else if (type === 'subprocesohijo') {
        const [macroIndex, procesoIndex, subProcesoIndex, subProcesoHijoIndex] = path;
        newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos.splice(
          subProcesoHijoIndex,
          1
        );
      } else if (type === 'actividad') {
        const [macroIndex, procesoIndex, subProcesoIndex, subHijoOrActIndex, actividadIndex] = path;
        if (actividadIndex !== undefined) {
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[
            subHijoOrActIndex
          ].actividades.splice(actividadIndex, 1);
        } else {
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades.splice(
            subHijoOrActIndex,
            1
          );
        }
      } else if (type === 'descripcion') {
        const [macroIndex, procesoIndex, subProcesoIndex, subHijoOrActIndex, actOrDescIndex, descripcionIndex] = path;
        if (descripcionIndex !== undefined) {
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[
            subHijoOrActIndex
          ].actividades[actOrDescIndex].descripciones.splice(descripcionIndex, 1);
        } else {
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[
            subHijoOrActIndex
          ].descripciones.splice(actOrDescIndex, 1);
        }
      } else if (type === 'puesto') {
        const [macroIndex, procesoIndex, subProcesoIndex] = path;
        
        // Determine if we have a SubProcesoHijo by checking path length and structure
        if (path.length >= 7) {
          const potentialSubHijoIndex = path[3];
          const potentialActIndex = path[4];
          const potentialDescIndex = path[5];
          const potentialPuestoIndex = path[6];

          // Check if subprocesos array exists and has the index
          if (
            newMatriz[macroIndex]?.procesos[procesoIndex]?.subprocesos[subProcesoIndex]?.subprocesos &&
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[potentialSubHijoIndex]
          ) {
            // Has SubProcesoHijo
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].subprocesos[potentialSubHijoIndex].actividades[potentialActIndex].descripciones[potentialDescIndex].puestos.splice(potentialPuestoIndex, 1);
          } else {
            // No SubProcesoHijo - direct actividad
            const actividadIndex = path[3];
            const descripcionIndex = path[4];
            const puestoIndex = path[5];
            newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[actividadIndex].descripciones[descripcionIndex].puestos.splice(puestoIndex, 1);
          }
        } else {
          // Path length < 7, must be without SubProcesoHijo
          const actividadIndex = path[3];
          const descripcionIndex = path[4];
          const puestoIndex = path[5];
          newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex].actividades[actividadIndex].descripciones[descripcionIndex].puestos.splice(puestoIndex, 1);
        }
      }

      await matrizProcesosService.updateMatriz(newMatriz);
      showMessage('success', 'Elemento eliminado exitosamente');
      setIsDeleteDialogOpen(false);
      await refreshMatriz();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al eliminar el elemento');
    } finally {
      setIsDeleting(false);
    }
  };

  // Manejadores de eventos táctiles para scroll horizontal suave
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setScrollStart(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart || !scrollContainerRef.current) return;

    const touch = e.touches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = touchStart.y - touch.clientY;

    // Si el movimiento horizontal es mayor que el vertical, hacer scroll horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevenir scroll vertical
      scrollContainerRef.current.scrollLeft = scrollStart + deltaX;
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setScrollStart(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const rows = buildMatrixRows();

  return (
    <div className="space-y-6">
      {viewMode === 'matrix' ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Matriz de Procesos</h1>
              <p className="text-muted-foreground mt-1">Gestiona la jerarquía de procesos de tu organización.</p>
            </div>
            {canCreate && (
              <Button onClick={() => handleAdd('macro', [])}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Macroproceso
              </Button>
            )}
          </div>

          {/* Buscador global */}
          <div className="max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en toda la matriz (macroproceso, proceso, actividad, puesto...)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {busqueda.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                {filasFiltradas.length} resultado{filasFiltradas.length !== 1 ? 's' : ''} encontrado{filasFiltradas.length !== 1 ? 's' : ''}
                {' · '}
                <button type="button" className="underline" onClick={() => setBusqueda('')}>
                  limpiar
                </button>
              </p>
            )}
          </div>

          {/* Matrix Table with Loading Overlay */}
          <div className="relative">
            {isRefreshing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Actualizando matriz...</p>
                </div>
              </div>
            )}
            {busqueda.trim() ? (
              <div className="border rounded-lg bg-card overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Macroproceso</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Proceso</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Subproceso Nivel 1</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Subproceso Nivel 2</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Actividad</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Descripción</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Puesto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No se encontraron resultados para "{busqueda}".
                        </td>
                      </tr>
                    ) : (
                      filasFiltradas.map((f, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-3 text-sm border-r">{f.macro}</td>
                          <td className="p-3 text-sm border-r">{f.proceso}</td>
                          <td className="p-3 text-sm border-r">{f.subproceso1}</td>
                          <td className="p-3 text-sm border-r">{f.subproceso2}</td>
                          <td className="p-3 text-sm border-r">{f.actividad}</td>
                          <td className="p-3 text-sm border-r">{f.descripcion}</td>
                          <td className="p-3 text-sm">{f.puesto}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
            <div 
              ref={scrollContainerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="border rounded-lg bg-card overflow-x-auto touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Macroproceso</th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Proceso</th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Subproceso Nivel 1</th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r bg-muted/30">
                      Subproceso Nivel 2
                    </th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Actividad</th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap border-r">Descripción</th>
                    <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Puesto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No hay datos. Haga clic en "Nuevo Macroproceso" para comenzar.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b hover:bg-muted/30 transition-colors">
                        {row.cells.map((cell, cellIndex) => {
                          if (cell === null) return null;

                          const isEmptyCell = cell.type === 'empty';
                          const isSubHijoColumn = cellIndex === 3;
                          const esPuesto = cell.type === 'puesto';
                          const tienePuestoReal = esPuesto && !!cell.nombre;
                          const esSubHijoPlaceholder = cell.type === 'subprocesohijo' && !cell.nombre;
                          const esSubProcesoPlaceholder = cell.type === 'subproceso' && !cell.nombre;
                          const esActividadPlaceholder = cell.type === 'actividad' && !cell.nombre;
                          const esDescripcionPlaceholder = cell.type === 'descripcion' && !cell.nombre;
                          // Puesto: se puede soltar en CUALQUIER actividad (tenga puesto o no),
                          // no solo entre hermanos del mismo padre -- por eso se trata aparte.
                          const esArrastrable =
                            canUpdate && (
                              ['macro', 'proceso'].includes(cell.type) ||
                              (cell.type === 'descripcion' && !esDescripcionPlaceholder) ||
                              (cell.type === 'actividad' && !esActividadPlaceholder) ||
                              (cell.type === 'subproceso' && !esSubProcesoPlaceholder) ||
                              (cell.type === 'subprocesohijo' && !esSubHijoPlaceholder) ||
                              tienePuestoReal
                            );
                          const esSoltable =
                            canUpdate &&
                            (['macro', 'proceso', 'subproceso', 'subprocesohijo', 'actividad', 'descripcion'].includes(cell.type) || esPuesto);
                          const key = clavePath(cell.type, cell.path);
                          const esDragOver = dragOverKey === key;

                          return (
                            <td
                              key={cellIndex}
                              rowSpan={cell.rowSpan}
                              draggable={esArrastrable && !isReordering}
                              onDragStart={(e) => {
                                if (!esArrastrable) return;
                                e.dataTransfer.effectAllowed = 'move';
                                setDragItem({ type: cell.type, path: cell.path });
                              }}
                              onDragOver={(e) => {
                                if (!esSoltable || !dragItem || dragItem.type !== cell.type) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverKey !== key) setDragOverKey(key);
                              }}
                              onDragLeave={() => {
                                if (dragOverKey === key) setDragOverKey(null);
                              }}
                              onDrop={(e) => {
                                if (!esSoltable) return;
                                e.preventDefault();
                                handleDrop(cell.type, cell.path);
                              }}
                              onDragEnd={() => {
                                setDragItem(null);
                                setDragOverKey(null);
                              }}
                              className={`p-3 align-top border-r last:border-r-0 ${
                                isSubHijoColumn ? 'bg-muted/20' : ''
                              } ${isEmptyCell ? 'bg-muted/10' : ''} ${esArrastrable ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                esDragOver ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''
                              }`}
                            >
                              {cell.content}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </>
      ) : selectedSubProceso ? (
        // Detail View - Document Management
        <DocumentoSubProcesoView
          subProceso={selectedSubProceso.subProceso}
          onBack={() => setViewMode('matrix')}
        />
      ) : null}

      {/* Form Dialog */}
      {formContext && (
        <ElementFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          onSubmit={handleFormSubmit}
          title={formContext.title}
          isSubmitting={isSubmitting}
          initialValue={formContext.currentValue}
          formType={formContext.type}
        />
      )}

      {/* Puesto Dialog */}
      <PuestoFormDialog
        open={isPuestoDialogOpen}
        onOpenChange={setIsPuestoDialogOpen}
        onSubmit={handlePuestoSubmit}
        initialPuestoId={puestoContext?.currentPuestoId}
        initialTrabajadorId={puestoContext?.currentTrabajadorId}
        isEdit={puestoContext?.isEdit}
      />

      {/* Delete Dialog */}
      {deleteContext && (
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Confirmar Eliminación"
          description={`¿Está seguro de que desea eliminar "${deleteContext.nombre}"? Esta acción no se puede deshacer.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default MatrizProcesos;
