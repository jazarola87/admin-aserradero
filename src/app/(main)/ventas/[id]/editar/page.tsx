
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, PlusCircle, Save, Trash2, Loader2, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppConfig } from "@/lib/firebase/services/configuracionService";
import type { VentaDetalle as VentaDetalleType, Venta, Configuracion } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useRouter, useParams } from "next/navigation";
import { getVentaById, updateVenta } from "@/lib/firebase/services/ventasService";
import { getStockSummary, type StockSummaryItem } from "@/lib/firebase/services/stockService";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const initialDetallesCount = 15; 

const ventaDetalleSchema = z.object({
  tipoMadera: z.string().optional(),
  unidades: z.coerce.number().int().positive({ message: "Debe ser > 0" }).optional(),
  ancho: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  alto: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  largo: z.coerce.number().positive({ message: "Debe ser > 0" }).optional(), 
  precioPorPie: z.coerce.number().nonnegative({ message: "Debe ser >= 0" }).optional(),
  cepillado: z.boolean().default(false).optional(),
  unidadesDeStock: z.coerce.number().int().nonnegative("Debe ser >= 0.").optional(),
}).refine(data => {
  if (data.unidadesDeStock !== undefined && data.unidades !== undefined) {
    return data.unidadesDeStock <= data.unidades;
  }
  return true;
}, {
  message: "No puede exceder el total de unidades.",
  path: ['unidadesDeStock'],
});

const ventaFormSchema = z.object({
  fecha: z.date({ required_error: "La fecha es obligatoria." }),
  nombreComprador: z.string().min(2, "Mínimo 2 caracteres."),
  telefonoComprador: z.string().optional(),
  fechaEntregaEstimada: z.date().optional(),
  sena: z.coerce.number().nonnegative("La seña no puede ser negativa.").optional(),
  costoOperario: z.coerce.number().nonnegative("El costo de operario no puede ser negativo.").optional(),
  notas: z.string().optional(),
  detalles: z.array(ventaDetalleSchema)
    .min(1, "Debe agregar al menos un detalle de venta.")
    .refine(
      (detalles) => detalles.some(d => 
        d.tipoMadera && d.tipoMadera.length > 0 &&
        d.unidades && d.unidades > 0 &&
        d.alto && d.alto > 0 &&
        d.ancho && d.ancho > 0 &&
        d.largo && d.largo > 0 &&
        d.precioPorPie !== undefined && !isNaN(d.precioPorPie)
      ),
      {
        message: "Debe completar al menos una fila de producto con todos sus campos (Tipo, Unidades, Dimensiones).",
      }
    ),
  idOriginalPresupuesto: z.string().optional(), 
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
  unidadesDeStock: undefined,
});

const calculateAllTotals = (detalles: VentaFormValues['detalles'], config: Configuracion | null) => {
    if (!config) {
        return { totalVenta: 0, costoMadera: 0, costoAserrio: 0 };
    }

    const piesTablaresPorDetalle = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>): number => {
        const unidades = Number(detalle?.unidades) || 0;
        const alto = Number(detalle?.alto) || 0;
        const ancho = Number(detalle?.ancho) || 0;
        const largo = Number(detalle?.largo) || 0;
        if (!unidades || !alto || !ancho || !largo) return 0;
        return unidades * alto * ancho * largo * 0.2734;
    };

    let totalVenta = 0;
    let costoMadera = 0;
    let totalPies = 0;

    for (const detalle of detalles) {
        if (!detalle.tipoMadera || !detalle.unidades || !detalle.alto || !detalle.ancho || !detalle.largo || detalle.precioPorPie === undefined) {
            continue;
        }

        const pies = piesTablaresPorDetalle(detalle);
        totalPies += pies;

        let subtotalVenta = pies * (Number(detalle.precioPorPie) || 0);
        if (detalle.cepillado) {
            subtotalVenta += pies * (Number(config.precioCepilladoPorPie) || 0);
        }
        totalVenta += subtotalVenta;

        const costoMaderaConfig = (config.costosMaderaMetroCubico || []).find(c => c.tipoMadera === detalle.tipoMadera);
        const costoPorMetroCubico = Number(costoMaderaConfig?.costoPorMetroCubico) || 0;
        costoMadera += (costoPorMetroCubico / 200) * pies;
    }

    const precioNafta = Number(config.precioLitroNafta) || 0;
    const precioAfilado = Number(config.precioAfiladoSierra) || 0;
    const costoOperativoBase = (precioNafta * 6) + (precioAfilado * 3);
    const costoAjustado = costoOperativoBase * 1.38;
    const costoPorPieAserrio = (costoAjustado > 0 && isFinite(costoAjustado)) ? costoAjustado / 600 : 0;
    const costoAserrio = totalPies * costoPorPieAserrio;

    return { totalVenta, costoMadera, costoAserrio };
};

