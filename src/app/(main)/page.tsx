
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, ArchiveRestore, ArchiveX, CalendarDays, Layers } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { Compra, Venta, VentaDetalle, Configuracion } from "@/types";
import { initialConfigData } from "@/lib/config-data";

// Helper functions for calculations (similar to those in ventas/nueva)
const calcularPiesTablaresItem = (detalle: VentaDetalle): number => {
  const unidades = Number(detalle?.unidades) || 0;
  const alto = Number(detalle?.alto) || 0;
  const ancho = Number(detalle?.ancho) || 0;
  const largo = Number(detalle?.largo) || 0;
  if (!unidades || !alto || !ancho || !largo) return 0;
  return unidades * alto * ancho * largo * 0.2734;
};

const getCostoMaderaParaVentaItem = (detalle: VentaDetalle, config: Configuracion): number => {
  if (!detalle.tipoMadera) return 0;
  const piesTablaresArticulo = calcularPiesTablaresItem(detalle);
  if (piesTablaresArticulo <= 0) return 0;

  const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
  const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
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
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(startOfMonth(today));
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(today);

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
    if (!fechaDesde || !fechaHasta) return comprasList;
    const endOfHasta = endOfMonth(fechaHasta); 
    return comprasList.filter(compra => {
      if (!compra.fecha) return false;
      try {
        const fechaCompra = parseISO(compra.fecha);
        return isValid(fechaCompra) && fechaCompra >= fechaDesde && fechaCompra <= endOfHasta;
      } catch (e) {
        return false;
      }
    });
  }, [comprasList, fechaDesde, fechaHasta]);

  const filteredVentasList = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return ventasList;
    const endOfHasta = endOfMonth(fechaHasta);
    return ventasList.filter(venta => {
      if (!venta.fecha) return false;
      try {
        const fechaVenta = parseISO(venta.fecha);
        return isValid(fechaVenta) && fechaVenta >= fechaDesde && fechaVenta <= endOfHasta;
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
    return valorTotalCompras - costoMaderaRecuperado;
  }, [valorTotalCompras, costoMaderaRecuperado]);

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

  const totalMetrosCubicosComprados = useMemo(() => {
    return filteredComprasList.reduce((sum, compra) => sum + (Number(compra.volumen) || 0), 0);
  }, [filteredComprasList]);

  const totalPiesTablaresVendidos = useMemo(() => {
    return filteredVentasList.reduce((sumVenta, venta) => {
      const piesVenta = (venta.detalles || []).reduce((sumDetalle, detalle) => {
        return sumDetalle + calcularPiesTablaresItem(detalle);
      }, 0);
      return sumVenta + piesVenta;
    }, 0);
  }, [filteredVentasList]);

  const stockDisponibleEstimadoM3 = useMemo(() => {
    const metrosCubicosVendidos = totalPiesTablaresVendidos / 200;
    return totalMetrosCubicosComprados - metrosCubicosVendidos;
  }, [totalMetrosCubicosComprados, totalPiesTablaresVendidos]);

  const displayDateRange = useMemo(() => {
    const from = fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : "N/A";
    const to = fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : "N/A";
    return `${from} - ${to}`;
  }, [fechaDesde, fechaHasta]);


  return (
    <div className="container mx-auto py-6">
      <PageTitle 
        title="Balance General" 
        description={`Resumen financiero del aserradero para el período: ${displayDateRange}`}
      />
      <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border rounded-lg shadow-sm">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> {/* Ajustado para que la tarjeta de stock no quede sola */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total de Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${valorTotalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Ingresos totales en período.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total de Compras</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${valorTotalCompras.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costos de adquisición en período.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta Socios (c/u)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${gananciaNetaSocios.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Ganancia neta por socio en período.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Madera Recuperado</CardTitle>
            <ArchiveRestore className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costoMaderaRecuperado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costo de la madera vendida en período.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Madera a Recuperar</CardTitle>
            <ArchiveX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${saldoMaderaRecuperar.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Costo de madera en inventario (compras - recuperado).</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Disponible Estimado (M³)</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockDisponibleEstimadoM3.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
            </div>
            <p className="text-xs text-muted-foreground">Stock estimado para el período seleccionado.</p>
          </CardContent>
        </Card>
      </div>
      {/* Se puede eliminar la tarjeta de "Actividad Reciente" o dejarla para futuros gráficos */}
      {/* 
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Gráfica Reciente</CardTitle>
            <CardDescription>Próximamente: Gráficos de ventas y compras del período seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {(filteredVentasList.length === 0 && filteredComprasList.length === 0) ? (
              <p className="text-muted-foreground">No hay datos de actividad para el período seleccionado.</p>
            ) : (
              <p className="text-muted-foreground">Gráficos en desarrollo.</p> 
            )}
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}

    