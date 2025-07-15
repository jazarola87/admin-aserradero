
"use client";

import React from "react";
import Link from "next/link";
import { Presupuesto } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Download, Pencil, Trash2, Loader2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface PresupuestoItemProps {
  presupuesto: Presupuesto;
  isProcessing: string | null;
  onDelete: (id: string) => void;
  onConvertToVenta: (id: string) => void;
  onDownloadPDF: (presupuesto: Presupuesto) => void;
}

function PresupuestoItemComponent({ presupuesto, isProcessing, onDelete, onConvertToVenta, onDownloadPDF }: PresupuestoItemProps) {
  return (
    <AccordionItem value={presupuesto.id}>
      <div className="flex items-center w-full py-2 px-2 group hover:bg-muted/50 rounded-md">
        <AccordionTrigger className="flex-1 text-left p-2 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
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
                <Button variant="outline" size="sm" className="text-xs h-8 px-2" onClick={(e) => {e.stopPropagation(); onDownloadPDF(presupuesto);}}>
                    <Download className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 px-2" onClick={(e) => {e.stopPropagation(); onConvertToVenta(presupuesto.id);}}>
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
                        <AlertDialogAction onClick={(e) => {e.stopPropagation(); onDelete(presupuesto.id)}} className="bg-destructive hover:bg-destructive/90">
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
                <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                <TableCell className="text-right">${detalle.subTotal?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionContent>
    </AccordionItem>
  )
}

export const PresupuestoItem = React.memo(PresupuestoItemComponent);
