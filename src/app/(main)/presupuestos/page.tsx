
"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, ClipboardList, Search, Send, ChevronDown, Download } from "lucide-react";
import type { Presupuesto } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PresupuestoPDFDocument } from '@/components/shared/presupuesto-pdf-document';
import { initialConfigData } from '@/lib/config-data';


// Mock data for presupuestos
const mockPresupuestosData: Presupuesto[] = [
  { 
    id: "pres001", 
    fecha: "2024-07-25", 
    nombreCliente: "Ana Gómez", 
    telefonoCliente: "555-1122",
    detalles: [
      { id: "pd001", tipoMadera: "Pino", unidades: 15, ancho: 4, alto: 2, largo: 10, precioPorPie: 2.50, cepillado: false, piesTablares: 100, subTotal: 250, valorUnitario: 16.67 },
      { id: "pd002", tipoMadera: "Eucalipto", unidades: 8, ancho: 6, alto: 3, largo: 12, precioPorPie: 3.00, cepillado: true, piesTablares: 144, subTotal: 504, valorUnitario: 63.00 },
    ],
    totalPresupuesto: 754,
  },
  { 
    id: "pres002", 
    fecha: "2024-07-26", 
    nombreCliente: "Empresa Constructora XYZ", 
    detalles: [
      { id: "pd003", tipoMadera: "Roble", unidades: 50, ancho: 8, alto: 4, largo: 16, precioPorPie: 5.00, cepillado: false, piesTablares: 2133.33, subTotal: 10666.65, valorUnitario: 213.33 },
    ],
    totalPresupuesto: 10666.65,
  },
];

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(mockPresupuestosData);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);
  const [selectedPresupuestoForPdf, setSelectedPresupuestoForPdf] = useState<Presupuesto | null>(null);


  useEffect(() => {
    const budgetToDeleteId = localStorage.getItem('budgetToDeleteId');
    if (budgetToDeleteId) {
      setPresupuestos(prev => prev.filter(p => p.id !== budgetToDeleteId));
      localStorage.removeItem('budgetToDeleteId');
      toast({
        title: "Presupuesto Convertido",
        description: `El presupuesto ${budgetToDeleteId} ha sido convertido a venta y eliminado de esta lista.`,
      });
    }
  }, [toast]);


  const handleDeletePresupuesto = (idToDelete: string) => {
    setPresupuestos(prevPresupuestos => prevPresupuestos.filter(p => p.id !== idToDelete));
    toast({
      title: "Presupuesto Eliminado",
      description: "El presupuesto ha sido eliminado exitosamente.",
      variant: "default",
    });
  };

  const handlePasarAVenta = (presupuesto: Presupuesto) => {
    localStorage.setItem('presupuestoParaVenta', JSON.stringify(presupuesto));
    router.push('/ventas/nueva');
  };

  const downloadPDF = async (presupuesto: Presupuesto) => {
    const uniqueId = `pdf-presupuesto-${presupuesto.id}-${Date.now()}`; // Ensure unique ID for concurrent attempts
    setSelectedPresupuestoForPdf(presupuesto);
    setPdfTargetId(uniqueId);
  
    // Allow React to render the hidden component
    setTimeout(async () => {
      const inputElement = document.getElementById(uniqueId);
      if (inputElement) {
        try {
          // Ensure all images inside the element are loaded before capturing
          const images = Array.from(inputElement.getElementsByTagName('img'));
          await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = img.onerror = resolve; });
          }));

          const canvas = await html2canvas(inputElement, { 
            scale: 2, // Higher scale for better resolution
            useCORS: true, // If logo is from external URL
            logging: false, // Disable html2canvas logging for cleaner console
           });
          const imgData = canvas.toDataURL('image/png');
          
          const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
          });
  
          const pdfWidth = pdf.internal.pageSize.getWidth();
          // const pdfHeight = pdf.internal.pageSize.getHeight(); // Not used directly, but good to know
          
          // Calculate image dimensions to fit A4 width (with some margin)
          const margin = 10; // 10mm margin on each side
          const availableWidth = pdfWidth - 2 * margin;
          
          const imgOriginalWidth = canvas.width;
          const imgOriginalHeight = canvas.height;
          
          const aspectRatio = imgOriginalWidth / imgOriginalHeight;
          
          let imgRenderWidth = availableWidth;
          let imgRenderHeight = availableWidth / aspectRatio;

          // If image height exceeds typical A4 content area after scaling, further adjust (this is a rough heuristic)
          const typicalA4ContentHeight = 297 - 2 * margin; // 297mm A4 height
           if (imgRenderHeight > typicalA4ContentHeight) {
             imgRenderHeight = typicalA4ContentHeight;
             imgRenderWidth = imgRenderHeight * aspectRatio;
           }


          const imgX = margin + (availableWidth - imgRenderWidth) / 2; // Center horizontally within margins
          const imgY = margin;
  
          pdf.addImage(imgData, 'PNG', imgX, imgY, imgRenderWidth, imgRenderHeight);
          pdf.save(`presupuesto-${presupuesto.id}-${presupuesto.nombreCliente.replace(/\s+/g, '_')}.pdf`);
          toast({ title: "PDF Descargado", description: "El presupuesto se ha descargado como PDF."});
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast({ title: "Error al generar PDF", description: "No se pudo generar el PDF. Verifique la consola para más detalles.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error al generar PDF", description: "No se encontró el elemento para convertir a PDF.", variant: "destructive" });
      }
      // Clean up state
      setSelectedPresupuestoForPdf(null);
      setPdfTargetId(null);
    }, 250); // Increased timeout slightly
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
      <PageTitle title="Registro de Presupuestos" description="Listado de todos los presupuestos generados.">
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
                {filteredPresupuestos.length > 0 
                ? `Mostrando ${filteredPresupuestos.length} de ${presupuestos.length} presupuesto(s).` 
                : "No se encontraron presupuestos con los criterios de búsqueda."}
                {presupuestos.length === 0 && " Aún no se han registrado presupuestos."}
            </CardDescription>
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por cliente, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {presupuestos.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4" />
              <p>No hay presupuestos registrados.</p>
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
                   <AccordionTrigger asChild className="hover:no-underline">
                    <div className={cn(
                        "flex w-full items-center py-4 px-2 font-medium text-left",
                        "hover:bg-muted/50 rounded-md group" 
                      )}>
                      <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <span className="font-semibold">Cliente: {presupuesto.nombreCliente}</span>
                            <span className="ml-0 sm:ml-4 text-sm text-muted-foreground block sm:inline">Fecha: {new Date(presupuesto.fecha).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className="flex items-center mt-2 sm:mt-0">
                            <span className="mr-2 sm:mr-4 font-semibold text-base sm:text-lg">Total: ${presupuesto.totalPresupuesto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                             <Button variant="outline" size="sm" className="mr-2" onClick={(e) => {e.stopPropagation(); downloadPDF(presupuesto);}}>
                                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">PDF</span>
                            </Button>
                            <Button variant="outline" size="sm" className="mr-2" onClick={(e) => {e.stopPropagation(); handlePasarAVenta(presupuesto);}}>
                                <Send className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">A Venta</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive mr-1 sm:mr-2" onClick={(e) => e.stopPropagation()}>
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
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
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
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {presupuesto.detalles.map((detalle) => (
                          <TableRow key={detalle.id}>
                            <TableCell>{detalle.tipoMadera}</TableCell>
                            <TableCell>{detalle.unidades}</TableCell>
                            <TableCell>{detalle.ancho}" x {detalle.alto}" x {detalle.largo}'</TableCell>
                            <TableCell>{detalle.piesTablares?.toFixed(2)}</TableCell>
                            <TableCell>${detalle.valorUnitario?.toFixed(2)}</TableCell>
                            <TableCell>${detalle.precioPorPie.toFixed(2)}</TableCell>
                            <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                            <TableCell>${detalle.subTotal?.toFixed(2)}</TableCell>
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
      {/* Hidden container for PDF rendering */}
      {selectedPresupuestoForPdf && pdfTargetId && (
        <div style={{ position: 'absolute', left: '-99999px', top: '-99999px', width: '210mm', backgroundColor: 'white', padding: '20px', boxSizing: 'border-box' }}>
          <PresupuestoPDFDocument
            presupuesto={selectedPresupuestoForPdf}
            config={initialConfigData}
            elementId={pdfTargetId}
          />
        </div>
      )}
    </div>
  );
}
