
"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Presupuesto, Venta, Configuracion } from '@/types';

// Function to generate the PDF
export const generateOrderPDF = (order: Presupuesto | Venta, config: Configuracion, documentType: 'Presupuesto' | 'Venta') => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;

  // --- Header ---
  const logoSize = 34;
  if (config.logoUrl) {
    try {
        // Add image with MEDIUM compression to reduce file size
        doc.addImage(config.logoUrl, 'JPEG', margin, cursorY, logoSize, logoSize, undefined, 'MEDIUM');
    } catch (e) {
        console.error("Error adding logo image to PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nombreAserradero || 'Aserradero', pageWidth / 2, cursorY + 12, { align: 'center' });
  
  let headerBottomY = Math.max(cursorY + logoSize, cursorY + 20);
  cursorY = headerBottomY;

  // --- Document Title & Info ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(documentType === 'Presupuesto' ? 'PRESUPUESTO' : 'NOTA DE VENTA', pageWidth / 2, cursorY, { align: 'center' });
  
  cursorY += 10;
  
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // --- Client & Order Details ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const customerName = 'nombreCliente' in order ? order.nombreCliente : order.nombreComprador;
  const customerPhone = 'telefonoCliente' in order ? order.telefonoCliente : ('telefonoComprador' in order ? order.telefonoComprador : undefined);
  const orderDate = order.fecha ? new Date(order.fecha + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  
  doc.text(`Cliente: ${customerName}`, margin, cursorY);
  if (documentType === 'Venta') {
      doc.text(`N° Venta: ${order.id}`, pageWidth - margin, cursorY, { align: 'right'});
  }
  cursorY += 6;
  if(customerPhone) doc.text(`Teléfono: ${customerPhone}`, margin, cursorY);
  doc.text(`Fecha: ${orderDate}`, pageWidth - margin, cursorY, { align: 'right'});
  cursorY += 10;


  // --- Table ---
  const head = [['Tipo Madera', 'Unid.', 'Dimensiones', 'Cepill.', 'P.Tabl.', '$/Pie', 'Val.Unit.', 'Subtotal']];
  const body = order.detalles.map(d => [
    d.tipoMadera || '-',
    d.unidades?.toString() || '0',
    `${d.alto}" x ${d.ancho}" x ${d.largo}m`,
    d.cepillado ? 'Sí' : 'No',
    d.piesTablares?.toFixed(2) || '0.00',
    `$${d.precioPorPie?.toFixed(2) || '0.00'}`,
    `$${d.valorUnitario?.toFixed(2) || '0.00'}`,
    `$${d.subTotal?.toFixed(2) || '0.00'}`
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [230, 230, 230], textColor: [30, 30, 30] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
        0: { cellWidth: 35 }, // Tipo Madera
        1: { cellWidth: 12, halign: 'right' }, // Unid.
        2: { cellWidth: 30 }, // Dimensiones
        3: { cellWidth: 15 }, // Cepill.
        4: { cellWidth: 18, halign: 'right' }, // P.Tabl
        5: { halign: 'right' }, // $/Pie
        6: { halign: 'right' }, // Val.Unit
        7: { halign: 'right' }, // Subtotal
    },
    didDrawPage: (data) => {
        cursorY = data.cursor?.y || cursorY;
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // --- Totals ---
  const orderTotal = 'totalPresupuesto' in order ? order.totalPresupuesto : order.totalVenta;
  const sena = documentType === 'Venta' && 'sena' in order ? order.sena : undefined;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const totalLabel = documentType === 'Presupuesto' ? 'TOTAL PRESUPUESTO:' : 'TOTAL VENTA:';
  doc.text(totalLabel, pageWidth - margin - 50, cursorY, { align: 'right' });
  doc.text(`$${orderTotal?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, cursorY, { align: 'right' });

  if (sena !== undefined && sena > 0) {
      cursorY += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Seña:', pageWidth - margin - 50, cursorY, { align: 'right' });
      doc.text(`-$${sena.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, cursorY, { align: 'right' });

      cursorY += 7;
      doc.setLineWidth(0.2);
      doc.line(pageWidth - margin - 60, cursorY, pageWidth - margin, cursorY);
      cursorY += 7;
      
      const saldoPendiente = orderTotal! - sena;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SALDO PENDIENTE:', pageWidth - margin - 50, cursorY, { align: 'right' });
      doc.text(`$${saldoPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, cursorY, { align: 'right' });
  }

  // --- Footer ---
  cursorY = pageHeight - 35;
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);

  const thankYouText = `Gracias por su consulta ${config.nombreAserradero || ''}.`;
  doc.text(thankYouText, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;

  const footerTextParts = [];
  if (config.telefonoEmpresa) footerTextParts.push(`Tel: ${config.telefonoEmpresa}`);
  if (config.lemaEmpresa) footerTextParts.push(config.lemaEmpresa);

  if (footerTextParts.length > 0) {
    doc.text(footerTextParts.join(' - '), pageWidth / 2, cursorY, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);

  if (documentType === 'Presupuesto' && config.enlaceWhatsApp) {
      cursorY += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 204);
      const ctaText = 'Para realizar su pedido haga clic aquí';
      const textWidth = doc.getTextWidth(ctaText);
      const textX = (pageWidth - textWidth) / 2;
      doc.text(ctaText, textX, cursorY);
      doc.link(textX, cursorY - 3, textWidth, 5, { url: config.enlaceWhatsApp });
  } else if (documentType === 'Venta') {
      cursorY += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('¡Gracias por su compra!', pageWidth / 2, cursorY, { align: 'center' });
  }

  return doc;
};
