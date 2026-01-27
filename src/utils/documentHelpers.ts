import type { SubProceso, SubProcesoHijo, Actividad } from '@/services/matrizProcesosService';
import type { Puesto } from '@/services/puestosService';

// Extraer todos los IDs de puestos únicos SOLO de las actividades directas del subproceso padre
// NO incluye puestos de subprocesos hijos ni sus actividades
export function extractPuestoIds(subProceso: SubProceso): string[] {
  const puestoIds = new Set<string>();

  // SOLO extraer de actividades del subproceso padre (nivel directo)
  subProceso.actividades.forEach(actividad => {
    actividad.descripciones.forEach(descripcion => {
      descripcion.puestos.forEach(puesto => {
        if (puesto.id) {
          puestoIds.add(puesto.id);
        }
      });
    });
  });

  return Array.from(puestoIds);
}

// Obtener puestos con descripciones desde la lista completa
export function getPuestosConDescripcion(
  puestoIds: string[],
  todosPuestos: Puesto[]
): Array<{ nombre: string; descripcion: string }> {
  const puestosMap = new Map(todosPuestos.map(p => [p._id, p]));
  const puestosUnicos = new Map<string, { nombre: string; descripcion: string }>();

  puestoIds.forEach(id => {
    const puesto = puestosMap.get(id);
    if (puesto && !puestosUnicos.has(puesto.Nombre)) {
      puestosUnicos.set(puesto.Nombre, {
        nombre: puesto.Nombre,
        descripcion: puesto.Descripcion,
      });
    }
  });

  return Array.from(puestosUnicos.values());
}

// Estructura para actividades jerárquicas
export interface ActividadJerarquica {
  nivel: number;
  numero: string;
  tipo: 'actividad' | 'descripcion' | 'subproceso';
  nombre: string;
  detalle?: string;
}

// Generar estructura jerárquica de actividades para el documento
export function generarActividadesJerarquicas(subProceso: SubProceso): ActividadJerarquica[] {
  const resultado: ActividadJerarquica[] = [];
  let contadorActividad = 1;

  // Procesar actividades del subproceso padre
  subProceso.actividades.forEach(actividad => {
    const numeroActividad = `${contadorActividad}`;
    resultado.push({
      nivel: 1,
      numero: numeroActividad,
      tipo: 'actividad',
      nombre: actividad.nombre,
    });

    // Procesar descripciones directamente (sin "Descripción X")
    actividad.descripciones.forEach((descripcion) => {
      if (descripcion.texto && descripcion.texto.trim()) {
        resultado.push({
          nivel: 1,
          numero: '',
          tipo: 'descripcion',
          nombre: '',
          detalle: descripcion.texto,
        });
      }
    });

    contadorActividad++;
  });

  // Procesar subprocesos hijos
  let contadorSubProceso = contadorActividad;
  subProceso.subprocesos.forEach(subProcesoHijo => {
    const numeroSubProceso = `${contadorSubProceso}`;
    resultado.push({
      nivel: 1,
      numero: numeroSubProceso,
      tipo: 'subproceso',
      nombre: subProcesoHijo.nombre.toUpperCase(),
    });

    // Procesar actividades del subproceso hijo
    let contadorActividadHijo = 1;
    subProcesoHijo.actividades.forEach(actividad => {
      const numeroActividadHijo = `${numeroSubProceso}.${contadorActividadHijo}`;
      resultado.push({
        nivel: 2,
        numero: numeroActividadHijo,
        tipo: 'actividad',
        nombre: actividad.nombre,
      });

      // Procesar descripciones directamente
      actividad.descripciones.forEach((descripcion) => {
        if (descripcion.texto && descripcion.texto.trim()) {
          resultado.push({
            nivel: 2,
            numero: '',
            tipo: 'descripcion',
            nombre: '',
            detalle: descripcion.texto,
          });
        }
      });

      contadorActividadHijo++;
    });

    // Procesar subprocesos nietos (recursivo)
    procesarSubProcesosNietos(subProcesoHijo.subprocesos, numeroSubProceso, resultado);

    contadorSubProceso++;
  });

  return resultado;
}

// Función auxiliar para procesar subprocesos nietos recursivamente
function procesarSubProcesosNietos(
  subprocesos: SubProcesoHijo[],
  numeroBase: string,
  resultado: ActividadJerarquica[]
) {
  subprocesos.forEach((subProcesoNieto, nietoIndex) => {
    const numeroNieto = `${numeroBase}.${nietoIndex + 1}`;
    resultado.push({
      nivel: 2,
      numero: numeroNieto,
      tipo: 'subproceso',
      nombre: subProcesoNieto.nombre.toUpperCase(),
    });

    // Procesar actividades del nieto
    let contadorActividadNieto = 1;
    subProcesoNieto.actividades.forEach(actividad => {
      const numeroActividadNieto = `${numeroNieto}.${contadorActividadNieto}`;
      resultado.push({
        nivel: 3,
        numero: numeroActividadNieto,
        tipo: 'actividad',
        nombre: actividad.nombre,
      });

      // Procesar descripciones directamente
      actividad.descripciones.forEach((descripcion) => {
        if (descripcion.texto && descripcion.texto.trim()) {
          resultado.push({
            nivel: 3,
            numero: '',
            tipo: 'descripcion',
            nombre: '',
            detalle: descripcion.texto,
          });
        }
      });

      contadorActividadNieto++;
    });

    // Recursión para más niveles
    if (subProcesoNieto.subprocesos.length > 0) {
      procesarSubProcesosNietos(subProcesoNieto.subprocesos, numeroNieto, resultado);
    }
  });
}
