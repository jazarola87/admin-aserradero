
"use client";

import React from "react";
import Link from "next/link";
import { StockMaderaAserrada, VentaDetalle } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ArrowRightCircle } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface StockEntryItemProps {
  entry: StockMaderaAserrada;
  onDelete: (id: string) => void;
}

function StockEntryItemComponent({ entry, onDelete }: StockEntryItemProps) {
  const isConsumption = !!entry.idVentaConsumo;
  
  return (
    <AccordionItem value={entry.id} key={entry.id}>
      <div className="flex items-center w-full py-2 px-2 group hover:bg-muted/50 rounded-md">
        <AccordionTrigger className="flex-1 text-left p-2 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
            <div className="flex-1 mb-2 sm:mb-0">
               {isConsumption ? (
                <span className="font-semibold text-blue-600">Consumo Venta: {entry.nombreClienteConsumo || `ID ${entry.idVentaConsumo}`}</span>
              ) : (
                <span className="font-semibold">Fecha de Producción: {entry.fecha && isValid(parseISO(entry.fecha)) ? format(parseISO(entry.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}</span>
              )}
              <span className="ml-0 sm:ml-4 text-sm text-muted-foreground block sm:inline">
                 {isConsumption ? 
                  `Fecha: ${entry.fecha && isValid(parseISO(entry.fecha)) ? format(parseISO(entry.fecha), 'PPP', { locale: es }) : 'N/A'}` : 
                  `Notas: ${entry.notas || "N/A"}`
                 }
              </span>
            </div>
            <span className={`font-semibold text-base sm:text-lg self-start sm:self-center ${isConsumption ? 'text-destructive' : ''}`}>
              Total: {entry.totalPiesTablares.toFixed(2)} Pies Tablares
            </span>
          </div>
        </AccordionTrigger>
        <div className="flex items-center space-x-1 shrink-0">
          {isConsumption && entry.idVentaConsumo ? (
            <Button asChild variant="ghost" size="icon" title={`Buscar Venta #${entry.idVentaConsumo}`}>
              <Link href={`/ventas?search=${encodeURIComponent(entry.idVentaConsumo)}`}>
                <ArrowRightCircle className="h-5 w-5 text-blue-600" />
                <span className="sr-only">Buscar Venta</span>
              </Link>
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar Ingreso</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el ingreso de stock de Firebase.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(entry.id)} className="bg-destructive hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <AccordionContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo Madera</TableHead>
              <TableHead>Unid.</TableHead>
              <TableHead>Dimensiones</TableHead>
              <TableHead>Cepillado</TableHead>
              <TableHead className="text-right">Pies Tabl.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entry.detalles || []).map((detalle: VentaDetalle, index) => (
              <TableRow key={detalle.id || index}>
                <TableCell>{detalle.tipoMadera}</TableCell>
                <TableCell>{detalle.unidades}</TableCell>
                <TableCell>{`${detalle.alto}" x ${detalle.ancho}" x ${detalle.largo}m`}</TableCell>
                <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                <TableCell className="text-right">{detalle.piesTablares?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionContent>
    </AccordionItem>
  );
}

export const StockEntryItem = React.memo(StockEntryItemComponent);
