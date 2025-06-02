
"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Search, ChevronDown, DollarSign, Pencil, CircleCheckBig } from "lucide-react";
import type { Venta, VentaDetalle, Configuracion } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { initialConfigData } from "@/lib/config-data";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import * as AccordionPrimitive from "@radix-ui/react-accordion"; // Import for AccordionPrimitive.Header

const VENTAS_STORAGE_KEY = 'ventasList';

const calcularPiesTablaresVentaItem = (detalle: Partial<VentaDetalle>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0; 
  
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
};

const getCostoMaderaParaVentaItem = (detalle: Partial<VentaDetalle>, config: Configuracion): number => {
  if (!detalle.tipoMadera) return 0;
  const piesTablaresArticulo = calcularPiesTablaresVentaItem(detalle);
  if (piesTablaresArticulo <= 0) return 0;

  const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
  const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
  return (piesTablaresArticulo / 200) * costoPorMetroCubicoDelTipo;
};


interface VentaItemProps {
  venta: Venta;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onIngresarSena: (ventaId: string, montoSeña: number) => void;
}

function VentaItem({ venta, onDelete, onMarkAsPaid, onIngresarSena }: VentaItemProps) {
  const config = initialConfigData; 
  const [isSenaDialogOpen, setIsSenaDialogOpen] = useState(false);
  const [senaInputValue, setSenaInputValue] = useState<string>(venta.sena?.toString() || "");
  const { toast } = useToast();

  useEffect(() => {
    setSenaInputValue(venta.sena?.toString() || "");
  }, [venta.sena]);


  const costoTotalMaderaVenta = useMemo(() => {
    if (typeof venta.costoMaderaVentaSnapshot === 'number') {
      return venta.costoMaderaVentaSnapshot;
    }
    let costoTotal = 0;
    (venta.detalles || []).forEach(detalle => {
       costoTotal += getCostoMaderaParaVentaItem(detalle, config);
    });
    return costoTotal;
  }, [venta.detalles, venta.costoMaderaVentaSnapshot, config]);

  const costoTotalAserrioVenta = useMemo(() => {
     if (typeof venta.costoAserrioVentaSnapshot === 'number') {
      return venta.costoAserrioVentaSnapshot;
    }
    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;

    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoOperativoAjustado = costoOperativoBase * 1.38;
    const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado) && costoOperativoAjustado !== 0) ? costoOperativoAjustado / 600 : 0;

    const totalPiesTablaresVenta = (venta.detalles || []).reduce((acc, detalle) => {
      return acc + calcularPiesTablaresVentaItem(detalle);
    }, 0);

    return totalPiesTablaresVenta * costoAserrioPorPie;
  }, [venta.detalles, venta.costoAserrioVentaSnapshot, config.precioLitroNafta, config.precioAfiladoSierra]);

  const costoOperarioActual = Number(venta.costoOperario) || 0;

  const gananciaNetaEstimada = useMemo(() => {
    return (Number(venta.totalVenta) || 0) - costoTotalMaderaVenta - costoTotalAserrioVenta - costoOperarioActual;
  }, [venta.totalVenta, costoTotalMaderaVenta, costoTotalAserrioVenta, costoOperarioActual]);

  const valorJavier = costoTotalMaderaVenta + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);
  const valorLucas = costoTotalAserrioVenta + costoOperarioActual + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);

  const senaActual = Number(venta.sena) || 0;
  const saldoPendiente = (Number(venta.totalVenta) || 0) - senaActual;

  const getEstadoCobro = (): { texto: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    const totalVentaNum = Number(venta.totalVenta) || 0;
    const senaNum = senaActual; 

    if (totalVentaNum <= 0 && senaNum <=0 && (!venta.detalles || venta.detalles.length === 0)) return { texto: "N/A", variant: "outline" }; 

    if (senaNum >= totalVentaNum && totalVentaNum > 0) { 
      return { texto: "Cobrado", variant: "default" };
    } else if (senaNum > 0 && senaNum < totalVentaNum) {
      const saldo = totalVentaNum - senaNum;
      return { texto: `Parcialmente Cobrado (Resta: $${saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, variant: "secondary" };
    } else if (totalVentaNum > 0){ 
      return { texto: "Pendiente", variant: "destructive" };
    }
    return { texto: "Sin Cobro Requerido", variant: "outline" }; 
  };

  const estadoCobro = getEstadoCobro();
  const isFullyPaid = estadoCobro.texto === "Cobrado";

  const handleGuardarSena = () => {
    const monto = parseFloat(senaInputValue);
    if (!isNaN(monto) && monto >= 0) {
      onIngresarSena(venta.id, monto);
      setIsSenaDialogOpen(false);
      toast({ title: "Seña Actualizada", description: `Seña para la venta ID ${venta.id} actualizada a $${monto.toFixed(2)}` });
    } else {
      toast({ title: "Error", description: "Monto de seña inválido.", variant: "destructive" });
    }
  };

  return (
    <AccordionItem value={venta.id} key={venta.id}>
      {/* Use AccordionPrimitive.Header directly for more control if needed, or just style the div */}
      <div className="flex items-center w-full py-3 px-2 group hover:bg-muted/50 rounded-md">
        <AccordionTrigger className="flex-1 text-left p-0 m-0 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
          {/* Content for the trigger button - NO OTHER BUTTONS HERE */}
          <div className="flex items-center justify-between w-full"> {/* Inner div for layout within the trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-base">Venta a: {venta.nombreComprador}</span>
              <Badge variant={estadoCobro.variant} className="w-fit text-xs px-2 py-0.5 whitespace-normal sm:whitespace-nowrap h-auto max-w-[250px] sm:max-w-xs text-left">
                {estadoCobro.texto}
              </Badge>
              <span className="text-sm text-muted-foreground block sm:inline">
                Fecha: {venta.fecha && isValid(parseISO(venta.fecha)) ? format(parseISO(venta.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}
              </span>
            </div>
            <span className="mr-1 sm:mr-2 font-semibold text-base sm:text-lg">Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
            {/* The default chevron from AccordionTrigger component will be used.
                If you want to customize it, you'd use asChild and provide your own,
                but ensure that child is NOT a button.
                The class "data-[state=open]:[&>svg]:rotate-180" targets the default SVG.
            */}
          </div>
        </AccordionTrigger>

        {/* Action buttons are SIBLINGS to AccordionTrigger */}
        <div className="flex items-center space-x-1 shrink-0">
          {!isFullyPaid && (
            <>
              <AlertDialog open={isSenaDialogOpen} onOpenChange={setIsSenaDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 px-2"
                    title="Ingresar o Modificar Seña"
                  >
                    <DollarSign className="mr-1 h-3.5 w-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Seña</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ingresar/Modificar Seña</AlertDialogTitle>
                    <AlertDialogDescription>
                      Venta ID: {venta.id} <br/>
                      Total Venta: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <br/>
                      Seña Actual: ${senaActual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Input 
                      type="number"
                      placeholder="Monto de la seña"
                      value={senaInputValue}
                      onChange={(e) => setSenaInputValue(e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSenaInputValue(venta.sena?.toString() || "")}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGuardarSena}>Guardar Seña</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 px-2"
                onClick={() => onMarkAsPaid(venta.id)}
                title="Marcar como Cobrado Totalmente"
              >
                <CircleCheckBig className="mr-1 h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Cobrado</span>
              </Button>
            </>
          )}

          <Button asChild variant="ghost" size="icon">
            <Link href={`/ventas/${venta.id}/editar`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar Venta</span>
            </Link>
          </Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar Venta</span>
              </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la venta.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(venta.id)} className="bg-destructive hover:bg-destructive/90">
                  Eliminar
                  </AlertDialogAction>
              </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 mb-4 text-sm p-4 border rounded-md bg-muted/30">
          <p><strong>Teléfono Comprador:</strong> {venta.telefonoComprador || "N/A"}</p>
          {venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)) && <p><strong>Fecha Entrega Estimada:</strong> {format(parseISO(venta.fechaEntregaEstimada), "PPP", { locale: es })}</p>}
          {typeof venta.costoOperario === 'number' && venta.costoOperario > 0 && <p><strong>Costo Operario:</strong> ${venta.costoOperario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>}
          {venta.idOriginalPresupuesto && <p><strong>Presupuesto Original ID:</strong> {venta.idOriginalPresupuesto}</p>}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo Madera</TableHead>
              <TableHead>Unid.</TableHead>
              <TableHead>Dimensiones</TableHead>
              <TableHead>Cepillado</TableHead>
              <TableHead className="text-right">P.Tabl.</TableHead>
              <TableHead className="text-right">$/Pie</TableHead>
              <TableHead className="text-right">Val.Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(venta.detalles || []).map((detalle) => (
              <TableRow key={detalle.id}>
                <TableCell>{detalle.tipoMadera}</TableCell>
                <TableCell>{detalle.unidades}</TableCell>
                <TableCell>{detalle.alto}" x {detalle.ancho}" x {detalle.largo}m</TableCell>
                <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                <TableCell className="text-right">{detalle.piesTablares?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.precioPorPie?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.valorUnitario?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.subTotal?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-6 p-4 border rounded-md space-y-1 text-sm">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Venta:</span>
              <span className="text-primary">${(venta.totalVenta || 0).toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
            {senaActual > 0 && (
              <>
                <div className="flex justify-between text-sm text-destructive">
                    <span className="text-muted-foreground">Seña Aplicada:</span>
                    <span>-${(Number(senaActual) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                    <span>Saldo Pendiente:</span>
                    <span className="text-primary">${(Number(saldoPendiente) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
                </div>
              </>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Total Madera:</span>
              <span>${costoTotalMaderaVenta.toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Total Aserrío:</span>
              <span>${costoTotalAserrioVenta.toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Operario:</span>
              <span>${costoOperarioActual.toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
             <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Ganancia Neta Estimada:</span>
              <span>${gananciaNetaEstimada.toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
                <span>Javier (Madera + 50% Gan. Neta):</span>
                <span>${(Number(valorJavier) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>Lucas (Aserrío + Operario + 50% Gan. Neta):</span>
                <span>${(Number(valorLucas) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2})}</span>
            </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}


export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { toast } = useToast();

  const updateVentasListAndStorage = useCallback((newList: Venta[]) => {
    const sortedList = newList.sort((a, b) => {
      if (!a.fecha || !b.fecha) return 0; 
      const dateA = parseISO(a.fecha);
      const dateB = parseISO(b.fecha);
      return dateB.getTime() - dateA.getTime();
    });
    setVentas(sortedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(sortedList));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
      let dataToLoad: Venta[] = []; 

      if (storedVentas) {
        try {
          const parsedVentas = JSON.parse(storedVentas);
          if(Array.isArray(parsedVentas)) {
            dataToLoad = parsedVentas.filter(v => v.fecha && isValid(parseISO(v.fecha)));
          }
        } catch (e) {
          console.error("Error parsing ventas from localStorage", e);
        }
      }
      if (isMounted) {
        const sortedData = dataToLoad.sort((a, b) => {
            if (!a.fecha || !b.fecha) return 0;
            const dateA = parseISO(a.fecha);
            const dateB = parseISO(b.fecha);
            return dateB.getTime() - dateA.getTime();
        });
        setVentas(sortedData);
        if (!storedVentas && dataToLoad.length === 0) { 
          localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify([]));
        }
      }
    }
    return () => {
      isMounted = false;
    };
  }, []); 

  const handleDeleteVenta = (idToDelete: string) => {
    const newList = ventas.filter(venta => venta.id !== idToDelete);
    updateVentasListAndStorage(newList);
    toast({
      title: "Venta Eliminada",
      description: "La venta ha sido eliminada exitosamente.",
      variant: "default",
    });
  };

  const handleMarkAsPaid = (idToMark: string) => {
    const newList = ventas.map(venta => {
      if (venta.id === idToMark) {
        const totalVentaNum = Number(venta.totalVenta) || 0;
        return { ...venta, sena: totalVentaNum };
      }
      return venta;
    });
    updateVentasListAndStorage(newList);
    toast({
      title: "Venta Actualizada",
      description: "La venta ha sido marcada como cobrada.",
    });
  };

  const handleIngresarSena = (ventaId: string, montoSeña: number) => {
    const newList = ventas.map(v => {
      if (v.id === ventaId) {
        return { ...v, sena: montoSeña };
      }
      return v;
    });
    updateVentasListAndStorage(newList);
  };

  const filteredVentas = useMemo(() => {
    if (!searchTerm) {
      return ventas; 
    }
    return ventas.filter(venta =>
      venta.nombreComprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (venta.telefonoComprador && venta.telefonoComprador.includes(searchTerm))
    );
  }, [ventas, searchTerm]);

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Registro de Ventas" description="Listado de todas las ventas de madera.">
        <Button asChild>
          <Link href="/ventas/nueva">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Venta
          </Link>
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
            <CardDescription>
                {filteredVentas.length > 0
                ? `Mostrando ${filteredVentas.length} de ${ventas.length} venta(s). (Ordenadas por fecha descendente)`
                : ventas.length === 0 ? "Aún no se han registrado ventas." : "No se encontraron ventas con los criterios de búsqueda."}
            </CardDescription>
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por comprador, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-[300px]"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 && !searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <DollarSign className="mx-auto h-12 w-12 mb-4" />
              <p>No hay ventas registradas.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/ventas/nueva">Registrar la primera venta</Link>
              </Button>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
             <p>No se encontraron ventas que coincidan con su búsqueda.</p>
           </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredVentas.map((venta) => (
                <VentaItem 
                  key={venta.id} 
                  venta={venta} 
                  onDelete={handleDeleteVenta} 
                  onMarkAsPaid={handleMarkAsPaid}
                  onIngresarSena={handleIngresarSena} 
                />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    