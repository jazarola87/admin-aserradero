
"use client";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/page-title";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, PlusCircle, Save, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialConfigData } from "@/lib/config-data";
import type { Presupuesto, VentaDetalle as VentaDetalleType, Venta } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

const VENTAS_STORAGE_KEY = 'ventasList';

const ventaDetalleSchema = z.object({
  tipoMadera: z.string().min(1, { message: "Debe seleccionar un tipo."}).optional(),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional(),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(),
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional(),
  cepillado: z.boolean().default(false).optional(),
});

const ventaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreComprador: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoComprador: z.string().optional(),
  fechaEntregaEstimada: z.date().optional(),
  sena: z.coerce.number().nonnegative("La seña no puede ser negativa.").optional(),
  costoOperario: z.coerce.number().nonnegative("El costo de operario no puede ser negativo.").optional(),
  detalles: z.array(ventaDetalleSchema)
    .min(1, "Debe agregar al menos un detalle de venta.")
    .refine(
      (arr) => arr.some(d => d.tipoMadera && d.tipoMadera.length > 0 && (Number(d.unidades) || 0) > 0 && typeof (Number(d.precioPorPie)) === 'number' && !isNaN(Number(d.precioPorPie))),
      {
        message: "Debe ingresar al menos un artículo válido en los detalles (con tipo de madera, unidades y precio por pie).",
      }
    ),
  idOriginalPresupuesto: z.string().optional(),
  totalVentaManual: z.coerce.number().optional(),
  costoMaderaManual: z.coerce.number().optional(),
  costoAserrioManual: z.coerce.number().optional(),
});

type VentaFormValues = z.infer<typeof ventaFormSchema>;

const createEmptyDetalle = (): Partial<z.infer<typeof ventaDetalleSchema>> => ({
  tipoMadera: undefined,
  unidades: undefined,
  ancho: undefined,
  alto: undefined,
  largo: undefined,
  precioPorPie: undefined,
  cepillado: false,
});

