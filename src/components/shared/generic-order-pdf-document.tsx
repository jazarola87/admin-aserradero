
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
  const standardLineHeight = 6;

  // --- Header ---
  const logoSize = 30;
  if (config.logoUrl) {
    try {
        doc.addImage(config.logoUrl, 'PNG', margin, cursorY, logoSize, logoSize, undefined, 'MEDIUM');
    } catch (e) {
        console.error("Error adding logo image to PDF:", e);
    }
  }

  const textStartX = margin + logoSize + 10;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nombreAserradero || 'Aserradero', textStartX, cursorY + 7);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const docTitle = documentType === 'Presupuesto' ? 'PRESUPUESTO' : 'NOTA DE VENTA';
  const titleY = cursorY + 7 + standardLineHeight; 
  doc.text(docTitle, textStartX, titleY);

  let headerBottomY = Math.max(cursorY + logoSize, titleY + standardLineHeight);
  cursorY = headerBottomY;
  
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // --- Client & Order Details ---
  const customerName = 'nombreCliente' in order ? order.nombreCliente : order.nombreComprador;
  const customerPhone = 'telefonoCliente' in order ? order.telefonoCliente : ('telefonoComprador' in order ? order.telefonoComprador : undefined);
  const orderDate = order.fecha ? new Date(order.fecha + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text(`Cliente: ${customerName}`, margin, cursorY);
  if(customerPhone) {
    cursorY += standardLineHeight;
    doc.text(`Teléfono: ${customerPhone}`, margin, cursorY);
  }
  
  const dateTextY = cursorY - (customerPhone ? standardLineHeight : 0);
  doc.text(`Fecha: ${orderDate}`, pageWidth - margin, dateTextY, { align: 'right'});
  
  cursorY += 10;


  // --- Table ---
  const head = [['Tipo Madera', 'Unid.', 'Dimensiones', 'Cepill.', 'P.Tabl.', 'Val.Unit.', 'Subtotal']];
  const body = order.detalles.map(d => [
    d.tipoMadera || '-',
    d.unidades?.toString() || '0',
    `${d.alto}" x ${d.ancho}" x ${d.largo}m`,
    d.cepillado ? 'Sí' : 'No',
    d.piesTablares?.toFixed(2) || '0.00',
    `$${d.valorUnitario?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
    `$${d.subTotal?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [230, 230, 230], textColor: [30, 30, 30], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
        0: { cellWidth: 45 }, // Tipo Madera
        1: { cellWidth: 12, halign: 'right' }, // Unid.
        2: { cellWidth: 35 }, // Dimensiones
        3: { cellWidth: 15 }, // Cepill.
        4: { cellWidth: 18, halign: 'right' }, // P.Tabl
        5: { halign: 'right' }, // Val.Unit
        6: { halign: 'right' }, // Subtotal
    },
    didDrawPage: (data) => {
        cursorY = data.cursor?.y || cursorY;
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 15;

  // --- Totals ---
  const orderTotal = 'totalPresupuesto' in order ? order.totalPresupuesto : order.totalVenta;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const totalLabel = `TOTAL ${documentType.toUpperCase()}:`;
  doc.text(totalLabel, margin, cursorY);
  doc.text(`$${orderTotal?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, cursorY, { align: 'right' });


  // --- Footer ---
  cursorY = pageHeight - 35;
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);

  const thankYouText = `Gracias por tu consulta! ${config.nombreAserradero || ''}`;
  doc.text(thankYouText, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;

  const footerLine2Parts = [];
  if (config.telefonoEmpresa) footerLine2Parts.push(`Tel: ${config.telefonoEmpresa}`);
  if (config.lemaEmpresa) footerLine2Parts.push(config.lemaEmpresa);
  
  const footerLine2Text = footerLine2Parts.join(' - ');
  doc.text(footerLine2Text, pageWidth / 2, cursorY, { align: 'center' });
  

  doc.setTextColor(0, 0, 0);

  if (documentType === 'Presupuesto' && config.enlaceWhatsApp) {
      cursorY += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 204);
      
      const ctaText = 'Para confirmar tu pedido ingrese aquí';
      
      const formattedDate = new Date(order.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const message = `Hola, quiero confirmar el pedido del presupuesto a nombre de ${customerName} del día ${formattedDate}`;

      let url = new URL(config.enlaceWhatsApp);
      url.searchParams.set('text', message);
      const finalUrl = url.toString();
      
      const textWidth = doc.getStringUnitWidth(ctaText) * doc.getFontSize() / doc.internal.scaleFactor;
      const textX = (pageWidth - textWidth) / 2;

      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.roundedRect(textX - 2, cursorY - 4, textWidth + 4, 6, 1.5, 1.5, 'S');
      
      doc.textWithLink(ctaText, pageWidth / 2, cursorY, { url: finalUrl, align: 'center' });

  }

  return doc;
};
