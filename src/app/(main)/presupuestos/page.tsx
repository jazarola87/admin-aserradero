
"use client";

import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, ClipboardList } from "lucide-react";
import type { Presupuesto } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Mock data for presupuestos
const mockPresupuestosData: Presupuesto[] = [
  { 
    id: "pres001", 
    fecha: "2024-07-25", 
    nombreCliente: "Ana Gómez", 
    telefonoCliente: "555-1122",
    detalles: [
      { id: "pd001", tipoMadera: "Pino", unidades: 15, ancho: 4, alto: 2, largo: 10, precioPorPie: 2.50, cepillado: false, piesTablares: 100, subTotal: 250, valorUnitario: 16.67 },
      { id: "pd002", tipoMadera: "Eucalipto", unidades: 8, ancho: 6, alto: 3, largo: 12, precioPorPie: 3.00, cepillado: true, piesTablares: 144, subTotal: 504, valorUnitario: 63.00 }, // 144 * 3 + 144 * 0.5 (cepillado)
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
  const { toast } = useToast();

  const handleDeletePresupuesto = (idToDelete: string) => {
    setPresupuestos(prevPresupuestos => prevPresupuestos.filter(p => p.id !== idToDelete));
    toast({
      title: "Presupuesto Eliminado",
      description: "El presupuesto ha sido eliminado exitosamente.",
      variant: "default",
    });
  };

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
           <CardDescription>
            {presupuestos.length > 0 
              ? `Mostrando ${presupuestos.length} presupuesto(s).` 
              : "Aún no se han registrado presupuestos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {presupuestos.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {presupuestos.map((presupuesto) => (
                <AccordionItem value={presupuesto.id} key={presupuesto.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between w-full pr-4 items-center">
                      <div className="flex-1">
                        <span>Presupuesto para: {presupuesto.nombreCliente}</span>
                        <span className="ml-4 text-sm text-muted-foreground">Fecha: {new Date(presupuesto.fecha).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-4 font-semibold">Total: ${presupuesto.totalPresupuesto?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
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
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2"><strong>Teléfono Cliente:</strong> {presupuesto.telefonoCliente || "N/A"}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo Madera</TableHead>
                          <TableHead>Unidades</TableHead>
                          <TableHead>Dimensiones (Ancho x Alto x Largo)</TableHead>
                          <TableHead>Pies Tablares</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Precio/Pie</TableHead>
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
          ) : (
             <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4" />
              <p>No hay presupuestos registrados.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/presupuestos/nueva">Registrar el primer presupuesto</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