export default function EditarVentaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const ventaId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummaryItem[]>([]);
  const [isFechaVentaPickerOpen, setIsFechaVentaPickerOpen] = useState(false);
  const [isFechaEntregaPickerOpen, setIsFechaEntregaPickerOpen] = useState(false);

  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaFormSchema),
    defaultValues: {
      fecha: new Date(),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  useEffect(() => {
    if (!ventaId) {
      router.push('/ventas');
      return;
    }
    async function loadData() {
      setIsLoading(true);
      try {
        const [appConfig, ventaAEditar, stockData] = await Promise.all([
          getAppConfig(),
          getVentaById(ventaId),
          getStockSummary()
        ]);
        setConfig(appConfig);
        setStockSummary(stockData);

        if (ventaAEditar) {
            const loadedDetails = (ventaAEditar.detalles || []).map(d => ({
                tipoMadera: d.tipoMadera,
                unidades: Number(d.unidades) || undefined,
                ancho: Number(d.ancho) || undefined,
                alto: Number(d.alto) || undefined,
                largo: Number(d.largo) || undefined,
                precioPorPie: Number(d.precioPorPie) || undefined,
                cepillado: d.cepillado ?? false,
                unidadesDeStock: d.unidadesDeStock || undefined,
            }));
            
            form.reset({
              fecha: ventaAEditar.fecha && isValid(parseISO(ventaAEditar.fecha)) ? parseISO(ventaAEditar.fecha) : new Date(),
              nombreComprador: ventaAEditar.nombreComprador,
              telefonoComprador: ventaAEditar.telefonoComprador || "",
              fechaEntregaEstimada: ventaAEditar.fechaEntregaEstimada && isValid(parseISO(ventaAEditar.fechaEntregaEstimada)) ? parseISO(ventaAEditar.fechaEntregaEstimada) : undefined,
              sena: ventaAEditar.sena ?? undefined,
              costoOperario: ventaAEditar.costoOperario ?? undefined,
              idOriginalPresupuesto: ventaAEditar.idOriginalPresupuesto || undefined,
              notas: ventaAEditar.notas || "",
              detalles: [], 
            });
            
            replace(loadedDetails); 

            let currentLength = loadedDetails.length;
            while (currentLength < initialDetallesCount) {
              append(createEmptyDetalle(), { shouldFocus: false });
              currentLength++;
            }
            form.trigger();
        } else {
            toast({ title: "Error", description: "Venta no encontrada en Firebase.", variant: "destructive" });
            router.push('/ventas');
        }
      } catch(error) {
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos de la venta o la configuración. " + (error instanceof Error ? error.message : "Error desconocido"), variant: "destructive" });
        router.push('/ventas');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [ventaId, form, router, toast, replace, append]);


  const watchedDetalles = form.watch("detalles");
  const watchedSena = form.watch("sena");
  const watchedCostoOperario = form.watch("costoOperario");

  const totals = calculateAllTotals(watchedDetalles, config);

  const gananciaNetaEstimada = totals.totalVenta - totals.costoMadera - totals.costoAserrio - (Number(watchedCostoOperario) || 0);
  const valorJavier = totals.costoMadera + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);
  const valorLucas = totals.costoAserrio + (gananciaNetaEstimada > 0 ? gananciaNetaEstimada / 2 : 0);
  const saldoPendiente = totals.totalVenta - (Number(watchedSena) || 0);

  const handleTipoMaderaChange = (value: string, index: number) => {
    form.setValue(`detalles.${index}.tipoMadera`, value, { shouldValidate: true, shouldDirty: true });
    const maderaSeleccionada = config?.preciosMadera.find(m => m.tipoMadera === value);
    if (maderaSeleccionada) {
      form.setValue(`detalles.${index}.precioPorPie`, maderaSeleccionada.precioPorPie, { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue(`detalles.${index}.precioPorPie`, undefined, { shouldValidate: true, shouldDirty: true });
    }
    form.trigger(`detalles.${index}`);
  };

  const calcularPiesTablares = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>): number => {
    const unidades = Number(detalle?.unidades) || 0;
    const alto = Number(detalle?.alto) || 0; 
    const ancho = Number(detalle?.ancho) || 0; 
    const largo = Number(detalle?.largo) || 0;
    if (!unidades || !alto || !ancho || !largo) return 0;
    return unidades * alto * ancho * largo * 0.2734;
  };

  const findUnidadesDisponiblesPorLargo = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>): { total: number; breakdown: string } => {
    if (!detalle || !detalle.tipoMadera || !detalle.alto || !detalle.ancho || !detalle.largo) {
        return { total: 0, breakdown: "Stock: 0" };
    }
    const { tipoMadera, alto, ancho, largo, cepillado } = detalle;
    
    const matchingStock = stockSummary.filter(stockItem => {
      if (
        stockItem.tipoMadera !== tipoMadera ||
        stockItem.alto !== alto ||
        stockItem.ancho !== ancho ||
        stockItem.largo < (largo || 0)
      ) {
        return false;
      }
      
      return cepillado ? true : !stockItem.cepillado;
    });

    if (matchingStock.length === 0) {
      return { total: 0, breakdown: "Stock: 0" };
    }

    const breakdownMap = new Map<number, number>();
    let total = 0;

    matchingStock.forEach(item => {
      const currentUnits = breakdownMap.get(item.largo) || 0;
      breakdownMap.set(item.largo, currentUnits + item.unidades);
      total += item.unidades;
    });

    if (total === 0) {
      return { total: 0, breakdown: "Stock: 0" };
    }

    const breakdownString = Array.from(breakdownMap.entries())
      .sort(([largoA], [largoB]) => largoA - largoB)
      .map(([largo, unidades]) => `${largo}m: ${unidades}`)
      .join(', ');

    return { total, breakdown: `Stock: ${breakdownString}` };
  };
  
  async function onSubmit(data: VentaFormValues) {
    if (!ventaId || !config) return;
    setIsSubmitting(true);

    const stockItems = data.detalles.filter(d => d.unidadesDeStock && d.unidadesDeStock > 0);
    if (stockItems.length > 0) {
      for (const item of stockItems) {
        const stockInfo = findUnidadesDisponiblesPorLargo(item);
        if ((item.unidadesDeStock ?? 0) > stockInfo.total) {
            toast({ 
                variant: "destructive", 
                title: "Stock Insuficiente",
                description: `No hay suficiente stock para ${item.unidadesDeStock} unidades de ${item.tipoMadera} con las dimensiones especificadas.`
            });
            setIsSubmitting(false);
            return;
        }
      }
    }
    
    const finalTotals = calculateAllTotals(data.detalles, config);

    const processedDetalles = data.detalles.filter(
      d => 
        d.tipoMadera && d.tipoMadera.length > 0 &&
        d.unidades && d.unidades > 0 &&
        d.alto && d.alto > 0 &&
        d.ancho && d.ancho > 0 &&
        d.largo && d.largo > 0 &&
        d.precioPorPie !== undefined && !isNaN(d.precioPorPie)
    ).map((d_form, idx) => {
      const pies = calcularPiesTablares(d_form);
      const precioPorPie = Number(d_form.precioPorPie) || 0;
      let subTotal = pies * precioPorPie;
      if (d_form.cepillado) {
          subTotal += pies * (Number(config.precioCepilladoPorPie) || 0);
      }
      const valorUnit = (Number(d_form.unidades) > 0 && subTotal > 0) ? subTotal / Number(d_form.unidades) : 0;
      
      return { 
        ...d_form,
        unidades: Number(d_form.unidades),
        ancho: Number(d_form.ancho),
        alto: Number(d_form.alto),
        largo: Number(d_form.largo),
        precioPorPie: precioPorPie,
        piesTablares: pies, 
        subTotal: subTotal, 
        valorUnitario: valorUnit, 
        id: `vd-edit-${Date.now()}-${idx}`,
        unidadesDeStock: d_form.unidadesDeStock || 0,
      } as VentaDetalleType;
    });

    if (processedDetalles.length === 0) {
      toast({ title: "Error en la Venta", description: "No hay artículos válidos para guardar.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const ventaActualizadaData: Partial<Omit<Venta, 'id'>> = {
        fecha: format(data.fecha, "yyyy-MM-dd"),
        nombreComprador: data.nombreComprador,
        detalles: processedDetalles,
        totalVenta: finalTotals.totalVenta,
        costoMaderaVentaSnapshot: finalTotals.costoMadera, 
        costoAserrioVentaSnapshot: finalTotals.costoAserrio, 
        telefonoComprador: data.telefonoComprador || '',
        fechaEntregaEstimada: (data.fechaEntregaEstimada && isValid(data.fechaEntregaEstimada)) 
            ? format(data.fechaEntregaEstimada, "yyyy-MM-dd") 
            : '',
        sena: data.sena ?? 0,
        costoOperario: data.costoOperario ?? 0,
        idOriginalPresupuesto: data.idOriginalPresupuesto || '',
        notas: data.notas || '',
    };


    try {
        await updateVenta(ventaId, ventaActualizadaData);

       toast({
        title: "Venta Actualizada en Firebase",
        description: `Se ha actualizado la venta para ${data.nombreComprador}.`,
      });
      router.push('/ventas');
    } catch(error) {
       toast({ title: "Error al Actualizar", description: "No se pudo actualizar la venta en Firebase. " + (error instanceof Error ? error.message : "Error desconocido"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRowEffectivelyEmpty = (detalle: Partial<z.infer<typeof ventaDetalleSchema>>) => {
    if (!detalle) return true;
    return !detalle.tipoMadera && !detalle.unidades && !detalle.alto && !detalle.ancho && !detalle.largo && (detalle.precioPorPie === undefined || isNaN(Number(detalle.precioPorPie))) && !detalle.cepillado;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="mr-2 h-12 w-12 animate-spin text-primary" />
        <p>Cargando datos de la venta...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle title="Editar Venta" description="Modifique los detalles de la venta existente." />
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
                    <Popover open={isFechaVentaPickerOpen} onOpenChange={setIsFechaVentaPickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && isValid(field.value) ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsFechaVentaPickerOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")} 
                          initialFocus 
                          locale={es} 
                        />
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
                    <Popover open={isFechaEntregaPickerOpen} onOpenChange={setIsFechaEntregaPickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && isValid(field.value) ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsFechaEntregaPickerOpen(false);
                          }}
                          initialFocus 
                          locale={es} 
                        />
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
               <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Añadir notas internas sobre la venta..."
                        {...field}
                        value={field.value ?? ""}
                      />
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
              <CardDescription>Modifique los productos vendidos.</CardDescription>
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
                      <TableHead className="min-w-[120px]">Uds. de Stock</TableHead>
                      <TableHead className="min-w-[110px] text-right">Pies Tabl.</TableHead>
                      <TableHead className="min-w-[120px] text-right">Valor Unit. ($)</TableHead>
                      <TableHead className="min-w-[120px] text-right">Subtotal ($)</TableHead>
                      <TableHead className="w-[50px] text-center">Borrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentDetalle = watchedDetalles[index];
                      const pies = calcularPiesTablares(currentDetalle);
                      const precioPorPie = Number(currentDetalle?.precioPorPie) || 0;
                      let subTotal = pies * precioPorPie;
                      if (currentDetalle?.cepillado) {
                          subTotal += pies * (Number(config?.precioCepilladoPorPie) || 0);
                      }
                      const valorUnitario = (Number(currentDetalle?.unidades) > 0 && subTotal > 0) ? subTotal / Number(currentDetalle.unidades) : 0;
                      const isEffectivelyEmpty = isRowEffectivelyEmpty(currentDetalle);
                      const stockInfo = findUnidadesDisponiblesPorLargo(currentDetalle);

                      return (
                        <TableRow key={item.id} className={cn(isEffectivelyEmpty && index >= 1 && "opacity-70 hover:opacity-100 focus-within:opacity-100")}>
                          <TableCell className="p-1">
                            <FormField
                              control={form.control}
                              name={`detalles.${index}.tipoMadera`}
                              key={`${item.id}-tipoMadera`}
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
                                      {config?.preciosMadera.map(madera => (
                                        <SelectItem key={madera.tipoMadera} value={madera.tipoMadera}>
                                          {madera.tipoMadera}
                                        </SelectItem>
                                      ))}
                                      {(!config || config.preciosMadera.length === 0) && <SelectItem value="" disabled>No hay tipos definidos</SelectItem>}
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
                              <FormItem>
                                <FormControl><Input type="number" step="0.01" placeholder="Ej: 3.05" {...f} value={f.value ?? ""} onChange={e => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl>
                                <FormMessage className="text-xs px-1" />
                              </FormItem> 
                            )}
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
                          <TableCell className="p-1 align-middle w-[120px]">
                            <FormField
                              control={form.control}
                              name={`detalles.${index}.unidadesDeStock`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Cant."
                                      className="h-8 text-center"
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={e => {
                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                        field.onChange(val);
                                        form.trigger(`detalles.${index}`);
                                      }}
                                      disabled={stockInfo.total === 0}
                                      min="0"
                                      max={Math.min(stockInfo.total, form.getValues(`detalles.${index}.unidades`) ?? 0)}
                                    />
                                  </FormControl>
                                  <div className="text-center mt-1">
                                    <Badge variant={stockInfo.total > 0 ? "default" : "outline"} className="text-xs cursor-default px-1.5 py-0.5 h-auto whitespace-normal text-left">
                                        {stockInfo.breakdown}
                                    </Badge>
                                  </div>
                                  <FormMessage className="text-xs px-1 text-center" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={pies > 0 ? pies.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                           <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={valorUnitario > 0 ? valorUnitario.toFixed(2) : ""} className="bg-muted/50 text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-right align-middle">
                            <Input readOnly value={subTotal > 0 ? subTotal.toFixed(2) : ""} className="bg-muted/50 font-semibold text-right border-none h-8" tabIndex={-1} />
                          </TableCell>
                          <TableCell className="p-1 text-center align-middle">
                            {(!isRowEffectivelyEmpty(currentDetalle) || fields.length > 1) && (
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
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Total Venta:</span>
                        <span className="font-semibold text-primary">${totals.totalVenta.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Costo Total Madera:</span>
                        <span>${totals.costoMadera.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Costo Total Aserrío:</span>
                        <span>${totals.costoAserrio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Costo Operario:</span>
                        <span>${(Number(watchedCostoOperario) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-md font-semibold">
                        <span>Ganancia Neta Estimada:</span>
                        <span>${gananciaNetaEstimada.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm">
                        <span>Javier (Madera + 50% Gan. Neta):</span>
                        <span>${valorJavier.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Lucas (Aserrío + 50% Gan. Neta):</span>
                        <span>${valorLucas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {(Number(watchedSena) || 0) > 0 && (
                        <>
                            <Separator className="my-1" />
                            <div className="flex justify-between text-sm text-destructive">
                                <span className="text-muted-foreground">Seña Aplicada:</span>
                                <span>-${(Number(watchedSena) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                                <span>Saldo Pendiente:</span>
                                <span className="text-primary">${saldoPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </>
                    )}
                </div>
              <Button type="submit" size="lg" disabled={isSubmitting || isLoading} className="mt-4">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

    