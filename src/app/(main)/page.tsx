
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, ArchiveRestore, ArchiveX, CalendarDays, Layers, Package } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isValid, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { Compra, Venta, VentaDetalle, Configuracion } from "@/types";
import { initialConfigData } from "@/lib/config-data";
import { Separator } from "@/components/ui/separator";

// Helper functions for calculations (similar to those in ventas/nueva)
const calcularPiesTablaresItem = (detalle: VentaDetalle): number => {
  const unidades = Number(detalle?.unidades) || 0;
  const alto = Number(detalle?.alto) || 0;
  const ancho = Number(detalle?.ancho) || 0;
  const largo = Number(detalle?.largo) || 0;
  if (!unidades || !alto || !ancho || !largo) return 0;
  // Fórmula: unidades * alto (pulg) * ancho (pulg) * largo (metros) * 0.2734
  return unidades * alto * ancho * largo * 0.2734;
};

const getCostoMaderaParaVentaItem = (detalle: VentaDetalle, config: Configuracion): number => {
  if (!detalle.tipoMadera) return 0;
  const piesTablaresArticulo = calcularPiesTablaresItem(detalle);
  if (piesTablaresArticulo <= 0) return 0;

  const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
  const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
  // 1 m³ = 200 pies tablares
  return (piesTablaresArticulo / 200) * costoPorMetroCubicoDelTipo;
};

const getCostoAserrioParaVenta = (venta: Venta, config: Configuracion): number => {
  const precioNafta = Number(config.precioLitroNafta) || 0;
  const precioAfilado = Number(config.precioAfiladoSierra) || 0;

  const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
  const costoOperativoAjustado = costoOperativoBase * 1.38;
  const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado) && costoOperativoAjustado !== 0) ? costoOperativoAjustado / 600 : 0;

  const totalPiesTablaresVenta = (venta.detalles || []).reduce((acc, detalle) => {
    return acc + calcularPiesTablaresItem(detalle);
  }, 0);

  return totalPiesTablaresVenta * costoAserrioPorPie;
};


