import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { SubProcesoDocumento } from '@/types/documento';
import type { ActividadJerarquica } from '@/utils/documentHelpers';

// Estilos para el PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  logo: {
    width: 100,
    height: 60,
    alignSelf: 'center',
    marginTop: 80,
  },
  coverTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 200,
  },
  coverTable: {
    marginTop: 'auto',
    border: '1px solid black',
  },
  coverTableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  coverTableCell: {
    flex: 1,
    padding: 8,
    borderRight: '1px solid black',
  },
  coverTableCellLast: {
    flex: 1,
    padding: 8,
  },
  coverTableHeader: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  coverTableValue: {
    fontSize: 9,
    marginTop: 4,
  },
  header: {
    marginBottom: 20,
  },
  headerTable: {
    border: '1px solid black',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  headerCell: {
    padding: 6,
    borderRight: '1px solid black',
    fontSize: 8,
  },
  headerCellLast: {
    padding: 6,
    fontSize: 8,
  },
  headerLogoCell: {
    width: 120,
    padding: 6,
    borderRight: '1px solid black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCell: {
    flex: 2,
    padding: 6,
    borderRight: '1px solid black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfoCell: {
    width: 100,
    padding: 6,
  },
  headerLogo: {
    width: 80,
    height: 40,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerLabel: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  headerValue: {
    fontSize: 8,
    marginTop: 2,
  },
  headerResponsablesRow: {
    flexDirection: 'row',
  },
  headerResponsableCell: {
    flex: 1,
    padding: 6,
    borderRight: '1px solid black',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  puestoItem: {
    marginBottom: 6,
  },
  puestoNombre: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  puestoDescripcion: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'justify',
  },
  definicionItem: {
    marginBottom: 8,
  },
  definicionTermino: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  definicionDescripcion: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'justify',
  },
  actividadItem: {
    marginBottom: 4,
  },
  actividadNumero: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actividadTexto: {
    fontSize: 9,
    marginTop: 2,
    marginLeft: 20,
    textAlign: 'justify',
    lineHeight: 1.4,
  },
  anexoItem: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 10,
  },
  actividadNivel1: {
    marginLeft: 0,
  },
  actividadNivel2: {
    marginLeft: 20,
  },
  actividadNivel3: {
    marginLeft: 40,
  },
  actividadNivel4: {
    marginLeft: 60,
  },
  table: {
    border: '1px solid black',
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  tableHeaderCell: {
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRight: '1px solid black',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableCell: {
    padding: 6,
    borderRight: '1px solid black',
    fontSize: 9,
  },
  tableCellLast: {
    padding: 6,
    fontSize: 9,
  },
  tableColItem: {
    width: 50,
  },
  tableColModificacion: {
    flex: 1,
  },
  tableColFecha: {
    width: 120,
  },
  tableColVersion: {
    width: 80,
  },
  sectionContentWrapper: {
    marginLeft: 15, // Esta es la sangría general para el contenido
    marginTop: 4,
  },
  // Ajustamos el estilo de las descripciones para que no hereden márgenes extra innecesarios
  textContent: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
});

interface PDFDocumentoProps {
  documento: SubProcesoDocumento;
  puestosResponsables: Array<{ id: string; nombre: string; descripcion: string; actividades?: any[]}>;
  actividadesJerarquicas: ActividadJerarquica[];
  logoUrl?: string;
}

