
"use client"; // Required if it uses client-side features like Image or specific styling logic

import type { Presupuesto, Configuracion } from '@/types';
// Using a regular img tag for html2canvas compatibility with Data URIs
// import Image from 'next/image'; 

interface PresupuestoPDFDocumentProps {
  presupuesto: Presupuesto;
  config: Configuracion;
  elementId: string;
}

export function PresupuestoPDFDocument({ presupuesto, config, elementId }: PresupuestoPDFDocumentProps) {
  // Basic inline styles for PDF layout. 
  // For html2canvas, it's often better to rely on standard HTML/CSS structure if complex styling is needed,
  // but inline styles are direct.
  const styles = {
    container: { 
      fontFamily: 'Arial, sans-serif', 
      fontSize: '10pt', // Use points for better PDF scaling consistency
      padding: '10mm', // Standard A4 margins are often around 10-20mm
      width: '190mm', // A4 width (210mm) - 2*10mm margin
      // minHeight: '277mm', // A4 height (297mm) - 2*10mm margin (optional, content will define height)
      margin: 'auto',
      boxSizing: 'border-box' as const,
      backgroundColor: '#ffffff', // Ensure white background for canvas capture
    },
    header: { textAlign: 'center' as const, marginBottom: '15mm' },
    logo: { 
      maxWidth: '60mm', // Max width for logo
      maxHeight: '30mm', // Max height for logo
      margin: '0 auto 5mm auto', 
      display: 'block' 
    },
    lema: { fontSize: '9pt', fontStyle: 'italic' as const, marginBottom: '10mm', color: '#555555' },
    h2: { fontSize: '16pt', fontWeight: 'bold' as const, marginBottom: '10mm', color: '#333333' },
    clientInfo: { marginBottom: '10mm', borderBottom: '1px solid #cccccc', paddingBottom: '5mm', fontSize: '10pt' },
    clientInfoP: { margin: '2mm 0', lineHeight: '1.4' },
    detailsTable: { 
      width: '100%', 
      borderCollapse: 'collapse' as const, 
      fontSize: '9pt', 
      marginBottom: '10mm',
      tableLayout: 'fixed' as const, // Helps with consistent column widths
    },
    th: { 
      border: '1px solid #dddddd', 
      padding: '3mm 2mm', 
      backgroundColor: '#f0f0f0', 
      textAlign: 'left' as const,
      fontWeight: 'bold' as const,
      color: '#333333',
    },
    td: { 
      border: '1px solid #dddddd', 
      padding: '3mm 2mm', 
      textAlign: 'left' as const,
      wordWrap: 'break-word' as const,
    },
    tdNumeric: {
      border: '1px solid #dddddd', 
      padding: '3mm 2mm', 
      textAlign: 'right' as const,
      wordWrap: 'break-word' as const,
    },
    total: { textAlign: 'right' as const, fontSize: '12pt', fontWeight: 'bold' as const, marginTop: '10mm', color: '#333333' },
    footer: {
      fontSize: '8pt',
      textAlign: 'center' as const,
      marginTop: '15mm',
      borderTop: '1px solid #cccccc',
      paddingTop: '5mm',
      color: '#777777',
    }
  };

  return (
    <div id={elementId} style={styles.container}>
      <div style={styles.header}>
        {config.logoUrl && (
          <img src={config.logoUrl} alt="Logo de la Empresa" style={styles.logo} />
        )}
        {config.lemaEmpresa && <p style={styles.lema}>{config.lemaEmpresa}</p>}
        <div style={styles.h2}>PRESUPUESTO</div>
      </div>

      <div style={styles.clientInfo}>
        <p style={styles.clientInfoP}><strong>Cliente:</strong> {presupuesto.nombreCliente}</p>
        <p style={styles.clientInfoP}><strong>Fecha:</strong> {new Date(presupuesto.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {presupuesto.telefonoCliente && <p style={styles.clientInfoP}><strong>Teléfono:</strong> {presupuesto.telefonoCliente}</p>}
        <p style={styles.clientInfoP}><strong>N° Presupuesto:</strong> {presupuesto.id}</p>
      </div>

      <table style={styles.detailsTable}>
        <colgroup>
            <col style={{width: '25%'}} />
            <col style={{width: '8%'}} />
            <col style={{width: '20%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '9%'}} />
            <col style={{width: '9%'}} />
            <col style={{width: '9%'}} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>Tipo Madera</th>
            <th style={styles.th}>Unid.</th>
            <th style={styles.th}>Dimensiones</th>
            <th style={styles.th}>Cepill.</th>
            <th style={styles.tdNumeric}>P.Tabl.</th>
            <th style={styles.tdNumeric}>$/Pie</th>
            <th style={styles.tdNumeric}>Val.Unit.</th>
            <th style={styles.tdNumeric}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {presupuesto.detalles.map((detalle, index) => (
            <tr key={detalle.id || `detalle-${index}`}>
              <td style={styles.td}>{detalle.tipoMadera}</td>
              <td style={styles.tdNumeric}>{detalle.unidades}</td>
              <td style={styles.td}>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}'`}</td>
              <td style={styles.td}>{detalle.cepillado ? 'Sí' : 'No'}</td>
              <td style={styles.tdNumeric}>{detalle.piesTablares?.toFixed(2)}</td>
              <td style={styles.tdNumeric}>${detalle.precioPorPie.toFixed(2)}</td>
              <td style={styles.tdNumeric}>${detalle.valorUnitario?.toFixed(2)}</td>
              <td style={styles.tdNumeric}>${detalle.subTotal?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={styles.total}>
        TOTAL PRESUPUESTO: ${presupuesto.totalPresupuesto?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={styles.footer}>
        <p>{config.nombreAserradero}</p>
        <p>Gracias por su consulta.</p>
      </div>
    </div>
  );
}