export default function DashboardPage() {
  const [comprasList, setComprasList] = useState<Compra[]>([]);
  const [ventasList, setVentasList] = useState<Venta[]>([]);
  
  const today = new Date();
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(startOfMonth(subMonths(today,1))); // Default to start of previous month
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(endOfMonth(subMonths(today,1))); // Default to end of previous month

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem('comprasList');
      if (storedCompras) {
        try {
            const parsed = JSON.parse(storedCompras);
            if (Array.isArray(parsed)) setComprasList(parsed);
        } catch (e) { console.error("Error parsing compras from localStorage", e); }
      }

      const storedVentas = localStorage.getItem('ventasList');
      if (storedVentas) {
        try {
            const parsed = JSON.parse(storedVentas);
            if (Array.isArray(parsed)) setVentasList(parsed);
        } catch (e) { console.error("Error parsing ventas from localStorage", e); }
      }
    }
  }, []);

  const filteredComprasList = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return comprasList; // Return all if no dates
    const startOfDesdePeriod = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), fechaDesde.getDate());
    const endOfHastaPeriod = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate(), 23, 59, 59, 999);
    
    return comprasList.filter(compra => {
      if (!compra.fecha) return false;
      try {
        const fechaCompra = parseISO(compra.fecha);
        return isValid(fechaCompra) && fechaCompra >= startOfDesdePeriod && fechaCompra <= endOfHastaPeriod;
      } catch (e) {
        return false;
      }
    });
  }, [comprasList, fechaDesde, fechaHasta]);

  const filteredVentasList = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return ventasList; // Return all if no dates
    const startOfDesdePeriod = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), fechaDesde.getDate());
    const endOfHastaPeriod = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate(), 23, 59, 59, 999);

    return ventasList.filter(venta => {
      if (!venta.fecha) return false;
      try {
        const fechaVenta = parseISO(venta.fecha);
        return isValid(fechaVenta) && fechaVenta >= startOfDesdePeriod && fechaVenta <= endOfHastaPeriod;
      } catch (e) {
        return false;
      }
    });
  }, [ventasList, fechaDesde, fechaHasta]);

  const valorTotalVentas = useMemo(() => {
    return filteredVentasList.reduce((sum, venta) => sum + (Number(venta.totalVenta) || 0), 0);
  }, [filteredVentasList]);

  const valorTotalCompras = useMemo(() => {
    return filteredComprasList.reduce((sum, compra) => sum + (Number(compra.costo) || 0), 0);
  }, [filteredComprasList]);

  const costoMaderaRecuperado = useMemo(() => {
    return filteredVentasList.reduce((sum, venta) => {
      const costoMaderaEstaVenta = (venta.detalles || []).reduce((itemSum, detalle) => {
        return itemSum + getCostoMaderaParaVentaItem(detalle, initialConfigData);
      }, 0);
      return sum + costoMaderaEstaVenta;
    }, 0);
  }, [filteredVentasList]);

  const saldoMaderaRecuperar = useMemo(() => {
    // This should use total historical purchases - total historical wood cost recovered from sales
    const totalComprasHistoricas = comprasList.reduce((sum, compra) => sum + (Number(compra.costo) || 0), 0);
    const costoMaderaRecuperadoHistorico = ventasList.reduce((sum, venta) => {
        const costoMaderaEstaVenta = (venta.detalles || []).reduce((itemSum, detalle) => {
            return itemSum + getCostoMaderaParaVentaItem(detalle, initialConfigData);
        },0);
        return sum + costoMaderaEstaVenta;
    }, 0);
    return totalComprasHistoricas - costoMaderaRecuperadoHistorico;
  }, [comprasList, ventasList]);


  const gananciaNetaSocios = useMemo(() => {
    let totalGananciaNetaFiltrada = 0;
    filteredVentasList.forEach(venta => {
      const costoMaderaEstaVenta = (venta.detalles || []).reduce((itemSum, detalle) => {
        return itemSum + getCostoMaderaParaVentaItem(detalle, initialConfigData);
      }, 0);
      const costoAserrioEstaVenta = getCostoAserrioParaVenta(venta, initialConfigData);
      const costoOperarioEstaVenta = Number(venta.costoOperario) || 0;
      const gananciaNetaEstaVenta = (Number(venta.totalVenta) || 0) - costoMaderaEstaVenta - costoAserrioEstaVenta - costoOperarioEstaVenta;
      totalGananciaNetaFiltrada += gananciaNetaEstaVenta;
    });
    return totalGananciaNetaFiltrada / 2;
  }, [filteredVentasList]);

  const stockPorTipoMadera = useMemo(() => {
    const stockMap: { [key: string]: { compradosM3: number, vendidosPies: number } } = {};

    // Initialize with all configured wood types
    (initialConfigData.preciosMadera || []).forEach(pm => {
      stockMap[pm.tipoMadera] = { compradosM3: 0, vendidosPies: 0 };
    });

    // Sum all historical purchases
    comprasList.forEach(compra => {
      if (compra.tipoMadera && stockMap[compra.tipoMadera]) {
        stockMap[compra.tipoMadera].compradosM3 += Number(compra.volumen) || 0;
      } else if (compra.tipoMadera && !stockMap[compra.tipoMadera]) {
        // Edge case: purchase for a wood type not in current config (should ideally not happen)
        stockMap[compra.tipoMadera] = { compradosM3: Number(compra.volumen) || 0, vendidosPies: 0 };
      }
    });

    // Sum all historical sales
    ventasList.forEach(venta => {
      (venta.detalles || []).forEach(detalle => {
        if (detalle.tipoMadera && stockMap[detalle.tipoMadera]) {
          stockMap[detalle.tipoMadera].vendidosPies += calcularPiesTablaresItem(detalle);
        } else if (detalle.tipoMadera && !stockMap[detalle.tipoMadera]) {
           // Edge case: sale of a wood type not in current config
          stockMap[detalle.tipoMadera] = { compradosM3: 0, vendidosPies: calcularPiesTablaresItem(detalle) };
        }
      });
    });

    return Object.entries(stockMap).map(([tipoMadera, data]) => {
      const vendidosM3 = data.vendidosPies / 200; // 1 m³ = 200 pies tablares
      return {
        tipoMadera,
        compradosM3: data.compradosM3,
        vendidosM3: vendidosM3,
        stockM3: data.compradosM3 - vendidosM3,
      };
    }).filter(item => item.compradosM3 > 0 || item.vendidosM3 > 0 || item.stockM3 !== 0); // Only show types with activity or stock
  }, [comprasList, ventasList, initialConfigData.preciosMadera]);


  const displayDateRange = useMemo(() => {
    const from = fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : "N/A";
    const to = fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : "N/A";
    return `${from} - ${to}`;
  }, [fechaDesde, fechaHasta]);


  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Balance General" 
        description={`Resumen financiero y de stock del aserradero para el período: ${displayDateRange}`}
      />
      <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaDesde && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : <span>Fecha Desde</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fechaDesde}
                onSelect={setFechaDesde}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaHasta && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : <span>Fecha Hasta</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fechaHasta}
                onSelect={setFechaHasta}
                initialFocus
                locale={es}
                disabled={(date) => fechaDesde ? date < fechaDesde : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total de Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${valorTotalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Ingresos totales en período seleccionado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total de Compras</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${valorTotalCompras.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costos de adquisición en período seleccionado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta Socios (c/u)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${gananciaNetaSocios.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Ganancia neta por socio en período seleccionado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Madera Recuperado</CardTitle>
            <ArchiveRestore className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costoMaderaRecuperado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costo de la madera vendida en período seleccionado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Madera a Recuperar</CardTitle>
            <ArchiveX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${saldoMaderaRecuperar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costo total de madera en inventario (histórico).</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            Stock Histórico Total Estimado por Tipo de Madera
          </CardTitle>
          <CardDescription>Calculado sobre el total histórico de compras y ventas para cada tipo de madera (ignora filtro de fecha).</CardDescription>
        </CardHeader>
        <CardContent>
          {stockPorTipoMadera.length > 0 ? (
            <ul className="space-y-2">
              {stockPorTipoMadera.map((item) => (
                <li key={item.tipoMadera} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b last:border-b-0 hover:bg-muted/50 rounded-md text-sm">
                  <div>
                    <span className="font-medium">{item.tipoMadera}: </span>
                    <span className={cn("font-semibold text-base", item.stockM3 < 0 ? "text-destructive" : "text-primary")}>
                      {item.stockM3.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-4">
                    (Comprado: {item.compradosM3.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                     , Vendido: {item.vendidosM3.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No hay datos de stock para mostrar o no se han configurado tipos de madera con actividad.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

      