const initialDetallesCount = 15;

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      fecha: new Date(),
      nombreComprador: "",
      telefonoComprador: "",
      fechaEntregaEstimada: undefined,
      sena: undefined,
      costoOperario: undefined,
      detalles: Array(initialDetallesCount).fill(null).map(() => createEmptyDetalle()),
      idOriginalPresupuesto: undefined,
      totalVentaManual: undefined,
      costoMaderaManual: undefined,
      costoAserrioManual: undefined,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  useEffect(() => {
    const presupuestoParaVentaString = localStorage.getItem('presupuestoParaVenta');
    if (presupuestoParaVentaString) {
      try {
        const presupuesto: Presupuesto = JSON.parse(presupuestoParaVentaString);
        
        const budgetItemsToMap = (presupuesto.detalles || []).map(d_presupuesto_item => ({
            tipoMadera: d_presupuesto_item.tipoMadera,
            unidades: Number(d_presupuesto_item.unidades) || undefined,
            ancho: Number(d_presupuesto_item.ancho) || undefined,
            alto: Number(d_presupuesto_item.alto) || undefined,
            largo: Number(d_presupuesto_item.largo) || undefined,
            precioPorPie: Number(d_presupuesto_item.precioPorPie) || undefined,
            cepillado: d_presupuesto_item.cepillado ?? false,
        }));

        form.reset({
          fecha: new Date(),
          nombreComprador: presupuesto.nombreCliente,
          telefonoComprador: presupuesto.telefonoCliente || "",
          idOriginalPresupuesto: presupuesto.id,
          fechaEntregaEstimada: undefined,
          sena: undefined,
          costoOperario: undefined,
          detalles: [], // Reset with empty, then populate
          totalVentaManual: undefined,
          costoMaderaManual: undefined,
          costoAserrioManual: undefined,
        });
        
        replace(budgetItemsToMap); // Replace the empty array with mapped items

        let currentLength = budgetItemsToMap.length;
        while (currentLength < initialDetallesCount) {
          append(createEmptyDetalle(), { shouldFocus: false });
          currentLength++;
        }
        
        form.trigger();

        toast({
          title: "Presupuesto Cargado para Venta",
          description: `Datos del presupuesto para ${presupuesto.nombreCliente} cargados. Fecha actualizada.`,
        });
      } catch (error) {
        console.error("Error al cargar presupuesto desde localStorage:", error);
        toast({
          title: "Error al Cargar Presupuesto",
          description: "No se pudieron cargar los datos. Por favor, ingréselos manualmente.",
          variant: "destructive",
        });
      } finally {
        localStorage.removeItem('presupuestoParaVenta');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, replace, append, toast]);


  const watchedDetalles = form.watch("detalles");
  const watchedSena = form.watch("sena");
  const watchedCostoOperario = form.watch("costoOperario");
  const watchedTotalVentaManual = form.watch("totalVentaManual");
  const watchedCostoMaderaManual = form.watch("costoMaderaManual");
  const watchedCostoAserrioManual = form.watch("costoAserrioManual");


  const calcularPiesTablares = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0;
    const ancho = Number(detalle?.ancho) || 0;
    const largo = Number(detalle?.largo) || 0;
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
  };

  const calcularSubtotalDetalle = (
    detalle: Partial<z.infer<typeof ventaDetalleSchema>>,
    piesTablares: number,
    precioCepilladoConfigValue: number
  ): number => {
    const precioPorPie = Number(detalle?.precioPorPie);
    if (isNaN(precioPorPie) || piesTablares === 0) return 0;

    let subtotal = piesTablares * precioPorPie;
    if (detalle?.cepillado) {
      subtotal += piesTablares * precioCepilladoConfigValue;
    }
    return subtotal;
  };
  
  const currentPrecioCepilladoPorPie = Number(initialConfigData.precioCepilladoPorPie) || 0;
  const currentCostosMaderaMetroCubico = Array.isArray(initialConfigData.costosMaderaMetroCubico) ? initialConfigData.costosMaderaMetroCubico : [];
  const currentPrecioLitroNafta = Number(initialConfigData.precioLitroNafta) || 0;
  const currentPrecioAfiladoSierra = Number(initialConfigData.precioAfiladoSierra) || 0;
  
  let calculatedTotalVentaGeneral = 0;
  if (Array.isArray(watchedDetalles)) {
    watchedDetalles.forEach(detalle => {
      if (detalle && detalle.tipoMadera && (Number(detalle.unidades) || 0) > 0 && typeof (Number(detalle.precioPorPie)) === 'number' && !isNaN(Number(detalle.precioPorPie))) {
        const pies = calcularPiesTablares(detalle);
        calculatedTotalVentaGeneral += calcularSubtotalDetalle(detalle, pies, currentPrecioCepilladoPorPie);
      }
    });
  }

  let calculatedCostoTotalMaderaVenta = 0;
  if (Array.isArray(watchedDetalles)) {
    watchedDetalles.forEach(detalle => {
      if (detalle && detalle.tipoMadera && (Number(detalle.unidades) || 0) > 0) {
        const piesTablaresArticulo = calcularPiesTablares(detalle);
        if (piesTablaresArticulo > 0) {
          const costoMaderaConfig = currentCostosMaderaMetroCubico.find(c => c.tipoMadera === detalle.tipoMadera);
          const costoPorMetroCubicoDelTipo = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
          calculatedCostoTotalMaderaVenta += (piesTablaresArticulo / 200) * costoPorMetroCubicoDelTipo;
        }
      }
    });
  }

  const costoOperativoBase = (currentPrecioLitroNafta * 6) + (currentPrecioAfiladoSierra * 3);
  const costoOperativoAjustado = costoOperativoBase * 1.38;
  const costoAserrioPorPie = (costoOperativoAjustado > 0 && isFinite(costoOperativoAjustado) && costoOperativoAjustado !== 0) ? costoOperativoAjustado / 600 : 0;
  
  let totalPiesTablaresVentaParaAserrio = 0;
  if (Array.isArray(watchedDetalles)) {
    watchedDetalles.forEach(detalle => {
      if (detalle && detalle.tipoMadera && (Number(detalle.unidades) || 0) > 0) {
        totalPiesTablaresVentaParaAserrio += calcularPiesTablares(detalle);
      }
    });
  }
  const calculatedCostoTotalAserrioVenta = totalPiesTablaresVentaParaAserrio * costoAserrioPorPie;
  
  const displayTotalVenta = typeof watchedTotalVentaManual === 'number' && !isNaN(watchedTotalVentaManual) ? watchedTotalVentaManual : calculatedTotalVentaGeneral;
  const displayCostoMadera = typeof watchedCostoMaderaManual === 'number' && !isNaN(watchedCostoMaderaManual) ? watchedCostoMaderaManual : calculatedCostoTotalMaderaVenta;
  const displayCostoAserrio = typeof watchedCostoAserrioManual === 'number' && !isNaN(watchedCostoAserrioManual) ? watchedCostoAserrioManual : calculatedCostoTotalAserrioVenta;
  const costoOperarioActual = Number(watchedCostoOperario) || 0;

  const gananciaNetaEstimada = displayTotalVenta - displayCostoMadera - displayCostoAserrio - costoOperarioActual;

  const valorJavier = displayCostoMadera + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);
  const valorLucas = displayCostoAserrio + costoOperarioActual + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);

  const senaActual = Number(watchedSena) || 0;
  const saldoPendiente = displayTotalVenta - senaActual;

  const handleTipoMaderaChange = (value: string, index: number) => {
    form.setValue(`detalles.${index}.tipoMadera`, value, { shouldValidate: true, shouldDirty: true });
    const maderaSeleccionada = initialConfigData.preciosMadera.find(m => m.tipoMadera === value);
    if (maderaSeleccionada) {
      form.setValue(`detalles.${index}.precioPorPie`, maderaSeleccionada.precioPorPie, { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue(`detalles.${index}.precioPorPie`, undefined, { shouldValidate: true, shouldDirty: true });
    }
    form.trigger(`detalles.${index}`);
  };

  function onSubmit(data: VentaFormValues) {
    const processedDetalles = (data.detalles || []).filter(
      d_form => d_form.tipoMadera && d_form.tipoMadera.length > 0 && (Number(d_form.unidades) || 0) > 0 && typeof (Number(d_form.precioPorPie)) === 'number' && !isNaN(Number(d_form.precioPorPie))
    ).map((d_form, idx) => {
      const d = d_form as Required<Omit<VentaDetalleType, 'id' | 'piesTablares' | 'subTotal' | 'valorUnitario'>>;
      const pies = calcularPiesTablares(d);
      const sub = calcularSubtotalDetalle(d, pies, currentPrecioCepilladoPorPie);
      const valorUnit = ((Number(d.unidades) || 0) > 0 && sub > 0) ? sub / (Number(d.unidades)) : 0;
      return {
        ...d,
        unidades: Number(d.unidades),
        ancho: Number(d.ancho),
        alto: Number(d.alto),
        largo: Number(d.largo),
        precioPorPie: Number(d.precioPorPie),
        piesTablares: pies,
        subTotal: sub,
        valorUnitario: valorUnit,
        id: `vd-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
      } as VentaDetalleType;
    });

    if (processedDetalles.length === 0) {
      toast({
        title: "Error en la Venta",
        description: "No hay artículos válidos para registrar. Asegúrese de completar tipo de madera, unidades y precio.",
        variant: "destructive",
      });
      return;
    }

    const finalTotalVenta = typeof data.totalVentaManual === 'number' && !isNaN(data.totalVentaManual) ? data.totalVentaManual : calculatedTotalVentaGeneral;
    const finalCostoMadera = typeof data.costoMaderaManual === 'number' && !isNaN(data.costoMaderaManual) ? data.costoMaderaManual : calculatedCostoTotalMaderaVenta;
    const finalCostoAserrio = typeof data.costoAserrioManual === 'number' && !isNaN(data.costoAserrioManual) ? data.costoAserrioManual : calculatedCostoTotalAserrioVenta;

    const nuevaVenta: Venta = {
      id: `venta-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fecha: format(data.fecha, "yyyy-MM-dd"),
      nombreComprador: data.nombreComprador,
      telefonoComprador: data.telefonoComprador,
      fechaEntregaEstimada: data.fechaEntregaEstimada ? format(data.fechaEntregaEstimada, "yyyy-MM-dd") : undefined,
      sena: data.sena && !isNaN(data.sena) ? Number(data.sena) : undefined,
      costoOperario: data.costoOperario && !isNaN(data.costoOperario) ? Number(data.costoOperario) : undefined,
      detalles: processedDetalles,
      totalVenta: finalTotalVenta,
      idOriginalPresupuesto: data.idOriginalPresupuesto,
      costoMaderaVentaSnapshot: finalCostoMadera,
      costoAserrioVentaSnapshot: finalCostoAserrio,
    };

    if (typeof window !== 'undefined') {
        const storedVentas = localStorage.getItem(VENTAS_STORAGE_KEY);
        let ventasActuales: Venta[] = storedVentas ? JSON.parse(storedVentas) : [];
        ventasActuales.push(nuevaVenta);
        ventasActuales.sort((a, b) => b.fecha.localeCompare(a.fecha));
        localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(ventasActuales));
    }

    toast({
      title: "Venta Registrada",
      description: `Se ha registrado la venta a ${data.nombreComprador}. Total: $${nuevaVenta.totalVenta?.toFixed(2)}`,
    });

    if (data.idOriginalPresupuesto) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('budgetToDeleteId', data.idOriginalPresupuesto);
      }
    }
    router.push('/ventas');
  }

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && (detalle.precioPorPie === undefined || isNaN(Number(detalle.precioPorPie))) && !detalle.cepillado;
  };

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Ingresar Nueva Venta" description="Registre los detalles de una nueva venta de madera." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Información del Comprador y Venta</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Venta</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="nombreComprador" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Comprador</FormLabel>
                    <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="telefonoComprador" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fechaEntregaEstimada"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Entrega Estimada (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seña ($) (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 50.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costoOperario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Operario ($) (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 100.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Venta</CardTitle>
              <CardDescription>Ingrese los productos vendidos. Las filas con tipo de madera, unidades y precio se considerarán válidas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Tipo Madera</TableHead>
                      <TableHead className="min-w-[100px]">Unid.</TableHead>
                      <TableHead className="min-w-[90px]">Alto (pulg)</TableHead>
                      <TableHead className="min-w-[90px]">Ancho (pulg)</TableHead>
                      <TableHead className="min-w-[100px]">Largo (m)</TableHead>
                      <TableHead className="min-w-[120px]">Precio/Pie ($)</TableHead>
                      <TableHead className="w-[90px] text-center">Cepillado</TableHead>
                      <TableHead className="min-w-[110px] text-right">Pies Tabl.</TableHead>
                      <TableHead className="min-w-[120px] text-right">Valor Unit. ($)</TableHead>
                      <TableHead className="min-w-[120px] text-right">Subtotal ($)</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentDetalle = watchedDetalles[index];
                      const piesTablares = calcularPiesTablares(currentDetalle);
                      const subTotal = calcularSubtotalDetalle(currentDetalle, piesTablares, currentPrecioCepilladoPorPie);
                      const valorUnitario = ((Number(currentDetalle?.unidades) || 0) > 0 && subTotal > 0) ? subTotal / (Number(currentDetalle.unidades)) : 0;
                      const isEffectivelyEmpty = isRowEffectivelyEmpty(currentDetalle);

                      return (
                        <TableRow key={item.id} className={cn(isEffectivelyEmpty && index >= 1 && "opacity-70 hover:opacity-100 focus-within:opacity-100")}>
                          <TableCell className="p-1">
                            <FormField
                              control={form.control}
                              name={`detalles.${index}.tipoMadera`}
                              render={({ field: maderaField }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => handleTipoMaderaChange(value, index)}
                                    value={maderaField.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {initialConfigData.preciosMadera.map(madera => (
                                        <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                                          {madera.tipoMadera}
                                        </SelectItem>
                                      ))}
                                      {initialConfigData.preciosMadera.length === 0 && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs px-1" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.unidades`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" placeholder="Cant." {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.alto`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.ancho`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 6" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.largo`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 3.05" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`detalles.${index}.precioPorPie`} render={({ field: f }) => (
                              <FormItem><FormControl><Input type="number" step="0.01" placeholder="Ej: 2.50" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-xs px-1" /></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            <FormField control={form.control} name={`detalles.${index}.cepillado`} render={({ field: f }) => (
                              <FormItem className="flex justify-center items-center h-full"><FormControl><Checkbox checked={f.value} onCheckedChange={f.onChange} /></FormControl></FormItem> )}
                            />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={piesTablares > 0 ? piesTablares.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                           <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={valorUnitario > 0 ? valorUnitario.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={subTotal > 0 ? subTotal.toFixed(2) : ""} className="bg-muted/50 font-semibold text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {(!isEffectivelyEmpty || fields.length > 1) && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.detalles && (
                 <p className="text-sm font-medium text-destructive pt-2">{form.formState.errors.detalles.message || form.formState.errors.detalles.root?.message}</p>
              )}
              <Button type="button" variant="outline" onClick={() => append(createEmptyDetalle())} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Producto
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col items-end gap-1 mt-8 border-t pt-6">
              <div className="w-full max-w-md space-y-1 text-right">
                
                <FormField
                  control={form.control}
                  name="totalVentaManual"
                  render={({ field }) => (
                    <FormItem className="flex justify-between items-center">
                      <FormLabel className="text-lg">Total Venta:</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="font-semibold text-primary text-right w-32 h-8" 
                          placeholder={calculatedTotalVentaGeneral.toFixed(2)}
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormMessage>{form.formState.errors.totalVentaManual?.message}</FormMessage>
                
                <Separator className="my-1" />

                <FormField
                  control={form.control}
                  name="costoMaderaManual"
                  render={({ field }) => (
                    <FormItem className="flex justify-between items-center">
                      <FormLabel className="text-sm text-muted-foreground">Costo Total Madera:</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="text-right w-32 h-8 bg-muted/30" 
                          placeholder={calculatedCostoTotalMaderaVenta.toFixed(2)}
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormMessage>{form.formState.errors.costoMaderaManual?.message}</FormMessage>

                <FormField
                  control={form.control}
                  name="costoAserrioManual"
                  render={({ field }) => (
                    <FormItem className="flex justify-between items-center">
                      <FormLabel className="text-sm text-muted-foreground">Costo Total Aserrío:</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="text-right w-32 h-8 bg-muted/30" 
                          placeholder={calculatedCostoTotalAserrioVenta.toFixed(2)}
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormMessage>{form.formState.errors.costoAserrioManual?.message}</FormMessage>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Costo Operario:</span>
                  <span>${(Number(costoOperarioActual) || 0).toFixed(2)}</span>
                </div>
                 <Separator className="my-1" />
                <div className="flex justify-between text-md font-semibold">
                  <span>Ganancia Neta Estimada:</span>
                  <span>${(Number(gananciaNetaEstimada) || 0).toFixed(2)}</span>
                </div>
                <Separator className="my-1" />
                 <div className="flex justify-between text-sm">
                  <span>Javier (Madera + 50% Gan. Neta):</span>
                  <span>${(Number(valorJavier) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Lucas (Aserrío + Operario + 50% Gan. Neta):</span>
                  <span>${(Number(valorLucas) || 0).toFixed(2)}</span>
                </div>
                {senaActual > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm text-destructive">
                        <span className="text-muted-foreground">Seña Aplicada:</span>
                        <span>-${(Number(senaActual) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                        <span>Saldo Pendiente:</span>
                        <span className="text-primary">${(Number(saldoPendiente) || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Registrando..." : "Registrar Venta"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

