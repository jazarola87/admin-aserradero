
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
import { PlusCircle, Trash2, Search, ChevronDown, DollarSign } from "lucide-react";
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
    detalles: [
      { id: "d001", tipoMadera: "Pino", unidades: 10, ancho: 6, alto: 2, largo: 8, precioPorPie: 2.50, cepillado: true, piesTablares: 80, subTotal: 220, valorUnitario: 22 },
      { id: "d002", tipoMadera: "Roble", unidades: 5, ancho: 8, alto: 3, largo: 10, precioPorPie: 5.00, cepillado: false, piesTablares: 100, subTotal: 500, valorUnitario: 100 },
    ],
    totalVenta: 720,
  },
  {
    id: "venta002",
    fecha: "2024-07-22",
    nombreComprador: "Constructora Moderna",
    telefonoComprador: "555-4321",
    detalles: [
      { id: "d003", tipoMadera: "Cedro", unidades: 20, ancho: 4, alto: 1, largo: 12, precioPorPie: 4.00, cepillado: true, piesTablares: 80, subTotal: 360, valorUnitario: 18 },
    ],
    totalVenta: 360,
  },
];

const calcularPiesTablaresVenta = (detalle: VentaDetalle): number => {
    if (!detalle || !detalle.alto || !detalle.ancho || !detalle.largo || !detalle.unidades) return 0;
    return (detalle.alto * detalle.ancho * detalle.largo * detalle.unidades) / 12;
};

const calcularSubtotalVenta = (detalle: VentaDetalle, piesTablares: number): number => {
    if (!detalle || typeof detalle.precioPorPie !== 'number') return 0;
    let subtotal = piesTablares * detalle.precioPorPie;
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
    venta.detalles.forEach(detalle => {
      if (detalle.tipoMadera && detalle.unidades && detalle.unidades > 0 && typeof detalle.precioPorPie === 'number') {
        const piesTablaresArticulo = calcularPiesTablaresVenta(detalle);
        if (piesTablaresArticulo > 0) {
          const costoMaderaConfig = initialConfigData.costosMaderaMetroCubico?.find(c => c.tipoMadera === detalle.tipoMadera);
          const costoPorMetroCubicoDelTipo = costoMaderaConfig?.costoPorMetroCubico || 0;
          const metrosCubicosArticulo = piesTablaresArticulo / 200; // 200 pies = 1 m3
          costoTotal += metrosCubicosArticulo * costoPorMetroCubicoDelTipo;
        }
      }
    });
    return costoTotal;
  }, [venta.detalles]);

  const costoTotalAserrioVenta = useMemo(() => {
    const precioNafta = initialConfigData.precioLitroNafta || 0;
    const precioAfilado = initialConfigData.precioAfiladoSierra || 0;

    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoOperativoAjustado = costoOperativoBase * 1.38;
    const costoAserrioPorPie = costoOperativoAjustado / 600;

    const totalPiesTablaresVenta = venta.detalles.reduce((acc, detalle) => {
      if (detalle.tipoMadera && detalle.unidades && detalle.unidades > 0 && typeof detalle.precioPorPie === 'number') {
        return acc + calcularPiesTablaresVenta(detalle);
      }
      return acc;
    }, 0);

    return totalPiesTablaresVenta * costoAserrioPorPie;
  }, [venta.detalles]);

  const gananciaBrutaEstimada = useMemo(() => {
    return (venta.totalVenta || 0) - costoTotalMaderaVenta - costoTotalAserrioVenta;
  }, [venta.totalVenta, costoTotalMaderaVenta, costoTotalAserrioVenta]);

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
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 ml-2" />
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 mb-4 text-sm p-4 border rounded-md bg-muted/30">
          <p><strong>Teléfono Comprador:</strong> {venta.telefonoComprador || "N/A"}</p>
          {venta.fechaEntregaEstimada && <p><strong>Fecha Entrega Estimada:</strong> {format(new Date(venta.fechaEntregaEstimada + 'T00:00:00'), "PPP", { locale: es })}</p>}
          {typeof venta.sena === 'number' && <p><strong>Seña:</strong> ${venta.sena.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>}
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
            {venta.detalles.map((detalle) => (
              <TableRow key={detalle.id}>
                <TableCell>{detalle.tipoMadera}</TableCell>
                <TableCell>{detalle.unidades}</TableCell>
                <TableCell>{detalle.alto}" x {detalle.ancho}" x {detalle.largo}'</TableCell>
                <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                <TableCell className="text-right">{detalle.piesTablares?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.precioPorPie?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.valorUnitario?.toFixed(2)}</TableCell>
                <TableCell className="text-right">${detalle.subTotal?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-6 p-4 border rounded-md space-y-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Venta:</span>
              <span className="text-primary">${(venta.totalVenta || 0).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo Total Madera:</span>
              <span>${costoTotalMaderaVenta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Costo Total Aserrío:</span>
              <span>${costoTotalAserrioVenta.toFixed(2)}</span>
            </div>
             <Separator />
            <div className="flex justify-between text-md font-semibold">
              <span>Ganancia Bruta Estimada:</span>
              <span>${gananciaBrutaEstimada.toFixed(2)}</span>
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
            setVentas(parsedVentas);
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
