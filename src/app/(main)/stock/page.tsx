"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Search, Loader2, Database, Package } from "lucide-react";
import type { StockMaderaAserrada } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllStockEntries, deleteStockEntry } from "@/lib/firebase/services/stockService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { VentaDetalle } from "@/types";

export default function StockPage() {
  const [stockEntries, setStockEntries] = useState<StockMaderaAserrada[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadStockEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const entriesList = await getAllStockEntries();
      setStockEntries(entriesList);
    } catch (error) {
      console.error("Error al cargar ingresos de stock desde Firebase: ", error);
      toast({
        title: "Error al Cargar Ingresos de Stock",
        description: "No se pudieron obtener los ingresos de stock de Firebase. " + (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStockEntries();
  }, [loadStockEntries]);

  const handleDeleteEntry = async (idToDelete: string) => {
    try {
      await deleteStockEntry(idToDelete);
      toast({
        title: "Ingreso Eliminado",
        description: "El ingreso de stock ha sido eliminado exitosamente de Firebase.",
        variant: "default",
      });
      loadStockEntries();
    } catch (error) {
      console.error("Error al eliminar ingreso de stock en Firebase: ", error);
      toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar el ingreso de stock de Firebase. " + (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      });
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return stockEntries;
    return stockEntries.filter(entry =>
      entry.notas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.detalles.some(d => d.tipoMadera?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [stockEntries, searchTerm]);

  const stockSummaryByWoodType = useMemo(() => {
    if (!stockEntries || stockEntries.length === 0) return [];

    const summaryMap = new Map<string, { tipoMadera: string; totalPiesTablares: number }>();

    stockEntries.forEach(entry => {
      (entry.detalles || []).forEach(detalle => {
        if (!detalle.tipoMadera || !detalle.unidades) return;
        
        let piesTablaresDelDetalle = detalle.piesTablares;
        if (piesTablaresDelDetalle === undefined || piesTablaresDelDetalle === 0) {
          piesTablaresDelDetalle = (detalle.unidades || 0) * (detalle.alto || 0) * (detalle.ancho || 0) * (detalle.largo || 0) * 0.2734;
        }

        const existing = summaryMap.get(detalle.tipoMadera);
        if (existing) {
          existing.totalPiesTablares += piesTablaresDelDetalle;
        } else {
          summaryMap.set(detalle.tipoMadera, {
            tipoMadera: detalle.tipoMadera,
            totalPiesTablares: piesTablaresDelDetalle,
          });
        }
      });
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.tipoMadera.localeCompare(b.tipoMadera));
  }, [stockEntries]);


  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Stock de Madera Aserrada" description="Registro y resumen de la producción de madera para inventario.">
        <Button asChild>
          <Link href="/stock/nueva">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Ingreso a Stock
          </Link>
        </Button>
      </PageTitle>

       <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
             <Package className="mr-2 h-5 w-5 text-primary" />
             Resumen de Stock Actual
          </CardTitle>
          <CardDescription>
            Total de pies tablares en stock, agrupados por tipo de madera.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </div>
            ) : stockSummaryByWoodType.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay stock para mostrar.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo de Madera</TableHead>
                            <TableHead className="text-right">Total Pies Tablares</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stockSummaryByWoodType.map((item, index) => (
                           item.totalPiesTablares !== 0 && (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.tipoMadera}</TableCell>
                                <TableCell className="text-right font-semibold">{item.totalPiesTablares.toFixed(2)}</TableCell>
                            </TableRow>
                           )
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ingresos a Stock</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardDescription>
              {isLoading ? "Cargando ingresos de stock..." :
                (filteredEntries.length > 0
                  ? `Mostrando ${filteredEntries.length} de ${stockEntries.length} ingreso(s).`
                  : stockEntries.length === 0 ? "Aún no se han registrado ingresos a stock." : "No se encontraron ingresos con los criterios de búsqueda.")
              }
            </CardDescription>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por tipo de madera, notas..."
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
              <p>Cargando ingresos...</p>
            </div>
          ) : stockEntries.length === 0 && !searchTerm ? (
            <div className="text-center py-10 text-muted-foreground">
              <Database className="mx-auto h-12 w-12 mb-4" />
              <p>No hay ingresos de stock registrados.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/stock/nueva">Registrar el primer ingreso</Link>
              </Button>
            </div>
          ) : filteredEntries.length === 0 && searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron ingresos que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredEntries.map((entry) => (
                <AccordionItem value={entry.id} key={entry.id}>
                    <div className="flex items-center w-full py-3 px-2 group hover:bg-muted/50 rounded-md">
                        <AccordionTrigger className="flex-1 text-left p-0 m-0 hover:no-underline focus:outline-none data-[state=open]:[&>svg]:rotate-180 mr-2">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                                <div className="flex-1 mb-2 sm:mb-0">
                                    <span className="font-semibold">Fecha de Producción: {entry.fecha && isValid(parseISO(entry.fecha)) ? format(parseISO(entry.fecha), 'PPP', { locale: es }) : 'Fecha inválida'}</span>
                                    <span className="ml-0 sm:ml-4 text-sm text-muted-foreground block sm:inline">
                                    Notas: {entry.notas || "N/A"}
                                    </span>
                                </div>
                                <span className="font-semibold text-base sm:text-lg self-start sm:self-center">
                                Total: {entry.totalPiesTablares.toFixed(2)} Pies Tablares
                                </span>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center space-x-1 shrink-0">
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
                                    <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive hover:bg-destructive/90">
                                    Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
