
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
import { PlusCircle, Trash2, Search, ChevronDown, DollarSign, Send, Download } from "lucide-react";
import type { Venta, VentaDetalle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { initialConfigData } from "@/lib/config-data";
import { Separator } from "@/components/ui/separator";

const VENTAS_STORAGE_KEY = 'ventasList';

const mockVentasData: Venta[] = [
  {
    id: "venta001",
    fecha: "2024-07-20",
    nombreComprador: "Juan Pérez",
    telefonoComprador: "555-8765",
    fechaEntregaEstimada: "2024-07-25",
    sena: 50,
    costoOperario: 100,
    detalles: [
      { id: "d001", tipoMadera: "Pino", unidades: 10, ancho: 6, alto: 2, largo: 2.44, precioPorPie: 2.50, cepillado: true, piesTablares: 80, subTotal: 220, valorUnitario: 22 },
      { id: "d002", tipoMadera: "Roble", unidades: 5, ancho: 8, alto: 3, largo: 3.05, precioPorPie: 5.00, cepillado: false, piesTablares: 100, subTotal: 500, valorUnitario: 100 },
    ],
    totalVenta: 720,
  },
];

const calcularPiesTablaresVenta = (detalle: VentaDetalle): number => {
    const unidades = Number(detalle.unidades) || 0;
    const alto = Number(detalle.alto) || 0;
    const ancho = Number(detalle.ancho) || 0;
    const largo = Number(detalle.largo) || 0; 
  
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
};

const calcularSubtotalVenta = (detalle: VentaDetalle, piesTablares: number): number => {
    const precioPorPie = Number(detalle.precioPorPie) || 0;
    if (!precioPorPie && piesTablares > 0) return 0;
    if (piesTablares === 0) return 0;

    let subtotal = piesTablares * precioPorPie;
    if (detalle.cepillado) {
      subtotal += piesTablares * (initialConfigData.precioCepilladoPorPie || 0);
    }
    return subtotal;
};


interface VentaItemProps {
  venta: Venta;
  onDelete: (id: string) => void;
}

function VentaItem({ venta, onDelete }: VentaItemProps) {
  const costoTotalMaderaVenta = useMemo(() => {
    let costoTotal = 0;
    (venta.detalles || []).forEach(detalle => {
      if (detalle.tipoMadera && Number(detalle.unidades) > 0) {
        const piesTablaresArticulo = calcularPiesTablaresVenta(detalle);
        if (piesTablaresArticulo > 0) {
          const costoMaderaConfig = initialConfigData.costosMaderaMetroCubico?.find(c => c.tipoMadera === detalle.tipoMadera);
          const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
          costoTotal += (piesTablaresArticulo / 200) * costoPorMetroCubicoDelTipo; 
        }
      }
    });
    return costoTotal;
  }, [venta.detalles]);

  const costoTotalAserrioVenta = useMemo(() => {
    const precioNafta = Number(initialConfigData.precioLitroNafta) || 0;
    const precioAfilado = Number(initialConfigData.precioAfiladoSierra) || 0;

    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoOperativoAjustado = costoOperativoBase * 1.38;
    const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado)) ? costoOperativoAjustado / 600 : 0;

    const totalPiesTablaresVenta = (venta.detalles || []).reduce((acc, detalle) => {
      if (detalle.tipoMadera && Number(detalle.unidades) > 0) {
        return acc + calcularPiesTablaresVenta(detalle);
      }
      return acc;
    }, 0);

    return totalPiesTablaresVenta * costoAserrioPorPie;
  }, [venta.detalles]);

  const costoOperarioActual = Number(venta.costoOperario) || 0;
  const gananciaNetaEstimada = useMemo(() => {
    return (venta.totalVenta || 0) - costoTotalMaderaVenta - costoTotalAserrioVenta - costoOperarioActual;
  }, [venta.totalVenta, costoTotalMaderaVenta, costoTotalAserrioVenta, costoOperarioActual]);

  const valorJavier = costoTotalMaderaVenta + (gananciaNetaEstimada / 2);
  const valorLucas = costoTotalAserrioVenta + (gananciaNetaEstimada / 2);

  const senaActual = Number(venta.sena) || 0;
  let saldoACobrarJavier = valorJavier;
  let saldoACobrarLucas = valorLucas;

  if (senaActual > 0) {
    const totalJavierYLucas = valorJavier + valorLucas;
    if (totalJavierYLucas > 0) {
      const proporcionJavier = valorJavier / totalJavierYLucas;
      const proporcionLucas = valorLucas / totalJavierYLucas;
      const senaParaJavier = senaActual * proporcionJavier;
      const senaParaLucas = senaActual * proporcionLucas;
      saldoACobrarJavier = valorJavier - senaParaJavier;
      saldoACobrarLucas = valorLucas - senaParaLucas;
    }
  }


  return (
    <AccordionItem value={venta.id} key={venta.id}>
      <AccordionTrigger asChild className="hover:no-underline">
         <div className={cn(
            "flex w-full items-center py-4 px-2 font-medium text-left group", 
            "hover:bg-muted/50 rounded-md"
          )}>
          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <span className="font-semibold">Venta a: {venta.nombreComprador}</span>
                <span className="ml-0 sm:ml-4 text-sm text-muted-foreground block sm:inline">Fecha: {new Date(venta.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex items-center mt-2 sm:mt-0 space-x-1 sm:space-x-2">
                <span className="mr-1 sm:mr-2 font-semibold text-base sm:text-lg">Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
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
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(venta.id); }} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 ml-2" data-manual-chevron="true" />
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 mb-4 text-sm p-4 border rounded-md bg-muted/30">
          <p><strong>Teléfono Comprador:</strong> {venta.telefonoComprador || "N/A"}</p>
          {venta.fechaEntregaEstimada && <p><strong>Fecha Entrega Estimada:</strong> {format(new Date(venta.fechaEntregaEstimada + 'T00:00:00'), "PPP", { locale: es })}</p>}
          {typeof venta.sena === 'number' && <p><strong>Seña:</strong> ${venta.sena.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>}
          {typeof venta.costoOperario === 'number' && <p><strong>Costo Operario:</strong> ${venta.costoOperario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>}
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
              <span className="text-primary">${(venta.totalVenta || 0).toFixed(2)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Total Madera:</span>
              <span>${costoTotalMaderaVenta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Total Aserrío:</span>
              <span>${costoTotalAserrioVenta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo Operario:</span>
              <span>${costoOperarioActual.toFixed(2)}</span>
            </div>
             <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Ganancia Neta Estimada:</span>
              <span>${gananciaNetaEstimada.toFixed(2)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between">
                <span>Javier (Madera + 50% Gan.):</span>
                <span>${(Number(valorJavier) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span>Lucas (Aserrío + 50% Gan.):</span>
                <span>${(Number(valorLucas) || 0).toFixed(2)}</span>
            </div>
            {senaActual > 0 && (
                <>
                <Separator className="my-1" />
                <div className="flex justify-between text-destructive">
                    <span>Seña Aplicada:</span>
                    <span>-${(Number(senaActual) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Saldo a Cobrar Javier:</span>
                    <span>${(Number(saldoACobrarJavier) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Saldo a Cobrar Lucas:</span>
                    <span>${(Number(saldoACobrarLucas) || 0).toFixed(2)}</span>
                </div>
                </>
            )}
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
    setVentas(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(newList));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
      if (isMounted) {
        if (storedVentas) {
          try {
            const parsedVentas = JSON.parse(storedVentas);
            if(Array.isArray(parsedVentas)) {
              setVentas(parsedVentas);
            } else {
              console.warn("Stored ventas data is not an array, falling back to mock data.");
              updateVentasListAndStorage(mockVentasData);
            }
          } catch (e) {
            console.error("Error parsing ventas from localStorage", e);
            updateVentasListAndStorage(mockVentasData);
          }
        } else {
          updateVentasListAndStorage(mockVentasData);
        }
      }
    }
    return () => {
      isMounted = false;
    };
  }, [updateVentasListAndStorage]);

  const handleDeleteVenta = (idToDelete: string) => {
    const newList = ventas.filter(venta => venta.id !== idToDelete);
    updateVentasListAndStorage(newList);
    toast({
      title: "Venta Eliminada",
      description: "La venta ha sido eliminada exitosamente.",
      variant: "default",
    });
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
                ? `Mostrando ${filteredVentas.length} de ${ventas.length} venta(s).`
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
                <VentaItem key={venta.id} venta={venta} onDelete={handleDeleteVenta} />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
