"use client"; 

import type { Presupuesto, Venta, Configuracion } from '@/types';

interface GenericOrderPDFDocumentProps {
  order: Presupuesto | Venta;
  config: Configuracion;
  elementId: string;
  documentType: 'Presupuesto' | 'Venta';
}

export function GenericOrderPDFDocument({ order, config, elementId, documentType }: GenericOrderPDFDocumentProps) {
  const isPresupuesto = documentType === 'Presupuesto';
  const styles = {
    container: { 
      fontFamily: 'Arial, sans-serif', 
      fontSize: '10pt',
      padding: '10mm',
      width: '190mm', 
      margin: 'auto',
      boxSizing: 'border-box' as const,
      backgroundColor: '#ffffff', // Ensure background is white for PDF
    },
    header: { textAlign: 'center' as const, marginBottom: '10mm' },
    logo: { 
      maxWidth: '60mm', 
      maxHeight: '30mm', 
      margin: '0 auto 5mm auto', 
      display: 'block' 
    },
    companyName: { fontSize: '14pt', fontWeight: 'bold' as const, color: '#333333', marginBottom: '2mm' },
    lema: { fontSize: '9pt', fontStyle: 'italic' as const, marginBottom: '8mm', color: '#555555' },
    documentTitle: { fontSize: '16pt', fontWeight: 'bold' as const, marginBottom: '8mm', color: '#333333' },
    infoSection: { 
      display: 'flex', 
      justifyContent: 'space-between' as const, 
      marginBottom: '8mm', 
      borderBottom: '1px solid #cccccc', 
      paddingBottom: '5mm', 
      fontSize: '10pt' 
    },
    clientInfo: { textAlign: 'left' as const, maxWidth: '60%' },
    orderInfo: { textAlign: 'right' as const, maxWidth: '35%' },
    infoP: { margin: '2mm 0', lineHeight: '1.4' },
    detailsTable: { 
      width: '100%', 
      borderCollapse: 'collapse' as const, 
      fontSize: '9pt', 
      marginBottom: '8mm',
      tableLayout: 'fixed' as const,
    },
    th: { 
      border: '1px solid #dddddd', 
      padding: '2.5mm 1.5mm', 
      backgroundColor: '#f0f0f0', 
      textAlign: 'left' as const,
      fontWeight: 'bold' as const,
      color: '#333333',
    },
    td: { 
      border: '1px solid #dddddd', 
      padding: '2.5mm 1.5mm', 
      textAlign: 'left' as const,
      wordWrap: 'break-word' as const,
    },
    tdNumeric: {
      border: '1px solid #dddddd', 
      padding: '2.5mm 1.5mm', 
      textAlign: 'right' as const,
      wordWrap: 'break-word' as const,
    },
    totalSection: { marginTop: '8mm', fontSize: '10pt', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' as const },
    totalRow: { display: 'flex', justifyContent: 'space-between' as const, width: '60%', marginBottom: '1.5mm'},
    totalLabel: { fontWeight: 'normal' as const, color: '#444444' },
    totalAmount: { fontWeight: 'bold' as const, textAlign: 'right' as const, color: '#333333' },
    grandTotalRow: { display: 'flex', justifyContent: 'space-between' as const, width: '60%', marginTop: '3mm', paddingTop: '3mm', borderTop: '1px solid #cccccc'},
    grandTotalLabel: { fontSize: '12pt', fontWeight: 'bold' as const, color: '#333333'},
    grandTotalAmount: { fontSize: '12pt', fontWeight: 'bold' as const, textAlign: 'right' as const, color: '#333333' },
    footer: {
      fontSize: '8pt',
      textAlign: 'center' as const,
      marginTop: '10mm',
      borderTop: '1px solid #cccccc',
      paddingTop: '5mm',
      color: '#777777',
    }
  };

  const customerName = 'nombreCliente' in order ? order.nombreCliente : order.nombreComprador;
  const customerPhone = 'telefonoCliente' in order ? order.telefonoCliente : ('telefonoComprador' in order ? order.telefonoComprador : undefined);
  const orderTotal = 'totalPresupuesto' in order ? order.totalPresupuesto : order.totalVenta;
  const sena = documentType === 'Venta' && 'sena' in order ? order.sena : undefined;
  const saldoPendiente = (sena !== undefined && orderTotal !== undefined) ? orderTotal - sena : undefined;
  const orderDate = order.fecha ? new Date(order.fecha + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const deliveryDate = documentType === 'Venta' && 'fechaEntregaEstimada' in order && order.fechaEntregaEstimada ? 
                       new Date(order.fechaEntregaEstimada + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;


  return (
    <div id={elementId} style={styles.container}>
      <div style={styles.header}>
        {config.logoUrl && (
          <img src={config.logoUrl} alt="Logo de la Empresa" style={styles.logo} data-ai-hint="company logo" />
        )}
        <div style={styles.companyName}>{config.nombreAserradero || 'Nombre de Empresa'}</div>
        {config.lemaEmpresa && <p style={styles.lema}>{config.lemaEmpresa}</p>}
        <div style={styles.documentTitle}>{documentType === 'Presupuesto' ? 'PRESUPUESTO' : 'NOTA DE VENTA'}</div>
      </div>

      <div style={styles.infoSection}>
        <div style={styles.clientInfo}>
          <p style={styles.infoP}><strong>Cliente:</strong> {customerName}</p>
          {customerPhone && <p style={styles.infoP}><strong>Teléfono:</strong> {customerPhone}</p>}
        </div>
        <div style={styles.orderInfo}>
          <p style={styles.infoP}><strong>N° {documentType}:</strong> {order.id}</p>
          <p style={styles.infoP}><strong>Fecha:</strong> {orderDate}</p>
          {deliveryDate && <p style={styles.infoP}><strong>Entrega Estimada:</strong> {deliveryDate}</p>}
        </div>
      </div>

      <table style={styles.detailsTable}>
        {isPresupuesto ? (
          <colgroup>
            <col style={{width: '25%'}} />
            <col style={{width: '8%'}} />
            <col style={{width: '20%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '13.5%'}} />
            <col style={{width: '13.5%'}} />
          </colgroup>
        ) : (
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
        )}
        <thead>
          <tr>
            <th style={styles.th}>Tipo Madera</th>
            <th style={styles.th}>Unid.</th>
            <th style={styles.th}>Dimensiones</th>
            <th style={styles.th}>Cepill.</th>
            <th style={styles.tdNumeric}>P.Tabl.</th>
            {!isPresupuesto && <th style={styles.tdNumeric}>$/Pie</th>}
            <th style={styles.tdNumeric}>Val.Unit.</th>
            <th style={styles.tdNumeric}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.detalles.map((detalle, index) => (
            <tr key={detalle.id || `detalle-${index}`}>
              <td style={styles.td}>{detalle.tipoMadera}</td>
              <td style={styles.tdNumeric}>{detalle.unidades}</td>
              <td style={styles.td}>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}m`}</td>
              <td style={styles.td}>{detalle.cepillado ? 'Sí' : 'No'}</td>
              <td style={styles.tdNumeric}>{detalle.piesTablares?.toFixed(2)}</td>
              {!isPresupuesto && <td style={styles.tdNumeric}>${detalle.precioPorPie?.toFixed(2)}</td>}
              <td style={styles.tdNumeric}>${detalle.valorUnitario?.toFixed(2)}</td>
              <td style={styles.tdNumeric}>${detalle.subTotal?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={styles.totalSection}>
        <div style={styles.totalRow}>
            <span style={styles.totalLabel}>Subtotal:</span>
            <span style={styles.totalAmount}>${orderTotal?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {sena !== undefined && sena > 0 && (
             <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Seña:</span>
                <span style={styles.totalAmount}>-${sena.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        )}
        <div style={styles.grandTotalRow}>
          <span style={styles.grandTotalLabel}>{documentType === 'Presupuesto' ? 'TOTAL PRESUPUESTO:' : (sena !== undefined && sena > 0 && saldoPendiente !== undefined ? 'SALDO PENDIENTE:' : 'TOTAL VENTA:')}</span>
          <span style={styles.grandTotalAmount}>
            ${((sena !== undefined && sena > 0 && saldoPendiente !== undefined) ? saldoPendiente : (orderTotal ?? 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div style={styles.footer}>
        <p>{config.nombreAserradero || 'Nombre de Empresa'}</p>
        <p>{documentType === 'Presupuesto' ? 'Gracias por su consulta. Presupuesto válido por 15 días.' : '¡Gracias por su compra!'}</p>
      </div>
    </div>
  );
}
