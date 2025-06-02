
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

// Helper to calculate board feet for a single sale item
const calcularPiesTablaresItem = (detalle: Partial<VentaDetalle>): number => {
  const unidades = Number(detalle?.unidades) || 0;
  const alto = Number(detalle?.alto) || 0;
  const ancho = Number(detalle?.ancho) || 0;
  const largo = Number(detalle?.largo) || 0;
  if (!unidades || !alto || !ancho || !largo) return 0;
  return unidades * alto * ancho * largo * 0.2734;
};

// Helper to get wood cost for an entire Venta object
const getCostoMaderaParaVenta = (venta: Venta, config: Configuracion): number => {
  return (venta.detalles || []).reduce((itemSum, detalle) => {
    if (!detalle.tipoMadera) return itemSum;
    const piesTablaresArticulo = calcularPiesTablaresItem(detalle);
    if (piesTablaresArticulo <= 0) return itemSum;

    const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
    const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
    return itemSum + (piesTablaresArticulo / 200) * costoPorMetroCubicoDelTipo;
  }, 0);
};

// Helper to get sawmill cost for an entire Venta object
const getCostoAserrioParaVenta = (venta: Venta, config: Configuracion): number => {
  const precioNafta = Number(config.precioLitroNafta) || 0;
  const precioAfilado = Number(config.precioAfiladoSierra) || 0;

  const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
  const costoOperativoAjustado = costoOperativoBase * 1.38;
  // Ensure costoAserrioPorPie is 0 if costoOperativoAjustado is 0, to prevent NaN or Infinity
  const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado) && costoOperativoAjustado !== 0) ? costoOperativoAjustado / 600 : 0;


  const totalPiesTablaresVenta = (venta.detalles || []).reduce((acc, detalle) => {
    return acc + calcularPiesTablaresItem(detalle);
  }, 0);

  return totalPiesTablaresVenta * costoAserrioPorPie;
};


