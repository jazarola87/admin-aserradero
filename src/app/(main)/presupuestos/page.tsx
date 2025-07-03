
"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, ClipboardList, Search, Send, Download, Pencil, Loader2 } from "lucide-react";
import type { Presupuesto, Venta, Configuracion } from "@/types";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GenericOrderPDFDocument } from '@/components/shared/presupuesto-pdf-document';
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import { getAllPresupuestos, deletePresupuesto } from "@/lib/firebase/services/presupuestosService";
import { addVenta } from "@/lib/firebase/services/ventasService";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PresupuestosPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // To track which budget is being processed
  const [searchTerm, setSearchTerm] = useState("");
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);
  const [selectedPresupuestoForPdf, setSelectedPresupuestoForPdf] = useState<Presupuesto | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appConfig, presupuestosData] = await Promise.all([
        getAppConfig(),
        getAllPresupuestos()
      ]);
      setConfig(appConfig);
      setPresupuestos(presupuestosData);
    } catch (e) {
      console.error("Error loading data:", e);
      toast({ title: "Error de Carga", description: "No se pudieron cargar los datos desde Firebase. " + (e instanceof Error ? e.message : ""), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePresupuesto = async (idToDelete: string) => {
    setIsProcessing(idToDelete);
    try {
      await deletePresupuesto(idToDelete);
      toast({
        title: "Presupuesto Eliminado",
        description: "El presupuesto ha sido eliminado exitosamente de Firebase.",
      });
      loadData(); // Recargar la lista
    } catch (error) {
       toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar el presupuesto. " + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePasarAVenta = async (presupuesto: Presupuesto) => {
    setIsProcessing(presupuesto.id);
    try {
      const ventaData: Omit<Venta, 'id'> = {
        fecha: format(new Date(), "yyyy-MM-dd"), // Use today's date for the sale
        nombreComprador: presupuesto.nombreCliente,
        telefonoComprador: presupuesto.telefonoCliente,
        detalles: presupuesto.detalles,
        totalVenta: presupuesto.totalPresupuesto,
        idOriginalPresupuesto: presupuesto.id,
      };

      const newVenta = await addVenta(ventaData);
      await deletePresupuesto(presupuesto.id);

      toast({
        title: "Presupuesto Convertido a Venta",
        description: `Se creó la venta ${newVenta.id} y se eliminó el presupuesto original.`,
      });
      router.push(`/ventas/${newVenta.id}/editar`);

    } catch (error) {
       toast({
        title: "Error al Convertir a Venta",
        description: "No se pudo completar la operación. " + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const downloadPDF = async (presupuesto: Presupuesto) => {
    if (!config) {
      toast({ title: "Error", description: "La configuración no se ha cargado todavía.", variant: "destructive"});
      return;
    }
    const uniqueId = `pdf-presupuesto-${presupuesto.id}-${Date.now()}`; 
    setSelectedPresupuestoForPdf(presupuesto);
    setPdfTargetId(uniqueId);
  
    toast({ title: "Generando PDF...", description: "Por favor espere."});

    setTimeout(async () => {
      const inputElement = document.getElementById(uniqueId);
      if (inputElement) {
        try {
          const images = Array.from(inputElement.getElementsByTagName('img'));
          await Promise.all(images.map(img => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve(); 
            return new Promise(resolve => { 
              img.onload = resolve; 
              img.onerror = () => { console.warn(`Failed to load image for PDF: ${img.src}`); resolve(null); };
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
          pdf.save(`presupuesto-${presupuesto.id}-${presupuesto.nombreCliente.replace(/\s+/g, '_')}.pdf`);
          toast({ title: "PDF Descargado", description: "El presupuesto se ha descargado como PDF."});
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast({ title: "Error al generar PDF", description: "No se pudo generar el PDF.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error al generar PDF", description: "No se encontró el elemento para PDF.", variant: "destructive" });
      }
      setSelectedPresupuestoForPdf(null);
      setPdfTargetId(null);
    }, 300); 
  };


  const filteredPresupuestos = useMemo(() => {
    if (!searchTerm) return presupuestos; 
    return presupuestos.filter(presupuesto => 
      presupuesto.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (presupuesto.telefonoCliente && presupuesto.telefonoCliente.includes(searchTerm))
    );
  }, [presupuestos, searchTerm]);

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Registro de Presupuestos (Firebase)" description="Listado de todos los presupuestos generados.">
        <Button asChild>
          <Link href="/presupuestos/nuevo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Presupuesto
          </Link>
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Presupuestos</CardTitle>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
            <CardDescription>
                {isLoading ? "Cargando presupuestos..." :
                (filteredPresupuestos.length > 0 
                ? `Mostrando ${filteredPresupuestos.length} de ${presupuestos.length} presupuesto(s). (Ordenados por fecha descendente)` 
                : presupuestos.length === 0 ? "Aún no se han registrado presupuestos." : "No se encontraron presupuestos con los criterios de búsqueda.")}
            </CardDescription>
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por cliente, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
                disabled={isLoading}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Cargando datos desde Firebase...</p>
            </div>
          ) : presupuestos.length === 0 && !searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4" />
              <p>No hay presupuestos registrados en Firebase.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/presupuestos/nuevo">Registrar el primer presupuesto</Link>
              </Button>
            </div>
          ) : filteredPresupuestos.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron presupuestos que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredPresupuestos.map((presupuesto) => (
                <AccordionItem value={presupuesto.id} key={presupuesto.id}>
                  <div className="flex items-center w-full py-3 px-2 group hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 text-left p-0 m-0 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                        <div className="flex-1 mb-2 sm:mb-0">
                            <span className="font-semibold">Cliente: {presupuesto.nombreCliente}</span>
                            <span className="ml-0 sm:ml-4 text-sm text-muted-foreground block sm:inline">
                              Fecha: {presupuesto.fecha && isValid(parseISO(presupuesto.fecha)) ? format(parseISO(presupuesto.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}
                            </span>
                        </div>
                        <span className="font-semibold text-base sm:text-lg self-start sm:self-center">
                          Total: ${presupuesto.totalPresupuesto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center space-x-1 shrink-0">
                        {isProcessing === presupuesto.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>
                            <Button variant="outline" size="sm" className="text-xs h-8 px-2" onClick={(e) => {e.stopPropagation(); downloadPDF(presupuesto);}}>
                                <Download className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-8 px-2" onClick={(e) => {e.stopPropagation(); handlePasarAVenta(presupuesto);}}>
                                <Send className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">A Venta</span>
                            </Button>
                            <Button asChild variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/presupuestos/${presupuesto.id}/editar`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar Presupuesto</span>
                              </Link>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar Presupuesto</span>
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el presupuesto.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => {e.stopPropagation(); handleDeletePresupuesto(presupuesto.id)}} className="bg-destructive hover:bg-destructive/90">
                                    Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                    </div>
                  </div>
                  <AccordionContent>
                    <p className="mb-2 text-sm"><strong>Teléfono Cliente:</strong> {presupuesto.telefonoCliente || "N/A"}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo Madera</TableHead>
                          <TableHead>Unid.</TableHead>
                          <TableHead>Dimensiones</TableHead>
                          <TableHead>P.Tabl.</TableHead>
                          <TableHead>Val.Unit.</TableHead>
                          <TableHead>$/Pie</TableHead>
                          <TableHead>Cepillado</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {presupuesto.detalles.map((detalle, index) => (
                          <TableRow key={detalle.id || index}>
                            <TableCell>{detalle.tipoMadera}</TableCell>
                            <TableCell>{detalle.unidades}</TableCell>
                            <TableCell>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}m`}</TableCell>
                            <TableCell>{detalle.piesTablares?.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${detalle.valorUnitario?.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${detalle.precioPorPie?.toFixed(2)}</TableCell>
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
      {selectedPresupuestoForPdf && config && pdfTargetId && (
        <div style={{ position: 'absolute', left: '-99999px', top: '-99999px', width: '210mm', backgroundColor: 'white', padding: '20px', boxSizing: 'border-box' }}>
          <GenericOrderPDFDocument
            order={selectedPresupuestoForPdf}
            config={config}
            elementId={pdfTargetId}
            documentType="Presupuesto"
          />
        </div>
      )}
    </div>
  );
}
