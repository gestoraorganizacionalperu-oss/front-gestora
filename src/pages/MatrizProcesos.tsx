import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
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
            { content: null, rowSpan: 1, path: [], type: 'empty' },
            { content: null, rowSpan: 1, path: [], type: 'empty' },
            { content: null, rowSpan: 1, path: [], type: 'empty' },
            { content: null, rowSpan: 1, path: [], type: 'empty' },
            { content: null, rowSpan: 1, path: [], type: 'empty' },
            { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                { content: null, rowSpan: 1, path: [], type: 'empty' },
                { content: null, rowSpan: 1, path: [], type: 'empty' },
                { content: null, rowSpan: 1, path: [], type: 'empty' },
                { content: null, rowSpan: 1, path: [], type: 'empty' },
                { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                    { content: null, rowSpan: 1, path: [], type: 'empty' },
                    { content: null, rowSpan: 1, path: [], type: 'empty' },
                    { content: null, rowSpan: 1, path: [], type: 'empty' },
                    { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
                          { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], false), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: false },
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                              { content: null, rowSpan: 1, path: [], type: 'empty' },
                              actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                              { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: false },
                              { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                                { content: null, rowSpan: 1, path: [], type: 'empty' },
                                actividadRowsProcessed === 0 ? { content: renderCell(actividad.nombre, 'actividad', [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], true), rowSpan: actividadRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex], type: 'actividad', nombre: actividad.nombre, hasChildren: true } : null,
                                descripcionRowsProcessed === 0 ? { content: renderDescripcionCell(descripcion, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex]), rowSpan: descripcionRowSpan, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex], type: 'descripcion', nombre: descripcion.texto, hasChildren: true } : null,
                                { content: renderPuestoCell(puesto, [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex, puestoIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, actividadIndex, descripcionIndex, puestoIndex], type: 'puesto', nombre: puesto.nombre || getPuestoName(puesto.id), hasChildren: false },
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
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
                          { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                              { content: null, rowSpan: 1, path: [], type: 'empty' },
                              { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                                  { content: null, rowSpan: 1, path: [], type: 'empty' },
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
                                    { content: renderPuestoCell(puesto, [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex, puestoIndex]), rowSpan: 1, path: [macroIndex, procesoIndex, subProcesoIndex, subHijoIndex, actividadIndex, descripcionIndex, puestoIndex], type: 'puesto', nombre: puesto.nombre || getPuestoName(puesto.id), hasChildren: false },
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
    return (
      <div className="relative min-w-[180px]">
        {/* Botones flotantes en la esquina superior derecha */}
        <div className="float-right flex gap-1 ml-2">
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
        {/* Texto que fluye alrededor de los botones */}
        <p className="font-medium text-sm text-justify">{nombre}</p>
      </div>
    );
  };

  // Render sub proceso cell with "Ver detalle" link
  const renderSubProcesoCell = (macro: MacroProceso, proceso: Proceso, subProceso: SubProceso, path: number[], hasChildren: boolean) => {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-start justify-between gap-2">
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
      <div className="relative min-w-[200px]">
        {/* Botones flotantes en la esquina superior derecha */}
        <div className="float-right flex gap-1 ml-2">
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
        {/* Texto justificado que fluye alrededor de los botones */}
        <p className="text-sm text-justify">{descripcion.texto}</p>
      </div>
    );
  };

  // Render puesto cell with edit button
  const renderPuestoCell = (puesto: { id: string | null; nombre?: string }, path: number[]) => {
    const puestoNombre = puesto.nombre || getPuestoName(puesto.id);
    
    return (
      <div className="relative min-w-[150px]">
        {/* Botones flotantes en la esquina superior derecha */}
        {(canUpdate || canDelete) && (
          <div className="float-right flex gap-1 ml-2">
            {canUpdate && (
              <button
                onClick={() => handleEditPuesto(puesto.id, path)}
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
        {/* Texto que fluye alrededor de los botones */}
        <p className="text-sm text-justify">{puestoNombre}</p>
      </div>
    );
  };

  // Get cargo name by ID
  const getCargoName = (cargoId: string | null): string => {
    if (!cargoId) return 'Sin asignar';
    const cargo = cargos.find((c) => c._id === cargoId);
    return cargo ? cargo.Nombre : 'Desconocido';
  };

  // Get puesto name by ID
  const getPuestoName = (puestoId: string | null): string => {
    if (!puestoId) return 'Sin asignar';
    const nombre = puestosMap.get(puestoId);
    return nombre || 'Desconocido';
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
  const handleEditPuesto = (currentPuestoId: string | null, path: number[]) => {
    setPuestoContext({ path, currentPuestoId, isEdit: true });
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
          nombre: puestoNombre
        };
      
      console.log('Puesto actualizado exitosamente en SubHijo');
    } else {
      // AGREGAR nuevo puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .subprocesos[subHijoIndex].actividades[actividadIndex]
        .descripciones[descripcionIndex].puestos.push({
          id: puestoId,
          nombre: puestoNombre
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
          nombre: puestoNombre
        };
      
      console.log('Puesto actualizado exitosamente sin SubHijo');
    } else {
      // AGREGAR nuevo puesto
      newMatriz[macroIndex].procesos[procesoIndex].subprocesos[subProcesoIndex]
        .actividades[actividadIndex].descripciones[descripcionIndex]
        .puestos.push({
          id: puestoId,
          nombre: puestoNombre
        });
      
      console.log('Nuevo puesto agregado exitosamente sin SubHijo');
    }
  };

  // Handle puesto submit - Main function
  const handlePuestoSubmit = async (puestoId: string, puestoNombre: string) => {
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
        await handlePuestoSubmitConSubHijo(newMatriz, path, puestoId, puestoNombre, isEdit || false);
      } else {
        await handlePuestoSubmitSinSubHijo(newMatriz, path, puestoId, puestoNombre, isEdit || false);
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
                          
                          return (
                            <td
                              key={cellIndex}
                              rowSpan={cell.rowSpan}
                              className={`p-3 align-top border-r last:border-r-0 ${
                                isSubHijoColumn ? 'bg-muted/20' : ''
                              } ${isEmptyCell ? 'bg-muted/10' : ''}`}
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