// Componente para el header que se repite en cada página
const PageHeader = ({
  documento,
  logoUrl,
  pageNumber,
  totalPages,
}: {
  documento: SubProcesoDocumento;
  logoUrl: string;
  pageNumber: number;
  totalPages: number;
}) => (
  <View style={styles.header} fixed>
    <View style={styles.headerTable}>
      <View style={styles.headerRow}>
        <View style={styles.headerLogoCell}>
          <Image src={logoUrl} style={styles.headerLogo} />
        </View>
        <View style={styles.headerTitleCell}>
          <Text style={styles.headerTitle}>
            PROCEDIMIENTO DE {documento.subProcesoNombre.toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfoCell}>
          <Text style={styles.headerLabel}>Código:</Text>
          <Text style={styles.headerValue}>{documento.codigo}</Text>
          <Text style={styles.headerLabel}>Versión:</Text>
          <Text style={styles.headerValue}>{documento.version}</Text>
          <Text style={styles.headerLabel}>Página:</Text>
          <Text style={styles.headerValue}>{pageNumber} de {totalPages}</Text>
        </View>
      </View>
    </View>
  </View>
);

export const PDFDocumento = ({
  documento,
  puestosResponsables,
  actividadesJerarquicas,
  logoUrl = 'https://resource-static.cdn.bcebos.com/img/dynamic-qr-code/feedback.png',
}: PDFDocumentoProps) => {
  // Calcular número aproximado de páginas
  // Página 1: Portada
  // Páginas 2+: Contenido (Objetivo, Alcance, Puestos, Definiciones, Actividades)
  // Última página: Control de Cambios (forzada con break, siempre en página separada)
  const itemsPerPage = 25;
  const totalItems = puestosResponsables.length + documento.definiciones.length + actividadesJerarquicas.length + 10;
  const contentPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  // Total: 1 portada + páginas de contenido + 1 página de control de cambios
  const totalPages = 1 + contentPages + 1;

  return (
    <Document>
      {/* Página 1: Portada */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Image src={logoUrl} style={styles.logo} />
        </View>

        <View>
          <Text style={styles.coverTitle}>
            PROCEDIMIENTO DE {documento.subProcesoNombre.toUpperCase()}
          </Text>
        </View>

        <View style={styles.coverTable}>
          <View style={styles.coverTableRow}>
            <View style={styles.coverTableCell}>
              <Text style={styles.coverTableHeader}>Elaborado por:</Text>
              <Text style={styles.coverTableValue}>
                {documento.NombreElaborado || documento.elaboradoPor?.nombre || ''}
              </Text>
            </View>
            <View style={styles.coverTableCell}>
              <Text style={styles.coverTableHeader}>Revisado por:</Text>
              <Text style={styles.coverTableValue}>
                {documento.NombreRevisado || documento.revisadoPor?.nombre || ''}
              </Text>
            </View>
            <View style={styles.coverTableCellLast}>
              <Text style={styles.coverTableHeader}>Aprobado por:</Text>
              <Text style={styles.coverTableValue}>
                {documento.NombreAprobado || documento.aprobadoPor?.nombre || ''}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Páginas 2+: Contenido con header fijo */}
      <Page size="A4" style={styles.page}>
        {/* Header fijo que se repite en todas las páginas */}
        <PageHeader
          documento={documento}
          logoUrl={logoUrl}
          pageNumber={2}
          totalPages={totalPages}
        />

        {/* I. OBJETIVO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. OBJETIVO</Text>
          <View style={styles.sectionContentWrapper}>
              <Text style={styles.textContent}>{documento.objetivo}</Text>
            </View>
          {/*<Text style={styles.sectionContent}>{documento.objetivo}</Text>*/}
        </View>

        {/* II. ALCANCE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. ALCANCE</Text>
          <View style={styles.sectionContentWrapper}>
              <Text style={styles.textContent}>{documento.alcance}</Text>
          </View>
        </View>

        {/*III. PUESTOS RESPONSABLES*/}
       {/* {<View style={styles.section}>
          <Text style={styles.sectionTitle}>III. PUESTOS RESPONSABLES</Text>
          <View style={styles.sectionContentWrapper}>
          {puestosResponsables.map((puesto, index) => (
            <View key={index} style={styles.puestoItem}>
              <Text style={styles.puestoNombre}>{puesto.nombre}</Text>
              {<Text style={styles.puestoDescripcion}>{puesto.descripcion}</Text>}
            </View>
          ))}
          </View>
        </View>} */}

        {/* III. PUESTOS RESPONSABLES */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>III. PUESTOS RESPONSABLES</Text>
  <View style={styles.sectionContentWrapper}>
    {puestosResponsables.map((puesto, index) => (
      <View key={index} style={styles.puestoItem}>
        {/* Nombre del Puesto en Negrita */}
        <Text style={styles.puestoNombre}>{puesto.nombre}</Text>
        
        {/* Listado de Actividades Asociadas con sangría */}
        <View style={{ marginLeft: 15, marginTop: 2 }}>
          {puesto.actividades && puesto.actividades.length > 0 ? (
            puesto.actividades.map((act, actIdx) => (
              <Text key={actIdx} style={{ fontSize: 9, marginBottom: 2 }}>
                • {act.nombre}
              </Text>
            ))
          ) : (
            <Text style={{ fontSize: 8, color: 'gray' }}>Sin actividades asociadas.</Text>
          )}
        </View>
      </View>
    ))}
  </View>
</View>

       

        {/* IV. DEFINICIONES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IV. DEFINICIONES</Text>
          <View style={styles.sectionContentWrapper}>
          {documento.definiciones.length > 0 ? (
            documento.definiciones.map((def, index) => (
              <View key={def.id} style={styles.definicionItem}>
                <Text style={styles.definicionTermino}>{def.termino}:</Text>
                <Text style={styles.definicionDescripcion}>{def.descripcion}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionContent}>No se han definido términos.</Text>
            )}
            </View>
        </View>

        {/* V. ACTIVIDADES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>V. ACTIVIDADES</Text>
          <View style={styles.sectionContentWrapper}>
          {actividadesJerarquicas.map((actividad, index) => {
            const nivelStyle =
              actividad.nivel === 1
                ? styles.actividadNivel1
                : actividad.nivel === 2
                ? styles.actividadNivel2
                : actividad.nivel === 3
                ? styles.actividadNivel3
                : styles.actividadNivel4;

            return (
              <View key={index} style={nivelStyle}>
                {actividad.tipo === 'descripcion' ? (
                  // Descripción sin número, solo texto indentado
                  <Text style={styles.actividadTexto}>{actividad.detalle}</Text>
                ) : (
                  // Actividad o subproceso con número
                  <Text style={styles.actividadNumero}>
                    {actividad.numero}. {actividad.nombre}
                  </Text>
                )}
              </View>
            );
          })}
            </View>
        </View>

        {/* VI. ANEXOS */}
        {documento.adjuntos && documento.adjuntos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VI. ANEXOS</Text>
            {documento.adjuntos.map((adjunto, index) => (
              <Text key={index} style={styles.anexoItem}>
                {index + 1}. {adjunto.nombreArchivo}
              </Text>
            ))}
          </View>
        )}
      </Page>

      {/* Página 3: Control de Cambios */}
      <Page size="A4" style={styles.page}>
        {/* Header para la página de Control de Cambios */}
        <PageHeader
          documento={documento}
          logoUrl={logoUrl}
          pageNumber={3}
          totalPages={totalPages}
        />
        
        {/* VII. CONTROL DE CAMBIOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VII. CONTROL DE CAMBIOS</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderCell, styles.tableColItem]}>
                <Text>Ítem</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableColModificacion]}>
                <Text>Modificación</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableColFecha]}>
                <Text>Fecha</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableColVersion]}>
                <Text>Versión</Text>
              </View>
            </View>
            {documento.controlCambios.map((cambio, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.tableColItem]}>
                  <Text>{cambio.item}</Text>
                </View>
                <View style={[styles.tableCell, styles.tableColModificacion]}>
                  <Text>{cambio.modificacion}</Text>
                </View>
                <View style={[styles.tableCell, styles.tableColFecha]}>
                  <Text>{cambio.fecha}</Text>
                </View>
                <View style={[styles.tableCellLast, styles.tableColVersion]}>
                  <Text>{cambio.version}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};
