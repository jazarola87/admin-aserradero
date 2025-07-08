"use client";

import React from "react";
import Link from "next/link";
import { Compra } from "@/types";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface CompraItemProps {
  compra: Compra;
  onDelete: (id: string) => void;
}

function CompraItemComponent({ compra, onDelete }: CompraItemProps) {
  return (
    <TableRow key={compra.id}>
      <TableCell>{compra.fecha && isValid(parseISO(compra.fecha)) ? format(parseISO(compra.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}</TableCell>
      <TableCell>{compra.tipoMadera}</TableCell>
      <TableCell>{compra.volumen} m³</TableCell>
      <TableCell>${(compra.precioPorMetroCubico ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
      <TableCell>${compra.costo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
      <TableCell>{compra.proveedor}</TableCell>
      <TableCell>{compra.telefonoProveedor || "N/A"}</TableCell>
      <TableCell className="text-right space-x-1">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/compras/${compra.id}/editar`}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar Compra</span>
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar Compra</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la compra de Firebase.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(compra.id)} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export const CompraItem = React.memo(CompraItemComponent);
