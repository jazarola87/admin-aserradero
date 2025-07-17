"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Loader2, Database, Package, ArrowUp, ArrowDown } from "lucide-react";
import type { StockMaderaAserrada } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getAllStockEntries, deleteStockEntry } from "@/lib/firebase/services/stockService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StockEntryItem } from "@/components/shared/stock-entry-item";

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

  const handleDeleteEntry = useCallback(async (idToDelete: string) => {
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
  }, [loadStockEntries, toast]);

  const { productionEntries, consumptionEntries } = useMemo(() => {
    const production: StockMaderaAserrada[] = [];
    const consumption: StockMaderaAserrada[] = [];

    stockEntries.forEach(entry => {
        if (entry.idVentaConsumo) {
            consumption.push(entry);
        } else {
            production.push(entry);
        }
    });
    return { productionEntries: production, consumptionEntries: consumption };
  }, [stockEntries]);

  const filteredProductionEntries = useMemo(() => {
    if (!searchTerm) return productionEntries;
    return productionEntries.filter(entry =>
      entry.notas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.detalles || []).some(d => d.tipoMadera?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productionEntries, searchTerm]);

  const stockSummaryByWoodType = useMemo(() => {
    if (!stockEntries || stockEntries.length === 0) return [];

    const summaryMap = new Map<string, { 
      tipoMadera: string; 
      medidas: Map<string, {
        alto: number;
        ancho: number;
        largo: number;
        cepillado: boolean;
        unidades: number;
        totalPiesTablares: number;
      }> 
    }>();

    stockEntries.forEach(entry => {
      (entry.detalles || []).forEach(detalle => {
        if (!detalle.tipoMadera || !detalle.unidades || !detalle.alto || !detalle.ancho || !detalle.largo) return;
        
        if (!summaryMap.has(detalle.tipoMadera)) {
          summaryMap.set(detalle.tipoMadera, {
            tipoMadera: detalle.tipoMadera,
            medidas: new Map(),
          });
        }
        
        const woodTypeEntry = summaryMap.get(detalle.tipoMadera)!;
        const cepillado = !!detalle.cepillado;
        const medidaKey = `${detalle.alto}-${detalle.ancho}-${detalle.largo}-${cepillado}`;

        let piesTablaresDelDetalle = detalle.piesTablares;
        if (piesTablaresDelDetalle === undefined || piesTablaresDelDetalle === null) {
          piesTablaresDelDetalle = (detalle.unidades || 0) * (detalle.alto || 0) * (detalle.ancho || 0) * (detalle.largo || 0) * 0.2734;
        }

        const medidaEntry = woodTypeEntry.medidas.get(medidaKey);
        if (medidaEntry) {
          medidaEntry.unidades += detalle.unidades;
          medidaEntry.totalPiesTablares += piesTablaresDelDetalle;
        } else {
          woodTypeEntry.medidas.set(medidaKey, {
            alto: detalle.alto,
            ancho: detalle.ancho,
            largo: detalle.largo,
            cepillado: cepillado,
            unidades: detalle.unidades,
            totalPiesTablares: piesTablaresDelDetalle,
          });
        }
      });
    });
    
    const finalSummary = Array.from(summaryMap.values()).map(woodType => {
      const filteredMedidas = Array.from(woodType.medidas.values())
        .filter(m => m.unidades > 0)
        .sort((a,b) => {
            if (a.alto !== b.alto) return a.alto - b.alto;
            if (a.ancho !== b.ancho) return a.ancho - b.ancho;
            if (a.largo !== b.largo) return a.largo - b.largo;
            return 0;
        });

      const totalPiesTablaresWoodType = filteredMedidas.reduce((sum, m) => sum + m.totalPiesTablares, 0);

      return {
        ...woodType,
        medidas: filteredMedidas,
        totalPiesTablares: totalPiesTablaresWoodType
      };
    }).filter(woodType => woodType.medidas.length > 0)
      .sort((a, b) => a.tipoMadera.localeCompare(b.tipoMadera));

    return finalSummary;
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
            Inventario detallado de madera aserrada disponible, agrupado por tipo y medidas.
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
                <Accordion type="multiple" className="w-full space-y-2">
                  {stockSummaryByWoodType.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={item.tipoMadera} className="border rounded-md px-4">
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span className="font-semibold text-lg">{item.tipoMadera}</span>
                          <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{item.totalPiesTablares.toFixed(2)} Pies Tablares</span></span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Dimensiones (Alto" x Ancho" x Largo m)</TableHead>
                              <TableHead>Cepillado</TableHead>
                              <TableHead className="text-right">Unidades</TableHead>
                              <TableHead className="text-right">Pies Tablares</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {item.medidas.map((medida, medidaIndex) => (
                              <TableRow key={`${item.tipoMadera}-${medidaIndex}`}>
                                <TableCell>{`${medida.alto}" x ${medida.ancho}" x ${medida.largo}m`}</TableCell>
                                <TableCell>{medida.cepillado ? "Sí" : "No"}</TableCell>
                                <TableCell className="text-right font-medium">{medida.unidades}</TableCell>
                                <TableCell className="text-right">{medida.totalPiesTablares.toFixed(2)}</TableCell>
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <ArrowUp className="mr-2 h-5 w-5" />
            Historial de Ingresos por Producción
          </CardTitle>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardDescription>
              {isLoading ? "Cargando ingresos de producción..." :
                (filteredProductionEntries.length > 0
                  ? `Mostrando ${filteredProductionEntries.length} de ${productionEntries.length} ingreso(s).`
                  : productionEntries.length === 0 ? "Aún no se han registrado ingresos de producción." : "No se encontraron ingresos con los criterios de búsqueda.")
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
          ) : productionEntries.length === 0 && !searchTerm ? (
            <div className="text-center py-10 text-muted-foreground">
              <Database className="mx-auto h-12 w-12 mb-4" />
              <p>No hay ingresos de producción registrados.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/stock/nueva">Registrar el primer ingreso</Link>
              </Button>
            </div>
          ) : filteredProductionEntries.length === 0 && searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron ingresos que coincidan con su búsqueda.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredProductionEntries.map((entry) => (
                <StockEntryItem key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <ArrowDown className="mr-2 h-5 w-5" />
            Historial de Egresos por Venta
          </CardTitle>
           <CardDescription>
              {isLoading ? "Cargando egresos..." :
                consumptionEntries.length > 0 ? `Mostrando ${consumptionEntries.length} egreso(s) por ventas.` : "Aún no se han registrado egresos por ventas."
              }
            </CardDescription>
        </CardHeader>
        <CardContent>
             {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </div>
            ) : consumptionEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay egresos de stock para mostrar.</p>
            ) : (
                <Accordion type="single" collapsible className="w-full">
                    {consumptionEntries.map((entry) => (
                        <StockEntryItem key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
                    ))}
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
