
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarClock, Download, Loader2, CheckCircle } from "lucide-react";
import type { Venta, VentaDetalle, Configuracion } from "@/types"; 
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";
import { GenericOrderPDFDocument } from '@/components/shared/generic-order-pdf-document';
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import { getAllVentas, updateVenta } from "@/lib/firebase/services/ventasService";
import { Badge } from "@/components/ui/badge";

type EstadoCobro = { texto: string; variant: "default" | "secondary" | "destructive" | "outline" };

// Helper to determine payment status
const getEstadoCobroDisplay = (venta: Venta): EstadoCobro => {
    const totalVentaNum = Number(venta.totalVenta) || 0;
    const senaNum = Number(venta.sena) || 0;

    if (totalVentaNum <= 0 && senaNum <=0 && (!venta.detalles || venta.detalles.length === 0)) return { texto: "N/A", variant: "outline" };

    if (senaNum >= totalVentaNum && totalVentaNum > 0) {
      return { texto: "Cobrado", variant: "default" };
    } else if (senaNum > 0 && senaNum < totalVentaNum) {
      return { texto: `Parcial`, variant: "secondary" };
    } else if (totalVentaNum > 0){
      return { texto: "Pendiente", variant: "destructive" };
    }
    return { texto: "Sin Cobro", variant: "outline" };
};


export default function CronogramaEntregasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedVentaForPdf, setSelectedVentaForPdf] = useState<Venta | null>(null);
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configData, ventasData] = await Promise.all([
        getAppConfig(),
        getAllVentas()
      ]);
      setConfig(configData);
      setVentas(ventasData);
    } catch (error) {
       toast({
         title: "Error al Cargar Datos",
         description: "No se pudieron obtener los datos de configuración o ventas. " + (error instanceof Error ? error.message : ""),
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
      .filter(venta => venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)) && !venta.entregado)
      .sort((a, b) => {
        const dateA = parseISO(a.fechaEntregaEstimada!);
        const dateB = parseISO(b.fechaEntregaEstimada!);
        return dateA.getTime() - dateB.getTime(); // Soonest first
    });
  }, [ventas]);

  const handleMarkAsDelivered = async (venta: Venta) => {
    if (!venta || !venta.id) return;
    setIsProcessing(venta.id);
    try {
        await updateVenta(venta.id, {
            sena: venta.totalVenta, // Mark as paid
            entregado: true,        // Mark as delivered
        });
        toast({
            title: "Entrega Completada",
            description: `La venta a ${venta.nombreComprador} ha sido marcada como entregada y cobrada.`,
        });
        await loadData(); // Refresh the list to remove the item
    } catch (error) {
        toast({
            title: "Error",
            description: "No se pudo actualizar el estado de la venta. " + (error instanceof Error ? error.message : ""),
            variant: "destructive",
        });
    } finally {
        setIsProcessing(null);
    }
};

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
          
          const canvas = await html2canvas(inputElement, { scale: 3, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
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

          pdf.addImage(imgData, 'JPEG', imgX, imgY, imgRenderWidth, imgRenderHeight);
          pdf.save(`nota_venta_${venta.nombreComprador.replace(/\s+/g, '_')}_${venta.fecha}.pdf`);
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
          <CardTitle>Entregas Pendientes</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando entregas..." : 
              ventasConEntregaEstimada.length > 0
              ? `Mostrando ${ventasConEntregaEstimada.length} entrega(s) pendiente(s).`
              : "No hay entregas pendientes."
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
              {ventasConEntregaEstimada.map((venta) => {
                const estadoCobro = getEstadoCobroDisplay(venta);

                const totalVentaNum = Number(venta.totalVenta) || 0;
                const senaNum = Number(venta.sena) || 0;
                const saldoPendiente = totalVentaNum - senaNum;
                
                const esCobrable = estadoCobro.texto === "Cobrado" || estadoCobro.texto === "Parcial" || estadoCobro.texto === "Pendiente";
                
                const textoMonto = esCobrable ? 'Saldo' : 'Total';
                const monto = esCobrable ? saldoPendiente : totalVentaNum;
                
                return (
                <AccordionItem value={venta.id} key={venta.id}>
                  <div className="flex items-center w-full py-3 px-2 group hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 text-left p-0 m-0 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                          <div className="flex-1 mb-2 sm:mb-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="font-semibold text-primary whitespace-nowrap">
                              Entrega: {venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)) ? format(parseISO(venta.fechaEntregaEstimada), "PPP", { locale: es }) : 'N/A'}
                            </span>
                            <Badge variant={estadoCobro.variant} className="text-xs h-5">{estadoCobro.texto}</Badge>
                            <span className="text-sm text-foreground">Cliente: {venta.nombreComprador}</span>
                          </div>
                        <span className="font-semibold text-base sm:text-lg self-start sm:self-center">
                          {textoMonto}: ${monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center space-x-1 shrink-0">
                      {isProcessing === venta.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 px-2 border-primary text-primary hover:bg-primary/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Entregado</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Entrega?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción marcará la venta como <strong>entregada y cobrada totalmente</strong>.
                                  La venta desaparecerá de este cronograma. ¿Está seguro?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleMarkAsDelivered(venta)}>
                                  Sí, Confirmar Entrega
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 px-2"
                            onClick={(e) => { e.stopPropagation(); downloadVentaPDF(venta); }}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
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
                )
              })}
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

    
