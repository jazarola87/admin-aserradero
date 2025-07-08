
"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, ClipboardList, Search, Send, Download, Pencil, Loader2 } from "lucide-react";
import type { Presupuesto, Venta, Configuracion, PresupuestoDetalle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GenericOrderPDFDocument } from '@/components/shared/presupuesto-pdf-document';
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import { getAllPresupuestos, deletePresupuesto, getPresupuestoById } from "@/lib/firebase/services/presupuestosService";
import { addVenta } from "@/lib/firebase/services/ventasService";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";
import { PresupuestoItem } from "@/components/shared/presupuesto-item";

// Helper to calculate costs for the new Venta, ensuring data integrity at the moment of conversion
const calculateCostsForVenta = (detalles: PresupuestoDetalle[], config: Configuracion) => {
    const piesTablaresPorDetalle = (detalle: PresupuestoDetalle): number => {
        const unidades = Number(detalle.unidades) || 0;
        const alto = Number(detalle.alto) || 0;
        const ancho = Number(detalle.ancho) || 0;
        const largo = Number(detalle.largo) || 0;
        if (!unidades || !alto || !ancho || !largo) return 0;
        return unidades * alto * ancho * largo * 0.2734;
    };

    let costoMadera = 0;
    let totalPies = 0;

    const costosMaderaMap = new Map(config.costosMaderaMetroCubico?.map(c => [c.tipoMadera, c.costoPorMetroCubico]));

    for (const detalle of detalles) {
        const pies = piesTablaresPorDetalle(detalle);
        totalPies += pies;
        
        const costoPorMetroCubico = Number(costosMaderaMap.get(detalle.tipoMadera)) || 0;
        costoMadera += (costoPorMetroCubico / 200) * pies;
    }

    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;
    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoAjustado = costoOperativoBase * 1.38;
    const costoPorPieAserrio = (costoAjustado > 0 && isFinite(costoAjustado)) ? costoAjustado / 600 : 0;
    const costoAserrio = totalPies * costoPorPieAserrio;

    return { costoMadera, costoAserrio };
};

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

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");

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

  const handleDeletePresupuesto = useCallback(async (idToDelete: string) => {
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
  }, [loadData, toast]);

  const handlePasarAVenta = useCallback(async (presupuestoId: string) => {
    setIsProcessing(presupuestoId);
    try {
      const [presupuestoAFacturar, appConfig] = await Promise.all([
        getPresupuestoById(presupuestoId),
        getAppConfig()
      ]);

      if (!presupuestoAFacturar) {
        throw new Error("El presupuesto ya no existe. Pudo haber sido eliminado o convertido por otro usuario.");
      }
      
      if (!appConfig) {
        throw new Error("No se pudo cargar la configuración de la aplicación para calcular los costos.");
      }

      const { costoMadera, costoAserrio } = calculateCostsForVenta(presupuestoAFacturar.detalles, appConfig);

      const ventaData: Omit<Venta, 'id'> = {
        fecha: format(new Date(), "yyyy-MM-dd"),
        nombreComprador: presupuestoAFacturar.nombreCliente,
        detalles: presupuestoAFacturar.detalles.map(d => ({ ...d, unidadesDeStock: 0 })),
        totalVenta: presupuestoAFacturar.totalPresupuesto,
        idOriginalPresupuesto: presupuestoAFacturar.id,
        costoMaderaVentaSnapshot: costoMadera,
        costoAserrioVentaSnapshot: costoAserrio,
        entregado: false, // Default to not delivered
        ...(presupuestoAFacturar.telefonoCliente && { telefonoComprador: presupuestoAFacturar.telefonoCliente }),
      };

      const newVenta = await addVenta(ventaData);
      await deletePresupuesto(presupuestoAFacturar.id);

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
  }, [router, toast]);

  const downloadPDF = useCallback(async (presupuesto: Presupuesto) => {
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

          const canvas = await html2canvas(inputElement, { scale: 4, useCORS: true, logging: false });
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
  }, [config, toast]);


  const filteredPresupuestos = useMemo(() => {
    if (!searchTerm) return presupuestos; 
    return presupuestos.filter(presupuesto => 
      presupuesto.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (presupuesto.telefonoCliente && presupuesto.telefonoCliente.includes(searchTerm))
    );
  }, [presupuestos, searchTerm]);

  const handleRowCountChange = (tipoMadera: string, value: string) => {
    const count = parseInt(value, 10);
    setRowCounts(prev => ({
      ...prev,
      [tipoMadera]: isNaN(count) || count < 0 ? 0 : count,
    }));
  };

  const handleGeneratePresupuesto = () => {
    if (!nombreCliente.trim()) {
      toast({
        title: "Campo Requerido",
        description: "Por favor, ingrese el nombre del cliente para continuar.",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams();
    params.append('cliente', nombreCliente.trim());
    if (telefonoCliente.trim()) {
      params.append('telefono', telefonoCliente.trim());
    }

    for (const [tipo, count] of Object.entries(rowCounts)) {
      if (count > 0) {
        params.append(tipo, count.toString());
      }
    }
    router.push(`/presupuestos/nueva?${params.toString()}`);
    setIsConfigDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Registro de Presupuestos" description="Listado de todos los presupuestos generados.">
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Nuevo Presupuesto</DialogTitle>
              <DialogDescription>
                Complete los datos del cliente y opcionalmente pre-cargue filas de productos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="space-y-2">
                <Label htmlFor="nombreClienteModal">Nombre del Cliente</Label>
                <Input
                  id="nombreClienteModal"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Nombre completo del cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefonoClienteModal">Teléfono (Opcional)</Label>
                <Input
                  id="telefonoClienteModal"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
              
              <Separator className="my-4" />

              <div>
                 <h4 className="text-sm font-medium mb-2">Relleno Rápido de Filas (Opcional)</h4>
                 <p className="text-sm text-muted-foreground mb-4">Especifique cuántas filas desea pre-cargar para cada tipo de madera.</p>
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {(config?.preciosMadera || []).map(madera => (
                      <div className="grid grid-cols-3 items-center gap-4" key={madera.tipoMadera}>
                        <Label htmlFor={madera.tipoMadera} className="text-sm text-right">
                          {madera.tipoMadera}
                        </Label>
                        <Input
                          id={madera.tipoMadera}
                          type="number"
                          min="0"
                          value={rowCounts[madera.tipoMadera] || ""}
                          onChange={(e) => handleRowCountChange(madera.tipoMadera, e.target.value)}
                          className="col-span-2"
                          placeholder="N° de filas"
                        />
                      </div>
                    ))}
                    {(!config || config.preciosMadera.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center col-span-4">
                          No hay tipos de madera definidos en la configuración.
                        </p>
                      )}
                  </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGeneratePresupuesto}>Continuar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <Link href="/presupuestos/configurar">Registrar el primer presupuesto</Link>
              </Button>
            </div>
          ) : filteredPresupuestos.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron presupuestos que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredPresupuestos.map((presupuesto) => (
                <PresupuestoItem
                  key={presupuesto.id}
                  presupuesto={presupuesto}
                  isProcessing={isProcessing}
                  onDelete={handleDeletePresupuesto}
                  onConvertToVenta={handlePasarAVenta}
                  onDownloadPDF={downloadPDF}
                />
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