export default function DashboardPage() {
  const [comprasList, setComprasList] = useState<Compra[]>([]);
  const [ventasList, setVentasList] = useState<Venta[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false); // Flag to track if data has been loaded

  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCompras = localStorage.getItem('comprasList');
      let loadedCompras: Compra[] = [];
      if (storedCompras) {
        try {
            const parsed = JSON.parse(storedCompras);
            if (Array.isArray(parsed)) loadedCompras = parsed.filter(c => c.fecha && isValid(parseISO(c.fecha)));
        } catch (e) { console.error("Error parsing compras from localStorage", e); }
      }
      setComprasList(loadedCompras);

      const storedVentas = localStorage.getItem('ventasList');
      let loadedVentas: Venta[] = [];
      if (storedVentas) {
        try {
            const parsed = JSON.parse(storedVentas);
            if (Array.isArray(parsed)) loadedVentas = parsed.filter(v => v.fecha && isValid(parseISO(v.fecha)));
        } catch (e) { console.error("Error parsing ventas from localStorage", e); }
      }
      setVentasList(loadedVentas);
      setDataLoaded(true); // Set data as loaded after attempting to fetch
    }
  }, []);

  useEffect(() => {
    // Only proceed if data has been loaded (or attempted to load)
    if (!dataLoaded) {
      return;
    }

    // Only set initial dates if they haven't been set yet by any means.
    // This means `fechaDesde` and `fechaHasta` are still in their initial `undefined` state.
    if (fechaDesde === undefined && fechaHasta === undefined) {
      const allRecordDates: Date[] = [];
      comprasList.forEach(c => { if (c.fecha && isValid(parseISO(c.fecha))) allRecordDates.push(parseISO(c.fecha))});
      ventasList.forEach(v => { if (v.fecha && isValid(parseISO(v.fecha))) allRecordDates.push(parseISO(v.fecha))});

      if (allRecordDates.length > 0) {
        allRecordDates.sort((a, b) => a.getTime() - b.getTime());
        setFechaDesde(allRecordDates[0]);
        setFechaHasta(allRecordDates[allRecordDates.length - 1]);
      } else {
        // Default to current month if no records after loading
        const today = new Date();
        setFechaDesde(startOfMonth(today));
        setFechaHasta(endOfMonth(today));
      }
    }
  }, [comprasList, ventasList, dataLoaded, fechaDesde, fechaHasta]);


  const filteredComprasList = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return [];
    const startOfDesdePeriod = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), fechaDesde.getDate());
    const endOfHastaPeriod = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate(), 23, 59, 59, 999);
    
    return comprasList.filter(compra => {
        if (!compra.fecha || !isValid(parseISO(compra.fecha))) return false;
        const fechaCompra = parseISO(compra.fecha); 
        return fechaCompra >= startOfDesdePeriod && fechaCompra <= endOfHastaPeriod;
    });
  }, [comprasList, fechaDesde, fechaHasta]);

  const filteredVentasList = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return [];
    const startOfDesdePeriod = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), fechaDesde.getDate());
    const endOfHastaPeriod = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate(), 23, 59, 59, 999);

    return ventasList.filter(venta => {
        if (!venta.fecha || !isValid(parseISO(venta.fecha))) return false;
        const fechaVenta = parseISO(venta.fecha); 
        return fechaVenta >= startOfDesdePeriod && fechaVenta <= endOfHastaPeriod;
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
      const costoMaderaEstaVenta = typeof venta.costoMaderaVentaSnapshot === 'number' 
        ? venta.costoMaderaVentaSnapshot 
        : getCostoMaderaParaVenta(venta, initialConfigData);
      return sum + (Number(costoMaderaEstaVenta) || 0);
    }, 0);
  }, [filteredVentasList, initialConfigData]);
  
  const saldoMaderaARecuperar = useMemo(() => { 
    return valorTotalCompras - costoMaderaRecuperado;
  }, [valorTotalCompras, costoMaderaRecuperado]);


  const gananciaNetaSocios = useMemo(() => {
    let totalGananciaNetaFiltrada = 0;
    filteredVentasList.forEach(venta => {
      const costoMaderaEstaVenta = typeof venta.costoMaderaVentaSnapshot === 'number'
        ? venta.costoMaderaVentaSnapshot
        : getCostoMaderaParaVenta(venta, initialConfigData);
      const costoAserrioEstaVenta = typeof venta.costoAserrioVentaSnapshot === 'number'
        ? venta.costoAserrioVentaSnapshot
        : getCostoAserrioParaVenta(venta, initialConfigData);
      const costoOperarioEstaVenta = Number(venta.costoOperario) || 0;
      
      const gananciaNetaEstaVenta = (Number(venta.totalVenta) || 0) - (Number(costoMaderaEstaVenta) || 0) - (Number(costoAserrioEstaVenta) || 0) - costoOperarioEstaVenta;
      totalGananciaNetaFiltrada += gananciaNetaEstaVenta;
    });
    return totalGananciaNetaFiltrada > 0 ? totalGananciaNetaFiltrada / 2 : 0; 
  }, [filteredVentasList, initialConfigData]);

  const stockPorTipoMadera = useMemo(() => {
    const stockMap: { [key: string]: { compradosM3: number; vendidosPies: number } } = {};

    (initialConfigData.preciosMadera || []).forEach(pm => {
      stockMap[pm.tipoMadera] = { compradosM3: 0, vendidosPies: 0 };
    });
    
    comprasList.forEach(compra => {
      if (compra.tipoMadera && stockMap[compra.tipoMadera]) {
        stockMap[compra.tipoMadera].compradosM3 += Number(compra.volumen) || 0;
      } else if (compra.tipoMadera && !stockMap[compra.tipoMadera]) { 
        stockMap[compra.tipoMadera] = { compradosM3: Number(compra.volumen) || 0, vendidosPies: 0 };
      }
    });

    ventasList.forEach(venta => {
      (venta.detalles || []).forEach(detalle => {
        if (detalle.tipoMadera && stockMap[detalle.tipoMadera]) {
          stockMap[detalle.tipoMadera].vendidosPies += calcularPiesTablaresItem(detalle);
        } else if (detalle.tipoMadera && !stockMap[detalle.tipoMadera]) { 
           stockMap[detalle.tipoMadera] = { compradosM3: 0, vendidosPies: calcularPiesTablaresItem(detalle) };
        }
      });
    });

    return Object.entries(stockMap).map(([tipoMadera, data]) => {
      const vendidosM3 = data.vendidosPies / 200;
      return {
        tipoMadera,
        compradosM3: data.compradosM3,
        vendidosM3: vendidosM3,
        stockM3: data.compradosM3 - vendidosM3,
      };
    }).filter(item => item.compradosM3 > 0 || item.vendidosM3 > 0 || item.stockM3 !== 0); 
  }, [comprasList, ventasList, initialConfigData.preciosMadera]);


  const displayDateRange = useMemo(() => {
    const from = fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : "N/A";
    const to = fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : "N/A";
    if (from === "N/A" && to === "N/A" && !dataLoaded) return "Cargando rango de fechas...";
    if (from === "N/A" && to === "N/A" && dataLoaded) return "No hay registros para definir un rango";
    return `${from} - ${to}`;
  }, [fechaDesde, fechaHasta, dataLoaded]);


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
            <div className="text-2xl font-bold">${saldoMaderaARecuperar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costo de madera comprada en período que aún no se recuperó con ventas del período.</p>
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
                    <span className={cn("font-semibold text-lg", item.stockM3 < 0 ? "text-destructive" : "text-primary")}>
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
    
