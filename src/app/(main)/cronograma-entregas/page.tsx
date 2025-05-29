
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarClock, ChevronDown } from "lucide-react";
import type { Venta, VentaDetalle } from "@/types";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

const VENTAS_STORAGE_KEY = 'ventasList';

export default function CronogramaEntregasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
      if (storedVentas) {
        try {
          const parsedVentas = JSON.parse(storedVentas);
          if (Array.isArray(parsedVentas)) {
            setVentas(parsedVentas);
          }
        } catch (e) {
          console.error("Error parsing ventas from localStorage", e);
        }
      }
    }
  }, []);

  const ventasConEntregaEstimada = useMemo(() => {
    return ventas
      .filter(venta => venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)))
      .sort((a, b) => new Date(a.fechaEntregaEstimada!).getTime() - new Date(b.fechaEntregaEstimada!).getTime()); // Soonest first
  }, [ventas]);

  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Cronograma de Entregas" 
        description="Listado de ventas con fecha de entrega estimada, ordenadas por proximidad."
      />

      <Card>
        <CardHeader>
          <CardTitle>Ventas Programadas</CardTitle>
          <CardDescription>
            {ventasConEntregaEstimada.length > 0
              ? `Mostrando ${ventasConEntregaEstimada.length} venta(s) con fecha de entrega programada.`
              : "No hay ventas con fecha de entrega estimada."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ventasConEntregaEstimada.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarClock className="mx-auto h-12 w-12 mb-4" />
              <p>No hay entregas programadas en los registros de ventas.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {ventasConEntregaEstimada.map((venta) => (
                <AccordionItem value={venta.id} key={venta.id}>
                  <AccordionTrigger asChild className="hover:no-underline">
                    <div className={cn(
                        "flex w-full items-center py-4 px-2 font-medium text-left group", 
                        "hover:bg-muted/50 rounded-md"
                      )}>
                      <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                          <span className="font-semibold text-primary">
                            Entrega: {venta.fechaEntregaEstimada && isValid(parseISO(venta.fechaEntregaEstimada)) ? format(parseISO(venta.fechaEntregaEstimada), "PPP", { locale: es }) : 'N/A'}
                          </span>
                          <span className="ml-0 sm:ml-4 text-sm text-foreground block sm:inline">Cliente: {venta.nombreComprador}</span>
                        </div>
                        <div className="flex items-center mt-2 sm:mt-0">
                          <span className="mr-4 font-semibold text-base sm:text-lg">Total: ${venta.totalVenta?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 ml-2" data-manual-chevron="true"/>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-3 text-sm">
                      <p><strong>Fecha de Venta:</strong> {venta.fecha && isValid(parseISO(venta.fecha)) ? format(parseISO(venta.fecha), "PPP", { locale: es }) : 'N/A'}</p>
                      {venta.telefonoComprador && <p><strong>Teléfono Cliente:</strong> {venta.telefonoComprador}</p>}
                      {typeof venta.sena === 'number' && venta.sena > 0 && <p><strong>Seña Pagada:</strong> ${venta.sena.toLocaleString('es-ES', {minimumFractionDigits: 2})}</p>}
                      {typeof venta.costoOperario === 'number' && venta.costoOperario > 0 && <p><strong>Costo Operario:</strong> ${venta.costoOperario.toLocaleString('es-ES', {minimumFractionDigits: 2})}</p>}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo Madera</TableHead>
                          <TableHead>Unid.</TableHead>
                          <TableHead>Dimensiones</TableHead>
                          <TableHead>Cepillado</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(venta.detalles || []).map((detalle: VentaDetalle) => (
                          <TableRow key={detalle.id}>
                            <TableCell>{detalle.tipoMadera}</TableCell>
                            <TableCell>{detalle.unidades}</TableCell>
                            <TableCell>{detalle.alto}" x {detalle.ancho}" x {detalle.largo}m</TableCell>
                            <TableCell>{detalle.cepillado ? "Sí" : "No"}</TableCell>
                            <TableCell className="text-right">${detalle.subTotal?.toFixed(2)}</TableCell>
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
