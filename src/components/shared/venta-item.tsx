
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Venta, VentaDetalle, Configuracion } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CircleCheckBig, Undo2, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper functions (can be moved to a utils file later if needed)
const calcularPiesTablaresVentaItem = (detalle: Partial<VentaDetalle>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0; 
  
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
};

type EstadoCobro = { texto: string; variant: "default" | "secondary" | "destructive" | "outline" };

const getEstadoCobroDisplay = (venta: Venta): EstadoCobro => {
    const totalVentaNum = Number(venta.totalVenta) || 0;
    const senaNum = Number(venta.sena) || 0;

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


interface VentaItemProps {
  venta: Venta;
  config: Configuracion;
  onDelete: (id: string) => void;
  onUpdateVenta: (id: string, data: Partial<Venta>) => void;
}

function VentaItemComponent({ venta, config, onDelete, onUpdateVenta }: VentaItemProps) {
  const [isSenaDialogOpen, setIsSenaDialogOpen] = useState(false);
  const [senaInputValue, setSenaInputValue] = useState<string>(venta.sena?.toString() || "");
  const { toast } = useToast();

  useEffect(() => {
    setSenaInputValue(venta.sena?.toString() || "");
  }, [venta.sena]);

  const costoTotalMaderaVenta = useMemo(() => {
    if (typeof venta.costoMaderaVentaSnapshot === 'number' && venta.costoMaderaVentaSnapshot > 0) {
      return venta.costoMaderaVentaSnapshot;
    }
    
    if (!config || !config.costosMaderaMetroCubico) return 0;
    const costosMap = new Map(config.costosMaderaMetroCubico.map(c => [c.tipoMadera, c.costoPorMetroCubico]));

    return (venta.detalles || []).reduce((totalCosto, detalle) => {
      const piesTablares = calcularPiesTablaresVentaItem(detalle);
      if (piesTablares === 0 || !detalle.tipoMadera) return totalCosto;

      const costoPorMetroCubico = Number(costosMap.get(detalle.tipoMadera)) || 0;
      
      const costoDelItem = (costoPorMetroCubico / 200) * piesTablares;
      return totalCosto + costoDelItem;
    }, 0);

  }, [venta.detalles, venta.costoMaderaVentaSnapshot, config]);

  const costoTotalAserrioVenta = useMemo(() => {
     if (typeof venta.costoAserrioVentaSnapshot === 'number' && venta.costoAserrioVentaSnapshot > 0) {
      return venta.costoAserrioVentaSnapshot;
    }
    
    if (!config) return 0;
    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;

    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoOperativoAjustado = costoOperativoBase * 1.38;
    const costoAserrioPorPie = costoOperativoAjustado / 600;

    if (!isFinite(costoAserrioPorPie)) return 0;

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

  const estadoCobro = getEstadoCobroDisplay(venta);
  const isFullyPaid = estadoCobro.texto === "Cobrado";

  const handleGuardarSena = () => {
    const monto = parseFloat(senaInputValue);
    if (!isNaN(monto) && monto >= 0) {
      onUpdateVenta(venta.id, { sena: monto });
      setIsSenaDialogOpen(false);
      toast({ title: "Seña Actualizada", description: `Seña para la venta ID ${venta.id} actualizada a $${monto.toFixed(2)}` });
    } else {
      toast({ title: "Error", description: "Monto de seña inválido.", variant: "destructive" });
    }
  };

  return (
    <AccordionItem value={venta.id} id={venta.id}>
      <div className="flex items-center w-full py-3 px-2 group hover:bg-muted/50 rounded-md">
        <AccordionTrigger className="flex-1 text-left p-0 m-0 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-base">Venta a: {venta.nombreComprador}</span>
              <Badge variant={estadoCobro.variant} className="w-fit text-xs px-2 py-0.5 whitespace-normal sm:whitespace-nowrap h-auto max-w-[250px] sm:max-w-xs text-left">
                {estadoCobro.texto}
              </Badge>
              <span className="text-sm text-muted-foreground block sm:inline">
                Fecha: {venta.fecha && isValid(parseISO(venta.fecha)) ? format(parseISO(venta.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}
              </span>
            </div>
            <span className="mr-1 sm:mr-2 font-semibold text-base sm:text-lg self-start sm:self-center mt-2 sm:mt-0">Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          </div>
        </AccordionTrigger>

        <div className="flex items-center space-x-1 shrink-0">
          {isFullyPaid ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2 text-destructive hover:text-destructive"
                  title="Revertir estado a Pendiente"
                >
                  <Undo2 className="mr-1 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Revertir Cobro</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Revertir estado de cobro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción establecerá la seña de esta venta en $0 y la marcará como pendiente de cobro. ¿Desea continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => onUpdateVenta(venta.id, { sena: 0 })}
                  >
                    Sí, Revertir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
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
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2"
                    title="Marcar como Cobrado Totalmente"
                  >
                    <CircleCheckBig className="mr-1 h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Cobrado</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Marcar Venta como Cobrada?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción registrará el pago total para esta venta. El monto de la seña se igualará al total de ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                      ¿Desea continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onUpdateVenta(venta.id, { sena: venta.totalVenta })}>
                      Sí, Marcar Cobrada
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
        
        {venta.notas && (
          <div className="mb-4 p-4 border rounded-md bg-muted/50">
            <p className="font-semibold text-foreground">Notas:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{venta.notas}</p>
          </div>
        )}

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
                <TableCell>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}m`}</TableCell>
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

export const VentaItem = React.memo(VentaItemComponent);
