
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarClock, ChevronDown, Download, Loader2 } from "lucide-react";
import type { Venta, VentaDetalle, Configuracion } from "@/types"; 
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";
import { GenericOrderPDFDocument } from '@/components/shared/presupuesto-pdf-document';
import { getAppConfig } from "@/lib/firebase/services/configuracionService";

const VENTAS_STORAGE_KEY = 'ventasList';

export default function CronogramaEntregasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedVentaForPdf, setSelectedVentaForPdf] = useState<Venta | null>(null);
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const configData = await getAppConfig();
      setConfig(configData);

      if (typeof window !== 'undefined') {
        const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
        const ventasData = storedVentas ? JSON.parse(storedVentas) : [];
        setVentas(ventasData);
      }
    } catch (error) {
       toast({
         title: "Error al Cargar Datos",
         description: "No se pudieron obtener los datos de configuración.",
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ventasConEntregaEstimada = useMemo(() => {
    return ventas
      .filter(venta => venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)))
      .sort((a, b) => {
        const dateA = parseISO(a.fechaEntregaEstimada!);
        const dateB = parseISO(b.fechaEntregaEstimada!);
        return dateA.getTime() - dateB.getTime(); // Soonest first
    });
  }, [ventas]);

  const downloadVentaPDF = async (venta: Venta) => {
    if (!config) {
      toast({ title: "Error", description: "La configuración no se ha cargado.", variant: "destructive"});
      return;
    }
    const uniqueId = `pdf-venta-${venta.id}-${Date.now()}`;
    setSelectedVentaForPdf(venta);
    setPdfTargetId(uniqueId);

    toast({ title: "Generando PDF...", description: "Por favor espere." });

    setTimeout(async () => {
      const inputElement = document.getElementById(uniqueId);
      if (inputElement) {
        try {
          const images = Array.from(inputElement.getElementsByTagName('img'));
          await Promise.all(images.map(img => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise(resolve => { 
              img.onload = resolve; 
              img.onerror = () => { 
                console.warn(`Failed to load image for PDF: ${img.src}`);
                resolve(null);
              };
            });
          }));
          
          const canvas = await html2canvas(inputElement, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 10;
          const availableWidth = pdfWidth - 2 * margin;
          const availableHeight = pdfHeight - 2 * margin;
          const aspectRatio = canvas.width / canvas.height;
          let imgRenderWidth = availableWidth;
          let imgRenderHeight = availableWidth / aspectRatio;
          if (imgRenderHeight > availableHeight) {
            imgRenderHeight = availableHeight;
            imgRenderWidth = imgRenderHeight * aspectRatio;
          }
          const imgX = margin + (availableWidth - imgRenderWidth) / 2;
          const imgY = margin;

          pdf.addImage(imgData, 'PNG', imgX, imgY, imgRenderWidth, imgRenderHeight);
          pdf.save(`nota_venta-${venta.id}-${venta.nombreComprador.replace(/\s+/g, '_')}.pdf`);
          toast({ title: "PDF Descargado", description: "La nota de venta se ha descargado como PDF." });
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast({ title: "Error al generar PDF", description: "No se pudo generar el PDF.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error al generar PDF", description: "No se encontró el elemento para PDF.", variant: "destructive" });
      }
      setSelectedVentaForPdf(null);
      setPdfTargetId(null);
    }, 300);
  };


  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Cronograma de Entregas" 
        description="Listado de ventas con fecha de entrega estimada, ordenadas por proximidad."
      />

      <Card>
        <CardHeader>
          <CardTitle>Ventas Programadas</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando entregas..." : 
              ventasConEntregaEstimada.length > 0
              ? `Mostrando ${ventasConEntregaEstimada.length} venta(s) con fecha de entrega programada.`
              : "No hay ventas con fecha de entrega estimada."
            }
          </CardDescription>
        </CardHeader>
        <CardContent> 
          {isLoading ? (
             <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Cargando datos...</p>
            </div>
          ) : ventasConEntregaEstimada.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarClock className="mx-auto h-12 w-12 mb-4" />
              <p>No hay entregas programadas en los registros de ventas.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {ventasConEntregaEstimada.map((venta) => (
                <AccordionItem value={venta.id} key={venta.id}>
                  <AccordionTrigger asChild className="hover:no-underline">
                     <div className={cn(
                        "flex w-full items-center py-4 px-2 font-medium text-left group", 
                        "hover:bg-muted/50 rounded-md"
                      )}>
                      <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                          <span className="font-semibold text-primary">
                            Entrega: {venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)) ? format(parseISO(venta.fechaEntregaEstimada), "PPP", { locale: es }) : 'N/A'}
                          </span>
                          <span className="ml-0 sm:ml-4 text-sm text-foreground block sm:inline">Cliente: {venta.nombreComprador}</span>
                        </div>
                        <div className="flex items-center mt-2 sm:mt-0">
                          <span className="mr-2 sm:mr-4 font-semibold text-base sm:text-lg">Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                           <Button 
                              variant="outline" 
                              size="sm" 
                              className="mr-1 sm:mr-2"
                              onClick={(e) => { e.stopPropagation(); downloadVentaPDF(venta); }}
                            >
                              <>
                                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">PDF</span>
                              </>
                            </Button>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 ml-2" data-manual-chevron="true"/>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-3 text-sm">
                      <p><strong>Fecha de Venta:</strong> {venta.fecha && isValid(parseISO(venta.fecha)) ? format(parseISO(venta.fecha), "PPP", { locale: es }) : 'N/A'}</p>
                      {venta.telefonoComprador && <p><strong>Teléfono Cliente:</strong> {venta.telefonoComprador}</p>}
                      {typeof venta.sena === 'number' && venta.sena > 0 && <p><strong>Seña Pagada:</strong> ${venta.sena.toLocaleString('es-ES', {minimumFractionDigits: 2})}</p>}
                      {typeof venta.costoOperario === 'number' && venta.costoOperario > 0 && <p><strong>Costo Operario:</strong> ${venta.costoOperario.toLocaleString('es-ES', {minimumFractionDigits: 2})}</p>}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo Madera</TableHead>
                          <TableHead>Unid.</TableHead>
                          <TableHead>Dimensiones</TableHead>
                          <TableHead>Cepillado</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(venta.detalles || []).map((detalle: VentaDetalle) => (
                          <TableRow key={detalle.id}>
                            <TableCell>{detalle.tipoMadera}</TableCell>
                            <TableCell>{detalle.unidades}</TableCell>
                            <TableCell>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}m`}</TableCell>
                            <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                            <TableCell className="text-right">${detalle.subTotal?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      {selectedVentaForPdf && config && pdfTargetId && (
        <div style={{ position: 'absolute', left: '-99999px', top: '-99999px', width: '210mm', backgroundColor: 'white', padding: '20px', boxSizing: 'border-box' }}>
          <GenericOrderPDFDocument
            order={selectedVentaForPdf}
            config={config}
            elementId={pdfTargetId}
            documentType="Venta"
          />
        </div>
      )}
    </div>
  );
}

    