"use client";

import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, DollarSign, Loader2 } from "lucide-react";
import type { Venta, Configuracion } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import { getAllVentas, deleteVenta, updateVenta } from "@/lib/firebase/services/ventasService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VentaItem } from "@/components/shared/venta-item";

const getEstadoCobroSimple = (venta: Venta): 'cobrado' | 'parcialmente-cobrado' | 'pendiente' | 'otro' => {
    const totalVentaNum = Number(venta.totalVenta) || 0;
    const senaNum = Number(venta.sena) || 0;

    if (totalVentaNum <= 0) return 'otro';

    if (senaNum >= totalVentaNum) {
      return 'cobrado';
    } else if (senaNum > 0 && senaNum < totalVentaNum) {
      return 'parcialmente-cobrado';
    } else {
      return 'pendiente';
    }
};


export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [estadoCobroFilter, setEstadoCobroFilter] = useState<string>("todos");
  const searchParams = useSearchParams();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appConfig, ventasData] = await Promise.all([
        getAppConfig(),
        getAllVentas()
      ]);
      setConfig(appConfig);
      setVentas(ventasData);
    } catch (error) {
       console.error("Error al cargar datos: ", error);
       toast({
         title: "Error al Cargar Datos",
         description: "No se pudieron obtener los datos de ventas o configuración. " + (error instanceof Error ? error.message : "Error desconocido"),
         variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
        setSearchTerm(searchFromUrl);
    }
  }, [searchParams]);


  const handleDeleteVenta = useCallback(async (idToDelete: string) => {
    try {
        await deleteVenta(idToDelete);
        toast({
            title: "Venta Eliminada",
            description: "La venta ha sido eliminada exitosamente de Firebase.",
        });
        loadData(); // Recargar datos
    } catch (error) {
        toast({
            title: "Error al Eliminar",
            description: "No se pudo eliminar la venta de Firebase. " + (error instanceof Error ? error.message : "Error desconocido"),
            variant: "destructive",
        });
    }
  }, [loadData, toast]);

  const handleUpdateVenta = useCallback(async (ventaId: string, data: Partial<Venta>) => {
    try {
        await updateVenta(ventaId, data);
        toast({ title: "Venta Actualizada", description: `La venta ha sido actualizada.` });
        loadData(); // Recargar datos
    } catch (error) {
        toast({
            title: "Error al Actualizar",
            description: "No se pudo actualizar la venta. " + (error instanceof Error ? error.message : "Error desconocido"),
            variant: "destructive",
        });
    }
  }, [loadData, toast]);

  const filteredVentas = useMemo(() => {
    let tempVentas = [...ventas];

    if (estadoCobroFilter !== "todos") {
      if (estadoCobroFilter === 'pendiente-de-cobro') {
        tempVentas = tempVentas.filter(venta => {
          const estado = getEstadoCobroSimple(venta);
          return estado === 'parcialmente-cobrado' || estado === 'pendiente';
        });
      } else {
        tempVentas = tempVentas.filter(venta => {
            const estado = getEstadoCobroSimple(venta);
            return estado === estadoCobroFilter;
        });
      }
    }

    if (searchTerm) {
        tempVentas = tempVentas.filter(venta =>
          venta.nombreComprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (venta.telefonoComprador && venta.telefonoComprador.includes(searchTerm))
        );
    }

    return tempVentas;
  }, [ventas, searchTerm, estadoCobroFilter]);

  const { ventasDelMesActual, ventasPorMesPasado } = useMemo(() => {
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();

    const ventasDelMesActual: Venta[] = [];
    const ventasPasadas: Venta[] = [];

    filteredVentas.forEach(venta => {
        if (!venta.fecha || !isValid(parseISO(venta.fecha))) return;
        const fechaVenta = parseISO(venta.fecha);
        if (fechaVenta.getFullYear() === anioActual && fechaVenta.getMonth() === mesActual) {
            ventasDelMesActual.push(venta);
        } else if (fechaVenta < ahora) {
            ventasPasadas.push(venta);
        }
    });

    const ventasAgrupadas = ventasPasadas.reduce((acc, venta) => {
        const fechaVenta = parseISO(venta.fecha);
        const claveMes = format(fechaVenta, 'yyyy-MM');
        if (!acc[claveMes]) {
            acc[claveMes] = [];
        }
        acc[claveMes].push(venta);
        return acc;
    }, {} as Record<string, Venta[]>);

    return { ventasDelMesActual, ventasPorMesPasado: ventasAgrupadas };
  }, [filteredVentas]);

  const showFlatList = estadoCobroFilter === 'pendiente-de-cobro' || !!searchTerm;
  const flatListTitle = searchTerm
    ? `Resultados de la búsqueda para "${searchTerm}"`
    : "Ventas Pendientes de Cobro";


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
                {isLoading ? "Cargando ventas..." :
                  (filteredVentas.length > 0
                  ? `Mostrando ${filteredVentas.length} de ${ventas.length} venta(s).`
                  : ventas.length === 0 ? "Aún no se han registrado ventas." : "No se encontraron ventas con los criterios de búsqueda.")
                }
            </CardDescription>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              <Select value={estadoCobroFilter} onValueChange={setEstadoCobroFilter} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados</SelectItem>
                  <SelectItem value="cobrado">Cobrado</SelectItem>
                  <SelectItem value="pendiente-de-cobro">Pendiente de Cobro</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por comprador, teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full sm:w-[300px]"
                    disabled={isLoading}
                  />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Cargando datos...</p>
            </div>
          ) : !config ? (
             <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-destructive mb-4" />
                <p>Cargando configuración necesaria...</p>
            </div>
          ) : ventas.length === 0 && !searchTerm ? (
             <div className="text-center py-10 text-muted-foreground">
              <DollarSign className="mx-auto h-12 w-12 mb-4" />
              <p>No hay ventas registradas.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/ventas/nueva">Registrar la primera venta</Link>
              </Button>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
             <p>No se encontraron ventas que coincidan con su búsqueda y filtros.</p>
           </div>
          ) : (
            <>
              {showFlatList ? (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2 text-primary">{flatListTitle}</h3>
                    <Accordion type="single" collapsible className="w-full">
                      {filteredVentas.map((venta) => (
                        <VentaItem
                          key={venta.id}
                          venta={venta}
                          config={config!}
                          onDelete={handleDeleteVenta}
                          onUpdateVenta={handleUpdateVenta}
                        />
                      ))}
                    </Accordion>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-2 text-primary">Ventas del Mes Actual</h3>
                    {ventasDelMesActual.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {ventasDelMesActual.map((venta) => (
                          <VentaItem
                            key={venta.id}
                            venta={venta}
                            config={config!}
                            onDelete={handleDeleteVenta}
                            onUpdateVenta={handleUpdateVenta}
                          />
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-2">No hay ventas registradas para el mes actual que coincidan con los filtros.</p>
                    )}
                  </div>

                  {Object.keys(ventasPorMesPasado).length > 0 && (
                    <>
                      <Separator className="my-8" />
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-foreground">Ventas de Meses Anteriores</h3>
                        <Accordion type="multiple" className="w-full space-y-4">
                          {Object.keys(ventasPorMesPasado).sort().reverse().map((mesKey) => (
                            <AccordionItem value={mesKey} key={mesKey} className="border-none">
                              <div className="rounded-lg border shadow-sm">
                                <AccordionTrigger className="px-4 py-3 text-lg font-semibold capitalize hover:no-underline rounded-t-lg data-[state=open]:border-b">
                                  {format(parseISO(`${mesKey}-01`), 'MMMM yyyy', { locale: es })}
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    <Accordion type="single" collapsible className="w-full">
                                      {ventasPorMesPasado[mesKey].map((venta) => (
                                        <VentaItem
                                          key={venta.id}
                                          venta={venta}
                                          config={config!}
                                          onDelete={handleDeleteVenta}
                                          onUpdateVenta={handleUpdateVenta}
                                        />
                                      ))}
                                    </Accordion>
                                </AccordionContent>
                              </div>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
